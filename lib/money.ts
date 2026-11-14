// numeric(10,2) holds up to 99,999,999.99
export const MAX_AMOUNT = 99_999_999.99;

const MONEY = /^\d+(\.\d{1,2})?$/;

/**
 * Reads a typed dollar amount such as "300", "$300" or "1,200.50".
 * Returns null when it isn't a plain non-negative amount with at most two
 * decimal places, or when it is too large to store.
 */
export function parseMoney(raw: string): number | null {
  const value = raw.trim().replace(/[$,]/g, "");
  if (!MONEY.test(value)) return null;
  const amount = Number(value);
  return amount <= MAX_AMOUNT ? amount : null;
}
