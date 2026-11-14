"use client";

import { useState } from "react";
import {
  calculateRenewal,
  validateRenewalDraft,
  type RenewalDraft,
  type RenewalInput,
} from "@/lib/renewal";
import { formatMoney } from "@/lib/format";
import { SAMPLE_RENEWAL } from "@/lib/sample-apartment";
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
    if (rental.is_sample) return SAMPLE_RENEWAL;
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

  function field(key: keyof RenewalInput) {
    const { label, help } = FIELDS.find((entry) => entry.key === key)!;
    const error =
      !validated.ok && draft[key] !== "" ? validated.errors[key] : undefined;
    return (
      <div
        key={key}
        className={`flex flex-col gap-2 ${key === "overlapDays" ? "sm:col-span-2" : ""}`}
      >
        <Label htmlFor={`renewal-${key}`} className="text-xs leading-5">
          {label}
        </Label>
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
          className="bg-background/40 tabular-nums"
        />
        {help && (
          <p
            id={`renewal-${key}-help`}
            className="text-[11px] leading-4 text-muted-foreground"
          >
            {help}
          </p>
        )}
        {error && (
          <p id={`renewal-${key}-error`} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-1.5">
        <p className="page-eyebrow">03 / Renewal</p>
        <h2 className="text-2xl font-medium tracking-tight">
          What does your next year cost?
        </h2>
        <p className="text-sm text-muted-foreground">
          Compare a renewal offer with negotiating or moving. Adjust the
          estimates below.
          {rental.is_sample && " These starting numbers are fictional."}
        </p>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {!result ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Complete the amounts below to see your comparison.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.key}
                data-renewal-plan={plan.key}
                className="rounded-xl border bg-card p-5"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {plan.label}
                </p>
                <p className="mt-3 text-[28px] font-medium tracking-tight text-primary tabular-nums">
                  {formatMoney(plan.amount)}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  {plan.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="space-y-5 rounded-xl border bg-card p-5">
          <div>
            <h3 className="text-sm font-semibold">Monthly rent</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Compare the offer with your alternatives.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                "currentRent",
                "proposedRent",
                "negotiatedRent",
                "comparableRent",
              ] as const
            ).map(field)}
          </div>
        </section>
        <section className="space-y-5 rounded-xl border bg-card p-5">
          <div>
            <h3 className="text-sm font-semibold">The cost of moving</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Include the expenses that are easy to overlook.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {(["movingCosts", "newDeposit", "overlapDays"] as const).map(field)}
          </div>
        </section>
      </div>
      {result && (
        <>
          <div
            className="grid gap-6 rounded-xl bg-secondary/55 p-5 text-sm lg:grid-cols-[1.1fr_1fr]"
            data-renewal-break-even
          >
            <div>
              <p className="font-semibold">
                {result.breakEvenMonths === null
                  ? "Moving doesn't lower the monthly rent"
                  : result.breakEvenMonths === 0
                    ? "No moving costs to recover"
                    : `Moving breaks even in ${result.breakEvenMonths} ${result.breakEvenMonths === 1 ? "month" : "months"}`}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {result.monthlySavingsVsStay > 0
                  ? `${formatMoney(result.monthlySavingsVsStay)} lower monthly rent compared with accepting renewal covers ${formatMoney(result.oneTimeMovingCost)} in moving and overlap costs.`
                  : "Moving costs won't be recovered through lower rent compared with this renewal offer."}
                {result.breakEvenMonths !== null &&
                  result.breakEvenMonths > 12 &&
                  " Break-even falls beyond this 12-month comparison."}
              </p>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Negotiating to your target would{" "}
              {result.negotiateSavingsVsStay >= 0 ? "save" : "cost an extra"}{" "}
              <span className="font-medium text-foreground">
                {formatMoney(Math.abs(result.negotiateSavingsVsStay))}
              </span>{" "}
              over 12 months compared with the renewal offer. Your landlord
              would need to agree to that rent.
            </p>
          </div>
          <details className="group rounded-xl border bg-card">
            <summary className="px-5 py-4 text-sm font-medium">
              Cash needed &amp; assumptions{" "}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Refundable deposits are cash tied up, not an expense.
              </span>
            </summary>
            <div className="space-y-4 border-t p-5">
              <dl className="grid gap-5 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Cash needed to move
                  </dt>
                  <dd className="mt-2 text-xl font-medium" data-renewal-upfront>
                    {formatMoney(result.upfrontMoveCash)}
                  </dd>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    First month + deposit + moving + overlap
                  </p>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Refundable new deposit
                  </dt>
                  <dd className="mt-2 text-xl font-medium">
                    {formatMoney(result.newDeposit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    12-month cash outflow if you move
                  </dt>
                  <dd className="mt-2 text-xl font-medium">
                    {formatMoney(result.moveCashOver12Months)}
                  </dd>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Includes the new deposit, before any old-deposit refund
                  </p>
                </div>
              </dl>
              <p className="text-[11px] leading-5 text-muted-foreground">
                Overlap rent: {formatMoney(result.overlapCost)}, using current
                rent divided by 30. Assumes flat rent for 12 months and a fully
                refundable new deposit. Utilities, insurance, financing costs,
                and the timing of your old deposit refund aren&apos;t included. Add
                other fees to moving costs.
              </p>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
