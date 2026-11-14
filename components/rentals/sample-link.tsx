"use client";

import Link from "next/link";

const INTENT_KEY = "safer:open-sample";

/**
 * A link to the sample apartment that records the click, so the sample page
 * can tell a visitor who asked for it from a crawler that merely loaded the
 * URL. Only a recorded click lets that page create data without asking.
 */
export function SampleLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href="/protected/sample"
      // Prefetching would start a guest session before anyone clicks.
      prefetch={false}
      className={className}
      onClick={() => {
        try {
          sessionStorage.setItem(INTENT_KEY, "1");
        } catch {
          // Storage can be blocked; the sample page then asks for a click.
        }
      }}
    >
      {children}
    </Link>
  );
}

/** True once, right after a SampleLink click in this tab. */
export function takeSampleIntent(): boolean {
  try {
    const asked = sessionStorage.getItem(INTENT_KEY) === "1";
    sessionStorage.removeItem(INTENT_KEY);
    return asked;
  } catch {
    return false;
  }
}
