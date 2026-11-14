import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDateTime } from "./format.ts";
import {
  PRESET_ROOMS,
  buildChecklist,
  buildComparison,
  checklistProgress,
  evidencePhotoPath,
} from "./inspection.ts";
import type { InspectionItem } from "./types.ts";

let nextId = 0;
function entry(overrides: Partial<InspectionItem>): InspectionItem {
  nextId += 1;
  return {
    id: `item-${nextId}`,
    user_id: "user-1",
    rental_id: "rental-1",
    room: "Kitchen",
    item: "Countertop",
    phase: "move_in",
    condition: "good",
    note: null,
    photo_path: null,
    captured_at: `2025-01-05T10:00:${String(nextId).padStart(2, "0")}Z`,
    ...overrides,
  };
}

const presetTotal = PRESET_ROOMS.reduce((n, room) => n + room.items.length, 0);

describe("buildComparison", () => {
  it("pairs both phases case-insensitively, with presets first", () => {
    const before = entry({ room: " kitchen ", item: "COUNTERTOP" });
    const after = entry({ phase: "move_out" });
    const line = buildComparison([after, before])[0].lines[0];
    assert.deepEqual(line, {
      room: "Kitchen",
      item: "Countertop",
      moveIn: [before],
      moveOut: [after],
    });
  });
  it("keeps unmatched custom items and every repeated recording without duplicating pairs", () => {
    const first = entry({ room: "Garage", item: "Door" });
    const second = entry({ room: "garage", item: "door" });
    const outOnly = entry({
      room: "Garage",
      item: "Window",
      phase: "move_out",
    });
    const input = [second, outOnly, first];
    const lines = buildComparison(input).at(-1)!.lines;
    assert.deepEqual(lines[0].moveIn, [first, second]);
    assert.deepEqual(lines[0].moveOut, []);
    assert.deepEqual(lines[1].moveOut, [outOnly]);
    assert.deepEqual(lines[1].moveIn, []);
    assert.deepEqual(input, [second, outOnly, first], "does not mutate input");
  });
});

describe("buildChecklist", () => {
  it("lists every preset item as to-do when nothing is recorded", () => {
    const rooms = buildChecklist([], "move_in");
    assert.deepEqual(
      rooms.map((room) => room.room),
      PRESET_ROOMS.map((room) => room.room),
    );
    assert.deepEqual(checklistProgress(rooms), {
      recorded: 0,
      total: presetTotal,
    });
  });

  it("attaches a recorded entry to its preset line, ignoring case", () => {
    const recorded = entry({ room: "kitchen", item: "COUNTERTOP" });
    const kitchen = buildChecklist([recorded], "move_in")[0];
    assert.equal(kitchen.lines[0].item, "Countertop");
    assert.equal(kitchen.lines[0].entry, recorded);
    assert.equal(kitchen.lines.length, PRESET_ROOMS[0].items.length);
  });

  it("only includes entries from the requested phase", () => {
    const rooms = buildChecklist([entry({ phase: "move_out" })], "move_in");
    assert.equal(checklistProgress(rooms).recorded, 0);
  });

  it("puts custom items after the presets in their room", () => {
    const custom = entry({ item: "Ceiling fan" });
    const kitchen = buildChecklist([custom], "move_in")[0];
    assert.equal(kitchen.lines.at(-1)?.entry, custom);
    assert.equal(kitchen.lines.length, PRESET_ROOMS[0].items.length + 1);
  });

  it("appends rooms that are not in the presets", () => {
    const rooms = buildChecklist(
      [entry({ room: "Garage", item: "Door" })],
      "move_in",
    );
    assert.equal(rooms.at(-1)?.room, "Garage");
    assert.equal(rooms.length, PRESET_ROOMS.length + 1);
  });

  it("gives each recording its own line when an item is recorded twice", () => {
    const first = entry({});
    const second = entry({});
    const kitchen = buildChecklist([second, first], "move_in")[0];
    assert.deepEqual(
      kitchen.lines.slice(0, 2).map((line) => line.entry),
      [first, second],
    );
    assert.deepEqual(checklistProgress([kitchen]), {
      recorded: 2,
      total: PRESET_ROOMS[0].items.length + 1,
    });
  });
});

describe("evidencePhotoPath", () => {
  it("stores photos under the owner's folder, then the rental", () => {
    assert.equal(evidencePhotoPath("u", "r", "i"), "u/r/i.jpg");
  });
});

describe("formatDateTime", () => {
  it("formats a timestamp in the given time zone", () => {
    assert.equal(
      formatDateTime("2025-01-05T18:05:00Z", "America/Los_Angeles"),
      "Jan 5, 2025, 10:05 AM",
    );
  });
});
