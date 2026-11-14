"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { amountAtRisk, disputedTotal } from "@/lib/deposit-rules";
import {
  validateDeduction,
  type DeductionDraft,
  type DeductionErrors,
} from "@/lib/deductions";
import { formatMoney } from "@/lib/format";
import type { Deduction, Rental } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMPTY: DeductionDraft = { description: "", amount: "", disputed: true };

export function DeductionsList({ rental }: { rental: Rental }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deduction | null>(null);
  const [draft, setDraft] = useState<DeductionDraft>(EMPTY);
  const [errors, setErrors] = useState<DeductionErrors>({});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string[]>([]);
  const [removing, setRemoving] = useState<Deduction | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("deductions")
      .select("*")
      .eq("rental_id", rental.id)
      .order("created_at");
    setLoadError(error?.message ?? null);
    if (!error) setRows(data as Deduction[]);
    setLoading(false);
  }, [supabase, rental.id]);
  useEffect(() => {
    load();
  }, [load]);

  function openForm(row: Deduction | null) {
    setEditing(row);
    setDraft(
      row
        ? {
            description: row.description,
            amount: String(row.amount),
            disputed: row.disputed,
          }
        : EMPTY,
    );
    setErrors({});
    setFormOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = validateDeduction(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setSaving(true);
    const query = editing
      ? supabase
          .from("deductions")
          .update(result.payload)
          .eq("id", editing.id)
          .eq("rental_id", rental.id)
      : supabase
          .from("deductions")
          .insert({ ...result.payload, rental_id: rental.id });
    const { data, error } = await query.select().single();
    setSaving(false);
    if (error) {
      toast.error(`Couldn't save the deduction: ${error.message}`);
      return;
    }
    setRows((prev) =>
      editing
        ? prev.map((row) => (row.id === editing.id ? (data as Deduction) : row))
        : [...prev, data as Deduction],
    );
    setFormOpen(false);
    toast.success(editing ? "Deduction updated" : "Deduction added");
  }

  async function toggle(row: Deduction, disputed: boolean) {
    setToggling((prev) => [...prev, row.id]);
    const { data, error } = await supabase
      .from("deductions")
      .update({ disputed })
      .eq("id", row.id)
      .eq("rental_id", rental.id)
      .select()
      .single();
    setToggling((prev) => prev.filter((id) => id !== row.id));
    if (error) {
      toast.error(`Couldn't update the deduction: ${error.message}`);
      return;
    }
    setRows((prev) =>
      prev.map((entry) => (entry.id === row.id ? (data as Deduction) : entry)),
    );
    toast.success(
      disputed ? "Deduction marked disputed" : "Deduction marked accepted",
    );
  }

  async function remove() {
    if (!removing) return;
    setRemoveBusy(true);
    const { error } = await supabase
      .from("deductions")
      .delete()
      .eq("id", removing.id)
      .eq("rental_id", rental.id);
    setRemoveBusy(false);
    if (error) {
      toast.error(`Couldn't remove the deduction: ${error.message}`);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== removing.id));
    setRemoving(null);
    toast.success("Deduction removed");
  }

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (loadError)
    return (
      <div className="rounded-lg border border-destructive/40 p-5">
        <p>Couldn&apos;t load deductions.</p>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button className="mt-3" variant="outline" onClick={load}>
          Try again
        </Button>
      </div>
    );

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Landlord deductions</h2>
          <p className="text-sm text-muted-foreground">
            Record each charge and choose which ones you dispute.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => openForm(null)}>
          <Plus />
          Add deduction
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-4 rounded-md bg-muted/50 p-4">
        <div>
          <dt className="text-sm text-muted-foreground">Amount at risk</dt>
          <dd className="text-xl font-semibold">
            {formatMoney(
              rental.deposit_returned_at ? 0 : amountAtRisk(rental, rows),
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Disputed total</dt>
          <dd className="text-xl font-semibold">
            {formatMoney(disputedTotal(rows))}
          </dd>
        </div>
      </dl>
      {rows.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          No deductions recorded. Until the deposit is returned, the full
          deposit is at risk.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start gap-3 py-4"
              data-deduction={row.id}
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words font-medium">{row.description}</p>
                  <Badge variant={row.disputed ? "secondary" : "outline"}>
                    {row.disputed ? "Disputed" : "Accepted"}
                  </Badge>
                </div>
                <Label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-normal">
                  <Checkbox
                    checked={row.disputed}
                    disabled={toggling.includes(row.id)}
                    onCheckedChange={(checked) => toggle(row, checked === true)}
                    aria-label={`Dispute ${row.description}`}
                  />
                  I dispute this charge
                </Label>
              </div>
              <p className="font-semibold">{formatMoney(row.amount)}</p>
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={toggling.includes(row.id)}
                  aria-label={`Edit ${row.description}`}
                  onClick={() => openForm(row)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={toggling.includes(row.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${row.description}`}
                  onClick={() => setRemoving(row)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => !saving && setFormOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit deduction" : "Add deduction"}
            </DialogTitle>
            <DialogDescription>
              Use the description and amount from your landlord&apos;s
              statement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} noValidate className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="deduction-description">Description</Label>
              <Input
                id="deduction-description"
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                placeholder="Counter damage"
                aria-invalid={!!errors.description}
                aria-describedby={
                  errors.description ? "deduction-description-error" : undefined
                }
              />
              {errors.description && (
                <p
                  id="deduction-description-error"
                  className="text-sm text-destructive"
                >
                  {errors.description}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deduction-amount">Amount ($)</Label>
              <Input
                id="deduction-amount"
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                placeholder="300"
                aria-invalid={!!errors.amount}
                aria-describedby={
                  errors.amount ? "deduction-amount-error" : undefined
                }
              />
              {errors.amount && (
                <p
                  id="deduction-amount-error"
                  className="text-sm text-destructive"
                >
                  {errors.amount}
                </p>
              )}
            </div>
            <Label className="flex items-center gap-2">
              <Checkbox
                checked={draft.disputed}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, disputed: checked === true })
                }
              />
              I dispute this charge
            </Label>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save deduction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removing}
        onOpenChange={(open) => !open && !removeBusy && setRemoving(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this deduction?</DialogTitle>
            <DialogDescription>
              The charge will be removed from your totals. Inspection evidence
              is kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={removeBusy}
              onClick={() => setRemoving(null)}
            >
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={removeBusy}
              onClick={remove}
            >
              {removeBusy ? "Removing…" : "Remove deduction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
