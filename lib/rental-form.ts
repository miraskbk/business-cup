import type { Rental } from "./types.ts";
import { US_STATES } from "./us-states.ts";

/** What the rental form holds while the user types: every field is a string. */
export type RentalDraft = {
  address: string;
  state: string;
  landlord_name: string;
  landlord_email: string;
  monthly_rent: string;
  deposit_amount: string;
  lease_start: string;
  lease_end: string;
  move_out_date: string;
};

/** What gets written to the `rentals` table. */
export type RentalPayload = Omit<
  Rental,
  "id" | "user_id" | "created_at" | "deposit_returned_at"
>;

export type RentalErrors = Partial<Record<keyof RentalDraft, string>>;

export const emptyRentalDraft: RentalDraft = {
  address: "",
  state: "",
  landlord_name: "",
  landlord_email: "",
  monthly_rent: "",
  deposit_amount: "",
  lease_start: "",
  lease_end: "",
  move_out_date: "",
};

export function draftFromRental(rental: Rental): RentalDraft {
  return {
    address: rental.address,
    state: rental.state,
    landlord_name: rental.landlord_name ?? "",
    landlord_email: rental.landlord_email ?? "",
    monthly_rent: rental.monthly_rent?.toString() ?? "",
    deposit_amount: rental.deposit_amount.toString(),
    lease_start: rental.lease_start ?? "",
    lease_end: rental.lease_end ?? "",
    move_out_date: rental.move_out_date ?? "",
  };
}

// numeric(10,2) holds up to 99,999,999.99
const MAX_AMOUNT = 99_999_999.99;
const MONEY = /^\d+(\.\d{1,2})?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseMoney(raw: string): number | null {
  const value = raw.trim().replace(/[$,]/g, "");
  if (!MONEY.test(value)) return null;
  const amount = Number(value);
  return amount <= MAX_AMOUNT ? amount : null;
}

/**
 * Checks a draft and, when it is valid, returns the row to save.
 * Pure: no I/O, so it can be unit-tested and reused for create and edit.
 */
export function validateRentalDraft(
  draft: RentalDraft,
): { ok: true; payload: RentalPayload } | { ok: false; errors: RentalErrors } {
  const errors: RentalErrors = {};

  const address = draft.address.trim();
  if (!address) errors.address = "Enter the rental's address.";

  if (!US_STATES.some((s) => s.code === draft.state)) {
    errors.state = "Choose a state.";
  }

  const deposit = parseMoney(draft.deposit_amount);
  if (!draft.deposit_amount.trim()) {
    errors.deposit_amount = "Enter the deposit you paid.";
  } else if (deposit === null || deposit <= 0) {
    errors.deposit_amount = "Enter an amount like 1800 or 1800.50.";
  }

  let rent: number | null = null;
  if (draft.monthly_rent.trim()) {
    rent = parseMoney(draft.monthly_rent);
    if (rent === null) {
      errors.monthly_rent = "Enter an amount like 1800 or 1800.50.";
    }
  }

  const email = draft.landlord_email.trim();
  if (email && !EMAIL.test(email)) {
    errors.landlord_email = "Enter an email like name@example.com.";
  }

  if (
    draft.lease_start &&
    draft.lease_end &&
    draft.lease_end < draft.lease_start
  ) {
    errors.lease_end = "Lease end can't be before lease start.";
  }

  if (
    draft.lease_start &&
    draft.move_out_date &&
    draft.move_out_date < draft.lease_start
  ) {
    errors.move_out_date = "Move-out can't be before lease start.";
  }

  if (Object.keys(errors).length > 0 || deposit === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      address,
      state: draft.state,
      landlord_name: draft.landlord_name.trim() || null,
      landlord_email: email || null,
      monthly_rent: rent,
      deposit_amount: deposit,
      lease_start: draft.lease_start || null,
      lease_end: draft.lease_end || null,
      move_out_date: draft.move_out_date || null,
    },
  };
}
