"use client";

import { useState } from "react";
import {
  calculateRenewal,
  validateRenewalDraft,
  type RenewalDraft,
  type RenewalInput,
} from "@/lib/renewal";
import { formatMoney } from "@/lib/format";
import type { Rental } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS: { key: keyof RenewalInput; label: string; help?: string }[] = [
  { key: "currentRent", label: "Current monthly rent ($)" },
  { key: "proposedRent", label: "Renewal offer ($ / month)" },
  {
    key: "negotiatedRent",
    label: "Negotiation target ($ / month)",
    help: "The rent you hope to agree on; this outcome isn't guaranteed.",
  },
  { key: "comparableRent", label: "Alternative rent ($ / month)" },
  {
    key: "movingCosts",
    label: "Moving costs ($)",
    help: "Movers, supplies, application fees, and other nonrefundable costs.",
  },
  { key: "newDeposit", label: "New refundable deposit ($)" },
  {
    key: "overlapDays",
    label: "Days paying for both homes",
    help: "Extra rent at your current home, estimated using a 30-day month.",
  },
];

export function RenewalCalculator({ rental }: { rental: Rental }) {
  const [draft, setDraft] = useState<RenewalDraft>(() => {
    const rent = rental.monthly_rent;
    return {
      currentRent: rent === null ? "" : String(rent),
      proposedRent: rent === null ? "" : String(rent),
      negotiatedRent: rent === null ? "" : String(rent),
      comparableRent: rent === null ? "" : String(rent),
      movingCosts: "0",
      newDeposit: String(rental.deposit_amount),
      overlapDays: "0",
    };
  });
  const validated = validateRenewalDraft(draft);
  const result = validated.ok ? calculateRenewal(validated.input) : null;
  const plans = result
    ? [
        {
          key: "stay",
          label: "Accept renewal",
          amount: result.stayCost,
          detail: "12 months at the offered rent",
        },
        {
          key: "negotiate",
          label: "Negotiate",
          amount: result.negotiateCost,
          detail: "12 months at your target rent, if accepted",
        },
        {
          key: "move",
          label: "Move",
          amount: result.moveCost,
          detail: "12 months of alternative rent + moving + overlap",
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Stay, negotiate, or move?</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Compare the next 12 months using your own estimates. Enter the renewal
          offer and a comparable apartment to see what moving would really cost.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2 sm:p-5">
          {FIELDS.map(({ key, label, help }) => {
            const error = !validated.ok ? validated.errors[key] : undefined;
            return (
              <div
                key={key}
                className={`flex flex-col gap-2 ${key === "overlapDays" ? "sm:col-span-2" : ""}`}
              >
                <Label htmlFor={`renewal-${key}`}>{label}</Label>
                <Input
                  id={`renewal-${key}`}
                  inputMode={key === "overlapDays" ? "numeric" : "decimal"}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  aria-invalid={!!error}
                  aria-describedby={
                    error
                      ? `renewal-${key}-error`
                      : help
                        ? `renewal-${key}-help`
                        : undefined
                  }
                />
                {help && (
                  <p
                    id={`renewal-${key}-help`}
                    className="text-xs text-muted-foreground"
                  >
                    {help}
                  </p>
                )}
                {error && (
                  <p
                    id={`renewal-${key}-error`}
                    className="text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-4" aria-live="polite" aria-atomic="true">
          {!result ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Complete the amounts on the left to see your comparison.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {plans.map((plan) => (
                  <div
                    key={plan.key}
                    data-renewal-plan={plan.key}
                    className="rounded-lg border p-4"
                  >
                    <p className="text-sm font-medium">{plan.label}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {formatMoney(plan.amount)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.detail}
                    </p>
                  </div>
                ))}
              </div>
              <div
                className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm"
                data-renewal-break-even
              >
                <p className="font-semibold">
                  {result.breakEvenMonths === null
                    ? "Moving doesn't lower the monthly rent"
                    : result.breakEvenMonths === 0
                      ? "No moving costs to recover"
                      : `Moving breaks even in ${result.breakEvenMonths} ${result.breakEvenMonths === 1 ? "month" : "months"}`}
                </p>
                <p className="text-muted-foreground">
                  {result.monthlySavingsVsStay > 0
                    ? `${formatMoney(result.monthlySavingsVsStay)} lower monthly rent compared with accepting renewal, covering ${formatMoney(result.oneTimeMovingCost)} in moving and overlap costs.`
                    : "Moving costs won't be recovered through lower rent compared with this renewal offer."}
                </p>
                {result.breakEvenMonths !== null &&
                  result.breakEvenMonths > 12 && (
                    <p className="text-muted-foreground">
                      Break-even falls beyond this 12-month comparison.
                    </p>
                  )}
                <p className="text-muted-foreground">
                  Negotiating to your target would{" "}
                  {result.negotiateSavingsVsStay >= 0
                    ? "save"
                    : "cost an extra"}{" "}
                  {formatMoney(Math.abs(result.negotiateSavingsVsStay))} over 12
                  months compared with the renewal offer.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
      {result && (
        <div className="space-y-3 rounded-lg border p-4 sm:p-5">
          <h3 className="font-semibold">Plan for the cash you need</h3>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted-foreground">
                Cash needed to move
              </dt>
              <dd className="text-xl font-semibold" data-renewal-upfront>
                {formatMoney(result.upfrontMoveCash)}
              </dd>
              <p className="text-xs text-muted-foreground">
                First month + new deposit + moving + overlap
              </p>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                Refundable new deposit
              </dt>
              <dd className="text-xl font-semibold">
                {formatMoney(result.newDeposit)}
              </dd>
              <p className="text-xs text-muted-foreground">
                Cash tied up, excluded from the cost comparison
              </p>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                12-month cash outflow if you move
              </dt>
              <dd className="text-xl font-semibold">
                {formatMoney(result.moveCashOver12Months)}
              </dd>
              <p className="text-xs text-muted-foreground">
                Includes the new deposit; excludes any old-deposit refund
              </p>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Overlap rent: {formatMoney(result.overlapCost)}. Assumes flat rent
            for 12 months and a fully refundable new deposit. Utilities,
            insurance, financing costs, and the timing of your old deposit
            refund aren&apos;t included. Update moving costs to include any
            other fees.
          </p>
        </div>
      )}
    </section>
  );
}
