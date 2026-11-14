"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { rentalStatus } from "@/lib/rental-status";
import type { Rental } from "@/lib/types";
import { stateName } from "@/lib/us-states";
import { InspectionChecklist } from "@/components/inspection/inspection-checklist";
import { DeleteRentalDialog } from "@/components/rentals/delete-rental-dialog";
import { RentalFormDialog } from "@/components/rentals/rental-form-dialog";
import { RentalStatusBadge } from "@/components/rentals/rental-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; rental: Rental }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

export function RentalDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<Rental | null>(null);

  const load = useCallback(async () => {
    // A malformed id can't match a row; skip the round trip.
    if (!UUID.test(id)) {
      setState({ kind: "not_found" });
      return;
    }
    setState({ kind: "loading" });
    const { data, error } = await supabase
      .from("rentals")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) setState({ kind: "error", message: error.message });
    else if (!data) setState({ kind: "not_found" });
    else setState({ kind: "ready", rental: data as Rental });
  }, [supabase, id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/protected"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All rentals
      </Link>

      {state.kind === "loading" && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {state.kind === "not_found" && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Rental not found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            It may have been deleted, or it belongs to a different browser
            session.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/protected">Back to my rentals</Link>
          </Button>
        </div>
      )}

      {state.kind === "error" && (
        <div className="rounded-lg border border-destructive/40 p-6 text-center">
          <p className="font-medium">Couldn&apos;t load this rental.</p>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          <Button variant="outline" className="mt-4" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {state.kind === "ready" && (
        <>
          <RentalSummary
            rental={state.rental}
            onEdit={() => setEditOpen(true)}
            onDelete={() => setDeleting(state.rental)}
          />

          <Tabs defaultValue="move-in">
            <TabsList className="max-w-full justify-start overflow-x-auto">
              <TabsTrigger value="move-in">Move-in</TabsTrigger>
              <TabsTrigger value="lease-log" disabled>
                Lease log
              </TabsTrigger>
              <TabsTrigger value="renewal" disabled>
                Renewal
              </TabsTrigger>
              <TabsTrigger value="move-out" disabled>
                Move-out
              </TabsTrigger>
            </TabsList>
            <TabsContent value="move-in" className="mt-4">
              <InspectionChecklist rental={state.rental} phase="move_in" />
            </TabsContent>
          </Tabs>
        </>
      )}

      <RentalFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        rental={state.kind === "ready" ? state.rental : null}
        onSaved={(rental) => setState({ kind: "ready", rental })}
      />
      <DeleteRentalDialog
        rental={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => router.push("/protected")}
      />
    </div>
  );
}

function RentalSummary({
  rental,
  onEdit,
  onDelete,
}: {
  rental: Rental;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = rentalStatus(rental, todayISO());

  const lease =
    rental.lease_start && rental.lease_end
      ? `${formatDate(rental.lease_start)} – ${formatDate(rental.lease_end)}`
      : rental.lease_start
        ? `From ${formatDate(rental.lease_start)}`
        : rental.lease_end
          ? `Until ${formatDate(rental.lease_end)}`
          : null;

  const facts: { label: string; value: string | null }[] = [
    { label: "State", value: stateName(rental.state) },
    { label: "Security deposit", value: formatMoney(rental.deposit_amount) },
    {
      label: "Monthly rent",
      value:
        rental.monthly_rent === null ? null : formatMoney(rental.monthly_rent),
    },
    { label: "Lease", value: lease },
    {
      label: status === "active" ? "Move-out date" : "Moved out",
      value: rental.move_out_date ? formatDate(rental.move_out_date) : null,
    },
    { label: "Landlord", value: rental.landlord_name },
    { label: "Landlord email", value: rental.landlord_email },
  ];

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold leading-tight">{rental.address}</h1>
          <RentalStatusBadge status={status} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      <dl className="grid gap-x-8 gap-y-4 rounded-lg border p-5 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{fact.label}</dt>
            <dd className="break-words font-medium">
              {fact.value ?? (
                <span className="font-normal text-muted-foreground">
                  Not set
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
