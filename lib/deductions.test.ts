import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateDeduction } from "./deductions.ts";

describe("deduction validation", () => {
  it("trims descriptions and preserves cents and dispute choice", () => {
    assert.deepEqual(
      validateDeduction({
        description: " Counter damage ",
        amount: " 300.10 ",
        disputed: false,
      }),
      {
        ok: true,
        payload: {
          description: "Counter damage",
          amount: 300.1,
          disputed: false,
        },
      },
    );
  });
  it("rejects blank descriptions and invalid, negative, zero or out-of-range amounts", () => {
    for (const amount of [
      "",
      "abc",
      "-1",
      "0",
      "0.00",
      "1.005",
      "Infinity",
      "1e3",
      "100000000",
    ]) {
      const result = validateDeduction({
        description: " ",
        amount,
        disputed: true,
      });
      assert.equal(result.ok, false, amount);
      if (!result.ok) {
        assert.ok(result.errors.description);
        assert.ok(result.errors.amount, amount);
      }
    }
  });
});
