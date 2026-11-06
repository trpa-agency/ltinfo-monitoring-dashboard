/*
 * measures.ts: a programs.json measure config plus rows from the TRPA map
 * service, turned into a chart spec, table columns, and pick choices.
 *
 * Ported function by function from templates/program-dashboard.html in the
 * reference repo (fmtValue, measureYs, queryMeasure, measureView,
 * measureSeries, measureColumns, the pick default, and the span rule). Every
 * key in templates/README.md is supported. Pure: no DOM.
 */

import type { Attributes, ServiceOptions } from './map-service.ts';
import { normalizeDate, queryFeatures, queryStatistics, unpivot } from './map-service.ts';
import type { AxisKind, ChartSpec, ChartType } from './svg-chart/types.ts';
import { MONTHS, formatValue } from './svg-chart/format.ts';
import { plural, yearOf } from './sites.ts';

export { MONTHS };

export interface MeasureY {
  field: string;
  name?: string;
}

export interface MeasureStandard {
  /** Field that carries the threshold on each row; the first finite value is used. */
  field?: string;
  /** Fixed threshold value, used instead of a field. */
  value?: number;
  /** Label for the line; "Threshold" when omitted. */
  label?: string;
}

export type MeasureSpan = 'span-12' | 'span-6';

/** One entry of a program's measures list in programs.json. Keys as documented in templates/README.md. */
export interface Measure {
  title: string;
  sub?: string;
  layer: number | string;
  where?: string;
  x: string;
  xLabel?: string;
  /** Omit for years, "category" for text such as 2016-2019, "date" for dates, "month" for month numbers. */
  xType?: 'category' | 'date' | 'month';
  /** One field, or several { field, name } series. */
  y: string | MeasureY[];
  yName?: string;
  yLabel?: string;
  /** ".0%" for shares. */
  format?: string;
  /** Computed on the server, grouped by x, seriesBy, and pick. */
  stat?: 'sum' | 'count' | 'avg';
  seriesBy?: string;
  seriesLabel?: string;
  seriesNames?: Record<string, string>;
  seriesPrefix?: string;
  pick?: string;
  pickLabel?: string;
  pickDefault?: string;
  type?: ChartType;
  orientation?: 'v' | 'h';
  sort?: 'asc' | 'desc';
  limit?: number;
  standard?: MeasureStandard;
  /** false lets the value axis start above zero. */
  zero?: boolean;
  span?: MeasureSpan;
  xNames?: Record<string, string>;
  unpivot?: { prefix: string };
}

export interface MeasureSeries {
  name: string;
  field: string;
  rows: Attributes[];
}

export interface MeasureColumn {
  field: string;
  headerName: string;
  /** Right-aligned, formatted with fmtValue. */
  num?: boolean;
}

export const ERROR_STATE = {
  title: 'Data could not be loaded',
  description: 'The TRPA map service did not respond. Reload the page to try again.',
};

/** A value for tables and labels. ".0%" shows shares as percents, anything else a plain number. */
export const fmtValue = formatValue;

const toNumber = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/** The y fields a measure charts: the server statistic, the listed fields, or the one y field. */
export function measureYs(m: Measure): MeasureY[] {
  if (m.stat) return [{ field: 'value', name: m.yName || m.yLabel }];
  if (Array.isArray(m.y)) return m.y;
  return [{ field: m.y, name: m.yName || m.yLabel }];
}

/** Rows for a measure from the map service, long and normalized. */
export async function queryMeasure(m: Measure, opts: ServiceOptions = {}): Promise<Attributes[]> {
  const groups = [m.x, m.seriesBy, m.pick].filter((f): f is string => !!f);
  let rows: Attributes[];
  if (m.stat) {
    rows = await queryStatistics(
      m.layer,
      { where: m.where, groupBy: groups, statisticType: m.stat, onField: typeof m.y === 'string' ? m.y : m.y[0].field, outName: 'value' },
      opts,
    );
  } else if (m.unpivot) {
    rows = await queryFeatures(m.layer, { where: m.where }, opts);
    rows = unpivot(rows, m.unpivot.prefix, m.x, typeof m.y === 'string' ? m.y : m.y[0].field);
  } else {
    const fields = [...groups, ...measureYs(m).map((y) => y.field)];
    if (m.standard && m.standard.field) fields.push(m.standard.field);
    rows = await queryFeatures(m.layer, { where: m.where, outFields: [...new Set(fields)], orderByFields: m.x }, opts);
  }
  return rows.map((r) => {
    const row: Attributes = { ...r };
    if (m.xType === 'date') row[m.x] = normalizeDate(row[m.x]);
    if (m.seriesBy) {
      const s = row[m.seriesBy];
      row[m.seriesBy] = s == null || s === '' ? 'Not stated' : String(s);
    }
    return row;
  });
}

/** Rows with an x value, sorted (by value when sort is set, else by x), and capped at limit. */
export function measureView(m: Measure, rows: Attributes[]): Attributes[] {
  let out = rows.filter((r) => r[m.x] != null && r[m.x] !== '');
  const y0 = measureYs(m)[0].field;
  if (m.sort) {
    const dir = m.sort === 'desc' ? -1 : 1;
    out = [...out].sort((a, b) => dir * ((toNumber(a[y0]) ?? -Infinity) - (toNumber(b[y0]) ?? -Infinity)));
  } else if (!m.xType || m.xType === 'month') {
    out = [...out].sort((a, b) => Number(a[m.x]) - Number(b[m.x]));
  } else {
    out = [...out].sort((a, b) => String(a[m.x]).localeCompare(String(b[m.x])));
  }
  return m.limit ? out.slice(0, m.limit) : out;
}

/** One series per seriesBy value (named through seriesNames or seriesPrefix), or one per y field. */
export function measureSeries(m: Measure, rows: Attributes[]): MeasureSeries[] {
  const ys = measureYs(m);
  if (m.seriesBy) {
    const by = m.seriesBy;
    const values = [...new Set(rows.map((r) => String(r[by])))].sort();
    return values.map((v) => ({
      name: (m.seriesNames && m.seriesNames[v]) || `${m.seriesPrefix || ''}${v}`,
      field: ys[0].field,
      rows: rows.filter((r) => String(r[by]) === v),
    }));
  }
  return ys.map((y) => ({ name: y.name || m.yLabel || 'Value', field: y.field, rows }));
}

/** Table columns behind the chart: x, series, pick, each y, and the threshold field. */
export function measureColumns(m: Measure): MeasureColumn[] {
  const cols: MeasureColumn[] = [{ field: m.x, headerName: m.xLabel || 'Year' }];
  if (m.seriesBy) cols.push({ field: m.seriesBy, headerName: m.seriesLabel || m.seriesBy });
  if (m.pick) cols.push({ field: m.pick, headerName: m.pickLabel || m.pick });
  for (const y of measureYs(m)) cols.push({ field: y.field, headerName: y.name || m.yLabel || 'Value', num: true });
  if (m.standard && m.standard.field) cols.push({ field: m.standard.field, headerName: m.standard.label || 'Threshold' });
  return cols;
}

/** Distinct pick values, sorted. Empty when the measure has no pick. */
export function pickChoices(m: Measure, rows: Attributes[]): string[] {
  if (!m.pick) return [];
  const field = m.pick;
  return [...new Set(rows.map((r) => r[field]).filter((v) => v != null && v !== '').map(String))].sort();
}

/** pickDefault when it is a choice, else the choice with the longest record. */
export function defaultPick(m: Measure, rows: Attributes[], choices: string[]): string | undefined {
  if (!m.pick || !choices.length) return undefined;
  if (m.pickDefault && choices.includes(m.pickDefault)) return m.pickDefault;
  const field = m.pick;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = r[field];
    if (v == null || v === '') continue;
    counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
  }
  return choices.reduce((best, c) => ((counts.get(c) ?? 0) > (counts.get(best) ?? 0) ? c : best), choices[0]);
}

/** Rows for the picked value, or every row when the measure has no pick. */
export function pickedRows(m: Measure, rows: Attributes[], picked: string | undefined): Attributes[] {
  if (!m.pick || picked == null) return rows;
  const field = m.pick;
  return rows.filter((r) => String(r[field]) === picked);
}

/** Display text for an x value: month names, xNames, else the value itself. */
export function xDisplay(m: Measure, v: unknown): string {
  if (m.xType === 'month') {
    const n = Number(v);
    if (n >= 1 && n <= 12) return MONTHS[n - 1];
  }
  const key = String(v);
  if (m.xNames && m.xNames[key]) return m.xNames[key];
  return key;
}

/** Threshold value from standard.value or the first finite standard.field value in rows, else null. */
export function measureThreshold(m: Measure, rows: Attributes[]): number | null {
  if (!m.standard) return null;
  if (m.standard.value != null && Number.isFinite(m.standard.value)) return m.standard.value;
  if (!m.standard.field) return null;
  const field = m.standard.field;
  for (const r of rows) {
    const n = toNumber(r[field]);
    if (n != null) return n;
  }
  return null;
}

/** Axis kind for a measure: dates on a time axis, text and months as bands, years linear for lines and bands for bars. */
export function measureAxisKind(m: Measure): AxisKind {
  if (m.xType === 'date') return 'time';
  if (m.xType) return 'band';
  const bars = m.type === 'bar' || m.type === 'stacked';
  return bars || m.orientation === 'h' ? 'band' : 'linear';
}

/** The chart spec for a measure and its (viewed) rows. */
export function measureChartSpec(m: Measure, rows: Attributes[]): ChartSpec {
  const series = measureSeries(m, rows);
  const horizontal = m.orientation === 'h';
  const type: ChartType = m.type === 'bar' || m.type === 'stacked' ? m.type : 'line';
  const xKind = measureAxisKind(m);
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const k = String(r[m.x]);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  const band = xKind === 'band' || horizontal;
  const categoryLabels: Record<string, string> = {};
  for (const k of keys) categoryLabels[k] = xDisplay(m, k);
  const std = horizontal ? null : measureThreshold(m, rows);
  return {
    title: m.title,
    type,
    horizontal,
    xKind,
    xLabel: horizontal ? undefined : m.xLabel,
    yLabel: m.yLabel || '',
    format: m.format,
    zero: m.zero !== false,
    categories: band ? keys : undefined,
    categoryLabels,
    threshold: std == null ? null : { value: std, label: `${(m.standard && m.standard.label) || 'Threshold'}: ${fmtValue(std, m.format)}` },
    series: series.map((s) => ({
      name: s.name,
      points: s.rows.map((r) => ({
        x: xKind === 'linear' ? Number(r[m.x]) : String(r[m.x]),
        y: toNumber(r[s.field]),
      })),
    })),
  };
}

/** Empty-state copy per the embed contract: what is absent and what the section will show. */
export function emptyStateText(m: Measure): { title: string; description: string } {
  const what = m.yLabel || m.yName || 'values';
  const by = (m.xLabel || 'year').toLowerCase();
  return {
    title: `No ${m.title.toLowerCase()} loaded yet`,
    description: `This section will show ${what} by ${by}.`,
  };
}

/** Grid spans: explicit span, else pairs of span-6 with an unpaired last measure taking span-12. */
export function panelSpans(measures: Measure[]): MeasureSpan[] {
  const auto = measures.filter((x) => !x.span);
  return measures.map((m) => m.span || (auto.length % 2 === 1 && auto[auto.length - 1] === m ? 'span-12' : 'span-6'));
}

/* ---------- Sites monitored each year ---------- */

/**
 * A program's sitesPerYear in programs.json: the layer, year field, and site field to count
 * distinct sites per year from. extract: true groups a date field by its year on the server.
 */
export interface SitesPerYearConfig {
  layer: number | string;
  year: string;
  site: string;
  where?: string;
  extract?: boolean;
  /** What is counted: "site" when omitted. */
  unit?: string;
}

/** The row shape sitesPerYearRows returns, and the x and y fields of its measure. */
export const SITES_PER_YEAR_X = 'year';
export const SITES_PER_YEAR_Y = 'count';

const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * The chart as a Measure, so mon-chart-panel draws it with the same toggle, table, CSV, and
 * states as every measurement: a bar per year of the distinct site count. The rows come from
 * querySitesPerYear instead of queryMeasure (ChartPanel passes the config as data-source).
 */
export function sitesPerYearMeasure(cfg: SitesPerYearConfig): Measure {
  const units = plural(2, cfg.unit || 'site');
  return {
    title: `${capitalize(units)} monitored each year`,
    sub: `Number of ${units} with a record in each year.`,
    layer: cfg.layer,
    x: SITES_PER_YEAR_X,
    xLabel: 'Year',
    y: SITES_PER_YEAR_Y,
    yLabel: `${capitalize(units)} monitored`,
    type: 'bar',
  };
}

/** The group-by key the server returns the year under: the field, or Expr1 for an EXTRACT. */
export function sitesPerYearYearKey(cfg: SitesPerYearConfig): string {
  return cfg.extract ? `EXTRACT(YEAR FROM ${cfg.year})` : cfg.year;
}

/**
 * Distinct sites per year from the grouped rows (one row per year and site). An EXTRACT
 * comes back as Expr1 (or EXPR1) rather than under the field name; years may arrive as
 * numbers, "2024" strings, dates, or epoch milliseconds. Sorted ascending by year.
 */
export function sitesPerYearRows(cfg: SitesPerYearConfig, rows: Attributes[]): Attributes[] {
  const bySite = new Map<number, Set<string>>();
  for (const r of rows) {
    const raw = cfg.extract ? (r.Expr1 ?? r.EXPR1 ?? r[cfg.year]) : r[cfg.year];
    const y = yearOf(raw);
    const site = r[cfg.site];
    if (!y || site == null || site === '') continue;
    const set = bySite.get(y) ?? new Set<string>();
    set.add(String(site));
    bySite.set(y, set);
  }
  return [...bySite.keys()].sort((a, b) => a - b).map((y) => ({ [SITES_PER_YEAR_X]: y, [SITES_PER_YEAR_Y]: bySite.get(y)!.size }));
}

/** Sites monitored each year from the map service: one grouped statistics request, counted client side. */
export async function querySitesPerYear(cfg: SitesPerYearConfig, opts: ServiceOptions = {}): Promise<Attributes[]> {
  const rows = await queryStatistics(
    cfg.layer,
    { where: cfg.where, groupBy: [sitesPerYearYearKey(cfg), cfg.site], statisticType: 'count', onField: 'OBJECTID', outName: 'n' },
    opts,
  );
  return sitesPerYearRows(cfg, rows);
}

/** What ChartPanel passes as data-source when a panel's rows come from somewhere other than queryMeasure. */
export type PanelSource = { kind: 'sites-per-year'; config: SitesPerYearConfig };

/** The rows for a panel: its source when it has one, else the measure query. */
export function queryPanelRows(measure: Measure, source: PanelSource | null, opts: ServiceOptions = {}): Promise<Attributes[]> {
  if (source?.kind === 'sites-per-year') return querySitesPerYear(source.config, opts);
  return queryMeasure(measure, opts);
}
