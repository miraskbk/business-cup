import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateRenewal, validateRenewalDraft } from "./renewal.ts";

const input = {
  currentRent: 1800,
  proposedRent: 1950,
  negotiatedRent: 1850,
  comparableRent: 1700,
  movingCosts: 1200,
  newDeposit: 1700,
  overlapDays: 10,
};

describe("renewal comparison", () => {
  it("compares 12-month expenses and refundable cash separately", () => {
    const result = calculateRenewal(input);
    assert.equal(result.stayCost, 23400);
    assert.equal(result.negotiateCost, 22200);
    assert.equal(result.overlapCost, 600);
    assert.equal(result.moveCost, 22200);
    assert.equal(result.moveCashOver12Months, 23900);
    assert.equal(result.upfrontMoveCash, 5200);
    assert.equal(result.monthlySavingsVsStay, 250);
    assert.equal(result.breakEvenMonths, 8);
    assert.equal(result.negotiateSavingsVsStay, 1200);
    const higherDeposit = calculateRenewal({ ...input, newDeposit: 5000 });
    assert.equal(higherDeposit.moveCost, result.moveCost);
    assert.equal(higherDeposit.breakEvenMonths, result.breakEvenMonths);
    assert.equal(higherDeposit.upfrontMoveCash, 8500);
  });
  it("does not promise a break-even without lower rent, and handles no moving costs", () => {
    assert.equal(
      calculateRenewal({ ...input, comparableRent: 1950 }).breakEvenMonths,
      null,
    );
    assert.equal(
      calculateRenewal({ ...input, comparableRent: 2000 }).breakEvenMonths,
      null,
    );
    assert.equal(
      calculateRenewal({ ...input, movingCosts: 0, overlapDays: 0 })
        .breakEvenMonths,
      0,
    );
    assert.equal(
      calculateRenewal({ ...input, movingCosts: 6000 }).breakEvenMonths,
      27,
    );
  });
  it("rounds fractional overlap to cents and rejects invalid direct inputs", () => {
    assert.equal(
      calculateRenewal({ ...input, currentRent: 1000.01, overlapDays: 1 })
        .overlapCost,
      33.33,
    );
    for (const bad of [-1, Infinity, NaN])
      assert.throws(
        () => calculateRenewal({ ...input, newDeposit: bad }),
        RangeError,
      );
    assert.throws(
      () => calculateRenewal({ ...input, overlapDays: 1.5 }),
      RangeError,
    );
    assert.throws(
      () => calculateRenewal({ ...input, overlapDays: 366 }),
      RangeError,
    );
  });
  it("validates monetary text and integer overlap before calculating", () => {
    const draft = Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, String(value)]),
    ) as Record<keyof typeof input, string>;
    assert.deepEqual(
      validateRenewalDraft({ ...draft, currentRent: "$1,800.00" }),
      { ok: true, input },
    );
    for (const raw of ["", "-1", "1e3", "0.001", "Infinity"])
      assert.equal(
        validateRenewalDraft({ ...draft, movingCosts: raw }).ok,
        false,
      );
    assert.equal(
      validateRenewalDraft({ ...draft, overlapDays: "2.5" }).ok,
      false,
    );
    assert.equal(
      validateRenewalDraft({ ...draft, movingCosts: "0", overlapDays: "0" }).ok,
      true,
    );
  });
});
