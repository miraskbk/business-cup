import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function Navbar() {
  return (
    <nav className="h-16 w-full border-b border-b-foreground/10">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-5 text-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            Deposit Back
          </Link>
          {/* No prefetch: the first request to /protected creates the
              visitor's guest session, so it should happen on click. */}
          <Link
            href="/protected"
            prefetch={false}
            className="text-muted-foreground hover:text-foreground"
          >
            My rentals
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}
