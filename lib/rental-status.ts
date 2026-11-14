import { isLate } from "./deposit-rules.ts";
import type { ISODate, Rental } from "./types.ts";

export type RentalStatus = "active" | "moved_out" | "deposit_overdue";

export const RENTAL_STATUS_LABEL: Record<RentalStatus, string> = {
  active: "Active lease",
  moved_out: "Moved out",
  deposit_overdue: "Deposit overdue",
};

/**
 * Where a rental is in its lifecycle on a given day.
 *
 * A move-out date in the future still counts as an active lease. After
 * move-out, the rental turns overdue once the state's deadline for returning
 * the deposit has passed; states without a verified rule stay "moved out".
 * Dates are "YYYY-MM-DD", which compares correctly as plain strings.
 */
export function rentalStatus(
  rental: Pick<Rental, "state" | "move_out_date">,
  today: ISODate,
): RentalStatus {
  if (!rental.move_out_date || rental.move_out_date > today) return "active";
  return isLate(rental, today) ? "deposit_overdue" : "moved_out";
}
