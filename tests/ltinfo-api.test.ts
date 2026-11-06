import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  LTINFO_API,
  ROUTE_NAMES,
  clearMemo,
  dashboardSrc,
  defaultFixturesDir,
  documentType,
  embeddedFileResourceUrl,
  fetchDocuments,
  fetchFeatureCollection,
  fetchImages,
  fetchIndicators,
  fetchPartners,
  fetchProgramList,
  fetchProgramRecord,
  fetchRoute,
  fetchSites,
  fileResourceUrl,
  fixturePath,
  formatDate,
  indicatorHref,
  keyPhoto,
  loadProgramContent,
  paragraph,
  programPageHref,
  recordFromProgram,
  routePath,
  type FetchOptions,
  type ProgramRecord,
} from '../src/lib/ltinfo-api.ts';
import { allPrograms, type Program } from '../src/lib/programs.ts';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures', 'ltinfo');
const readFixture = <T>(id: number, route: string): T => JSON.parse(readFileSync(path.join(FIXTURES, String(id), `${route}.json`), 'utf8')) as T;

/** A fetch that answers from the fixtures, recording what it was asked for. */
function fixtureFetch(calls: string[], status = 200): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    const m = /\/monitoring-programs\/(\d+)(?:\/([a-z-]+))?(?:\?.*)?$/.exec(url);
    if (!m) return new Response('[]', { status, headers: { 'content-type': 'application/json' } });
    const id = Number(m[1]);
    const route = !m[2] ? 'record' : m[2] === 'sites' ? 'sites' : m[2] === 'sites-as-feature-collection' ? 'feature-collection' : m[2];
    const body = readFileSync(path.join(FIXTURES, String(id), `${route}.json`), 'utf8');
    return new Response(body, { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

const failingFetch = (kind: 'network' | 'timeout' | 'http' | 'badjson'): typeof fetch =>
  (async () => {
    if (kind === 'network') throw new TypeError('fetch failed');
    if (kind === 'timeout') {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    }
    if (kind === 'http') return new Response('nope', { status: 503 });
    return new Response('<html>not json</html>', { status: 200 });
  }) as typeof fetch;

const ozone = allPrograms().find((e) => e.program.id === 41)!.program;
const streams = allPrograms().find((e) => e.program.id === 63)!.program;
const offlineProgram = allPrograms().find((e) => e.program.ltinfo === false)!.program;

beforeEach(() => clearMemo());

test('routePath builds every route the pages use', () => {
  assert.equal(routePath(41, 'record'), '/monitoring-programs/41');
  assert.equal(routePath(41, 'partners'), '/monitoring-programs/41/partners');
  assert.equal(routePath(41, 'indicators'), '/monitoring-programs/41/indicators');
  assert.equal(routePath(41, 'documents'), '/monitoring-programs/41/documents');
  assert.equal(routePath(41, 'images'), '/monitoring-programs/41/images');
  assert.equal(routePath(41, 'sites'), '/monitoring-programs/41/sites?activeOnly=false');
  assert.equal(routePath(41, 'feature-collection'), '/monitoring-programs/41/sites-as-feature-collection');
  assert.equal(ROUTE_NAMES.length, 7);
});

test('URL helpers', () => {
  assert.equal(fileResourceUrl('8994BECE-3C0F-4394-A1A8-4B25BFD56899'), `${LTINFO_API}/file-resources/8994bece-3c0f-4394-a1a8-4b25bfd56899`);
  assert.equal(embeddedFileResourceUrl('ABC'), `${LTINFO_API}/file-resources/embedded/abc`);
  assert.equal(indicatorHref({ IndicatorID: 72 }), 'https://thresholds.laketahoeinfo.org/indicators/72');
  assert.equal(programPageHref({ MonitoringProgramID: 83, VanityUrl: 'subalpine-conifer' }), 'https://monitoring.laketahoeinfo.org/monitoring-programs/subalpine-conifer');
  assert.equal(programPageHref({ MonitoringProgramID: 41, VanityUrl: null }), 'https://monitoring.laketahoeinfo.org/monitoring-programs/41');
  assert.equal(programPageHref({ MonitoringProgramID: 41, VanityUrl: '  ' }), 'https://monitoring.laketahoeinfo.org/monitoring-programs/41');
});

test('dashboardSrc prefers the URL, then an uploaded file, else null', () => {
  const base = { MonitoringProgramDashboardID: 1, DashboardUrl: null, DashboardDescription: null, DashboardHeight: null, DashboardWidth: null, FileResourceInfoID: null, FileResourceGUID: null };
  assert.equal(dashboardSrc(null), null);
  assert.equal(dashboardSrc(undefined), null);
  assert.equal(dashboardSrc(base), null);
  assert.equal(dashboardSrc({ ...base, DashboardUrl: 'https://data-trpa.opendata.arcgis.com/pages/demographics' }), 'https://data-trpa.opendata.arcgis.com/pages/demographics');
  assert.equal(dashboardSrc({ ...base, DashboardUrl: '  ', FileResourceGUID: 'ABC' }), `${LTINFO_API}/file-resources/embedded/abc`);
  const socio = readFixture<ProgramRecord>(68, 'record');
  assert.equal(dashboardSrc(socio.Dashboard), 'https://data-trpa.opendata.arcgis.com/pages/demographics');
});

test('keyPhoto picks the flagged image, else the first, else the record GUID', () => {
  const images = readFixture<Parameters<typeof keyPhoto>[0]>(41, 'images');
  const record = readFixture<ProgramRecord>(41, 'record');
  const k = keyPhoto(images, record);
  assert.ok(k);
  assert.equal(k.guid, '8994bece-3c0f-4394-a1a8-4b25bfd56899');
  assert.equal(k.url, `${LTINFO_API}/file-resources/8994bece-3c0f-4394-a1a8-4b25bfd56899`);
  assert.equal(k.caption, 'TRPA air quality monitoring station.');
  assert.equal(k.credit, 'TRPA');
  assert.equal(keyPhoto([], record)?.guid, record.KeyImageFileResourceGUID);
  assert.equal(keyPhoto(null, { ...record, KeyImageFileResourceGUID: null }), null);
  assert.equal(keyPhoto([], null), null);
  const two = [{ ...images![0], IsKeyPhoto: false, FileResourceGUID: 'first' }, { ...images![0], IsKeyPhoto: true, FileResourceGUID: 'second' }];
  assert.equal(keyPhoto(two)?.guid, 'second');
  assert.equal(keyPhoto(two.map((i) => ({ ...i, IsKeyPhoto: false })))?.guid, 'first');
});

test('documentType, formatDate, paragraph', () => {
  assert.equal(documentType({ FileExtension: '.docx', OriginalFileName: null }), 'DOCX');
  assert.equal(documentType({ FileExtension: 'pdf', OriginalFileName: null }), 'PDF');
  assert.equal(documentType({ FileExtension: null, OriginalFileName: null }), '');
  assert.equal(formatDate('2024-11-14'), 'Nov. 14, 2024');
  assert.equal(formatDate('2023-03-05T00:00:00'), 'March 5, 2023');
  assert.equal(formatDate('2021-09-30'), 'Sept. 30, 2021');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('yesterday'), '');
  assert.equal(formatDate('2021-13-01'), '');
  assert.equal(paragraph('  a <b> & c  '), '<p>a &lt;b&gt; &amp; c</p>');
  assert.equal(paragraph(''), null);
  assert.equal(paragraph(undefined), null);
});

test('fetchRoute returns live data and memoizes per route', async () => {
  const calls: string[] = [];
  const opts: FetchOptions = { fetchImpl: fixtureFetch(calls), warn: () => {} };
  const a = await fetchProgramRecord(41, opts);
  const b = await fetchProgramRecord(41, opts);
  assert.equal(a.source, 'live');
  assert.ok(a.fetchedAt && !Number.isNaN(Date.parse(a.fetchedAt)));
  assert.equal(a.data?.MonitoringProgramName, 'Ozone Monitoring');
  assert.equal(b, a, 'same promise result');
  assert.equal(calls.length, 1, 'one request for two calls');
  await fetchPartners(41, opts);
  await fetchRoute(41, 'partners', opts);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].startsWith(`${LTINFO_API}/monitoring-programs/41`));
});

test('fetch sends an accept header and an abort signal', async () => {
  let seenInit: RequestInit | undefined;
  const fetchImpl = (async (_: string | URL | Request, init?: RequestInit) => {
    seenInit = init;
    return new Response('[]', { status: 200 });
  }) as typeof fetch;
  await fetchIndicators(41, { fetchImpl, warn: () => {} });
  assert.ok(seenInit?.signal instanceof AbortSignal);
  assert.equal((seenInit?.headers as Record<string, string>).accept, 'application/json');
});

test('every failure kind falls back to the fixture with one warning naming the route', async () => {
  for (const kind of ['network', 'timeout', 'http', 'badjson'] as const) {
    clearMemo();
    const warnings: string[] = [];
    const r = await fetchPartners(41, { fetchImpl: failingFetch(kind), warn: (m) => warnings.push(m) });
    assert.equal(r.source, 'fixture', kind);
    assert.equal(r.data?.length, 6, kind);
    assert.equal(warnings.length, 1, kind);
    assert.match(warnings[0], /\/monitoring-programs\/41\/partners/, kind);
    assert.match(warnings[0], /fixture/, kind);
    const meta = JSON.parse(readFileSync(path.join(FIXTURES, '41', 'meta.json'), 'utf8')) as { recordedAt: string };
    assert.equal(r.fetchedAt, meta.recordedAt, 'fixture fetchedAt is the recording time');
  }
});

test('a timeout warning says so', async () => {
  const warnings: string[] = [];
  await fetchDocuments(41, { fetchImpl: failingFetch('timeout'), warn: (m) => warnings.push(m), timeoutMs: 15000 });
  assert.match(warnings[0], /timed out after 15000 ms/);
});

test('a failure with no fixture returns null and source none, without throwing', async () => {
  const warnings: string[] = [];
  const r = await fetchProgramRecord(999999, { fetchImpl: failingFetch('http'), warn: (m) => warnings.push(m) });
  assert.equal(r.data, null);
  assert.equal(r.source, 'none');
  assert.equal(r.fetchedAt, null);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /\/monitoring-programs\/999999.*HTTP 503.*no fixture/);
});

test('offline mode never touches the network', async () => {
  const calls: string[] = [];
  const r = await fetchSites(63, { fetchImpl: fixtureFetch(calls), offline: true, warn: () => {} });
  assert.equal(calls.length, 0);
  assert.equal(r.source, 'fixture');
  assert.ok((r.data?.length ?? 0) > 100, 'streams has many sites');
  const warnings: string[] = [];
  const none = await fetchImages(999999, { fetchImpl: fixtureFetch(calls), offline: true, warn: (m) => warnings.push(m) });
  assert.equal(none.source, 'none');
  assert.equal(calls.length, 0);
  assert.match(warnings[0], /LTINFO_OFFLINE/);
});

test('LTINFO_OFFLINE=1 in the environment selects offline mode', async () => {
  const prev = process.env.LTINFO_OFFLINE;
  process.env.LTINFO_OFFLINE = '1';
  try {
    const calls: string[] = [];
    const r = await fetchFeatureCollection(39, { fetchImpl: fixtureFetch(calls), warn: () => {} });
    assert.equal(calls.length, 0);
    assert.equal(r.source, 'fixture');
    assert.equal(r.data?.type, 'FeatureCollection');
  } finally {
    if (prev === undefined) delete process.env.LTINFO_OFFLINE;
    else process.env.LTINFO_OFFLINE = prev;
  }
});

test('a custom fixtures dir and a corrupt fixture', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ltinfo-fixtures-'));
  mkdirSync(path.join(dir, '41'));
  writeFileSync(path.join(dir, '41', 'indicators.json'), '{not json', 'utf8');
  const warnings: string[] = [];
  const r = await fetchIndicators(41, { fetchImpl: failingFetch('network'), fixturesDir: dir, warn: (m) => warnings.push(m) });
  assert.equal(r.source, 'none', 'a corrupt fixture is treated as missing');
  assert.equal(fixturePath(41, 'indicators', dir), path.join(dir, '41', 'indicators.json'));
  assert.ok(defaultFixturesDir().endsWith(path.join('tests', 'fixtures', 'ltinfo')));
});

test('fetchProgramList is memoized and falls back to null when no fixture exists', async () => {
  const calls: string[] = [];
  const live = await fetchProgramList({ fetchImpl: fixtureFetch(calls), warn: () => {} });
  assert.equal(live.source, 'live');
  await fetchProgramList({ fetchImpl: fixtureFetch(calls), warn: () => {} });
  assert.equal(calls.length, 1);
  clearMemo();
  const warnings: string[] = [];
  const dir = mkdtempSync(path.join(tmpdir(), 'ltinfo-fixtures-'));
  const down = await fetchProgramList({ fetchImpl: failingFetch('network'), fixturesDir: dir, warn: (m) => warnings.push(m) });
  assert.equal(down.data, null);
  assert.equal(down.source, 'none');
  assert.match(warnings[0], /\/monitoring-programs: TypeError/);
});

test('loadProgramContent assembles every route for a live program', async () => {
  const calls: string[] = [];
  const c = await loadProgramContent(ozone, { fetchImpl: fixtureFetch(calls), warn: () => {} });
  assert.equal(c.source, 'live');
  assert.equal(calls.length, 7, 'seven routes, one request each');
  assert.equal(c.record?.MonitoringProgramID, 41);
  assert.equal(c.partners.length, 6);
  assert.equal(c.partners[0].OrganizationName, 'Tahoe Regional Planning Agency');
  assert.equal(c.indicators.length, 3);
  assert.equal(c.documents.length, 1);
  assert.equal(c.images.length, 1);
  assert.equal(c.sites.length, 0);
  assert.deepEqual(c.featureCollection, { type: 'FeatureCollection', features: [] });
  assert.ok(c.fetchedAt);
  assert.ok(ROUTE_NAMES.every((r) => c.sources[r] === 'live'));
});

test('loadProgramContent reports fixture when any route fell back, and none when the record is missing', async () => {
  let n = 0;
  const flaky = (async (input: string | URL | Request, init?: RequestInit) => {
    n++;
    if (String(input).endsWith('/documents')) return new Response('down', { status: 500 });
    return fixtureFetch([])(input, init);
  }) as typeof fetch;
  const warnings: string[] = [];
  const c = await loadProgramContent(streams, { fetchImpl: flaky, warn: (m) => warnings.push(m) });
  assert.equal(c.source, 'fixture');
  assert.equal(c.sources.documents, 'fixture');
  assert.equal(c.sources.record, 'live');
  assert.equal(c.documents.length, readFixture<unknown[]>(63, 'documents').length, 'documents came from the fixture');
  assert.ok(c.sites.length > 100);
  assert.equal(c.featureCollection.features.length, c.sites.length, 'streams: one point per site');
  assert.equal(warnings.length, 1);
  assert.equal(n, 7);

  clearMemo();
  const dir = mkdtempSync(path.join(tmpdir(), 'ltinfo-fixtures-'));
  const gone = await loadProgramContent(ozone, { fetchImpl: failingFetch('network'), fixturesDir: dir, warn: () => {} });
  assert.equal(gone.source, 'none');
  assert.equal(gone.record, null);
  assert.deepEqual(gone.partners, []);
  assert.equal(gone.fetchedAt, null);
});

test('loadProgramContent for ltinfo false uses programs.json text and makes no request', async () => {
  const calls: string[] = [];
  const c = await loadProgramContent(offlineProgram, { fetchImpl: fixtureFetch(calls) });
  assert.equal(calls.length, 0);
  assert.equal(c.source, 'none');
  assert.equal(c.fetchedAt, null);
  assert.ok(c.record);
  assert.equal(c.record.MonitoringProgramID, offlineProgram.id);
  assert.equal(c.record.MonitoringProgramName, offlineProgram.name);
  assert.equal(c.record.MonitoringProgramDescription, paragraph(offlineProgram.description));
  assert.equal(c.record.Dashboard, null);
  assert.deepEqual(c.partners, []);
  assert.deepEqual(c.featureCollection.features, []);
});

test('recordFromProgram escapes programs.json text', () => {
  const p: Program = { id: 9001, name: 'X', file: 'x.html', featured: false, ltinfo: false, description: 'a <b> & c', approach: 'm' };
  const r = recordFromProgram(p);
  assert.equal(r.MonitoringProgramDescription, '<p>a &lt;b&gt; &amp; c</p>');
  assert.equal(r.MonitoringApproach, '<p>m</p>');
  assert.equal(r.KeyImageFileResourceGUID, null);
});

test('the recorded fixtures have the shapes the types describe', () => {
  for (const id of [41, 63, 39, 83, 68]) {
    const record = readFixture<ProgramRecord>(id, 'record');
    assert.equal(record.MonitoringProgramID, id);
    assert.equal(typeof record.MonitoringProgramName, 'string');
    assert.ok('MonitoringApproach' in record && 'MonitoringProgramDescription' in record && 'Dashboard' in record);
    const partners = readFixture<{ OrganizationName: string }[]>(id, 'partners');
    assert.ok(Array.isArray(partners) && partners.every((p) => typeof p.OrganizationName === 'string'));
    const indicators = readFixture<{ IndicatorID: number; IndicatorDisplayName: string }[]>(id, 'indicators');
    assert.ok(indicators.every((i) => typeof i.IndicatorID === 'number' && typeof i.IndicatorDisplayName === 'string'));
    const documents = readFixture<{ FileResourceGUID: string; DisplayName: string; UploadDate: string | null }[]>(id, 'documents');
    assert.ok(documents.every((d) => /^[0-9a-f-]{36}$/i.test(d.FileResourceGUID) && typeof d.DisplayName === 'string'));
    const images = readFixture<{ FileResourceGUID: string; IsKeyPhoto: boolean }[]>(id, 'images');
    assert.ok(images.every((i) => /^[0-9a-f-]{36}$/i.test(i.FileResourceGUID) && typeof i.IsKeyPhoto === 'boolean'));
    const sites = readFixture<{ MonitoringSiteID: number; Active: boolean }[]>(id, 'sites');
    assert.ok(sites.every((s) => typeof s.MonitoringSiteID === 'number' && typeof s.Active === 'boolean'));
    const fc = readFixture<{ type: string; features: { geometry: { type: string; coordinates: number[] } | null }[] }>(id, 'feature-collection');
    assert.equal(fc.type, 'FeatureCollection');
    // Streams (63) has one site whose point carries an empty coordinates array.
    assert.ok(fc.features.every((f) => f.geometry === null || (f.geometry.type === 'Point' && [0, 2].includes(f.geometry.coordinates.length))));
  }
  const streamsFc = readFixture<{ features: { geometry: { coordinates: number[] } }[] }>(63, 'feature-collection');
  assert.equal(streamsFc.features.filter((f) => f.geometry.coordinates.length === 0).length, 1, 'the empty-coordinates case is in the fixture');
  assert.ok(readFixture<ProgramRecord>(68, 'record').Dashboard?.DashboardUrl, 'program 68 carries a Dashboard object');
});
