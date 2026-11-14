import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { SampleLink } from "@/components/rentals/sample-link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ShieldCheck, ArrowUpRight } from "lucide-react";

export function Navbar({ minimal = false }: { minimal?: boolean }) {
  return (
    <nav
      className={`sticky top-0 z-30 h-[72px] w-full bg-background/95 backdrop-blur-md ${minimal ? "" : "border-b"}`}
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-full max-w-[1360px] items-center justify-between gap-5 px-6 lg:px-10">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[26px] font-semibold tracking-[-0.06em]"
            aria-label="safer home"
          >
            <ShieldCheck className="size-7 text-primary" strokeWidth={1.7} />
            safer
          </Link>
          {/* Avoid creating a guest session until a protected link is clicked. */}
          {!minimal && (
            <Link
              href="/protected"
              prefetch={false}
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:block"
            >
              My rentals
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          {!minimal && (
            <>
              <SampleLink
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Explore demo
                <ArrowUpRight className="size-3.5" />
              </SampleLink>
              <span className="h-5 border-l" aria-hidden />
            </>
          )}
          <ThemeSwitcher />
          {!minimal && (
            <Suspense>
              <AuthButton />
            </Suspense>
          )}
        </div>
      </div>
    </nav>
  );
}
