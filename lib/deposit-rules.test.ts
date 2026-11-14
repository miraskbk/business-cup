import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEPOSIT_RULES,
  addDays,
  amountAtRisk,
  daysBetween,
  daysRemaining,
  deadlineFor,
  disputedTotal,
  isLate,
  ruleFor,
} from "./deposit-rules.ts";
import { US_STATES } from "./us-states.ts";

describe("DEPOSIT_RULES", () => {
  it("has one complete, sourced entry per state", () => {
    const states = DEPOSIT_RULES.map((rule) => rule.state);
    assert.equal(new Set(states).size, states.length);

    for (const rule of DEPOSIT_RULES) {
      assert.ok(
        US_STATES.some((state) => state.code === rule.state),
        `${rule.state} is a US state code`,
      );
      assert.ok(
        Number.isInteger(rule.returnDeadlineDays) && rule.returnDeadlineDays > 0,
        `${rule.state} deadline is a positive whole number of days`,
      );
      assert.match(rule.sourceUrl, /^https?:\/\/[^/]+\.(gov|us)\//, rule.state);
      assert.match(rule.verifiedOn, /^\d{4}-\d{2}-\d{2}$/, rule.state);
      for (const text of [
        rule.deadlineSummary,
        rule.penaltySummary,
        rule.statuteCitation,
        rule.sourceName,
      ]) {
        assert.ok(text.trim().length > 0, `${rule.state} has no empty text`);
      }
    }
  });

  it("states the verified deadlines", () => {
    assert.equal(ruleFor("CA")?.returnDeadlineDays, 21);
    assert.equal(ruleFor("NY")?.returnDeadlineDays, 14);
    assert.equal(ruleFor("TX")?.returnDeadlineDays, 30);
    assert.equal(ruleFor("FL")?.returnDeadlineDays, 30);
  });

  it("has no rule for states that are not verified yet", () => {
    assert.equal(ruleFor("WY"), null);
    assert.equal(ruleFor(""), null);
  });
});

describe("date helpers", () => {
  it("adds days across month, year and leap-day boundaries", () => {
    assert.equal(addDays("2026-10-14", 21), "2026-11-04");
    assert.equal(addDays("2026-12-20", 14), "2027-01-03");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addDays("2026-03-07", 30), "2026-04-06"); // spans a DST change
  });

  it("counts whole days in either direction", () => {
    assert.equal(daysBetween("2026-10-14", "2026-11-14"), 31);
    assert.equal(daysBetween("2026-11-14", "2026-10-14"), -31);
    assert.equal(daysBetween("2026-11-14", "2026-11-14"), 0);
  });
});

describe("deadlineFor / daysRemaining / isLate", () => {
  const oakland = { state: "CA", move_out_date: "2026-10-14" };

  it("is the move-out date plus the state's deadline", () => {
    assert.equal(deadlineFor(oakland), "2026-11-04");
    assert.equal(
      deadlineFor({ state: "NY", move_out_date: "2026-10-14" }),
      "2026-10-28",
    );
  });

  it("has no deadline before move-out or without a verified rule", () => {
    assert.equal(deadlineFor({ state: "CA", move_out_date: null }), null);
    assert.equal(
      deadlineFor({ state: "WY", move_out_date: "2026-10-14" }),
      null,
    );
    assert.equal(daysRemaining({ state: "CA", move_out_date: null }, "2026-11-14"), null);
    assert.equal(isLate({ state: "WY", move_out_date: "2020-01-01" }, "2026-11-14"), false);
  });

  it("counts down to zero on the deadline day, which is not yet late", () => {
    assert.equal(daysRemaining(oakland, "2026-10-14"), 21);
    assert.equal(daysRemaining(oakland, "2026-11-03"), 1);
    assert.equal(daysRemaining(oakland, "2026-11-04"), 0);
    assert.equal(isLate(oakland, "2026-11-04"), false);
  });

  it("is late from the day after the deadline", () => {
    assert.equal(daysRemaining(oakland, "2026-11-05"), -1);
    assert.equal(isLate(oakland, "2026-11-05"), true);
    // Day 31 after move-out, as in the demo: 10 days past California's 21.
    assert.equal(daysRemaining(oakland, "2026-11-14"), -10);
  });
});

describe("disputedTotal / amountAtRisk", () => {
  const deductions = [
    { amount: 300, disputed: true },
    { amount: 120.1, disputed: true },
    { amount: 75.2, disputed: false },
  ];

  it("sums only the deductions the renter disputes, without float drift", () => {
    assert.equal(disputedTotal(deductions), 420.1);
    assert.equal(
      disputedTotal([
        { amount: 0.1, disputed: true },
        { amount: 0.2, disputed: true },
      ]),
      0.3,
    );
    assert.equal(disputedTotal([]), 0);
  });

  it("puts every deduction at risk, capped at the deposit", () => {
    assert.equal(amountAtRisk({ deposit_amount: 1800 }, deductions), 495.3);
    assert.equal(amountAtRisk({ deposit_amount: 400 }, deductions), 400);
  });

  it("treats the whole deposit as at risk before any deduction is recorded", () => {
    assert.equal(amountAtRisk({ deposit_amount: 1800 }, []), 1800);
  });
});
