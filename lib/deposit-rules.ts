import type { Deduction, ISODate, Rental } from "./types.ts";

/**
 * What one state's law says about returning a residential security deposit.
 *
 * Every value below was read from the official state page in `sourceUrl` on
 * the `verifiedOn` date. Nothing here is filled in from memory. This is
 * general information, not legal advice: local ordinances and special
 * housing types can change the rule.
 */
export type DepositRule = {
  /** 2-letter state code. */
  state: string;
  /**
   * Days after move-out by which the landlord must have returned the deposit
   * or sent the renter their claim against it. Past this, the landlord is
   * late under the rule described in `deadlineSummary`.
   */
  returnDeadlineDays: number;
  /** The deadline in plain words, including what it is counted from. */
  deadlineSummary: string;
  /** Whether deductions must come with an itemized written statement. */
  itemizationRequired: boolean;
  /** What the renter can recover if the landlord breaks the rule. */
  penaltySummary: string;
  /** Something the renter must do to keep these protections, if anything. */
  renterDuty: string | null;
  statuteCitation: string;
  /** The official page the values were verified against. */
  sourceUrl: string;
  sourceName: string;
  verifiedOn: ISODate;
};

export const DEPOSIT_RULES: readonly DepositRule[] = [
  {
    state: "CA",
    returnDeadlineDays: 21,
    deadlineSummary:
      "Within 21 calendar days after you move out, the landlord must refund the deposit or send an itemized statement of deductions with a refund of the rest.",
    itemizationRequired: true,
    penaltySummary:
      "A landlord who acts in bad faith cannot claim any of the deposit, and a court can award up to twice the deposit on top of the amount wrongly withheld.",
    renterDuty: null,
    statuteCitation: "Cal. Civ. Code § 1950.5",
    sourceUrl:
      "https://www.dre.ca.gov/publications/ResourceGuidebook/gb10_movingout.html",
    sourceName: "California Department of Real Estate",
    verifiedOn: "2026-11-14",
  },
  {
    state: "NY",
    returnDeadlineDays: 14,
    deadlineSummary:
      "Within 14 days after you vacate, the landlord must send an itemized statement and return the rest of the deposit.",
    itemizationRequired: true,
    penaltySummary:
      "A landlord who misses the 14 days forfeits the right to keep any of the deposit. A willful violation can add punitive damages of up to twice the deposit.",
    renterDuty: null,
    statuteCitation: "N.Y. Gen. Oblig. Law § 7-108(1-a)",
    sourceUrl: "https://www.nysenate.gov/legislation/laws/GOB/7-108",
    sourceName: "New York State Senate",
    verifiedOn: "2026-11-14",
  },
  {
    state: "TX",
    returnDeadlineDays: 30,
    deadlineSummary:
      "The landlord must refund the deposit on or before the 30th day after you surrender the premises.",
    itemizationRequired: true,
    penaltySummary:
      "A landlord who keeps the deposit in bad faith can owe three times the portion wrongfully withheld.",
    renterDuty:
      "Give the landlord your forwarding address in writing. The landlord does not have to refund the deposit or describe deductions until you do.",
    statuteCitation: "Tex. Prop. Code §§ 92.103, 92.107, 92.109",
    sourceUrl:
      "https://guides.sll.texas.gov/landlord-tenant-law/security-deposit-refunds",
    sourceName: "Texas State Law Library",
    verifiedOn: "2026-11-14",
  },
  {
    state: "FL",
    // Florida has two clocks: 15 days to refund when the landlord makes no
    // claim, and 30 days to send written notice of a claim. Day 30 is used
    // here because only after it has the landlord lost the right to claim.
    returnDeadlineDays: 30,
    deadlineSummary:
      "The landlord has 15 days after the lease ends to refund the deposit, or 30 days to send written notice of a claim against it.",
    itemizationRequired: true,
    penaltySummary:
      "A landlord who misses the 30-day notice forfeits the right to claim any of the deposit. In court, the winning side recovers court costs and attorney's fees.",
    renterDuty:
      "Give at least 7 days' written notice before you leave, including an address where you can be reached, unless your lease says otherwise.",
    statuteCitation: "Fla. Stat. § 83.49(3)",
    sourceUrl:
      "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0083/Sections/0083.49.html",
    sourceName: "Florida Legislature",
    verifiedOn: "2026-11-14",
  },
];

/** The rule for a state, or null where we have not verified one yet. */
export function ruleFor(state: string): DepositRule | null {
  return DEPOSIT_RULES.find((rule) => rule.state === state) ?? null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toUTC(date: ISODate): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** A calendar date moved forward by a number of days. */
export function addDays(date: ISODate, days: number): ISODate {
  return new Date(toUTC(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from one calendar date to another; negative if `to` is earlier. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

type Dated = Pick<Rental, "state" | "move_out_date">;

/**
 * The last day the landlord has to act: move-out date plus the state's
 * deadline. Null until there is a move-out date, or where the state's rule
 * has not been verified.
 */
export function deadlineFor(rental: Dated): ISODate | null {
  const rule = ruleFor(rental.state);
  if (!rule || !rental.move_out_date) return null;
  return addDays(rental.move_out_date, rule.returnDeadlineDays);
}

/**
 * Days the landlord still has: 0 on the deadline itself, negative once it
 * has passed. Null when there is no deadline to count to.
 */
export function daysRemaining(rental: Dated, today: ISODate): number | null {
  const deadline = deadlineFor(rental);
  return deadline === null ? null : daysBetween(today, deadline);
}

/** True once the deadline day has fully passed. */
export function isLate(rental: Dated, today: ISODate): boolean {
  const remaining = daysRemaining(rental, today);
  return remaining !== null && remaining < 0;
}

/** Sums money in cents so amounts like 0.1 + 0.2 don't drift. */
function sum(amounts: readonly number[]): number {
  return amounts.reduce((cents, amount) => cents + Math.round(amount * 100), 0) / 100;
}

/** Total of the deductions the renter contests. */
export function disputedTotal(
  deductions: readonly Pick<Deduction, "amount" | "disputed">[],
): number {
  return sum(deductions.filter((d) => d.disputed).map((d) => d.amount));
}

/**
 * How much of the deposit the renter stands to lose right now: everything
 * the landlord is deducting, capped at the deposit. Before any deduction has
 * been recorded the whole deposit is still in the landlord's hands.
 */
export function amountAtRisk(
  rental: Pick<Rental, "deposit_amount">,
  deductions: readonly Pick<Deduction, "amount">[],
): number {
  if (deductions.length === 0) return rental.deposit_amount;
  return Math.min(rental.deposit_amount, sum(deductions.map((d) => d.amount)));
}
