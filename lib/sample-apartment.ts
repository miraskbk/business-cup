import { addDays } from "./deposit-rules.ts";
import { evidencePhotoPath, PRESET_ROOMS } from "./inspection.ts";
import type { RenewalDraft } from "./renewal.ts";
import type {
  Deduction,
  InspectionItem,
  ISODate,
  LeaseEvent,
} from "./types.ts";

export const SAMPLE_ADDRESS = "412 Oak St, Apt 3B, Oakland";
export const SAMPLE_PHOTOS = {
  move_in: "/samples/countertop-move-in.jpg",
  move_out: "/samples/countertop-move-out.jpg",
} as const;

/**
 * A fictional renewal offer for the sample, so its calculator opens on three
 * different outcomes instead of three copies of the current rent.
 */
export const SAMPLE_RENEWAL: RenewalDraft = {
  currentRent: "1800",
  proposedRent: "1950",
  negotiatedRent: "1875",
  comparableRent: "1750",
  movingCosts: "1400",
  newDeposit: "1750",
  overlapDays: "7",
};

/** Inject ids and today's date so the fixture is testable, with no clock I/O. */
export function buildSampleApartment(
  userId: string,
  today: ISODate,
  newId: () => string,
) {
  const rentalId = newId();
  const moveOut = addDays(today, -31);
  const rental = {
    id: rentalId,
    address: SAMPLE_ADDRESS,
    state: "CA",
    landlord_name: "Oak Street Property Management",
    landlord_email: "landlord@example.com",
    monthly_rent: 1800,
    deposit_amount: 1800,
    lease_start: "2025-01-05",
    lease_end: moveOut,
    move_out_date: moveOut,
  };
  const items: Omit<InspectionItem, "user_id" | "rental_id">[] = [];
  for (const { room, items: names } of PRESET_ROOMS) {
    for (const item of names) {
      const id = newId();
      const isCounter = room === "Kitchen" && item === "Countertop";
      items.push({
        id,
        room,
        item,
        phase: "move_in",
        condition: "good",
        note: isCounter
          ? "Sample move-in: countertop intact, with no chips or stains."
          : null,
        photo_path: isCounter ? evidencePhotoPath(userId, rentalId, id) : null,
        captured_at: "2025-01-05T18:00:00Z",
      });
    }
  }
  const outId = newId();
  items.push({
    id: outId,
    room: "Kitchen",
    item: "Countertop",
    phase: "move_out",
    condition: "good",
    note: "Sample move-out: the same countertop remains intact. Compare with the move-in record.",
    photo_path: evidencePhotoPath(userId, rentalId, outId),
    captured_at: `${moveOut}T18:00:00Z`,
  });
  const events: Omit<LeaseEvent, "user_id" | "rental_id">[] = [
    {
      id: newId(),
      kind: "repair_request",
      title: "Reported a leaking kitchen faucet",
      details:
        "Sample: emailed the property manager and kept a written record.",
      due_date: addDays(moveOut, -57),
      resolved: true,
      created_at: `${addDays(moveOut, -60)}T17:00:00Z`,
    },
    {
      id: newId(),
      kind: "landlord_promise",
      title: "Landlord agreed to repair the faucet",
      details: "Sample: the repair was completed as agreed.",
      due_date: addDays(moveOut, -57),
      resolved: true,
      created_at: `${addDays(moveOut, -59)}T17:00:00Z`,
    },
    {
      id: newId(),
      kind: "notice",
      title: "Sent move-out notice and forwarding address",
      details: "Fictional demo event; no notice was actually sent.",
      due_date: null,
      resolved: true,
      created_at: `${addDays(moveOut, -35)}T17:00:00Z`,
    },
  ];
  const deductions: Omit<Deduction, "user_id" | "rental_id" | "created_at">[] =
    [
      {
        id: newId(),
        description: "Counter damage",
        amount: 300,
        disputed: true,
      },
    ];
  return { rental, items, events, deductions };
}
