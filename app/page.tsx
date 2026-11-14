import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-5 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Get your full deposit back
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Renters lose deposit money when they can&apos;t prove what the
          apartment looked like at move-in, or don&apos;t know the landlord&apos;s
          legal deadline to return it.
        </p>
        <div className="flex gap-3">
          {/* No prefetch: the first request to /protected creates the
              visitor's guest session, so it should happen on click, not for
              every landing page view. */}
          <Button asChild>
            <Link href="/protected" prefetch={false}>
              Protect my deposit
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
