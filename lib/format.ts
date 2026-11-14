import type { ISODate } from "./types.ts";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const wholeMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** "$1,800" for whole amounts, "$1,800.50" otherwise. */
export function formatMoney(amount: number): string {
  return Number.isInteger(amount)
    ? wholeMoney.format(amount)
    : money.format(amount);
}

const day = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * "Jan 5, 2025" from a "YYYY-MM-DD" calendar date.
 *
 * The date is pinned to UTC on both sides so it never shifts by a day in the
 * viewer's time zone (new Date("2025-01-05") is midnight UTC, which is still
 * Jan 4 in every US time zone).
 */
export function formatDate(date: ISODate): string {
  const [year, month, dayOfMonth] = date.split("-").map(Number);
  return day.format(new Date(Date.UTC(year, month - 1, dayOfMonth)));
}

/** Today's calendar date where the user is, as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): ISODate {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * "Nov 14, 2026, 2:05 PM" from a timestamp, in the viewer's time zone unless
 * one is given.
 */
export function formatDateTime(timestamp: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(timestamp));
}
