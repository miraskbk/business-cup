"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  daysBetween,
  daysRemaining,
  deadlineFor,
  isLate,
  ruleFor,
} from "@/lib/deposit-rules";
import { formatDate, todayISO } from "@/lib/format";
import type { Rental } from "@/lib/types";
import { stateName } from "@/lib/us-states";
import { InspectionChecklist } from "@/components/inspection/inspection-checklist";
import { DeductionsList } from "@/components/move-out/deductions-list";
import { DemandLetter } from "@/components/move-out/demand-letter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MoveOutTab({
  rental,
  onEdit,
  onSaved,
}: {
  rental: Rental;
  onEdit: () => void;
  onSaved: (rental: Rental) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [today, setToday] = useState(todayISO);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnedOn, setReturnedOn] = useState(today);
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // Refresh across midnight, including when a background tab becomes visible.
  useEffect(() => {
    const refresh = () => setToday(todayISO());
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  async function setReturned(date: string | null) {
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        date > today ||
        (rental.move_out_date && date < rental.move_out_date))
    ) {
      setDateError("Choose a date from move-out through today.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("rentals")
      .update({ deposit_returned_at: date })
      .eq("id", rental.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast.error(`Couldn't update the deposit status: ${error.message}`);
      return;
    }
    onSaved(data as Rental);
    setReturnOpen(false);
    toast.success(
      date ? "Deposit marked returned" : "Deposit tracking reopened",
    );
  }

  const rule = ruleFor(rental.state);
  const deadline = deadlineFor(rental);
  const remaining = daysRemaining(rental, today);
  const late = isLate(rental, today);
  const day = rental.move_out_date
    ? daysBetween(rental.move_out_date, today)
    : null;
  const returned = !!rental.deposit_returned_at;
  const future = day !== null && day < 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="page-eyebrow">04 / Move-out</p>
          <h2 className="text-2xl font-medium tracking-tight">
            Your record. Your next step.
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare the condition, review the charges, and put it in writing.
          </p>
        </div>
        <DemandLetter rental={rental} today={today} compact />
      </div>
      <section
        className={`space-y-4 rounded-xl border bg-card p-5 ${late && !returned ? "border-destructive/25" : ""}`}
      >
        <div className="flex items-start gap-3">
          {returned ? (
            <CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" />
          ) : late ? (
            <AlertTriangle className="mt-1 size-5 shrink-0 text-destructive" />
          ) : (
            <Clock className="mt-1 size-5 shrink-0 text-primary" />
          )}
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Deposit return tracker
            </p>
            <h2
              className={`text-xl font-semibold ${late && !returned ? "text-destructive" : ""}`}
            >
              {returned
                ? "Deposit returned"
                : !rental.move_out_date
                  ? "Set your move-out date to start the clock"
                  : !rule
                    ? "More states coming soon"
                    : future
                      ? `Move-out in ${-day!} days`
                      : late
                        ? `Day ${day} — response overdue`
                        : `Day ${day} of ${rule.returnDeadlineDays}`}
            </h2>
            {returned ? (
              <p className="text-sm">
                You marked this deposit returned or fully resolved on{" "}
                {formatDate(rental.deposit_returned_at!)}.
              </p>
            ) : !rental.move_out_date ? (
              <p className="text-sm text-muted-foreground">
                We&apos;ll calculate the deadline using your state&apos;s
                verified rule.
              </p>
            ) : !rule ? (
              <p className="text-sm text-muted-foreground">
                We haven&apos;t verified the deposit deadline for{" "}
                {stateName(rental.state)} yet. You can still save evidence and
                track deductions.
              </p>
            ) : (
              <>
                <p className="text-sm">
                  {future
                    ? `Expected response deadline: ${formatDate(deadline!)}.`
                    : late
                      ? `The ${formatDate(deadline!)} deadline passed ${-remaining!} days ago. If no refund or required deduction statement arrived, your landlord is late.`
                      : remaining === 0
                        ? `The response deadline is today, ${formatDate(deadline!)}.`
                        : `Your landlord has ${remaining} ${remaining === 1 ? "day" : "days"} left, until ${formatDate(deadline!)}.`}
                </p>
              </>
            )}
          </div>
        </div>
        {rule && !returned && (
          <details className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <summary className="w-fit text-xs font-medium text-muted-foreground">
              State rule &amp; official source
            </summary>
            <div className="mt-3 space-y-2 pb-1 text-sm">
              <p className="text-muted-foreground">{rule.deadlineSummary}</p>
              {late && <p>{rule.penaltySummary}</p>}
              {rule.renterDuty && (
                <p>
                  <span className="font-medium">Your part: </span>
                  {rule.renterDuty}
                </p>
              )}
              <a
                href={rule.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-primary underline underline-offset-4"
              >
                {rule.statuteCitation} · Official source
              </a>
              <p className="text-xs text-muted-foreground">
                General information. Local rules and special housing types may
                differ. This tracker does not check what your landlord has sent.
              </p>
            </div>
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            {rental.move_out_date ? "Edit move-out date" : "Set move-out date"}
          </Button>
          {returned ? (
            <Button
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setReturned(null)}
            >
              {saving ? "Updating…" : "Reopen deposit tracking"}
            </Button>
          ) : (
            rental.move_out_date &&
            !future && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReturnedOn(today);
                  setDateError(null);
                  setReturnOpen(true);
                }}
              >
                Mark deposit returned
              </Button>
            )
          )}
        </div>
      </section>

      <Tabs defaultValue="evidence">
        <TabsList
          className="section-tabs h-auto bg-card"
          aria-label="Move-out tasks"
        >
          <TabsTrigger value="evidence">Compare evidence</TabsTrigger>
          <TabsTrigger value="deductions">Review deductions</TabsTrigger>
        </TabsList>
        <TabsContent value="evidence" className="mt-5">
          <InspectionChecklist rental={rental} phase="move_out" />
        </TabsContent>
        <TabsContent value="deductions" className="mt-5">
          <DeductionsList rental={rental} />
        </TabsContent>
      </Tabs>

      <Dialog
        open={returnOpen}
        onOpenChange={(open) => !saving && setReturnOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Is your deposit fully resolved?</DialogTitle>
            <DialogDescription>
              Confirm the refund arrived and any deductions are settled. This
              stops overdue alerts. Your evidence and deduction history stay
              saved.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setReturned(returnedOn);
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="deposit-returned-on">
                Date returned or resolved
              </Label>
              <Input
                id="deposit-returned-on"
                type="date"
                min={rental.move_out_date ?? undefined}
                max={today}
                value={returnedOn}
                required
                onChange={(e) => {
                  setReturnedOn(e.target.value);
                  setDateError(null);
                }}
                aria-invalid={!!dateError}
                aria-describedby={
                  dateError ? "deposit-returned-error" : undefined
                }
              />
              {dateError && (
                <p
                  id="deposit-returned-error"
                  className="text-sm text-destructive"
                >
                  {dateError}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setReturnOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Confirm deposit returned"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
