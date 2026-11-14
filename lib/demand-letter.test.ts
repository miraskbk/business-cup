import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateDemandLetter } from "./demand-letter.ts";
import type { Deduction, InspectionItem, Rental } from "./types.ts";

const rental: Rental = {
  id: "rental-1",
  user_id: "user-1",
  address: "412 Oak St, Oakland",
  state: "CA",
  landlord_name: "Bay Property Management",
  landlord_email: "landlord@example.com",
  monthly_rent: 1800,
  deposit_amount: 1800,
  lease_start: "2025-01-05",
  lease_end: "2026-10-14",
  move_out_date: "2026-10-14",
  deposit_returned_at: null,
  created_at: "2025-01-04T10:00:00Z",
};
const deduction = (overrides: Partial<Deduction> = {}): Deduction => ({
  id: "deduction-1",
  user_id: "user-1",
  rental_id: rental.id,
  description: "Counter damage",
  amount: 300,
  disputed: true,
  created_at: "2026-11-10T10:00:00Z",
  ...overrides,
});
const evidence = (overrides: Partial<InspectionItem> = {}): InspectionItem => ({
  id: "evidence-1",
  user_id: "user-1",
  rental_id: rental.id,
  room: "Kitchen",
  item: "Countertop",
  phase: "move_in",
  condition: "good",
  note: "Counter already chipped",
  photo_path: "private/photo.jpg",
  captured_at: "2025-01-05T10:15:00Z",
  ...overrides,
});
const input = {
  rental,
  deductions: [deduction()],
  evidence: [evidence()],
  today: "2026-11-14",
  senderName: " Taylor Renter ",
  forwardingAddress: " 123 Main St\nOakland, CA 94612 ",
  refundedAmount: "1500",
};

function letter(overrides: Partial<typeof input> = {}) {
  const result = generateDemandLetter({ ...input, ...overrides });
  if (!result.ok) assert.fail(JSON.stringify(result.errors));
  return result;
}

describe("demand letter", () => {
  it("uses the real rental, disputed amount, dates, official citation and recorded evidence", () => {
    const result = letter();
    assert.equal(result.amountRequested, 300);
    for (const text of [
      "Bay Property Management",
      "landlord@example.com",
      rental.address,
      "Jan 5, 2025",
      "Oct 14, 2026",
      "Nov 4, 2026",
      "Nov 14, 2026",
      "Counter damage: $300",
      "Cal. Civ. Code § 1950.5",
      "https://www.dre.ca.gov/",
      "Move-in · Kitchen · Countertop",
      "Good",
      "Jan 5, 2025, 10:15 AM UTC",
      "Counter already chipped",
      "Record ID: evidence-1",
      "Photo saved",
      "Taylor Renter",
      "123 Main St\nOakland",
    ]) {
      assert.ok(result.text.includes(text), text);
    }
    assert.ok(
      !result.text.includes("private/photo.jpg"),
      "does not disclose private storage paths",
    );
    assert.ok(
      !/bad faith|penalt|you violated|attached|landlord is late/i.test(
        result.text,
      ),
    );
  });
  it("requests the full unreturned balance when no refund or deductions are recorded", () => {
    assert.equal(
      letter({ deductions: [], refundedAmount: "0" }).amountRequested,
      1800,
    );
  });
  it("subtracts accepted charges and refunds in cents while still disputing contested charges", () => {
    const result = letter({
      deductions: [
        deduction(),
        deduction({
          id: "accepted",
          description: "Cleaning",
          amount: 100.1,
          disputed: false,
        }),
      ],
      refundedAmount: "1399.80",
    });
    assert.equal(result.amountRequested, 300.1);
    assert.ok(result.text.includes("Deductions I accept: $100.10"));
    assert.ok(!result.text.includes("- Cleaning:"));
  });
  it("rejects missing signatures, invalid refunds, future move-outs and resolved deposits", () => {
    const result = generateDemandLetter({
      ...input,
      senderName: " ",
      forwardingAddress: "",
      refundedAmount: "-1",
      rental: { ...rental, move_out_date: "2026-12-01" },
    });
    assert.equal(result.ok, false);
    if (!result.ok)
      for (const field of [
        "senderName",
        "forwardingAddress",
        "refundedAmount",
        "rental",
      ] as const)
        assert.ok(result.errors[field]);
    assert.equal(
      generateDemandLetter({
        ...input,
        rental: { ...rental, deposit_returned_at: "2026-11-01" },
      }).ok,
      false,
    );
    assert.equal(
      generateDemandLetter({
        ...input,
        rental: { ...rental, move_out_date: null },
      }).ok,
      false,
    );
    for (const refundedAmount of ["", "Infinity", "1e3", "0.001", "1800.01"]) {
      assert.equal(
        generateDemandLetter({ ...input, refundedAmount }).ok,
        false,
        refundedAmount,
      );
    }
  });
  it("refuses payment demands with no balance left", () => {
    assert.equal(
      generateDemandLetter({ ...input, refundedAmount: "1800" }).ok,
      false,
    );
    assert.equal(
      generateDemandLetter({
        ...input,
        deductions: [deduction({ disputed: false })],
      }).ok,
      false,
    );
  });
  it("does not invent unsupported state laws or claim future deadlines have passed", () => {
    const unsupported = letter({ rental: { ...rental, state: "WY" } }).text;
    assert.ok(!/Official source|standard \d+-day|§/.test(unsupported));
    const upcoming = letter({ today: "2026-10-20" }).text;
    assert.ok(upcoming.includes("ends on Nov 4, 2026"));
    assert.ok(!upcoming.includes("ended on"));
  });
  it("preserves Texas forwarding-address and Florida two-clock qualifications", () => {
    const texas = letter({ rental: { ...rental, state: "TX" } }).text;
    assert.ok(texas.includes("30 days after surrender"));
    assert.ok(texas.includes("written forwarding address provided below"));
    assert.ok(!texas.includes("ended on"));
    const florida = letter({ rental: { ...rental, state: "FL" } }).text;
    assert.ok(florida.includes("15 days after the lease ends"));
    assert.ok(florida.includes("30 days to send written notice"));
    assert.ok(florida.includes("required tenant notice"));
  });
  it("includes both phases in timestamp order, excludes other rentals, and never invents missing photos", () => {
    const after = evidence({
      id: "evidence-2",
      phase: "move_out",
      captured_at: "2026-10-14T11:00:00Z",
      photo_path: null,
    });
    const rows = [
      after,
      evidence(),
      evidence({ rental_id: "someone-else", note: "PRIVATE OTHER RENTAL" }),
    ];
    const result = letter({
      evidence: rows,
      deductions: [
        deduction(),
        deduction({ rental_id: "someone-else", amount: 5000, disputed: false }),
      ],
    });
    assert.equal(result.amountRequested, 300);
    assert.equal(result.evidence.length, 2);
    assert.ok(
      result.text.indexOf("1. Move-in") < result.text.indexOf("2. Move-out"),
    );
    assert.ok(result.text.includes("No photo saved with this record."));
    assert.ok(!result.text.includes("PRIVATE OTHER RENTAL"));
    assert.equal(rows[0], after, "input order remains unchanged");
    assert.ok(!letter({ evidence: [] }).text.includes("records listed below"));
    assert.ok(
      !letter({ evidence: [] }).text.includes("CONDITION EVIDENCE INDEX"),
    );
  });
});
