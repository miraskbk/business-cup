import { isLate } from "./deposit-rules.ts";
import type { ISODate, Rental } from "./types.ts";

export type RentalStatus =
  | "active"
  | "moved_out"
  | "deposit_overdue"
  | "deposit_returned";

export const RENTAL_STATUS_LABEL: Record<RentalStatus, string> = {
  active: "Active lease",
  moved_out: "Moved out",
  deposit_overdue: "Deposit overdue",
  deposit_returned: "Deposit returned",
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
  rental: Pick<Rental, "state" | "move_out_date"> &
    Partial<Pick<Rental, "deposit_returned_at">>,
  today: ISODate,
): RentalStatus {
  if (rental.deposit_returned_at) return "deposit_returned";
  if (!rental.move_out_date || rental.move_out_date > today) return "active";
  return isLate(rental, today) ? "deposit_overdue" : "moved_out";
}
