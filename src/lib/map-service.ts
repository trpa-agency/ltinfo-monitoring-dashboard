/*
 * map-service.ts: typed helpers for the TRPA LTInfo_Monitoring map service
 * (ArcGIS Server 11.5). Pure: no DOM, no Astro. Every function takes a fetch
 * implementation so the paging loop and error handling run under Node tests.
 *
 * Ported from templates/program-dashboard.html in the reference repo
 * (queryMeasure: 2,000-row paging with resultOffset, server statistics with
 * outStatistics plus groupByFieldsForStatistics, unpivot of wide year columns,
 * and date normalization).
 */

export const SERVICE_URL = 'https://maps.trpa.org/server/rest/services/LTInfo_Monitoring/MapServer';

/** One row of a query result: the feature's attributes. */
export type Attributes = Record<string, unknown>;

/** The slice of the Fetch API this module reads, so tests can pass a fake. */
export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}
export type FetchLike = (url: string) => Promise<FetchResponseLike>;

export interface ServiceOptions {
  /** Fetch implementation; globalThis.fetch by default. */
  fetch?: FetchLike;
  /** Map service root URL; SERVICE_URL by default. */
  service?: string;
  /** Rows per page for queryFeatures; 2,000 by default. */
  pageSize?: number;
}

export interface FeatureQuery {
  /** SQL filter; "1=1" when omitted. */
  where?: string;
  /** Fields to return; every field when omitted. */
  outFields?: string[];
  /** Server-side sort, for example "Year". */
  orderByFields?: string;
}

export type StatisticType = 'sum' | 'count' | 'avg' | 'min' | 'max';

export interface StatisticsQuery {
  where?: string;
  /** Fields to group by, in order. */
  groupBy: string[];
  statisticType: StatisticType;
  /** Field the statistic is computed on. */
  onField: string;
  /** Name of the statistic column in the result rows; "value" by default. */
  outName?: string;
}

interface ArcGISFeature {
  attributes: Attributes;
}

interface ArcGISQueryResponse {
  features?: ArcGISFeature[];
  exceededTransferLimit?: boolean;
  error?: { code?: number; message?: string; details?: string[] };
}

/** REST URL of a layer or table, for source links. */
export function layerUrl(layer: number | string, service: string = SERVICE_URL): string {
  return `${service}/${layer}`;
}

/** Query URL for a layer with the given parameters. */
export function queryUrl(
  layer: number | string,
  params: Record<string, string>,
  service: string = SERVICE_URL,
): string {
  return `${layerUrl(layer, service)}/query?${new URLSearchParams(params).toString()}`;
}

const defaultFetch: FetchLike = (url) => globalThis.fetch(url);

async function fetchQuery(url: string, fetchFn: FetchLike): Promise<ArcGISQueryResponse> {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as ArcGISQueryResponse | null;
  if (json && json.error) {
    const code = json.error.code != null ? ` (code ${json.error.code})` : '';
    throw new Error(`${json.error.message || 'Map service error'}${code}`);
  }
  return json ?? {};
}

/**
 * Every matching row, fetched in pages with resultOffset and resultRecordCount.
 * Stops when a page comes back short or the server says the transfer limit was
 * not exceeded. Throws on HTTP errors and on ArcGIS error payloads.
 */
export async function queryFeatures(
  layer: number | string,
  q: FeatureQuery = {},
  opts: ServiceOptions = {},
): Promise<Attributes[]> {
  const fetchFn = opts.fetch ?? defaultFetch;
  const pageSize = opts.pageSize ?? 2000;
  const base: Record<string, string> = {
    where: q.where || '1=1',
    outFields: q.outFields && q.outFields.length ? q.outFields.join(',') : '*',
    returnGeometry: 'false',
    f: 'json',
  };
  if (q.orderByFields) base.orderByFields = q.orderByFields;
  const rows: Attributes[] = [];
  const maxPages = 1000;
  for (let page = 0; page < maxPages; page += 1) {
    const url = queryUrl(
      layer,
      { ...base, resultOffset: String(page * pageSize), resultRecordCount: String(pageSize) },
      opts.service,
    );
    const json = await fetchQuery(url, fetchFn);
    const feats = json.features ?? [];
    for (const f of feats) rows.push(f.attributes);
    if (feats.length < pageSize || json.exceededTransferLimit === false) return rows;
  }
  throw new Error(`Layer ${layer} returned more than ${maxPages * pageSize} rows`);
}

/**
 * Server-side statistics grouped by one or more fields. Large tables (bike and
 * pedestrian counts, crashes) arrive as a few rows. One request, no paging.
 */
export async function queryStatistics(
  layer: number | string,
  q: StatisticsQuery,
  opts: ServiceOptions = {},
): Promise<Attributes[]> {
  const fetchFn = opts.fetch ?? defaultFetch;
  const outName = q.outName || 'value';
  const params: Record<string, string> = {
    where: q.where || '1=1',
    groupByFieldsForStatistics: q.groupBy.join(','),
    outStatistics: JSON.stringify([
      { statisticType: q.statisticType, onStatisticField: q.onField, outStatisticFieldName: outName },
    ]),
    returnGeometry: 'false',
    f: 'json',
  };
  const json = await fetchQuery(queryUrl(layer, params, opts.service), fetchFn);
  return (json.features ?? []).map((f) => f.attributes);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Turns wide year columns (NTU2015, NTU2016) into long rows: one per year with
 * the year in xField and the value in yField. Columns that do not match the
 * prefix are kept on every row. Null and empty cells are dropped.
 */
export function unpivot(rows: Attributes[], prefix: string, xField: string, yField: string): Attributes[] {
  const re = new RegExp(`^${escapeRegExp(prefix)}(\\d{4})$`);
  const out: Attributes[] = [];
  for (const r of rows) {
    const keep: Attributes = {};
    const years: [number, unknown][] = [];
    for (const [k, v] of Object.entries(r)) {
      const m = re.exec(k);
      if (!m) keep[k] = v;
      else if (v != null && v !== '') years.push([Number(m[1]), v]);
    }
    for (const [year, v] of years) out.push({ ...keep, [xField]: year, [yField]: v });
  }
  return out;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * ISO calendar date (YYYY-MM-DD) from epoch milliseconds, M/D/YYYY text, or
 * ISO text. Uses UTC so a midnight timestamp never rolls back a day. Values
 * that are none of those pass through unchanged.
 */
export function normalizeDate(v: unknown): unknown {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const d = new Date(v);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  if (typeof v === 'string') {
    const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v);
    if (mdy) return `${mdy[3]}-${pad2(Number(mdy[1]))}-${pad2(Number(mdy[2]))}`;
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  return v;
}
