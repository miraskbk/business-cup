import assert from "node:assert/strict";
import { it } from "node:test";
import { rentalStatus } from "./rental-status.ts";

it("stops overdue status for a returned deposit and restores it when reopened", () => {
  const rental = {
    state: "CA",
    move_out_date: "2026-10-14",
    deposit_returned_at: "2026-11-12",
  };
  assert.equal(rentalStatus(rental, "2026-11-14"), "deposit_returned");
  assert.equal(
    rentalStatus({ ...rental, deposit_returned_at: null }, "2026-11-14"),
    "deposit_overdue",
  );
});
