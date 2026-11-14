import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-5 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Your product name
        </h1>
        <p className="max-w-xl text-muted-foreground">
          One sentence about the problem you solve.
        </p>
        <div className="flex gap-3">
          {/* No prefetch: the first request to /protected creates the
              visitor's guest session, so it should happen on click, not for
              every landing page view. */}
          <Button asChild>
            <Link href="/protected" prefetch={false}>
              Get started
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
