import type { ISODate, Rental } from "./types.ts";

export type RentalStatus = "active" | "moved_out";

export const RENTAL_STATUS_LABEL: Record<RentalStatus, string> = {
  active: "Active lease",
  moved_out: "Moved out",
};

/**
 * Where a rental is in its lifecycle on a given day.
 *
 * A move-out date in the future still counts as an active lease. Both dates
 * are "YYYY-MM-DD", which compares correctly as plain strings.
 */
export function rentalStatus(
  rental: Pick<Rental, "move_out_date">,
  today: ISODate,
): RentalStatus {
  return rental.move_out_date && rental.move_out_date <= today
    ? "moved_out"
    : "active";
}
