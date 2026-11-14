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
  created_at: string;
};
