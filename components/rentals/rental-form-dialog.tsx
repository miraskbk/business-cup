"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  draftFromRental,
  emptyRentalDraft,
  validateRentalDraft,
  type RentalDraft,
  type RentalErrors,
} from "@/lib/rental-form";
import type { Rental } from "@/lib/types";
import { US_STATES } from "@/lib/us-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The rental to edit. Leave out to create a new one. */
  rental?: Rental | null;
  onSaved: (rental: Rental) => void;
};

export function RentalFormDialog({
  open,
  onOpenChange,
  rental,
  onSaved,
}: Props) {
  const [supabase] = useState(() => createClient());
  const [draft, setDraft] = useState<RentalDraft>(emptyRentalDraft);
  const [errors, setErrors] = useState<RentalErrors>({});
  const [saving, setSaving] = useState(false);

  // Start from a clean form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setDraft(rental ? draftFromRental(rental) : emptyRentalDraft);
    setErrors({});
  }, [open, rental]);

  function set<K extends keyof RentalDraft>(key: K, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const result = validateRentalDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setSaving(true);
    const query = rental
      ? supabase.from("rentals").update(result.payload).eq("id", rental.id)
      : supabase.from("rentals").insert(result.payload);
    const { data, error } = await query.select().single();
    setSaving(false);

    if (error) {
      toast.error(`Couldn't save the rental: ${error.message}`);
      return;
    }
    toast.success(rental ? "Rental updated" : "Rental added");
    onSaved(data as Rental);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rental ? "Edit rental" : "New rental"}</DialogTitle>
          <DialogDescription>
            The state decides how long your landlord has to return the deposit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} noValidate className="grid gap-4">
          <Field id="address" label="Address" error={errors.address}>
            <Input
              id="address"
              value={draft.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="412 Oak St, Apt 3B, Oakland"
              autoComplete="street-address"
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "address-error" : undefined}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="state" label="State" error={errors.state}>
              <Select
                value={draft.state}
                onValueChange={(value) => set("state", value)}
              >
                <SelectTrigger
                  id="state"
                  aria-invalid={!!errors.state}
                  aria-describedby={errors.state ? "state-error" : undefined}
                >
                  <SelectValue placeholder="Choose a state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              id="deposit_amount"
              label="Security deposit ($)"
              error={errors.deposit_amount}
            >
              <Input
                id="deposit_amount"
                inputMode="decimal"
                value={draft.deposit_amount}
                onChange={(e) => set("deposit_amount", e.target.value)}
                placeholder="1800"
                aria-invalid={!!errors.deposit_amount}
                aria-describedby={
                  errors.deposit_amount ? "deposit_amount-error" : undefined
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="monthly_rent"
              label="Monthly rent ($)"
              optional
              error={errors.monthly_rent}
            >
              <Input
                id="monthly_rent"
                inputMode="decimal"
                value={draft.monthly_rent}
                onChange={(e) => set("monthly_rent", e.target.value)}
                placeholder="1800"
                aria-invalid={!!errors.monthly_rent}
                aria-describedby={
                  errors.monthly_rent ? "monthly_rent-error" : undefined
                }
              />
            </Field>

            <Field
              id="move_out_date"
              label="Move-out date"
              optional
              error={errors.move_out_date}
            >
              <Input
                id="move_out_date"
                type="date"
                value={draft.move_out_date}
                onChange={(e) => set("move_out_date", e.target.value)}
                aria-invalid={!!errors.move_out_date}
                aria-describedby={
                  errors.move_out_date ? "move_out_date-error" : undefined
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="lease_start" label="Lease start" optional>
              <Input
                id="lease_start"
                type="date"
                value={draft.lease_start}
                onChange={(e) => set("lease_start", e.target.value)}
              />
            </Field>

            <Field
              id="lease_end"
              label="Lease end"
              optional
              error={errors.lease_end}
            >
              <Input
                id="lease_end"
                type="date"
                value={draft.lease_end}
                onChange={(e) => set("lease_end", e.target.value)}
                aria-invalid={!!errors.lease_end}
                aria-describedby={
                  errors.lease_end ? "lease_end-error" : undefined
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="landlord_name" label="Landlord name" optional>
              <Input
                id="landlord_name"
                value={draft.landlord_name}
                onChange={(e) => set("landlord_name", e.target.value)}
                placeholder="Bay Property Management"
              />
            </Field>

            <Field
              id="landlord_email"
              label="Landlord email"
              optional
              error={errors.landlord_email}
            >
              <Input
                id="landlord_email"
                type="email"
                value={draft.landlord_email}
                onChange={(e) => set("landlord_email", e.target.value)}
                placeholder="office@example.com"
                aria-invalid={!!errors.landlord_email}
                aria-describedby={
                  errors.landlord_email ? "landlord_email-error" : undefined
                }
              />
            </Field>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : rental ? "Save changes" : "Add rental"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  optional,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="ml-1 font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
