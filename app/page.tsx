import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  ClipboardList,
  FolderCheck,
  LockKeyhole,
  Scale,
} from "lucide-react";

const stages = [
  {
    name: "Move-in",
    view: "move-in",
    icon: Camera,
    text: "Save the condition you found.",
  },
  {
    name: "During the lease",
    view: "lease-log",
    icon: ClipboardList,
    text: "Keep requests and agreements on record.",
  },
  {
    name: "Renewal",
    view: "renewal",
    icon: Scale,
    text: "See the cost of staying or moving.",
  },
  {
    name: "Move-out",
    view: "move-out",
    icon: FolderCheck,
    text: "Put your evidence behind your refund.",
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <section className="mx-auto grid w-full max-w-[1360px] items-center gap-14 px-6 pb-16 pt-16 lg:grid-cols-[1fr_1.02fr] lg:gap-20 lg:px-10 lg:pb-24 lg:pt-24">
        <div className="max-w-xl">
          <p className="page-eyebrow mb-6">A private workspace for renters</p>
          <h1 className="text-[42px] font-medium leading-[1.08] tracking-[-0.055em] sm:text-[58px] lg:text-[64px]">
            Your deposit deserves a{" "}
            <span className="text-primary">paper trail.</span>
          </h1>
          <p className="mt-7 max-w-md text-[17px] leading-7 text-muted-foreground">
            Keep the photos, agreements, and dates that matter. When it&apos;s
            time to move out, your rental record is ready.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/protected" prefetch={false}>
                Protect my deposit
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/protected/sample" prefetch={false}>
                Try with a sample apartment
              </Link>
            </Button>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="size-3.5" />
            No sign-up required. Your guest workspace stays private.
          </p>
        </div>
        <Link
          href="/protected/sample"
          prefetch={false}
          className="group block overflow-hidden rounded-2xl border bg-card shadow-[0_12px_45px_-24px_rgba(24,54,39,0.35)] transition-transform duration-300 hover:-translate-y-1"
          aria-label="Open sample apartment workspace"
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <span className="text-sm font-medium">
              A little proof goes a long way.
            </span>
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
          <div className="relative bg-secondary/40 p-5 pb-0">
            {/* Labeled static preview; click opens a real private sample. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/samples/countertop-move-in.jpg"
              alt="Sample kitchen countertop condition photograph"
              className="aspect-[1.55] w-full rounded-t-lg object-cover object-bottom"
            />
            <div className="absolute bottom-4 left-9 flex items-center gap-2 rounded-md bg-card/95 px-3 py-2 text-xs shadow-sm">
              <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Check className="size-3" />
              </span>
              Kitchen countertop, recorded
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="font-medium">Your rental, on record</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Explore the fictional sample workspace
              </p>
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <ArrowRight className="size-4" />
            </span>
          </div>
        </Link>
      </section>
      <section className="border-t bg-card/60">
        <div className="mx-auto max-w-[1360px] px-6 py-10 lg:px-10">
          <div className="mb-7 flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-medium">
              One record for the whole lease
            </h2>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Explore any part of the sample
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map(({ name, view, icon: Icon, text }, index) => (
              <Link
                key={view}
                href={`/protected/sample?view=${view}`}
                prefetch={false}
                className="group flex gap-4 rounded-lg p-2 transition-colors hover:bg-secondary/50"
              >
                <span className="pt-1 text-xs text-muted-foreground">
                  0{index + 1}
                </span>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold">{name}</h3>
                    <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {text}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <footer className="mx-auto flex w-full max-w-[1360px] items-center justify-between gap-4 px-6 py-6 text-xs text-muted-foreground lg:px-10">
        <span>safer</span>
        <span>Built for the things worth keeping.</span>
      </footer>
    </main>
  );
}
