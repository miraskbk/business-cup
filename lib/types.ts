/** Row shapes for the Supabase tables in supabase/migrations. */

/** Calendar date as stored in a Postgres `date` column: "YYYY-MM-DD". */
export type ISODate = string;

export type Rental = {
  id: string;
  user_id: string;
  address: string;
  /** 2-letter US state code, e.g. "CA". */
  state: string;
  landlord_name: string | null;
  landlord_email: string | null;
  monthly_rent: number | null;
  deposit_amount: number;
  lease_start: ISODate | null;
  lease_end: ISODate | null;
  /** Set once the renter has moved out (or knows the date). */
  move_out_date: ISODate | null;
  /** Set when the renter confirms the deposit has been returned/resolved. */
  deposit_returned_at: ISODate | null;
  created_at: string;
};

export type InspectionPhase = "move_in" | "move_out";

export type Condition = "good" | "fair" | "damaged";

/** One piece of condition evidence: an item in a room, at move-in or move-out. */
export type InspectionItem = {
  id: string;
  user_id: string;
  rental_id: string;
  room: string;
  item: string;
  phase: InspectionPhase;
  condition: Condition;
  note: string | null;
  /** Path in the private `evidence` bucket: {user_id}/{rental_id}/{id}.jpg */
  photo_path: string | null;
  /** When the evidence was recorded. Set by the database, never edited. */
  captured_at: string;
};

/** An amount the landlord says they are keeping from the deposit. */
export type Deduction = {
  id: string;
  user_id: string;
  rental_id: string;
  description: string;
  amount: number;
  /** Whether the renter contests this deduction. */
  disputed: boolean;
  created_at: string;
};
