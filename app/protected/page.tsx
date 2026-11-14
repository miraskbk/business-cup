"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  MoreHorizontal,
  Plus,
  ArrowUpRight,
  House,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { rentalStatus } from "@/lib/rental-status";
import type { Rental } from "@/lib/types";
import { stateName } from "@/lib/us-states";
import { DeleteRentalDialog } from "@/components/rentals/delete-rental-dialog";
import { RentalFormDialog } from "@/components/rentals/rental-form-dialog";
import { RentalStatusBadge } from "@/components/rentals/rental-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function RentalsPage() {
  const [supabase] = useState(() => createClient());
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Rental | null>(null);
  const [deleting, setDeleting] = useState<Rental | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .order("created_at", { ascending: false });
    setLoadError(error ? error.message : null);
    setRentals((data as Rental[] | null) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(rental: Rental) {
    setEditing(rental);
    setFormOpen(true);
  }

  function handleSaved(saved: Rental) {
    setRentals((prev) =>
      prev.some((r) => r.id === saved.id)
        ? prev.map((r) => (r.id === saved.id ? saved : r))
        : [saved, ...prev],
    );
  }

  // The sample apartment is fictional, so its deposit isn't money being
  // tracked. Summed in cents so the total never picks up float noise.
  const ownRentals = rentals.filter((rental) => !rental.is_sample);
  const ownDeposits =
    ownRentals.reduce(
      (cents, rental) => cents + Math.round(rental.deposit_amount * 100),
      0,
    ) / 100;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b pb-8">
        <div>
          <p className="page-eyebrow mb-3">Your workspace</p>
          <h1 className="text-4xl font-medium tracking-[-0.04em]">
            My rentals
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A clear record for every place you call home.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          New rental
        </Button>
      </div>

      {!loading && !loadError && rentals.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <p className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            {ownRentals.length > 0 ? (
              <>
                <span className="font-medium text-foreground">
                  {formatMoney(ownDeposits)}
                </span>{" "}
                in deposits tracked across {ownRentals.length}{" "}
                {ownRentals.length === 1 ? "rental" : "rentals"}
              </>
            ) : (
              "This is the fictional sample. Add your own rental to track a real deposit."
            )}
          </p>
          <Link
            href="/protected/sample"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Explore the sample
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : loadError ? (
        <div className="rounded-lg border border-destructive/40 p-6 text-center">
          <p className="font-medium">Couldn&apos;t load your rentals.</p>
          <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" className="mt-4" onClick={load}>
            Try again
          </Button>
        </div>
      ) : rentals.length === 0 ? (
        <div className="rounded-2xl border bg-card px-8 py-16 text-center">
          <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-secondary">
            <House
              className="size-6 text-secondary-foreground"
              strokeWidth={1.5}
            />
          </span>
          <p className="font-medium">No rentals yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Add the place you rent to start recording its condition and tracking
            your deposit.
          </p>
          <Button className="mt-6" onClick={openCreate}>
            <Plus />
            Add your first rental
          </Button>
          <p className="mt-5 text-xs text-muted-foreground">
            Want to see how it works first?{" "}
            <Link
              href="/protected/sample"
              className="font-medium text-primary underline underline-offset-4"
            >
              Try a sample apartment
            </Link>
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rentals.map((rental) => (
            <li key={rental.id}>
              <RentalCard
                rental={rental}
                onEdit={() => openEdit(rental)}
                onDelete={() => setDeleting(rental)}
              />
            </li>
          ))}
        </ul>
      )}

      <RentalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rental={editing}
        onSaved={handleSaved}
      />
      <DeleteRentalDialog
        rental={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={(deleted) =>
          setRentals((prev) => prev.filter((r) => r.id !== deleted.id))
        }
      />
    </div>
  );
}

function RentalCard({
  rental,
  onEdit,
  onDelete,
}: {
  rental: Rental;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Cards only render in the browser after the rentals load, so "today" is
  // the visitor's own date rather than the build server's.
  const status = rentalStatus(rental, todayISO());

  return (
    // The title link is stretched over the whole card; the menu sits above it.
    <Card className="group relative h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <span className="mb-4 flex size-10 items-center justify-center rounded-lg bg-secondary/60 text-primary">
            <House className="size-5" strokeWidth={1.5} />
          </span>
          <CardTitle className="text-lg font-medium leading-snug">
            <Link
              href={`/protected/rentals/${rental.id}`}
              className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {rental.address}
            </Link>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {stateName(rental.state)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative z-10 -mr-2 -mt-1 shrink-0"
              aria-label={`Actions for ${rental.address}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <RentalStatusBadge status={status} />
          {rental.is_sample && (
            <Badge variant="outline">Sample apartment</Badge>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-4 text-sm">
          <dt className="text-muted-foreground">Deposit</dt>
          <dd className="text-right font-medium">
            {formatMoney(rental.deposit_amount)}
          </dd>
          {rental.move_out_date ? (
            <>
              <dt className="text-muted-foreground">
                {status === "active" ? "Moving out" : "Moved out"}
              </dt>
              <dd className="text-right">{formatDate(rental.move_out_date)}</dd>
            </>
          ) : rental.lease_end ? (
            <>
              <dt className="text-muted-foreground">Lease ends</dt>
              <dd className="text-right">{formatDate(rental.lease_end)}</dd>
            </>
          ) : null}
        </dl>
        <p className="flex items-center justify-between border-t pt-4 text-xs font-medium text-primary">
          Open rental workspace
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </p>
      </CardContent>
    </Card>
  );
}
