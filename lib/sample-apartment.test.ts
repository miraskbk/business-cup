import assert from "node:assert/strict";
import { it } from "node:test";
import { buildSampleApartment } from "./sample-apartment.ts";
import { daysBetween, isLate } from "./deposit-rules.ts";
import { buildComparison, PRESET_ROOMS } from "./inspection.ts";

it("seeds a complete move-in, matching counter photos, real deductions and a relative 31-day clock", () => {
  let sequence = 0;
  const data = buildSampleApartment(
    "owner",
    "2026-11-14",
    () => `id-${++sequence}`,
  );
  const before = data.items.filter((row) => row.phase === "move_in");
  assert.equal(
    before.length,
    PRESET_ROOMS.reduce((n, room) => n + room.items.length, 0),
  );
  assert.equal(daysBetween(data.rental.move_out_date, "2026-11-14"), 31);
  assert.equal(isLate(data.rental, "2026-11-14"), true);
  assert.equal(data.deductions[0].amount, 300);
  assert.equal(data.deductions[0].disputed, true);
  const photos = data.items.filter((row) => row.photo_path);
  assert.equal(photos.length, 2);
  assert.ok(
    photos.every((row) =>
      row.photo_path!.startsWith(`owner/${data.rental.id}/`),
    ),
  );
  assert.ok(before.every((row) => row.captured_at.startsWith("2025-01-05")));
  const allIds = [
    data.rental.id,
    ...data.items.map((row) => row.id),
    ...data.events.map((row) => row.id),
    ...data.deductions.map((row) => row.id),
  ];
  assert.equal(new Set(allIds).size, allIds.length);
  const comparison = buildComparison(
    data.items.map((row) => ({
      ...row,
      rental_id: data.rental.id,
      user_id: "owner",
    })),
  );
  assert.equal(comparison[0].lines[0].moveIn.length, 1);
  assert.equal(comparison[0].lines[0].moveOut.length, 1);
});

it("uses the next visitor's own date and path prefix", () => {
  const first = buildSampleApartment("one", "2026-11-14", () => "first");
  const next = buildSampleApartment("two", "2026-11-15", () => "second");
  assert.equal(
    daysBetween(first.rental.move_out_date, next.rental.move_out_date),
    1,
  );
  assert.ok(
    next.items
      .find((row) => row.photo_path)!
      .photo_path!.startsWith("two/second/"),
  );
});
