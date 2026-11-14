import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDate, formatMoney, todayISO } from "./format.ts";
import { emptyRentalDraft, validateRentalDraft } from "./rental-form.ts";
import { rentalStatus } from "./rental-status.ts";

const validDraft = {
  ...emptyRentalDraft,
  address: " 412 Oak St ",
  state: "CA",
  deposit_amount: "1,800.50",
};

describe("validateRentalDraft", () => {
  it("accepts the required fields and normalises them", () => {
    const result = validateRentalDraft(validDraft);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.payload.address, "412 Oak St");
    assert.equal(result.payload.deposit_amount, 1800.5);
    assert.equal(result.payload.monthly_rent, null);
    assert.equal(result.payload.lease_start, null);
    assert.equal(result.payload.landlord_email, null);
  });

  it("reports every missing required field", () => {
    const result = validateRentalDraft(emptyRentalDraft);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(Object.keys(result.errors).sort(), [
      "address",
      "deposit_amount",
      "state",
    ]);
  });

  it("rejects deposits that are not a positive amount in dollars and cents", () => {
    for (const deposit_amount of ["0", "-5", "abc", "12.345", "100000000"]) {
      const result = validateRentalDraft({ ...validDraft, deposit_amount });
      assert.equal(result.ok, false, `deposit "${deposit_amount}"`);
    }
  });

  it("rejects an unknown state, a malformed email and a malformed rent", () => {
    assert.equal(validateRentalDraft({ ...validDraft, state: "ZZ" }).ok, false);
    assert.equal(
      validateRentalDraft({ ...validDraft, landlord_email: "nope" }).ok,
      false,
    );
    assert.equal(
      validateRentalDraft({ ...validDraft, monthly_rent: "x" }).ok,
      false,
    );
  });

  it("rejects dates that come before the lease start", () => {
    const lease_start = "2025-02-01";
    assert.equal(
      validateRentalDraft({ ...validDraft, lease_start, lease_end: "2025-01-01" })
        .ok,
      false,
    );
    assert.equal(
      validateRentalDraft({
        ...validDraft,
        lease_start,
        move_out_date: "2025-01-01",
      }).ok,
      false,
    );
  });
});

describe("rentalStatus", () => {
  const today = "2026-11-14";
  const rental = (state: string, move_out_date: string | null) => ({
    state,
    move_out_date,
  });

  it("is active with no move-out date or one in the future", () => {
    assert.equal(rentalStatus(rental("CA", null), today), "active");
    assert.equal(rentalStatus(rental("CA", "2026-12-01"), today), "active");
  });

  it("is moved out from the move-out date until the state deadline passes", () => {
    assert.equal(rentalStatus(rental("CA", today), today), "moved_out");
    // California allows 21 days: Oct 24 + 21 = Nov 14, the deadline day itself.
    assert.equal(rentalStatus(rental("CA", "2026-10-24"), today), "moved_out");
  });

  it("is overdue the day after the state deadline", () => {
    assert.equal(
      rentalStatus(rental("CA", "2026-10-23"), today),
      "deposit_overdue",
    );
  });

  it("never reports overdue for a state without a verified rule", () => {
    assert.equal(rentalStatus(rental("WY", "2020-01-01"), today), "moved_out");
  });
});

describe("format", () => {
  it("formats a calendar date without shifting it across time zones", () => {
    assert.equal(formatDate("2025-01-05"), "Jan 5, 2025");
    assert.equal(formatDate("2024-12-31"), "Dec 31, 2024");
  });

  it("drops cents only for whole amounts", () => {
    assert.equal(formatMoney(1800), "$1,800");
    assert.equal(formatMoney(1800.5), "$1,800.50");
  });

  it("returns the local calendar date", () => {
    assert.equal(todayISO(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
  });
});
