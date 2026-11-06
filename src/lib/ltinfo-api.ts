/**
 * Build-time access to the Lake Tahoe Info API (internalapi.laketahoeinfo.org).
 *
 * Decision 5 in docs/v2-framework-plan.md: program text, partners, indicators,
 * documents, images, and sites are fetched in Astro frontmatter (Node) and a
 * nightly CI rebuild keeps them fresh. The rules this module enforces:
 *
 * - Every request has a 15 second timeout (AbortSignal.timeout).
 * - An in-process memo means a build fetches each route once, however many pages
 *   or components ask for it.
 * - LTINFO_OFFLINE=1 skips the network entirely and serves recorded fixtures.
 * - Any failure (timeout, network error, non-2xx, bad JSON) falls back to the
 *   fixture at tests/fixtures/ltinfo/<id>/<route>.json when one exists, else to
 *   null, with one console.warn per failure naming the route. Nothing here
 *   throws out of a page build because of the network.
 *
 * The response types below were derived from live responses on Nov. 5, 2026
 * (see the fixtures); LT Info publishes no schema. Fields the pages do not read
 * are typed loosely so a CMS change does not break the build.
 *
 * Node only: no DOM, no Astro imports, so tests run under `node --test`.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Program } from './programs.ts';

export const LTINFO_API = 'https://internalapi.laketahoeinfo.org';
export const LTINFO_MONITORING = 'https://monitoring.laketahoeinfo.org';
export const LTINFO_THRESHOLDS = 'https://thresholds.laketahoeinfo.org';
export const FETCH_TIMEOUT_MS = 15_000;

/* ---------- Response types ---------- */

/** `Dashboard` on a program record when the admin has configured one. */
export interface ProgramDashboard {
  MonitoringProgramDashboardID: number;
  /** External dashboard URL. Null when an HTML file was uploaded instead. */
  DashboardUrl: string | null;
  DashboardDescription: string | null;
  /** Frame height in pixels set by the admin, or null for the default. */
  DashboardHeight: number | null;
  DashboardWidth: number | null;
  FileResourceInfoID: number | null;
  /** Uploaded HTML dashboard, served at /file-resources/embedded/{guid}. */
  FileResourceGUID: string | null;
}

/** GET /monitoring-programs/{id} */
export interface ProgramRecord {
  MonitoringProgramID: number;
  MonitoringProgramName: string;
  ShortName: string | null;
  VanityUrl: string | null;
  /** CMS rich text (HTML). Sanitize before rendering. */
  MonitoringApproach: string | null;
  MonitoringProgramUrl: string | null;
  /** CMS rich text (HTML). Sanitize before rendering. */
  MonitoringProgramDescription: string | null;
  /** Plain text, may contain newlines. */
  MonitoringProgramPartnersDescription: string | null;
  IsSiteLocationUserDefined: boolean;
  /** Heading the host uses over the partner list, for example "Partners". */
  OrganizationRelationshipLabel: string | null;
  SiteLabel: string | null;
  SiteLabelPlural: string | null;
  IsFeaturedProgram: boolean;
  MonitoringProgramTypeID: number;
  MonitoringProgramTypeDisplayName: string | null;
  MonitoringProgramCategoryID: number | null;
  MonitoringProgramCategoryDisplayName: string | null;
  NumberOfSites: number;
  IsTransitProgram: boolean;
  IsCustomType: boolean;
  Dashboard: ProgramDashboard | null;
  HasExternalDataSources: boolean;
  KeyImageFileResourceInfoID: number | null;
  /** Upper-case GUID on the record; the images route returns it lower-case. */
  KeyImageFileResourceGUID: string | null;
  CurrentPersonCanManage?: boolean;
  CurrentPersonCanReport?: boolean;
}

/** One row of GET /monitoring-programs/{id}/partners */
export interface Partner {
  MonitoringProgramPartnerID: number;
  OrganizationID: number;
  OrganizationName: string;
  OrganizationShortName: string | null;
  LogoFileResourceGuid: string | null;
  SortOrder: number;
  /** Not in the API today. Typed so a link renders if LT Info adds one. */
  OrganizationUrl?: string | null;
}

/** One row of GET /monitoring-programs/{id}/indicators */
export interface Indicator {
  IndicatorID: number;
  IndicatorDisplayName: string;
}

/** One row of GET /monitoring-programs/{id}/documents */
export interface ProgramDocument {
  MonitoringProgramDocumentID: number;
  MonitoringProgramID: number;
  FileResourceInfoID: number;
  FileResourceGUID: string;
  DisplayName: string;
  /** ISO date, "2024-11-14". */
  UploadDate: string | null;
  DocumentDescription: string | null;
  OriginalFileName: string | null;
  /** With the dot: ".pdf", ".docx". */
  FileExtension: string | null;
}

/** One row of GET /monitoring-programs/{id}/images */
export interface ProgramImage {
  MonitoringProgramImageID: number;
  MonitoringProgramID: number;
  FileResourceInfoID: number;
  FileResourceGUID: string;
  Caption: string | null;
  SortOrder: number;
  IsKeyPhoto: boolean;
  PhotoCredit: string | null;
}

/** One row of GET /monitoring-programs/{id}/sites?activeOnly=false */
export interface MonitoringSite {
  MonitoringSiteID: number;
  MonitoringSiteName: string;
  Description: string | null;
  CanonicalName: string | null;
  Active: boolean;
  MonitoringSiteColor: string | null;
  MonitoringProgramID: number;
  MonitoringProgramName: string | null;
  /** Null on every row seen so far; coordinates come from the feature collection. */
  Latitude: number | null;
  Longitude: number | null;
  StationCount: number;
  CollisionCount: number;
  FirstObservationDate: string | null;
  LastObservationDate: string | null;
  Organizations: unknown[];
  Metadata: unknown[];
}

/** GET /monitoring-programs/{id}/sites-as-feature-collection (GeoJSON points) */
export interface SiteFeature {
  type: 'Feature';
  /**
   * A point, or null. The API has returned `coordinates: []` for a site with no
   * location (Streams, site 2022 in the Nov. 5, 2026 fixture), so check the length
   * before reading [lon, lat].
   */
  geometry: { type: 'Point'; coordinates: number[] } | null;
  properties: {
    MonitoringSiteID: number;
    MonitoringSiteName: string;
    CanonicalName: string | null;
    LayerColor: string | null;
    [key: string]: unknown;
  };
}
export interface SiteFeatureCollection {
  type: 'FeatureCollection';
  features: SiteFeature[];
}

/** One row of GET /monitoring-programs (every program). */
export interface ProgramListItem {
  MonitoringProgramID: number;
  MonitoringProgramName: string;
  ShortName: string | null;
  MonitoringProgramTypeID: number;
  MonitoringProgramTypeDisplayName: string | null;
  MonitoringProgramCategoryID: number | null;
  MonitoringProgramCategoryDisplayName: string | null;
  IsFeaturedProgram: boolean;
  NumberOfSites: number;
  KeyPhotoFileResourceInfoGUID: string | null;
  [key: string]: unknown;
}

/* ---------- Routes ---------- */

export type RouteName =
  | 'record'
  | 'partners'
  | 'indicators'
  | 'documents'
  | 'images'
  | 'sites'
  | 'feature-collection';

export const ROUTE_NAMES: readonly RouteName[] = [
  'record',
  'partners',
  'indicators',
  'documents',
  'images',
  'sites',
  'feature-collection',
];

/** The API path for a program route. */
export function routePath(id: number, route: RouteName): string {
  const base = `/monitoring-programs/${id}`;
  switch (route) {
    case 'record':
      return base;
    case 'sites':
      return `${base}/sites?activeOnly=false`;
    case 'feature-collection':
      return `${base}/sites-as-feature-collection`;
    default:
      return `${base}/${route}`;
  }
}

/** The URL a file resource GUID (image, document) is served from. */
export function fileResourceUrl(guid: string): string {
  return `${LTINFO_API}/file-resources/${guid.toLowerCase()}`;
}

/** The URL of an uploaded HTML dashboard file resource. */
export function embeddedFileResourceUrl(guid: string): string {
  return `${LTINFO_API}/file-resources/embedded/${guid.toLowerCase()}`;
}

/** The Threshold Dashboard page for an indicator (the host links `/indicators/{IndicatorID}`). */
export function indicatorHref(indicator: Pick<Indicator, 'IndicatorID'>): string {
  return `${LTINFO_THRESHOLDS}/indicators/${indicator.IndicatorID}`;
}

/** The program's own page on monitoring.laketahoeinfo.org, by vanity URL when set. */
export function programPageHref(record: Pick<ProgramRecord, 'MonitoringProgramID' | 'VanityUrl'>): string {
  const slug = record.VanityUrl && record.VanityUrl.trim() ? record.VanityUrl.trim() : String(record.MonitoringProgramID);
  return `${LTINFO_MONITORING}/monitoring-programs/${slug}`;
}

/** The dashboard frame source: the admin's URL, else an uploaded HTML file, else null. */
export function dashboardSrc(dashboard: ProgramDashboard | null | undefined): string | null {
  if (!dashboard) return null;
  const url = dashboard.DashboardUrl && dashboard.DashboardUrl.trim();
  if (url) return url;
  if (dashboard.FileResourceGUID) return embeddedFileResourceUrl(dashboard.FileResourceGUID);
  return null;
}

/** The key photo: the image flagged IsKeyPhoto, else the first image, else the record's GUID. */
export interface KeyPhoto {
  guid: string;
  url: string;
  caption: string;
  credit: string;
}
export function keyPhoto(images: ProgramImage[] | null | undefined, record?: ProgramRecord | null): KeyPhoto | null {
  const list = images ?? [];
  const pick = list.find((i) => i.IsKeyPhoto) ?? list[0];
  const guid = pick?.FileResourceGUID ?? record?.KeyImageFileResourceGUID ?? null;
  if (!guid) return null;
  return {
    guid,
    url: fileResourceUrl(guid),
    caption: (pick?.Caption ?? '').trim(),
    credit: (pick?.PhotoCredit ?? '').trim(),
  };
}

/** The upper-case file type of a document from its extension: ".docx" to "DOCX". */
export function documentType(doc: Pick<ProgramDocument, 'FileExtension' | 'OriginalFileName'>): string {
  const ext = doc.FileExtension ?? '';
  return ext.replace(/^\./, '').toUpperCase();
}

const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

/** An ISO date as TRPA style text: "Nov. 14, 2024". Empty string for null or unparseable input. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1];
  if (!month) return '';
  return `${month} ${Number(d)}, ${y}`;
}

/* ---------- Fetching ---------- */

export type ContentSource = 'live' | 'fixture' | 'none';

export interface RouteResult<T> {
  data: T | null;
  source: ContentSource;
  /** ISO time the data was fetched, or the fixture's recording time, or null. */
  fetchedAt: string | null;
}

export interface FetchOptions {
  /** Replace global fetch (tests). */
  fetchImpl?: typeof fetch;
  /** Skip the network and use fixtures. Defaults to LTINFO_OFFLINE=1. */
  offline?: boolean;
  /** Where fixtures live. Defaults to tests/fixtures/ltinfo under the repo root. */
  fixturesDir?: string;
  timeoutMs?: number;
  /** Replace console.warn (tests). */
  warn?: (message: string) => void;
  /** Bypass the memo (tests and the recorder). */
  noMemo?: boolean;
}

const memo = new Map<string, Promise<RouteResult<unknown>>>();

/** Forget every memoized response. Tests call this between cases. */
export function clearMemo(): void {
  memo.clear();
}

function isOffline(opts: FetchOptions): boolean {
  if (typeof opts.offline === 'boolean') return opts.offline;
  const v = process.env.LTINFO_OFFLINE;
  return v === '1' || v === 'true';
}

/** The default fixtures folder: <repo>/tests/fixtures/ltinfo, from this file's location, else from cwd. */
export function defaultFixturesDir(): string {
  const fromModule = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'fixtures', 'ltinfo');
  if (existsSync(path.dirname(fromModule))) return fromModule;
  return path.resolve(process.cwd(), 'tests', 'fixtures', 'ltinfo');
}

/** The fixture file for a program route. */
export function fixturePath(id: number, route: RouteName, fixturesDir = defaultFixturesDir()): string {
  return path.join(fixturesDir, String(id), `${route}.json`);
}

interface FixtureMeta {
  recordedAt?: string;
}

function readFixture<T>(id: number, route: RouteName, fixturesDir: string): RouteResult<T> | null {
  const file = fixturePath(id, route, fixturesDir);
  if (!existsSync(file)) return null;
  try {
    const data = JSON.parse(readFileSync(file, 'utf8')) as T;
    let recordedAt: string | null = null;
    const metaFile = path.join(fixturesDir, String(id), 'meta.json');
    if (existsSync(metaFile)) {
      const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as FixtureMeta;
      recordedAt = meta.recordedAt ?? null;
    }
    return { data, source: 'fixture', fetchedAt: recordedAt };
  } catch {
    return null;
  }
}

/**
 * Fetch one program route as JSON. Live when it can be, a fixture when it
 * cannot, null when neither exists. Never throws for network reasons.
 */
export async function fetchRoute<T>(id: number, route: RouteName, opts: FetchOptions = {}): Promise<RouteResult<T>> {
  const url = `${LTINFO_API}${routePath(id, route)}`;
  const key = url;
  if (!opts.noMemo) {
    const hit = memo.get(key);
    if (hit) return hit as Promise<RouteResult<T>>;
  }
  const run = fetchRouteUncached<T>(id, route, url, opts);
  if (!opts.noMemo) memo.set(key, run as Promise<RouteResult<unknown>>);
  return run;
}

async function fetchRouteUncached<T>(id: number, route: RouteName, url: string, opts: FetchOptions): Promise<RouteResult<T>> {
  const warn = opts.warn ?? ((m: string) => console.warn(m));
  const fixturesDir = opts.fixturesDir ?? defaultFixturesDir();
  const fallback = (reason: string): RouteResult<T> => {
    const fixture = readFixture<T>(id, route, fixturesDir);
    if (fixture) {
      warn(`[ltinfo-api] ${routePath(id, route)}: ${reason}; using fixture ${path.relative(process.cwd(), fixturePath(id, route, fixturesDir))}`);
      return fixture;
    }
    warn(`[ltinfo-api] ${routePath(id, route)}: ${reason}; no fixture, rendering the empty state`);
    return { data: null, source: 'none', fetchedAt: null };
  };

  if (isOffline(opts)) {
    const fixture = readFixture<T>(id, route, fixturesDir);
    if (fixture) return fixture;
    warn(`[ltinfo-api] ${routePath(id, route)}: LTINFO_OFFLINE is set and no fixture exists; rendering the empty state`);
    return { data: null, source: 'none', fetchedAt: null };
  }

  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  try {
    const res = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return fallback(`HTTP ${res.status}`);
    const text = await res.text();
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      return fallback('response was not JSON');
    }
    return { data, source: 'live', fetchedAt: new Date().toISOString() };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error';
    const message = err instanceof Error ? err.message : String(err);
    return fallback(name === 'TimeoutError' ? `timed out after ${timeoutMs} ms` : `${name}: ${message}`);
  }
}

export const fetchProgramRecord = (id: number, opts?: FetchOptions) => fetchRoute<ProgramRecord>(id, 'record', opts);
export const fetchPartners = (id: number, opts?: FetchOptions) => fetchRoute<Partner[]>(id, 'partners', opts);
export const fetchIndicators = (id: number, opts?: FetchOptions) => fetchRoute<Indicator[]>(id, 'indicators', opts);
export const fetchDocuments = (id: number, opts?: FetchOptions) => fetchRoute<ProgramDocument[]>(id, 'documents', opts);
export const fetchImages = (id: number, opts?: FetchOptions) => fetchRoute<ProgramImage[]>(id, 'images', opts);
export const fetchSites = (id: number, opts?: FetchOptions) => fetchRoute<MonitoringSite[]>(id, 'sites', opts);
export const fetchFeatureCollection = (id: number, opts?: FetchOptions) =>
  fetchRoute<SiteFeatureCollection>(id, 'feature-collection', opts);

/**
 * GET /monitoring-programs, every program LT Info lists. Same timeout, memo,
 * and fallback rules; the fixture, when recorded, is tests/fixtures/ltinfo/programs.json.
 */
export async function fetchProgramList(opts: FetchOptions = {}): Promise<RouteResult<ProgramListItem[]>> {
  const url = `${LTINFO_API}/monitoring-programs`;
  if (!opts.noMemo) {
    const hit = memo.get(url);
    if (hit) return hit as Promise<RouteResult<ProgramListItem[]>>;
  }
  const run = (async (): Promise<RouteResult<ProgramListItem[]>> => {
    const warn = opts.warn ?? ((m: string) => console.warn(m));
    const fixturesDir = opts.fixturesDir ?? defaultFixturesDir();
    const file = path.join(fixturesDir, 'programs.json');
    const fixture = (): RouteResult<ProgramListItem[]> | null => {
      if (!existsSync(file)) return null;
      try {
        return { data: JSON.parse(readFileSync(file, 'utf8')) as ProgramListItem[], source: 'fixture', fetchedAt: null };
      } catch {
        return null;
      }
    };
    const fallback = (reason: string): RouteResult<ProgramListItem[]> => {
      const f = fixture();
      warn(`[ltinfo-api] /monitoring-programs: ${reason}; ${f ? 'using fixture' : 'no fixture, returning null'}`);
      return f ?? { data: null, source: 'none', fetchedAt: null };
    };
    if (isOffline(opts)) return fixture() ?? fallback('LTINFO_OFFLINE is set');
    const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    const timeoutMs = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
    try {
      const res = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) return fallback(`HTTP ${res.status}`);
      return { data: (await res.json()) as ProgramListItem[], source: 'live', fetchedAt: new Date().toISOString() };
    } catch (err) {
      return fallback(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    }
  })();
  if (!opts.noMemo) memo.set(url, run as Promise<RouteResult<unknown>>);
  return run;
}

/* ---------- Program content ---------- */

export interface ProgramContent {
  program: Program;
  record: ProgramRecord | null;
  partners: Partner[];
  indicators: Indicator[];
  documents: ProgramDocument[];
  images: ProgramImage[];
  sites: MonitoringSite[];
  featureCollection: SiteFeatureCollection;
  /**
   * 'live' when every route that returned data came from the API, 'fixture'
   * when any came from a recording, 'none' when there is no record (the API and
   * the fixtures both failed, or the program has `ltinfo: false`).
   */
  source: ContentSource;
  /** Per-route provenance, for the footer line and the spike page. */
  sources: Record<RouteName, ContentSource>;
  /** The latest fetch time among the routes, or null. */
  fetchedAt: string | null;
}

function escapeText(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

/** Plain programs.json text as one paragraph of HTML, or null when empty. */
export function paragraph(text: string | null | undefined): string | null {
  const t = (text ?? '').trim();
  return t ? `<p>${escapeText(t)}</p>` : null;
}

/** A record built from programs.json for a program LT Info has no entry for. */
export function recordFromProgram(program: Program): ProgramRecord {
  return {
    MonitoringProgramID: program.id,
    MonitoringProgramName: program.name,
    ShortName: null,
    VanityUrl: null,
    MonitoringApproach: paragraph(program.approach),
    MonitoringProgramUrl: null,
    MonitoringProgramDescription: paragraph(program.description),
    MonitoringProgramPartnersDescription: null,
    IsSiteLocationUserDefined: false,
    OrganizationRelationshipLabel: null,
    SiteLabel: null,
    SiteLabelPlural: null,
    IsFeaturedProgram: program.featured,
    MonitoringProgramTypeID: 0,
    MonitoringProgramTypeDisplayName: null,
    MonitoringProgramCategoryID: null,
    MonitoringProgramCategoryDisplayName: null,
    NumberOfSites: 0,
    IsTransitProgram: false,
    IsCustomType: false,
    Dashboard: null,
    HasExternalDataSources: false,
    KeyImageFileResourceInfoID: null,
    KeyImageFileResourceGUID: null,
  };
}

const EMPTY_FC: SiteFeatureCollection = { type: 'FeatureCollection', features: [] };

/**
 * Everything a program page needs from LT Info, in one call. A program with
 * `ltinfo: false` gets its programs.json text as the record and no network call.
 */
export async function loadProgramContent(program: Program, opts: FetchOptions = {}): Promise<ProgramContent> {
  const none: Record<RouteName, ContentSource> = {
    record: 'none',
    partners: 'none',
    indicators: 'none',
    documents: 'none',
    images: 'none',
    sites: 'none',
    'feature-collection': 'none',
  };
  if (program.ltinfo === false) {
    return {
      program,
      record: recordFromProgram(program),
      partners: [],
      indicators: [],
      documents: [],
      images: [],
      sites: [],
      featureCollection: EMPTY_FC,
      source: 'none',
      sources: none,
      fetchedAt: null,
    };
  }
  const id = program.id;
  const [record, partners, indicators, documents, images, sites, fc] = await Promise.all([
    fetchProgramRecord(id, opts),
    fetchPartners(id, opts),
    fetchIndicators(id, opts),
    fetchDocuments(id, opts),
    fetchImages(id, opts),
    fetchSites(id, opts),
    fetchFeatureCollection(id, opts),
  ]);
  const results: Record<RouteName, RouteResult<unknown>> = {
    record,
    partners,
    indicators,
    documents,
    images,
    sites,
    'feature-collection': fc,
  };
  const sources = Object.fromEntries(ROUTE_NAMES.map((r) => [r, results[r].source])) as Record<RouteName, ContentSource>;
  const times = ROUTE_NAMES.map((r) => results[r].fetchedAt).filter((t): t is string => !!t).sort();
  const fetchedAt = times.length ? times[times.length - 1] : null;
  let source: ContentSource = 'none';
  if (record.data) source = ROUTE_NAMES.some((r) => results[r].source === 'fixture') ? 'fixture' : 'live';
  const asArray = <T>(v: T[] | null): T[] => (Array.isArray(v) ? v : []);
  return {
    program,
    record: record.data,
    partners: asArray(partners.data),
    indicators: asArray(indicators.data),
    documents: asArray(documents.data),
    images: asArray(images.data),
    sites: asArray(sites.data),
    featureCollection:
      fc.data && fc.data.type === 'FeatureCollection' && Array.isArray(fc.data.features) ? fc.data : EMPTY_FC,
    source,
    sources,
    fetchedAt,
  };
}
