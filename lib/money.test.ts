import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateDeduction } from "./deductions.ts";
import { formatDays } from "./format.ts";
import { parseMoney } from "./money.ts";
import { calculateRenewal, validateRenewalDraft } from "./renewal.ts";
import { SAMPLE_RENEWAL } from "./sample-apartment.ts";

describe("parseMoney", () => {
  it("reads plain amounts and ones typed with a dollar sign or commas", () => {
    assert.equal(parseMoney("300"), 300);
    assert.equal(parseMoney(" $300 "), 300);
    assert.equal(parseMoney("1,200.50"), 1200.5);
    assert.equal(parseMoney("$99,999,999.99"), 99_999_999.99);
  });

  it("rejects anything that isn't dollars and cents", () => {
    for (const raw of ["", "$", "abc", "-1", "1.005", "1e3", "Infinity"]) {
      assert.equal(parseMoney(raw), null, raw);
    }
    assert.equal(parseMoney("100000000"), null);
  });
});

describe("amount fields outside the rental form", () => {
  it("accepts a deduction typed as $1,200", () => {
    const result = validateDeduction({
      description: "Carpet",
      amount: "$1,200",
      disputed: true,
    });
    assert.equal(result.ok && result.payload.amount, 1200);
  });
});

describe("formatDays", () => {
  it("uses the singular for exactly one day", () => {
    assert.equal(formatDays(1), "1 day");
    assert.equal(formatDays(0), "0 days");
    assert.equal(formatDays(10), "10 days");
  });
});

describe("sample renewal numbers", () => {
  it("are valid and give three different 12-month totals", () => {
    const validated = validateRenewalDraft(SAMPLE_RENEWAL);
    assert.ok(validated.ok);
    const result = calculateRenewal(validated.input);
    assert.equal(result.stayCost, 23_400);
    assert.equal(result.negotiateCost, 22_500);
    assert.equal(result.moveCost, 22_820);
    assert.equal(result.breakEvenMonths, 10);
  });
});
