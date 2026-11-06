/*
 * src/lib/sites.ts
 *
 * Pure helpers behind the monitoring map and the site list beside it. No DOM, no Leaflet, no
 * Astro, so the file runs under `node --experimental-strip-types` for tests. Ported from the
 * no-build template (templates/program-dashboard.html in ltinfo-monitoring-dashboard):
 * serviceSites, siteStatus, STATUS_ORDER, statusColors, overlayLayers, wireAreaMap, and
 * downloadCsv.
 *
 * The TRPA map service answers f=geojson queries in WGS84 when outSR=4326. Layers with one
 * feature per site per year collapse to one point per site at its latest location, with the
 * first and last year observed. Polygon layers are generalized on the server (geometryPrecision
 * and maxAllowableOffset) because the full-precision 2023 SEZ layer is 17 MB of GeoJSON.
 */

export const SERVICE = 'https://maps.trpa.org/server/rest/services/LTInfo_Monitoring/MapServer';

/** Rows per page when a layer query is paged. The service allows far more, but a page this size keeps each response small. */
export const PAGE_SIZE = 2000;

export type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * The LT Info chart palette, read through the dataviz categorical tokens the ltinfo theme pins
 * (src/styles/theme-ltinfo.css), each with its literal fallback. Components resolve these to a
 * real color at runtime before handing them to Leaflet.
 */
export const SERIES_COLORS: readonly string[] = [
  'var(--color-background-dataviz-categorical-1, #3e72b0)',
  'var(--color-background-dataviz-categorical-2, #e49937)',
  'var(--color-background-dataviz-categorical-3, #89bf40)',
  'var(--color-background-dataviz-categorical-4, #5a9cb0)',
  'var(--color-background-dataviz-categorical-5, #be4c4c)',
  'var(--color-background-dataviz-categorical-6, #646820)',
  'var(--color-background-dataviz-categorical-7, #89cad7)',
  'var(--color-background-dataviz-categorical-8, #2c5f72)',
];

/** Inactive sites and values with no configured color: the theme's disabled content gray. */
export const INACTIVE_COLOR = 'var(--color-content-disabled, #8d8d8d)';

/** Default overlay color when a config gives none (the reference used #646820, categorical 6). */
export const OVERLAY_COLOR = 'var(--color-background-dataviz-categorical-6, #646820)';

/** Server-side generalization for polygon and line layers drawn as GeoJSON (about 2 m in WGS84). */
export const SIMPLIFY: QueryParams = { geometryPrecision: 5, maxAllowableOffset: 0.00002 };

/* ---------- GeoJSON and fetch shapes ---------- */

export interface Geometry {
  type: string;
  coordinates: unknown;
}

export interface Feature {
  type: 'Feature';
  id?: number | string;
  geometry: Geometry | null;
  properties: Record<string, unknown>;
}

export interface FeatureCollection {
  type?: 'FeatureCollection';
  features?: Feature[];
  /** ArcGIS Server sets this at the top level of a GeoJSON page; some versions put it under properties. */
  exceededTransferLimit?: boolean;
  properties?: { exceededTransferLimit?: boolean };
  error?: { code?: number; message?: string };
}

/** The slice of fetch this module needs, so tests can pass a fake. */
export type FetchLike = (url: string) => Promise<{ json(): Promise<unknown> }>;

/** The query URL for a layer. Undefined and empty values are left out. */
export function queryUrl(layer: number, params: QueryParams, service: string = SERVICE): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  return `${service}/${layer}/query?${search.toString()}`;
}

export interface PagingOptions {
  pageSize?: number;
  service?: string;
  /** A ceiling on pages, so a server that always reports more cannot loop forever. */
  maxPages?: number;
}

/**
 * Every feature of a layer query as GeoJSON in WGS84, paged with resultOffset and
 * resultRecordCount until the service stops reporting exceededTransferLimit.
 */
export async function fetchGeoJson(
  fetchFn: FetchLike,
  layer: number,
  params: QueryParams,
  options: PagingOptions = {},
): Promise<Feature[]> {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const maxPages = options.maxPages ?? 100;
  const out: Feature[] = [];
  for (let page = 0; page < maxPages; page++) {
    const url = queryUrl(
      layer,
      { ...params, f: 'geojson', outSR: 4326, resultOffset: page * pageSize, resultRecordCount: pageSize },
      options.service,
    );
    const response = await fetchFn(url);
    const json = (await response.json()) as FeatureCollection | null;
    if (!json || typeof json !== 'object') throw new Error(`Layer ${layer} returned no JSON`);
    if (json.error) throw new Error(json.error.message || `Layer ${layer} query failed`);
    const features = Array.isArray(json.features) ? json.features : [];
    out.push(...features);
    const more = json.exceededTransferLimit === true || json.properties?.exceededTransferLimit === true;
    if (!more || features.length === 0) break;
  }
  return out;
}

/** Attribute rows from an f=json query, for statistics and group-by calls. */
export async function fetchAttributes(
  fetchFn: FetchLike,
  layer: number,
  params: QueryParams,
  service: string = SERVICE,
): Promise<Record<string, unknown>[]> {
  const response = await fetchFn(queryUrl(layer, { ...params, f: 'json' }, service));
  const json = (await response.json()) as {
    features?: { attributes: Record<string, unknown> }[];
    error?: { message?: string };
  } | null;
  if (!json || typeof json !== 'object') throw new Error(`Layer ${layer} returned no JSON`);
  if (json.error) throw new Error(json.error.message || `Layer ${layer} query failed`);
  return (json.features || []).map((f) => f.attributes || {});
}

/* ---------- Small shared helpers ---------- */

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

/** A four digit year from a year number, a "2024" string, a date string, or epoch milliseconds. */
export function yearOf(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value > 3000 ? new Date(value).getUTCFullYear() : Math.trunc(value);
  }
  const match = String(value).match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

/** Numbers with at most one decimal and a thousands separator; everything else as text. */
export function formatValue(value: unknown): string {
  if (typeof value === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return text(value);
}

/** "site" to "sites", "assessment unit" to "assessment units"; a unit that already ends in s is left alone. */
export function plural(count: number, unit: string): string {
  if (count === 1) return unit;
  return unit.endsWith('s') ? unit : `${unit}s`;
}

/** The count line over the list: "36 sites", "Showing 4 of 36 sites", or "No matches". */
export function countLine(total: number, shown: number, filtering: boolean, unit: string): string {
  const all = `${total.toLocaleString('en-US')} ${plural(total, unit)}`;
  if (!filtering) return all;
  return shown ? `Showing ${shown.toLocaleString('en-US')} of ${all}` : 'No matches';
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ---------- Sites from a layer with one feature per site per year ---------- */

/** The property names collapseSites reads from each feature, shared by map service layers and LT Info GeoJSON. */
export interface SiteFields {
  /** Site name field. */
  name: string;
  /** Optional site ID field; sites are keyed by it when present, else by name. */
  code?: string;
  /** Year field for layers with one feature per site per year. */
  year?: string;
  /** Optional date or year fields for layers with one feature per site that carry its first and last observation. */
  first?: string;
  last?: string;
  /** Optional field to group and color sites by. */
  status?: string;
  /** Optional 1/0 (or true/false) field marking active sites. */
  active?: string;
}

/** A program's sitesLayer in programs.json (see templates/README.md in the reference repo). */
export interface SitesLayerConfig extends SiteFields {
  layer: number;
  where?: string;
  /** What a site is called: "site", "station", "counter". */
  unit?: string;
}

export interface Site {
  key: string;
  name: string;
  code: string;
  /** First and last year observed, as text, or empty. */
  first: string;
  last: string;
  /** "1978 to 2025", "2024", or empty. */
  span: string;
  status: string | null;
  active: boolean | null;
  lat: number | null;
  lon: number | null;
}

/** Query parameters for a sitesLayer: its fields, filter, and year order so later features win. */
export function sitesQueryParams(cfg: SitesLayerConfig): QueryParams {
  const fields = unique([cfg.name, cfg.code, cfg.year, cfg.first, cfg.last, cfg.status, cfg.active].filter(Boolean) as string[]);
  return {
    where: cfg.where || '1=1',
    outFields: fields.join(','),
    returnGeometry: true,
    ...(cfg.year ? { orderByFields: cfg.year } : {}),
  };
}

export function spanText(first: string, last: string): string {
  if (!first) return '';
  return last && last !== first ? `${first} to ${last}` : first;
}

function pointLatLon(geometry: Geometry | null): [number, number] | null {
  if (!geometry || geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return null;
  const [lon, lat] = geometry.coordinates as number[];
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  return [lat, lon];
}

type SiteDraft = Site & { firstYear: number | null; lastYear: number | null };

/**
 * One site per code (or name) from a layer with one feature per site per year: the latest
 * feature's name, location, and status, with the first and last year from the year field.
 * A layer with one feature per site instead carries the record span in its first and last
 * fields (LT Info sites: FirstObservationDate and LastObservationDate). Sites with no geometry
 * in any year are kept with null coordinates so the list can show them as not mapped. Sorted
 * by name.
 */
export function collapseSites(features: Feature[], cfg: SiteFields): Site[] {
  const yearField = cfg.year;
  const ordered = yearField
    ? [...features].sort(
        (a, b) => (yearOf(a.properties?.[yearField]) ?? 0) - (yearOf(b.properties?.[yearField]) ?? 0),
      )
    : features;
  const byKey = new Map<string, SiteDraft>();
  for (const feature of ordered) {
    const a = feature.properties || {};
    const code = cfg.code ? a[cfg.code] : undefined;
    const key = text(code ?? a[cfg.name] ?? '').trim();
    if (!key) continue;
    const year = yearField ? yearOf(a[yearField]) : null;
    const site: SiteDraft = byKey.get(key) || {
      key,
      name: text(a[cfg.name]) || 'Site',
      code: cfg.code ? text(code) : '',
      first: '',
      last: '',
      span: '',
      status: null,
      active: null,
      lat: null,
      lon: null,
      firstYear: null,
      lastYear: null,
    };
    // Features arrive in year order, so later ones carry the current name, location, and status.
    if (text(a[cfg.name])) site.name = text(a[cfg.name]);
    const latLon = pointLatLon(feature.geometry);
    if (latLon) [site.lat, site.lon] = latLon;
    if (cfg.status) site.status = text(a[cfg.status]) || null;
    if (cfg.active) site.active = a[cfg.active] == null ? null : !!a[cfg.active];
    // The year field, and the first and last fields when the layer carries the span itself.
    const seen = [year, cfg.first ? yearOf(a[cfg.first]) : null, cfg.last ? yearOf(a[cfg.last]) : null];
    for (const y of seen) {
      if (!y) continue;
      site.firstYear = site.firstYear == null ? y : Math.min(site.firstYear, y);
      site.lastYear = site.lastYear == null ? y : Math.max(site.lastYear, y);
    }
    byKey.set(key, site);
  }
  return [...byKey.values()]
    .map(({ firstYear, lastYear, ...site }) => {
      const first = firstYear == null ? '' : String(firstYear);
      const last = lastYear == null ? '' : String(lastYear);
      return { ...site, first, last, span: spanText(first, last) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- Status groups and colors ---------- */

export const STATUS_ORDER: readonly string[] = ['Active', 'Monitoring station', 'Inactive'];

/** A site's group: its status field when set, else its active flag, else a plain monitoring station. */
export function siteStatus(site: Pick<Site, 'status' | 'active'>): string {
  if (site.status) return site.status;
  if (site.active == null) return 'Monitoring station';
  return site.active ? 'Active' : 'Inactive';
}

/** Active, Monitoring station, and Inactive first, then any other status alphabetically. */
export function orderStatuses(present: Iterable<string>): string[] {
  const set = unique([...present].filter(Boolean));
  return [
    ...STATUS_ORDER.filter((v) => set.includes(v)),
    ...set.filter((v) => !STATUS_ORDER.includes(v)).sort((a, b) => a.localeCompare(b)),
  ];
}

/**
 * A color per status. One status takes the single color given (the program's category color);
 * several take the dataviz categorical tokens in status order, except Inactive, which is gray.
 */
export function statusColors(statuses: Iterable<string>, singleColor: string): Record<string, string> {
  const order = orderStatuses(statuses);
  const out: Record<string, string> = {};
  if (order.length === 1) {
    out[order[0]] = singleColor;
    return out;
  }
  let index = 0;
  for (const status of order) {
    out[status] = status === 'Inactive' ? INACTIVE_COLOR : SERIES_COLORS[index++ % SERIES_COLORS.length];
  }
  return out;
}

/* ---------- List rows ---------- */

export interface ListItem {
  key: string;
  name: string;
  /** "1978 to 2025 · Station 12" or "Channeled Meadow · 16.7 acres". */
  meta: string;
  /** The group value, or null for the catch-all group. */
  group: string | null;
  color: string;
  /** False when the row has no geometry; it lists but cannot zoom. */
  mapped: boolean;
  /** Lowercase text the filter box matches against. */
  search: string;
}

export interface ListGroup {
  value: string | null;
  label: string;
}

export const META_SEPARATOR = ' · ';

export function siteGroups(sites: Site[]): ListGroup[] {
  return orderStatuses(sites.map(siteStatus)).map((v) => ({ value: v, label: v }));
}

/** List rows for sites, in status order then by name. */
export function siteListItems(sites: Site[], colors: Record<string, string>, fallback: string = INACTIVE_COLOR): ListItem[] {
  const order = orderStatuses(sites.map(siteStatus));
  return sites
    .map((site) => ({ site, status: siteStatus(site) }))
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.site.name.localeCompare(b.site.name))
    .map(({ site, status }) => ({
      key: site.key,
      name: site.name || 'Unnamed site',
      meta: [site.span, site.code ? `Station ${site.code}` : ''].filter(Boolean).join(META_SEPARATOR),
      group: status,
      color: colors[status] || fallback,
      mapped: site.lat != null && site.lon != null,
      search: [site.name, site.code, status].join(' ').toLowerCase(),
    }));
}

/* ---------- Where clauses ---------- */

/** A SQL literal for an ArcGIS where clause: text quoted with doubled apostrophes, numbers bare. */
export function sqlLiteral(value: string | number | boolean): string {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * A base filter joined with an equality on one field. The value is quoted when it is text, so a
 * string field such as Threshold_Year compares to '2023' rather than 2023 (the service answers
 * 400 to the unquoted form). An OR in the base filter is wrapped in parentheses first.
 */
export function buildWhere(
  base?: string | null,
  field?: string | null,
  value?: string | number | boolean | null,
): string {
  const parts: string[] = [];
  const trimmed = (base || '').trim();
  const equality = field && value != null && value !== '' ? `${field} = ${sqlLiteral(value)}` : '';
  if (trimmed) parts.push(equality && /\bor\b/i.test(trimmed) ? `(${trimmed})` : trimmed);
  if (equality) parts.push(equality);
  return parts.length ? parts.join(' AND ') : '1=1';
}

/* ---------- Area layers (polygons or lines from a mapLayer) ---------- */

export interface FieldLabel {
  field: string;
  label?: string;
  /** Appended to a meta value: " acres". */
  suffix?: string;
}

/** A program's mapLayer in programs.json. */
export interface MapLayerConfig {
  layer: number;
  title?: string;
  unit?: string;
  unitPlural?: string;
  /** Name field. */
  name?: string;
  colorBy?: string;
  colorByLabel?: string;
  colors?: Record<string, string>;
  labels?: Record<string, string>;
  /** A field to show one value of at a time, latest first. */
  pick?: string;
  pickLabel?: string;
  where?: string;
  /** "line" for routes and segments; "fill" (programs.json also writes "polygon") otherwise. */
  geometry?: 'fill' | 'line' | 'polygon';
  meta?: FieldLabel[];
  fields?: FieldLabel[];
  /** false for areas with no names worth listing; the map fills the panel. */
  list?: boolean;
  /** false to draw the areas on the home page map without counting them as mapped sites. */
  countAsSites?: boolean;
}

export function areaWhere(cfg: MapLayerConfig, picked?: string | number | null): string {
  return buildWhere(cfg.where, cfg.pick, picked);
}

/** Every field the map, list, popup, and CSV read, once each, OBJECTID first. */
export function areaOutFields(cfg: MapLayerConfig): string[] {
  return unique(
    [
      'OBJECTID',
      cfg.name,
      cfg.colorBy,
      cfg.pick,
      ...(cfg.meta || []).map((m) => m.field),
      ...(cfg.fields || []).map((f) => f.field),
    ].filter(Boolean) as string[],
  );
}

/** Query parameters for the areas shown for one picked value, generalized for GeoJSON unless simplify is false. */
export function areaQueryParams(cfg: MapLayerConfig, picked?: string | number | null, simplify: boolean = true): QueryParams {
  return {
    where: areaWhere(cfg, picked),
    outFields: areaOutFields(cfg).join(','),
    returnGeometry: true,
    ...(cfg.name ? { orderByFields: cfg.name } : {}),
    ...(simplify ? SIMPLIFY : {}),
  };
}

/** A group-by query that lists the values of the pick field with a count each. */
export function pickStatsParams(cfg: MapLayerConfig): QueryParams {
  return {
    where: cfg.where || '1=1',
    groupByFieldsForStatistics: cfg.pick,
    outStatistics: JSON.stringify([{ statisticType: 'count', onStatisticField: 'OBJECTID', outStatisticFieldName: 'n' }]),
    returnGeometry: false,
  };
}

/** Distinct pick values, latest first. Numbers and numeric strings sort numerically; other text sorts reverse alphabetically. */
export function pickChoices(rows: Record<string, unknown>[], field: string): (string | number)[] {
  const values = unique(rows.map((r) => r[field]).filter((v) => v != null && v !== '') as (string | number)[]);
  const numeric = values.every((v) => typeof v === 'number' || /^-?\d+(\.\d+)?$/.test(String(v)));
  return values.sort((a, b) => (numeric ? Number(b) - Number(a) : String(b).localeCompare(String(a))));
}

export function areaLabel(cfg: MapLayerConfig, value: unknown): string {
  const key = text(value);
  return (cfg.labels && cfg.labels[key]) || key;
}

/** The configured color for a colorBy value, gray when the value has none, the fallback when the layer has no colorBy. */
export function areaColor(cfg: MapLayerConfig, value: unknown, fallback: string): string {
  if (!cfg.colorBy) return fallback;
  if (value == null || value === '') return INACTIVE_COLOR;
  return (cfg.colors && cfg.colors[text(value)]) || INACTIVE_COLOR;
}

/** List groups: one per configured color in config order, then Other; a layer without colorBy has one unlabeled group. */
export function areaGroups(cfg: MapLayerConfig): ListGroup[] {
  if (!cfg.colorBy) return [{ value: null, label: '' }];
  return [
    ...Object.keys(cfg.colors || {}).map((v) => ({ value: v, label: areaLabel(cfg, v) })),
    { value: null, label: 'Other' },
  ];
}

/** The key the map and list share for a feature: its GeoJSON id, else OBJECTID. */
export function featureKey(feature: Feature): string {
  return text(feature.id ?? feature.properties?.OBJECTID ?? '');
}

/** "Channeled Meadow · 16.7 acres" from the meta fields that have a value. */
export function metaText(meta: FieldLabel[] | undefined, props: Record<string, unknown>): string {
  return (meta || [])
    .map((m) => (props[m.field] == null || props[m.field] === '' ? '' : `${formatValue(props[m.field])}${m.suffix || ''}`))
    .filter(Boolean)
    .join(META_SEPARATOR);
}

/** List rows for areas, sorted by name. Values without a configured color file under the Other group. */
export function areaListItems(cfg: MapLayerConfig, features: Feature[], fallback: string): ListItem[] {
  const known = new Set(Object.keys(cfg.colors || {}));
  const unit = cfg.unit || 'area';
  return features
    .map((feature) => {
      const props = feature.properties || {};
      const value = cfg.colorBy ? props[cfg.colorBy] : null;
      const name = (cfg.name && text(props[cfg.name])) || `Unnamed ${unit}`;
      return {
        key: featureKey(feature),
        name,
        meta: metaText(cfg.meta, props),
        group: cfg.colorBy && value != null && known.has(text(value)) ? text(value) : null,
        color: areaColor(cfg, value, fallback),
        mapped: !!feature.geometry,
        search: [name, cfg.colorBy ? areaLabel(cfg, value) : '', text(value)].join(' ').toLowerCase(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- Legends and popups ---------- */

export interface LegendEntry {
  label: string;
  color: string;
  /** How the swatch is drawn. */
  shape: 'point' | 'line' | 'fill';
}

export function sitesLegend(colors: Record<string, string>): LegendEntry[] {
  return orderStatuses(Object.keys(colors)).map((status) => ({ label: status, color: colors[status], shape: 'point' }));
}

export function areaLegend(cfg: MapLayerConfig, fallback: string): LegendEntry[] {
  const shape = cfg.geometry === 'line' ? 'line' : 'fill';
  if (!cfg.colorBy) return [{ label: cfg.title || 'Areas', color: fallback, shape }];
  return Object.entries(cfg.colors || {}).map(([value, color]) => ({ label: areaLabel(cfg, value), color, shape }));
}

export type PopupValue = string | { href: string; text: string };

/** The popupCard pattern: a status pill, stat tiles, label and value rows, and a foot line. */
export interface PopupCard {
  title: string;
  pill?: { text: string; color: string } | null;
  stats?: [string, string][];
  rows?: [string, PopupValue][];
  foot?: string;
}

/** A URL becomes a link; everything else is formatted text. */
export function popupValue(value: unknown): PopupValue {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) return { href: value, text: 'Open website' };
  return formatValue(value);
}

/** Label and value rows for the configured fields that have a value, skipping any named in skip. */
export function fieldRows(
  fields: FieldLabel[] | undefined,
  props: Record<string, unknown>,
  skip: (string | undefined)[] = [],
): [string, PopupValue][] {
  const skipped = new Set(skip.filter(Boolean));
  return (fields || [])
    .filter((f) => !skipped.has(f.field))
    .map((f) => [f.label || f.field, popupValue(props[f.field])] as [string, PopupValue])
    .filter(([, value]) => value !== '');
}

export function sitePopup(site: Site, color: string, foot?: string): PopupCard {
  const first = yearOf(site.first);
  const last = yearOf(site.last);
  const stats: [string, string][] = [
    ['First record', site.first],
    ['Latest record', last != null && last !== first ? site.last : ''],
    ['Years spanned', first != null && last != null ? String(last - first + 1) : ''],
  ];
  return {
    title: site.name || 'Site',
    pill: { text: siteStatus(site), color },
    stats: stats.filter(([, value]) => value !== ''),
    rows: site.code ? [['Station ID', site.code]] : [],
    foot,
  };
}

export function areaPopup(cfg: MapLayerConfig, feature: Feature, fallback: string, foot?: string): PopupCard {
  const props = feature.properties || {};
  const value = cfg.colorBy ? props[cfg.colorBy] : null;
  return {
    title: (cfg.name && text(props[cfg.name])) || cfg.title || 'Area',
    pill: cfg.colorBy && value != null && value !== '' ? { text: areaLabel(cfg, value), color: areaColor(cfg, value, fallback) } : null,
    rows: fieldRows(cfg.fields, props, [cfg.colorBy, cfg.name]),
    foot,
  };
}

/* ---------- Overlays: reference layers drawn under the program layer ---------- */

/** One entry of a program's overlays in programs.json. */
export interface OverlayConfig {
  layer: number;
  title: string;
  /** Field for the popup title; the overlay title when absent. */
  name?: string;
  geometry?: 'point' | 'line' | 'fill';
  color?: string;
  where?: string;
  fields?: FieldLabel[];
}

export function overlayQueryParams(cfg: OverlayConfig, simplify: boolean = true): QueryParams {
  const fields = unique([cfg.name, ...(cfg.fields || []).map((f) => f.field)].filter(Boolean) as string[]);
  return {
    where: cfg.where || '1=1',
    outFields: fields.join(',') || '*',
    returnGeometry: true,
    ...(simplify && cfg.geometry !== 'point' ? SIMPLIFY : {}),
  };
}

export function overlayPopup(cfg: OverlayConfig, feature: Feature, foot?: string): PopupCard {
  const props = feature.properties || {};
  return {
    title: (cfg.name && text(props[cfg.name])) || cfg.title,
    pill: { text: cfg.title, color: cfg.color || OVERLAY_COLOR },
    rows: fieldRows(cfg.fields, props),
    foot,
  };
}

/* ---------- Layer specs: what mon-map draws ---------- */

/** The program's own layer, as GeoJSON features plus the functions that key, color, and describe each one. */
export interface ProgramLayerSpec {
  title: string;
  geometry: 'point' | 'fill' | 'line';
  features: Feature[];
  key: (feature: Feature) => string;
  color: (feature: Feature) => string;
  popup: (feature: Feature) => PopupCard;
  legend: LegendEntry[];
}

export interface OverlaySpec {
  title: string;
  geometry: 'point' | 'fill' | 'line';
  color: string;
  features: Feature[];
  popup: (feature: Feature) => PopupCard;
}

export interface MapLayers {
  program: ProgramLayerSpec;
  overlays: OverlaySpec[];
}

/** A site as a GeoJSON point feature keyed by its site key; sites without a location are left out. */
export function siteFeatures(sites: Site[]): Feature[] {
  return sites
    .filter((s) => s.lat != null && s.lon != null)
    .map((s) => ({
      type: 'Feature',
      id: s.key,
      geometry: { type: 'Point', coordinates: [s.lon as number, s.lat as number] },
      properties: { key: s.key, name: s.name, status: siteStatus(s) },
    }));
}

export function sitesLayerSpec(
  cfg: SitesLayerConfig,
  sites: Site[],
  colors: Record<string, string>,
  foot?: string,
  title?: string,
): ProgramLayerSpec {
  const byKey = new Map(sites.map((s) => [s.key, s]));
  const colorOf = (site: Site) => colors[siteStatus(site)] || INACTIVE_COLOR;
  const siteOf = (feature: Feature) => byKey.get(text(feature.properties?.key ?? feature.id));
  const unitTitle = cfg.unit ? `Monitoring ${plural(2, cfg.unit)}` : 'Monitoring sites';
  return {
    title: title || unitTitle,
    geometry: 'point',
    features: siteFeatures(sites),
    key: (feature) => text(feature.properties?.key ?? feature.id),
    color: (feature) => {
      const site = siteOf(feature);
      return site ? colorOf(site) : INACTIVE_COLOR;
    },
    popup: (feature) => {
      const site = siteOf(feature);
      return site ? sitePopup(site, colorOf(site), foot) : { title: text(feature.properties?.name) || 'Site', foot };
    },
    legend: sitesLegend(colors),
  };
}

export function areasLayerSpec(cfg: MapLayerConfig, features: Feature[], fallback: string, foot?: string): ProgramLayerSpec {
  return {
    title: cfg.title || 'Areas',
    geometry: cfg.geometry === 'line' ? 'line' : 'fill',
    features,
    key: featureKey,
    color: (feature) => areaColor(cfg, cfg.colorBy ? feature.properties?.[cfg.colorBy] : null, fallback),
    popup: (feature) => areaPopup(cfg, feature, fallback, foot),
    legend: areaLegend(cfg, fallback),
  };
}

export function overlaySpec(cfg: OverlayConfig, features: Feature[], foot?: string): OverlaySpec {
  return {
    title: cfg.title,
    geometry: cfg.geometry || 'point',
    color: cfg.color || OVERLAY_COLOR,
    features,
    popup: (feature) => overlayPopup(cfg, feature, foot),
  };
}

/* ---------- CSV ---------- */

/** RFC 4180 style text: cells with commas, quotes, or line breaks are quoted; rows end in CRLF. */
export function csvText(columns: string[], rows: Record<string, unknown>[]): string {
  const cell = (value: unknown) => {
    const t = text(value);
    return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [columns.map(cell).join(','), ...rows.map((row) => columns.map((c) => cell(row[c])).join(','))].join('\r\n');
}

export const SITES_CSV_COLUMNS: readonly string[] = ['Site', 'Status', 'First observation', 'Last observation', 'Latitude', 'Longitude'];

export function sitesCsvRows(sites: Site[]): Record<string, unknown>[] {
  const order = orderStatuses(sites.map(siteStatus));
  return sites
    .map((site) => ({ site, status: siteStatus(site) }))
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.site.name.localeCompare(b.site.name))
    .map(({ site, status }) => ({
      Site: site.name,
      Status: status,
      'First observation': site.first,
      'Last observation': site.last,
      Latitude: site.lat ?? '',
      Longitude: site.lon ?? '',
    }));
}

/** Every site, whatever the list filter shows, with the six standard columns. */
export function sitesCsv(sites: Site[]): string {
  return csvText([...SITES_CSV_COLUMNS], sitesCsvRows(sites));
}

export interface CsvFile {
  fileName: string;
  columns: string[];
  text: string;
}

/** The areas shown for the picked value: name, colorBy, the configured fields, and the pick field when set. */
export function areasCsv(
  cfg: MapLayerConfig,
  features: Feature[],
  picked?: string | number | null,
  programName: string = 'areas',
): CsvFile {
  const fields = unique([cfg.name, cfg.colorBy, ...(cfg.fields || []).map((f) => f.field)].filter(Boolean) as string[]);
  const label = (field: string) => {
    if (field === cfg.name) return 'Name';
    const configured = (cfg.fields || []).find((f) => f.field === field);
    if (configured && configured.label) return configured.label;
    return field === cfg.colorBy ? cfg.colorByLabel || field : field;
  };
  const columns = fields.map(label);
  const hasPick = cfg.pick && picked != null && picked !== '';
  const pickColumn = hasPick ? cfg.pickLabel || (cfg.pick as string) : '';
  if (pickColumn) columns.push(pickColumn);
  const rows = features.map((feature) => {
    const props = feature.properties || {};
    const row: Record<string, unknown> = Object.fromEntries(fields.map((f) => [label(f), props[f] ?? '']));
    if (pickColumn) row[pickColumn] = picked;
    return row;
  });
  const suffix = hasPick ? `-${slugify(String(picked))}` : '';
  const fileName = `${slugify(programName)}-${slugify(cfg.title || 'areas')}${suffix}.csv`;
  return { fileName, columns, text: csvText(columns, rows) };
}

/* ---------- The sites panel: one config for every site source ---------- */

/**
 * LT Info sites as GeoJSON (the hook for programs with neither sitesLayer nor mapLayer).
 * The URL answers a FeatureCollection of points, one per site, whose properties carry the
 * fields named here. The LT Info route is
 * /monitoring-programs/{id}/sites-as-feature-collection and its properties are
 * MonitoringSiteName, Active, FirstObservationDate, and LastObservationDate; pass them as
 * name, active, first, and last. The URL itself comes from src/lib/ltinfo-api.ts.
 */
export interface GeoJsonSitesConfig extends SiteFields {
  url: string;
  /** Link for the source line when url is not linkable (a data: URL); the url itself when omitted. */
  sourceHref?: string;
  /** What a site is called: "site" when omitted. */
  unit?: string;
  /** Link for the source line; the URL itself when omitted. */
  sourceLabel?: string;
}

/**
 * What <mon-sites-panel> reads from its data-config attribute: the program's site source
 * (exactly one of sitesLayer, mapLayer, or geojson is used, in that order of preference),
 * the overlays drawn under it, and the program name and category color for popups, legends,
 * and CSV file names. Mirrors the programs.json keys so a program entry maps onto it directly.
 */
export interface SitesPanelConfig {
  program: string;
  /** The category theme color from programs.json; sites with one status and areas without colorBy take it. */
  color: string;
  sitesLayer?: SitesLayerConfig;
  mapLayer?: MapLayerConfig;
  overlays?: OverlayConfig[];
  geojson?: GeoJsonSitesConfig;
}

export type SitesSourceKind = 'sites' | 'areas' | 'geojson' | 'none';

/** Which source the panel will load, in the order of preference the page template used. */
export function sitesSourceKind(cfg: SitesPanelConfig): SitesSourceKind {
  if (cfg.mapLayer) return 'areas';
  if (cfg.sitesLayer) return 'sites';
  if (cfg.geojson) return 'geojson';
  return 'none';
}

/** What one row is called: the configured unit, else "site". */
export function sitesPanelUnit(cfg: SitesPanelConfig): string {
  return cfg.mapLayer?.unit || cfg.sitesLayer?.unit || cfg.geojson?.unit || 'site';
}

/** The card title: the area layer's title, else "Monitoring sites" in the panel's unit. */
export function sitesPanelTitle(cfg: SitesPanelConfig): string {
  if (cfg.mapLayer?.title) return cfg.mapLayer.title;
  return `Monitoring ${plural(2, sitesPanelUnit(cfg))}`;
}

/** The source line under the map: the layer behind it, or the GeoJSON URL. */
export function sitesPanelSource(cfg: SitesPanelConfig, service: string = SERVICE): { href: string; label: string } | undefined {
  const layer = cfg.mapLayer?.layer ?? cfg.sitesLayer?.layer;
  if (layer != null) {
    const what = cfg.mapLayer?.title || `${plural(2, sitesPanelUnit(cfg))}`;
    return { href: `${service}/${layer}`, label: `TRPA LTInfo_Monitoring map service, layer ${layer} (${what})` };
  }
  if (cfg.geojson) return { href: cfg.geojson.sourceHref || cfg.geojson.url, label: cfg.geojson.sourceLabel || 'Lake Tahoe Info monitoring sites (GeoJSON)' };
  return undefined;
}

/* ---------- Record years and the summary tiles ---------- */

/**
 * The calendar years named in a list of values: whole numbers between 1900 and 2100, epoch
 * milliseconds (UTC year), and every 19xx or 20xx run of digits in a string, so "2016-2019"
 * yields both. Unique, ascending. Ported from noteYears in the reference template.
 */
export function recordYears(values: Iterable<unknown>): number[] {
  const out = new Set<number>();
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      const y = v > 3000 ? new Date(v).getUTCFullYear() : Math.trunc(v);
      if (y >= 1900 && y <= 2100) out.add(y);
    } else if (typeof v === 'string') {
      for (const m of v.matchAll(/\b(?:19|20)\d{2}\b/g)) out.add(Number(m[0]));
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** What the sites panel loaded, posted on the mon-sites:loaded event for the tiles. */
export interface SitesSummary {
  kind: 'sites' | 'areas';
  unit: string;
  unitPlural: string;
  total: number;
  /** Rows with a location. */
  mapped: number;
  /** Count of sites flagged active, or null when the source has no active flag. */
  active: number | null;
  /** The picked value (an evaluation year) when the layer has a pick, else null. */
  picked: string | number | null;
  /** First and last years across the rows, for the Record began and Latest data tiles. */
  years: number[];
}

export function sitesSummary(cfg: SitesPanelConfig, sites: Site[]): SitesSummary {
  const unit = sitesPanelUnit(cfg);
  const hasActive = !!(cfg.sitesLayer?.active || cfg.geojson?.active);
  return {
    kind: 'sites',
    unit,
    unitPlural: plural(2, unit),
    total: sites.length,
    mapped: sites.filter((s) => s.lat != null && s.lon != null).length,
    active: hasActive ? sites.filter((s) => s.active === true).length : null,
    picked: null,
    years: recordYears(sites.flatMap((s) => [s.first, s.last])),
  };
}

export function areasSummary(cfg: SitesPanelConfig, features: Feature[], picked: string | number | null): SitesSummary {
  const layer = cfg.mapLayer;
  const unit = sitesPanelUnit(cfg);
  return {
    kind: 'areas',
    unit,
    unitPlural: layer?.unitPlural || plural(2, unit),
    total: features.length,
    mapped: features.filter((f) => !!f.geometry).length,
    active: null,
    picked: picked ?? null,
    years: recordYears(picked == null ? [] : [picked]),
  };
}

export type PanelState = 'loading' | 'ready' | 'empty' | 'error';

export interface Tile {
  key: 'total' | 'active' | 'first' | 'last';
  label: string;
  value: string;
  sub: string;
}

/** Everything the four tiles are computed from, kept by the page script as data arrives. */
export interface TileState {
  /** The program has a sitesLayer, mapLayer, or geojson source. */
  hasSiteSource: boolean;
  /** The program has measures or a sitesPerYear chart, so dated records may arrive. */
  hasDatedCharts: boolean;
  sitesState: PanelState;
  sites: SitesSummary | null;
  /** Chart panels still loading. */
  chartsPending: number;
  /** Every year seen so far: chart x values, site spans, and the sites-per-year count. */
  years: number[];
}

export const TILE_LOADING = '…';
export const TILE_NA = 'n/a';

/** The tile state a page starts with, before any data arrives. */
export function initialTileState(hasSiteSource: boolean, chartCount: number): TileState {
  return {
    hasSiteSource,
    hasDatedCharts: chartCount > 0,
    sitesState: hasSiteSource ? 'loading' : 'empty',
    sites: null,
    chartsPending: chartCount,
    years: [],
  };
}

/**
 * The four summary tiles. Each shows "n/a" with a sub line that says why when the page has no
 * source for it, the loading mark while a source is in flight, and the number once it lands.
 * Ported from the kpi() calls and noteYears() in the reference template.
 */
export function summaryTiles(state: TileState): Tile[] {
  const { sites } = state;
  const n = (v: number) => v.toLocaleString('en-US');

  let total: Tile;
  let active: Tile;
  if (!state.hasSiteSource) {
    total = { key: 'total', label: 'Total sites', value: TILE_NA, sub: 'No site source yet' };
    active = { key: 'active', label: 'Active sites', value: TILE_NA, sub: 'No site source yet' };
  } else if (state.sitesState === 'loading') {
    total = { key: 'total', label: 'Total sites', value: TILE_LOADING, sub: 'Loading' };
    active = { key: 'active', label: 'Active sites', value: TILE_LOADING, sub: 'Loading' };
  } else if (state.sitesState === 'error') {
    total = { key: 'total', label: 'Total sites', value: TILE_NA, sub: 'Sites could not be loaded' };
    active = { key: 'active', label: 'Active sites', value: TILE_NA, sub: 'Sites could not be loaded' };
  } else if (!sites || sites.total === 0) {
    total = { key: 'total', label: 'Total sites', value: TILE_NA, sub: 'No fixed sites' };
    active = { key: 'active', label: 'Active sites', value: TILE_NA, sub: 'No fixed sites' };
  } else if (sites.kind === 'areas') {
    const pickedText = sites.picked != null && sites.picked !== '' ? `, ${sites.picked}` : '';
    total = { key: 'total', label: 'Total sites', value: n(sites.total), sub: `${sites.unitPlural}${pickedText}` };
    active = { key: 'active', label: 'Active sites', value: TILE_NA, sub: `Not tracked for ${sites.unitPlural.toLowerCase()}` };
  } else {
    total = { key: 'total', label: 'Total sites', value: n(sites.total), sub: `${n(sites.mapped)} mapped` };
    active =
      sites.active == null
        ? { key: 'active', label: 'Active sites', value: TILE_NA, sub: 'No active flag in the source' }
        : { key: 'active', label: 'Active sites', value: n(sites.active), sub: 'Marked active in the source' };
  }

  const years = recordYears(state.years);
  const waiting = state.chartsPending > 0 || (state.hasSiteSource && state.sitesState === 'loading');
  let first: Tile;
  let last: Tile;
  if (years.length) {
    first = { key: 'first', label: 'Record began', value: String(years[0]), sub: 'First year in the data' };
    last = { key: 'last', label: 'Latest data', value: String(years[years.length - 1]), sub: 'Most recent year in the data' };
  } else if (waiting && (state.hasDatedCharts || state.hasSiteSource)) {
    first = { key: 'first', label: 'Record began', value: TILE_LOADING, sub: 'Loading' };
    last = { key: 'last', label: 'Latest data', value: TILE_LOADING, sub: 'Loading' };
  } else {
    first = { key: 'first', label: 'Record began', value: TILE_NA, sub: 'No dated records' };
    last = { key: 'last', label: 'Latest data', value: TILE_NA, sub: 'No dated records' };
  }
  return [total, active, first, last];
}
