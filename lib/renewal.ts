export type RenewalInput = {
  currentRent: number;
  proposedRent: number;
  comparableRent: number;
  negotiatedRent: number;
  movingCosts: number;
  newDeposit: number;
  overlapDays: number;
};
export type RenewalDraft = Record<keyof RenewalInput, string>;
export type RenewalErrors = Partial<Record<keyof RenewalInput, string>>;

export function validateRenewalDraft(
  draft: RenewalDraft,
): { ok: true; input: RenewalInput } | { ok: false; errors: RenewalErrors } {
  const errors: RenewalErrors = {};
  const input = {} as RenewalInput;
  for (const key of Object.keys(draft) as (keyof RenewalInput)[]) {
    const raw = draft[key].trim().replace(/[$,]/g, "");
    const value = Number(raw);
    if (key === "overlapDays") {
      if (
        !/^\d+$/.test(raw) ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > 365
      )
        errors[key] = "Enter whole days from 0 to 365.";
    } else if (
      !/^\d+(\.\d{1,2})?$/.test(raw) ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 99_999_999.99
    ) {
      errors[key] = "Enter $0 or more, with up to two decimal places.";
    }
    input[key] = value;
  }
  return Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, input };
}

/**
 * Twelve-month rent plus nonrefundable moving/overlap costs. The new deposit
 * is refundable cash tied up, not an expense. Overlap uses a 30-day month.
 */
export function calculateRenewal(input: RenewalInput) {
  for (const value of Object.values(input)) {
    if (!Number.isFinite(value) || value < 0 || value > 99_999_999.99)
      throw new RangeError(
        "Renewal inputs must be finite nonnegative amounts.",
      );
  }
  if (!Number.isInteger(input.overlapDays) || input.overlapDays > 365)
    throw new RangeError("Overlap must be whole days from 0 to 365.");
  const cents = (amount: number) => Math.round(amount * 100);
  const current = cents(input.currentRent);
  const proposed = cents(input.proposedRent);
  const comparable = cents(input.comparableRent);
  const negotiated = cents(input.negotiatedRent);
  const moving = cents(input.movingCosts);
  const deposit = cents(input.newDeposit);
  const overlap = Math.round((current * input.overlapDays) / 30);
  const oneTime = moving + overlap;
  const savings = proposed - comparable;
  return {
    stayCost: (proposed * 12) / 100,
    negotiateCost: (negotiated * 12) / 100,
    moveCost: (comparable * 12 + oneTime) / 100,
    overlapCost: overlap / 100,
    oneTimeMovingCost: oneTime / 100,
    newDeposit: deposit / 100,
    moveCashOver12Months: (comparable * 12 + oneTime + deposit) / 100,
    upfrontMoveCash: (comparable + oneTime + deposit) / 100,
    monthlySavingsVsStay: savings / 100,
    breakEvenMonths: savings > 0 ? Math.ceil(oneTime / savings) : null,
    negotiateSavingsVsStay: ((proposed - negotiated) * 12) / 100,
  };
}
