"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Camera,
  ClipboardList,
  Scale,
  FolderCheck,
  LockKeyhole,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import { rentalStatus } from "@/lib/rental-status";
import type { Rental } from "@/lib/types";
import { stateName } from "@/lib/us-states";
import { InspectionChecklist } from "@/components/inspection/inspection-checklist";
import { MoveOutTab } from "@/components/move-out/move-out-tab";
import { LeaseLog } from "@/components/lease-log/lease-log";
import { RenewalCalculator } from "@/components/renewal/renewal-calculator";
import { DeleteRentalDialog } from "@/components/rentals/delete-rental-dialog";
import { RentalFormDialog } from "@/components/rentals/rental-form-dialog";
import { RentalStatusBadge } from "@/components/rentals/rental-status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; rental: Rental }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

export function RentalDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("move-in");
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

  useEffect(() => {
    const view = params.get("view");
    if (view && ["move-in", "lease-log", "renewal", "move-out"].includes(view))
      setTab(view);
  }, [params]);

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
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value);
              window.scrollTo({ top: 0 });
            }}
            orientation="vertical"
            className="grid items-start gap-8 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-10"
          >
            <aside className="space-y-8 lg:sticky lg:top-28">
              <div>
                <p className="page-eyebrow mb-4 hidden px-4 lg:block">
                  Rental workspace
                </p>
                <TabsList
                  className="workspace-nav grid h-auto w-full grid-cols-4 gap-1 rounded-xl border bg-card p-2 lg:grid-cols-1 lg:gap-2 lg:border-0 lg:bg-transparent lg:p-0"
                  aria-label="Rental sections"
                >
                  {[
                    {
                      value: "move-in",
                      label: "Move-in",
                      detail: "Your starting point",
                      icon: Camera,
                    },
                    {
                      value: "lease-log",
                      label: "Lease log",
                      detail: "Requests & agreements",
                      icon: ClipboardList,
                    },
                    {
                      value: "renewal",
                      label: "Renewal",
                      detail: "The cost of your next move",
                      icon: Scale,
                    },
                    {
                      value: "move-out",
                      label: "Move-out",
                      detail: "Evidence & refund",
                      icon: FolderCheck,
                    },
                  ].map(({ value, label, detail, icon: Icon }) => (
                    <TabsTrigger key={value} value={value} aria-label={label}>
                      <Icon className="size-[18px] shrink-0" />
                      <span className="text-left">
                        <span className="block">{label}</span>
                        <span className="nav-description mt-1 hidden text-[11px] font-normal text-muted-foreground lg:block">
                          {detail}
                        </span>
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div className="hidden space-y-4 border-t px-4 pt-6 lg:block">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Security deposit
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">
                    {formatMoney(state.rental.deposit_amount)}
                  </p>
                </div>
                <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
                  Keep this browser session to return to your guest records.
                </p>
              </div>
            </aside>
            <div className="min-w-0 space-y-7">
              <RentalSummary
                rental={state.rental}
                onEdit={() => setEditOpen(true)}
                onDelete={() => setDeleting(state.rental)}
              />
              {state.rental.is_sample && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary/60 px-4 py-3">
                  <p className="max-w-2xl text-xs leading-5 text-secondary-foreground">
                    <span className="font-semibold">Sample apartment.</span>{" "}
                    Fictional rental, simulated dates, and AI-generated example
                    photos. Your changes stay in your own workspace.
                  </p>
                  <button
                    className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    onClick={() => {
                      setTab("move-out");
                      window.scrollTo({ top: 0 });
                    }}
                  >
                    Compare move-out
                  </button>
                </div>
              )}
              <TabsContent value="move-in" className="mt-0">
                <div className="mb-6 space-y-1.5">
                  <p className="page-eyebrow">01 / Move-in</p>
                  <h2 className="text-2xl font-medium tracking-tight">
                    Start with what you found.
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    A room at a time. Photos and notes you can come back to.
                  </p>
                </div>
                <InspectionChecklist rental={state.rental} phase="move_in" />
              </TabsContent>
              <TabsContent value="lease-log" className="mt-0">
                <LeaseLog rental={state.rental} />
              </TabsContent>
              <TabsContent value="renewal" className="mt-0">
                <RenewalCalculator rental={state.rental} />
              </TabsContent>
              <TabsContent value="move-out" className="mt-0">
                <MoveOutTab
                  rental={state.rental}
                  onEdit={() => setEditOpen(true)}
                  onSaved={(rental) => setState({ kind: "ready", rental })}
                />
              </TabsContent>
            </div>
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
        <div className="min-w-0 space-y-3">
          <h1 className="text-[28px] font-medium leading-tight tracking-[-0.035em]">
            {rental.address}
          </h1>
          <div className="flex items-center gap-3">
            <RentalStatusBadge status={status} />
            <span className="text-xs text-muted-foreground">
              {stateName(rental.state)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Rental options"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={onDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <details className="group mt-5 rounded-lg border bg-card">
        <summary className="flex list-none items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
          Rental details
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <dl className="grid gap-x-8 gap-y-4 border-t p-5 sm:grid-cols-2 xl:grid-cols-3">
          {facts
            .filter((fact) => fact.value !== null && fact.value !== "")
            .map((fact) => (
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
      </details>
    </>
  );
}
