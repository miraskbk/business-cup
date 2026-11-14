import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_EVENT, eventStatus, validateEvent } from "./lease-log.ts";
import type { LeaseEventKind } from "./types.ts";

describe("lease events", () => {
  it("validates and trims an event without losing its kind or due date", () => {
    assert.deepEqual(
      validateEvent({
        ...EMPTY_EVENT,
        kind: "landlord_promise",
        title: " Repair faucet ",
        details: " By Friday ",
        due_date: "2028-02-29",
        resolved: true,
      }),
      {
        ok: true,
        payload: {
          kind: "landlord_promise",
          title: "Repair faucet",
          details: "By Friday",
          due_date: "2028-02-29",
          resolved: true,
        },
      },
    );
    const noDate = validateEvent({ ...EMPTY_EVENT, title: "Paid rent" });
    assert.ok(noDate.ok);
    assert.equal(noDate.payload.due_date, null);
    assert.equal(noDate.payload.details, null);
  });
  it("rejects empty titles, unknown kinds and impossible dates", () => {
    const result = validateEvent({
      ...EMPTY_EVENT,
      title: " ",
      kind: "bad" as LeaseEventKind,
      due_date: "2026-02-30",
    });
    assert.equal(result.ok, false);
    if (!result.ok)
      for (const field of ["title", "kind", "due_date"] as const)
        assert.ok(result.errors[field]);
    assert.equal(
      validateEvent({ ...EMPTY_EVENT, title: "A".repeat(201) }).ok,
      false,
    );
    assert.equal(
      validateEvent({ ...EMPTY_EVENT, title: "Valid", due_date: "not a date" })
        .ok,
      false,
    );
  });
  it("flags deadlines using calendar dates and lets resolved events override overdue dates", () => {
    assert.equal(
      eventStatus({ resolved: false, due_date: null }, "2026-11-14"),
      "open",
    );
    assert.equal(
      eventStatus({ resolved: false, due_date: "2026-11-15" }, "2026-11-14"),
      "open",
    );
    assert.equal(
      eventStatus({ resolved: false, due_date: "2026-11-14" }, "2026-11-14"),
      "due_today",
    );
    assert.equal(
      eventStatus({ resolved: false, due_date: "2026-11-13" }, "2026-11-14"),
      "overdue",
    );
    assert.equal(
      eventStatus({ resolved: true, due_date: "2026-11-13" }, "2026-11-14"),
      "resolved",
    );
  });
});
