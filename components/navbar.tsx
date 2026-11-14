import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ShieldCheck, ArrowUpRight } from "lucide-react";

export function Navbar() {
  return (
    <nav
      className="sticky top-0 z-30 h-[72px] w-full border-b bg-background/95 backdrop-blur-md"
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
          {/* No prefetch: the first request to /protected creates the
              visitor's guest session, so it should happen on click. */}
          <Link
            href="/protected"
            prefetch={false}
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:block"
          >
            My rentals
          </Link>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/protected/sample"
            prefetch={false}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Explore demo
            <ArrowUpRight className="size-3.5" />
          </Link>
          <span className="h-5 border-l" aria-hidden />
          <ThemeSwitcher />
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </div>
    </nav>
  );
}
