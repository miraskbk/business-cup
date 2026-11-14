import { parseMoney } from "./money.ts";

export type DeductionDraft = {
  description: string;
  amount: string;
  disputed: boolean;
};
export type DeductionErrors = Partial<Record<"description" | "amount", string>>;

export function validateDeduction(
  draft: DeductionDraft,
):
  | {
      ok: true;
      payload: { description: string; amount: number; disputed: boolean };
    }
  | { ok: false; errors: DeductionErrors } {
  const errors: DeductionErrors = {};
  const description = draft.description.trim();
  const amount = parseMoney(draft.amount);
  if (!description) errors.description = "Describe the deduction.";
  if (amount === null || amount <= 0) {
    errors.amount = "Enter an amount above $0 with up to two decimal places.";
  }
  return amount === null || Object.keys(errors).length
    ? { ok: false, errors }
    : { ok: true, payload: { description, amount, disputed: draft.disputed } };
}
