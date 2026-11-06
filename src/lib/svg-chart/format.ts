/*
 * svg-chart/format.ts: number and date formatting shared by the chart, the
 * table view, and the CSV name. Pure.
 */

/** Month abbreviations in TRPA style. */
export const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

/**
 * A value for tables, ticks, and labels. ".0%" shows shares as whole percents;
 * anything else is a plain number with at most 3 decimals. Blank for nulls and
 * anything that is not a finite number.
 */
export function formatValue(v: unknown, format?: string): string {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '';
  if (format === '.0%') return `${Math.round(n * 100)}%`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

/** Calendar parts of an ISO date (YYYY-MM-DD), or null when it is not one. */
export function isoParts(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** "Jan. 9, 2017" from an ISO date; the input unchanged when it is not one. */
export function formatDate(iso: string): string {
  const p = isoParts(iso);
  if (!p || p.m < 1 || p.m > 12) return iso;
  return `${MONTHS[p.m - 1]} ${p.d}, ${p.y}`;
}

/** "Jan. 2017" from a year and a 1-based month. */
export function formatMonthYear(y: number, m: number): string {
  return `${MONTHS[m - 1]} ${y}`;
}

/** "Jan. 9" from a 1-based month and a day. */
export function formatMonthDay(m: number, d: number): string {
  return `${MONTHS[m - 1]} ${d}`;
}
