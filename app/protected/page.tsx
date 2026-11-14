"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My rentals</h1>
          <p className="text-sm text-muted-foreground">
            Each rental keeps its own evidence, deadlines and deductions.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          New rental
        </Button>
      </div>

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
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">No rentals yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Add the place you rent to start recording its condition and
            tracking your deposit.
          </p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus />
            Add your first rental
          </Button>
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
    <Card className="relative h-full transition-colors hover:border-foreground/30">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base leading-snug">
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
      <CardContent className="space-y-3">
        <RentalStatusBadge status={status} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Deposit</dt>
          <dd className="text-right font-medium">
            {formatMoney(rental.deposit_amount)}
          </dd>
          {rental.move_out_date ? (
            <>
              <dt className="text-muted-foreground">
                {status === "moved_out" ? "Moved out" : "Moving out"}
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
      </CardContent>
    </Card>
  );
}
