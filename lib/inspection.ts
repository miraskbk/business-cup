import type { Condition, InspectionItem, InspectionPhase } from "./types.ts";

/** The rooms and items every checklist starts with. Users can add their own. */
export const PRESET_ROOMS: readonly { room: string; items: readonly string[] }[] =
  [
    {
      room: "Kitchen",
      items: ["Countertop", "Sink and faucet", "Appliances", "Cabinets", "Floor"],
    },
    {
      room: "Living room",
      items: ["Walls", "Floor or carpet", "Windows and blinds", "Light fixtures"],
    },
    {
      room: "Bedroom",
      items: ["Walls", "Floor or carpet", "Closet", "Windows and blinds"],
    },
    {
      room: "Bathroom",
      items: ["Sink and faucet", "Toilet", "Shower or tub", "Floor", "Walls"],
    },
    { room: "Entry", items: ["Front door and locks", "Floor"] },
  ];

export const CONDITIONS: readonly Condition[] = ["good", "fair", "damaged"];

export const CONDITION_LABEL: Record<Condition, string> = {
  good: "Good",
  fair: "Fair",
  damaged: "Damaged",
};

export const PHASE_LABEL: Record<InspectionPhase, string> = {
  move_in: "Move-in",
  move_out: "Move-out",
};

export type ChecklistLine = {
  room: string;
  item: string;
  /** The recorded evidence, or null while this item is still to do. */
  entry: InspectionItem | null;
};

export type ChecklistRoom = { room: string; lines: ChecklistLine[] };

const sameName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Merges the preset checklist with what has been recorded for one phase.
 *
 * Preset items come first in their preset order, recorded or not. Items the
 * user added themselves follow, oldest first, and rooms that are not in the
 * presets are appended after the preset rooms. If an item was recorded more
 * than once, every recording gets its own line.
 */
export function buildChecklist(
  entries: readonly InspectionItem[],
  phase: InspectionPhase,
): ChecklistRoom[] {
  const recorded = entries
    .filter((entry) => entry.phase === phase)
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at));
  const used = new Set<string>();

  const rooms: ChecklistRoom[] = PRESET_ROOMS.map(({ room, items }) => {
    const lines: ChecklistLine[] = [];
    for (const item of items) {
      const matches = recorded.filter(
        (entry) => sameName(entry.room, room) && sameName(entry.item, item),
      );
      if (matches.length === 0) lines.push({ room, item, entry: null });
      for (const entry of matches) {
        used.add(entry.id);
        lines.push({ room, item, entry });
      }
    }
    return { room, lines };
  });

  for (const entry of recorded) {
    if (used.has(entry.id)) continue;
    let room = rooms.find((r) => sameName(r.room, entry.room));
    if (!room) {
      room = { room: entry.room, lines: [] };
      rooms.push(room);
    }
    room.lines.push({ room: room.room, item: entry.item, entry });
  }

  return rooms;
}

/** How much of the checklist has evidence, counting each line once. */
export function checklistProgress(rooms: readonly ChecklistRoom[]): {
  recorded: number;
  total: number;
} {
  const lines = rooms.flatMap((room) => room.lines);
  return {
    recorded: lines.filter((line) => line.entry !== null).length,
    total: lines.length,
  };
}

/** Where an item's photo lives in the private `evidence` bucket. */
export function evidencePhotoPath(
  userId: string,
  rentalId: string,
  itemId: string,
): string {
  return `${userId}/${rentalId}/${itemId}.jpg`;
}
