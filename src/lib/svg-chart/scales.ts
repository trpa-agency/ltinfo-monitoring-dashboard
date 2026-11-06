/*
 * svg-chart/scales.ts: linear, band, and time scales with tick generation.
 * Pure functions, no DOM. Ticks step in 1-2-5 multiples of a power of ten.
 */

import { formatMonthDay, formatMonthYear } from './format.ts';

export interface TickOptions {
  /** Target tick count. Default 5. */
  count?: number;
  /** Include zero in the domain. Default true. */
  zero?: boolean;
  /** Keep the step at whole numbers (years). */
  integer?: boolean;
}

export interface LinearTicks {
  /** Nice domain that covers the data and every tick. */
  domain: [number, number];
  ticks: number[];
  step: number;
}

/** The 1-2-5 step whose count across span is closest to, but not above, count. */
export function niceStep(span: number, count: number): number {
  if (!(span > 0) || !(count > 0)) return 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / mag;
  const f = r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10;
  return f * mag;
}

/** Rounds away floating noise so 0.30000000000000004 reads as 0.3. */
function roundTo(v: number, step: number): number {
  const digits = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return Number(v.toFixed(Math.min(digits, 12)));
}

/** Nice ticks and domain for a value axis. */
export function linearTicks(min: number, max: number, opts: TickOptions = {}): LinearTicks {
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  if (opts.zero !== false) {
    lo = Math.min(lo, 0);
    hi = Math.max(hi, 0);
  }
  if (lo === hi) {
    if (opts.integer) {
      lo -= 1;
      hi += 1;
    } else if (lo === 0) {
      hi = 1;
    } else {
      const pad = Math.abs(lo) * 0.1;
      lo -= pad;
      hi += pad;
    }
  }
  const count = opts.count ?? 5;
  let step = niceStep(hi - lo, count);
  if (opts.integer) step = Math.max(1, Math.round(step));
  const d0 = Math.floor(lo / step + 1e-9) * step;
  const d1 = Math.ceil(hi / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let i = 0; i < 1000; i += 1) {
    const t = d0 + i * step;
    if (t > d1 + step * 1e-6) break;
    ticks.push(roundTo(t, step));
  }
  if (ticks.length < 2) ticks.push(roundTo(d0 + step, step));
  return { domain: [ticks[0], ticks[ticks.length - 1]], ticks, step };
}

export interface LinearScale {
  (v: number): number;
  domain: [number, number];
  range: [number, number];
}

/** Maps domain to range linearly. A zero-width domain maps everything to the range start. */
export function linearScale(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const fn = ((v: number): number => (span === 0 ? r0 : r0 + ((v - d0) / span) * (r1 - r0))) as LinearScale;
  fn.domain = domain;
  fn.range = range;
  return fn;
}

export interface BandScale {
  /** Start of the band for a key, or undefined for an unknown key. */
  (key: string): number | undefined;
  domain: string[];
  range: [number, number];
  bandwidth: number;
  step: number;
  /** Center of the band for a key. */
  center(key: string): number | undefined;
}

/**
 * Evenly spaced bands for ordered categories. paddingInner is the share of a
 * step left between bands; paddingOuter is the share of a step left at each end.
 */
export function bandScale(
  domain: string[],
  range: [number, number],
  paddingInner = 0.2,
  paddingOuter = 0.2,
): BandScale {
  const n = domain.length;
  const [r0, r1] = range;
  const denom = Math.max(1e-9, n - paddingInner + 2 * paddingOuter);
  const step = n ? (r1 - r0) / denom : r1 - r0;
  const bandwidth = n ? step * (1 - paddingInner) : 0;
  const index = new Map<string, number>();
  domain.forEach((k, i) => index.set(k, i));
  const fn = ((key: string): number | undefined => {
    const i = index.get(key);
    return i == null ? undefined : r0 + step * paddingOuter + i * step;
  }) as BandScale;
  fn.domain = domain;
  fn.range = range;
  fn.bandwidth = bandwidth;
  fn.step = step;
  fn.center = (key: string): number | undefined => {
    const s = fn(key);
    return s == null ? undefined : s + bandwidth / 2;
  };
  return fn;
}

/** Epoch milliseconds at UTC midnight for an ISO date, or NaN. */
export function isoToMs(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export interface TimeTick {
  ms: number;
  label: string;
}

const MONTH_STEPS = [1, 2, 3, 4, 6, 12, 24, 60, 120, 240, 600];
const DAY_STEPS = [1, 2, 7, 14];

/**
 * Ticks for a time axis. Year ticks when the span allows whole years, month
 * ticks for spans of a few years, day ticks inside a couple of months. At most
 * maxCount ticks.
 */
export function timeTicks(minMs: number, maxMs: number, maxCount = 8): TimeTick[] {
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) return [];
  const count = Math.max(2, maxCount);
  const a = new Date(Math.min(minMs, maxMs));
  const b = new Date(Math.max(minMs, maxMs));
  const spanMonths = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  const ticks: TimeTick[] = [];
  if (spanMonths < 2) {
    const spanDays = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
    const stepDays = DAY_STEPS.find((s) => Math.ceil(spanDays / s) <= count) ?? DAY_STEPS[DAY_STEPS.length - 1];
    for (let t = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()); t <= b.getTime(); t += stepDays * 86400000) {
      const d = new Date(t);
      ticks.push({ ms: t, label: formatMonthDay(d.getUTCMonth() + 1, d.getUTCDate()) });
    }
    return ticks;
  }
  const stepMonths = MONTH_STEPS.find((s) => Math.ceil(spanMonths / s) <= count) ?? MONTH_STEPS[MONTH_STEPS.length - 1];
  if (stepMonths >= 12) {
    const stepYears = stepMonths / 12;
    const y0 = Math.ceil(a.getUTCFullYear() / stepYears) * stepYears;
    for (let y = y0; y <= b.getUTCFullYear(); y += stepYears) {
      const ms = Date.UTC(y, 0, 1);
      if (ms >= minMs && ms <= maxMs) ticks.push({ ms, label: String(y) });
    }
    return ticks;
  }
  const first = a.getUTCFullYear() * 12 + Math.ceil(a.getUTCMonth() / stepMonths) * stepMonths;
  const last = b.getUTCFullYear() * 12 + b.getUTCMonth();
  for (let mi = first; mi <= last; mi += stepMonths) {
    const y = Math.floor(mi / 12);
    const m = mi - y * 12;
    const ms = Date.UTC(y, m, 1);
    if (ms >= minMs && ms <= maxMs) ticks.push({ ms, label: formatMonthYear(y, m + 1) });
  }
  return ticks;
}
