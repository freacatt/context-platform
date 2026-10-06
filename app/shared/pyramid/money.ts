/**
 * Money is exact: USD amounts are bigints of pico-dollars (1e-12 USD) in memory and
 * decimal strings at every boundary (database, API, UI). Never a float.
 */

export type Money = bigint;

const DIGITS = 12;
const SCALE = 10n ** BigInt(DIGITS);
const MONEY_RE = /^\s*(-)?(\d*)(?:\.(\d*))?\s*$/;

/** Parses "0.0042", "3", ".5" or a finite number (via its decimal string). */
export function parseMoney(value: string | number): Money {
  const text = typeof value === 'number' ? numberToPlain(value) : value;
  const m = MONEY_RE.exec(text);
  if (!m || (!m[2] && !m[3])) throw new Error(`not a decimal amount: ${JSON.stringify(value)}`);
  const whole = BigInt(m[2] || '0');
  const frac = (m[3] ?? '').slice(0, DIGITS).padEnd(DIGITS, '0');
  const amount = whole * SCALE + BigInt(frac);
  return m[1] ? -amount : amount;
}

/** Like parseMoney, but null/undefined/garbage → null. */
export function tryParseMoney(value: string | number | null | undefined): Money | null {
  if (value === null || value === undefined) return null;
  try {
    return parseMoney(value);
  } catch {
    return null;
  }
}

function numberToPlain(n: number): string {
  if (!Number.isFinite(n)) throw new Error(`not a finite amount: ${n}`);
  // toFixed avoids exponent notation (1e-7) for the magnitudes we see in token prices.
  return Math.abs(n) < 1e-6 && n !== 0 ? n.toFixed(DIGITS + 6) : String(n);
}

/** Rounds half away from zero to `digits` decimals. */
export function roundMoney(value: Money, digits: number): Money {
  const unit = 10n ** BigInt(DIGITS - digits);
  const half = unit / 2n;
  const q = (value < 0n ? value - half : value + half) / unit;
  return q * unit;
}

/** Decimal string; trailing zeros trimmed unless `digits` fixes the precision. */
export function formatMoney(value: Money, digits?: number): string {
  const v = digits === undefined ? value : roundMoney(value, digits);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const whole = abs / SCALE;
  let frac = (abs % SCALE).toString().padStart(DIGITS, '0');
  frac = digits === undefined ? frac.replace(/0+$/, '') : frac.slice(0, digits);
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

/** price (USD per token) × tokens. */
export const times = (price: Money, tokens: number): Money => price * BigInt(Math.round(tokens));

/** value × numerator / denominator, e.g. scale(x, 85n, 100n) for 0.85x. */
export const scale = (value: Money, numerator: bigint, denominator: bigint): Money => (value * numerator) / denominator;

export const sumMoney = (values: Iterable<Money>): Money => {
  let total = 0n;
  for (const v of values) total += v;
  return total;
};

/** Estimates and stored totals are quantized to a millionth of a dollar. */
export const ESTIMATE_DIGITS = 6;

/** "$0.0123" for display; "-" for missing values. */
export function usd(value: string | Money | null | undefined, digits = 4): string {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = typeof value === 'bigint' ? value : tryParseMoney(value);
  return parsed === null ? '-' : `$${formatMoney(parsed, digits)}`;
}

/** "$1.23" — or 4 decimals for amounts under a cent, so small spend never reads "$0.00". */
export function usdCompact(value: string | Money | null | undefined): string {
  const parsed = typeof value === 'bigint' ? value : tryParseMoney(value);
  if (parsed === null) return '-';
  const abs = parsed < 0n ? -parsed : parsed;
  return `$${formatMoney(parsed, abs !== 0n && abs < parseMoney('0.01') ? 4 : 2)}`;
}
