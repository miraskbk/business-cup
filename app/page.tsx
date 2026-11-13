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
          <Button asChild>
            <Link href="/auth/sign-up">Get started</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
