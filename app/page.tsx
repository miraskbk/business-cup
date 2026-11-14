import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { SampleLink } from "@/components/rentals/sample-link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar minimal />
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-24 pt-16 text-center lg:pb-36 lg:pt-20">
        <h1 className="font-serif text-[48px] font-normal leading-[1.08] tracking-[-0.045em] sm:text-[72px] lg:text-[82px]">
          Your deposit.
          <br />
          <span className="text-primary">Worth looking after.</span>
        </h1>
        <p className="mt-7 max-w-[440px] text-base leading-7 text-muted-foreground sm:text-[17px]">
          Keep your rental photos, notes, and dates in one place. Feel prepared
          when it&apos;s time to get your deposit back.
        </p>
        <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
          <Button asChild size="lg" className="min-w-40 rounded-full px-7">
            <Link href="/protected" prefetch={false}>
              Get started
              <ArrowRight />
            </Link>
          </Button>
          <SampleLink
            className="rounded-sm py-2 text-sm font-medium text-foreground underline decoration-border underline-offset-[6px] transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            Explore a sample apartment
          </SampleLink>
        </div>
        <p className="mt-7 text-xs text-muted-foreground">
          No sign-up needed. Your workspace stays private.
        </p>
      </section>
    </main>
  );
}
