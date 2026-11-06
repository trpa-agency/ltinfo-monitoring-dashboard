// Unit tests for src/lib/sites.ts. Run from the spoke root:
//   node --experimental-strip-types --test tests/sites.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INACTIVE_COLOR,
  SERIES_COLORS,
  SITES_CSV_COLUMNS,
  areaGroups,
  areaListItems,
  areaWhere,
  areasCsv,
  buildWhere,
  collapseSites,
  countLine,
  fetchGeoJson,
  orderStatuses,
  pickChoices,
  queryUrl,
  siteListItems,
  siteStatus,
  sitesCsv,
  statusColors,
  type Feature,
  type MapLayerConfig,
  type SitesLayerConfig,
} from '../src/lib/sites.ts';

const point = (lon: number, lat: number, properties: Record<string, unknown>, id?: number): Feature => ({
  type: 'Feature',
  id,
  geometry: { type: 'Point', coordinates: [lon, lat] },
  properties,
});

const TYC: SitesLayerConfig = { layer: 9, name: 'SITE_NAME', year: 'YEAR_OF_COUNT', where: "STATUS = 'Surveyed'" };

test('collapseSites keeps one site per name at its latest location with first and last year', () => {
  const features = [
    point(-119.95, 39.0, { SITE_NAME: 'Nevada Beach', YEAR_OF_COUNT: 2025 }),
    point(-119.9, 38.9, { SITE_NAME: 'Nevada Beach', YEAR_OF_COUNT: 1978 }),
    point(-119.92, 38.95, { SITE_NAME: 'Nevada Beach', YEAR_OF_COUNT: 2001 }),
    point(-120.1, 39.1, { SITE_NAME: 'Cascade Creek', YEAR_OF_COUNT: 1979 }),
  ];
  const sites = collapseSites(features, TYC);
  assert.equal(sites.length, 2);
  assert.deepEqual(sites.map((s) => s.name), ['Cascade Creek', 'Nevada Beach']);
  const nevada = sites[1];
  assert.equal(nevada.key, 'Nevada Beach');
  assert.equal(nevada.lon, -119.95);
  assert.equal(nevada.lat, 39.0);
  assert.equal(nevada.first, '1978');
  assert.equal(nevada.last, '2025');
  assert.equal(nevada.span, '1978 to 2025');
  assert.equal(sites[0].span, '1979');
});

test('collapseSites keys by code when the config has one, and keeps the code', () => {
  const cfg: SitesLayerConfig = { layer: 1, name: 'NAME', code: 'STATION', year: 'YEAR' };
  const features = [
    point(-120, 39, { NAME: 'Upper Truckee', STATION: 'UT1', YEAR: 2010 }),
    point(-120.01, 39.01, { NAME: 'Upper Truckee', STATION: 'UT2', YEAR: 2012 }),
    point(-120.02, 39.02, { NAME: 'Upper Truckee renamed', STATION: 'UT1', YEAR: 2014 }),
  ];
  const sites = collapseSites(features, cfg);
  assert.equal(sites.length, 2);
  const ut1 = sites.find((s) => s.key === 'UT1');
  if (!ut1) throw new Error('UT1 was not collapsed into a site');
  assert.equal(ut1.code, 'UT1');
  assert.equal(ut1.name, 'Upper Truckee renamed');
  assert.equal(ut1.lon, -120.02);
  assert.equal(ut1.span, '2010 to 2014');
});

test('collapseSites keeps a site with no geometry, and the list marks it not mapped', () => {
  const features: Feature[] = [
    { type: 'Feature', geometry: null, properties: { SITE_NAME: 'Ghost Beach', YEAR_OF_COUNT: 1999 } },
    point(-120, 39, { SITE_NAME: 'Real Beach', YEAR_OF_COUNT: 1999 }),
  ];
  const sites = collapseSites(features, TYC);
  const ghost = sites.find((s) => s.name === 'Ghost Beach');
  if (!ghost) throw new Error('Ghost Beach was dropped although it has a name and a year');
  assert.equal(ghost.lat, null);
  const items = siteListItems(sites, statusColors(sites.map(siteStatus), '#415414'));
  assert.equal(items.find((i) => i.name === 'Ghost Beach')?.mapped, false);
  assert.equal(items.find((i) => i.name === 'Real Beach')?.mapped, true);
});

test('siteStatus reads the status field, then the active flag, then falls back to Monitoring station', () => {
  assert.equal(siteStatus({ status: 'Surveyed', active: null }), 'Surveyed');
  assert.equal(siteStatus({ status: null, active: true }), 'Active');
  assert.equal(siteStatus({ status: null, active: false }), 'Inactive');
  assert.equal(siteStatus({ status: null, active: null }), 'Monitoring station');
});

test('orderStatuses puts Active, Monitoring station, and Inactive first, then others alphabetically', () => {
  assert.deepEqual(orderStatuses(['Zebra', 'Inactive', 'Surveyed', 'Active', 'Surveyed']), [
    'Active',
    'Inactive',
    'Surveyed',
    'Zebra',
  ]);
});

test('statusColors uses the single color for one status and the categorical tokens by index otherwise', () => {
  assert.deepEqual(statusColors(['Surveyed'], '#415414'), { Surveyed: '#415414' });
  const colors = statusColors(['Inactive', 'Active', 'Stream', 'Lake'], '#415414');
  assert.equal(colors.Active, SERIES_COLORS[0]);
  assert.equal(colors.Inactive, INACTIVE_COLOR);
  assert.equal(colors.Lake, SERIES_COLORS[1]);
  assert.equal(colors.Stream, SERIES_COLORS[2]);
  assert.match(colors.Active, /^var\(--color-background-dataviz-categorical-1, #3e72b0\)$/);
});

test('buildWhere quotes text values, leaves numbers bare, escapes apostrophes, and defaults to 1=1', () => {
  assert.equal(buildWhere(null, 'Threshold_Year', '2023'), "Threshold_Year = '2023'");
  assert.equal(buildWhere('', 'Year', 2024), 'Year = 2024');
  assert.equal(buildWhere("Feature_Type = 'SEZ'", 'Threshold_Year', '2023'), "Feature_Type = 'SEZ' AND Threshold_Year = '2023'");
  assert.equal(buildWhere(null, 'SITE_NAME', "O'Brien"), "SITE_NAME = 'O''Brien'");
  assert.equal(buildWhere("A = 1 OR B = 2", 'Y', '2023'), "(A = 1 OR B = 2) AND Y = '2023'");
  assert.equal(buildWhere(null, null, null), '1=1');
  assert.equal(buildWhere('STATUS = 1', 'Year', null), 'STATUS = 1');
});

const SEZ: MapLayerConfig = {
  layer: 106,
  title: 'SEZ assessment units',
  unit: 'assessment unit',
  name: 'Assessment_Unit_Name',
  colorBy: 'Final_Rating',
  colorByLabel: 'Overall rating',
  colors: { A: '#188c16', B: '#89bf40', C: '#e69527', D: '#be4c4c', 'Not Assessed': '#989898' },
  labels: { A: 'Rating A', B: 'Rating B', C: 'Rating C', D: 'Rating D' },
  pick: 'Threshold_Year',
  pickLabel: 'Evaluation year',
  meta: [{ field: 'SEZ_Type' }, { field: 'Acres', suffix: ' acres' }],
  fields: [
    { field: 'Final_Rating', label: 'Overall rating' },
    { field: 'Final_Percent', label: 'Score (%)' },
    { field: 'SEZ_Type', label: 'SEZ type' },
    { field: 'Acres', label: 'Acres' },
    { field: 'Ownership_Primary', label: 'Primary owner' },
  ],
};

test('areaWhere quotes the picked value of a string field such as Threshold_Year', () => {
  assert.equal(areaWhere(SEZ, '2023'), "Threshold_Year = '2023'");
  assert.equal(areaWhere(SEZ, null), '1=1');
});

test('pickChoices lists distinct values latest first, numerically when they are years', () => {
  assert.deepEqual(pickChoices([{ Threshold_Year: '2019' }, { Threshold_Year: '2023' }, { Threshold_Year: null }], 'Threshold_Year'), ['2023', '2019']);
  assert.deepEqual(pickChoices([{ Year: 2001 }, { Year: 2010 }, { Year: 2001 }], 'Year'), [2010, 2001]);
});

test('areaListItems groups by the colorBy value, files unknown values under Other, and reads meta with suffixes', () => {
  const features: Feature[] = [
    { type: 'Feature', id: 7, geometry: { type: 'Polygon', coordinates: [] }, properties: { Assessment_Unit_Name: 'Saxon Creek', Final_Rating: 'B', SEZ_Type: 'Channeled Meadow', Acres: 16.66 } },
    { type: 'Feature', id: 8, geometry: { type: 'Polygon', coordinates: [] }, properties: { Assessment_Unit_Name: 'Angora', Final_Rating: 'Z', SEZ_Type: 'Fen', Acres: 2 } },
  ];
  const items = areaListItems(SEZ, features, '#9A5710');
  assert.deepEqual(items.map((i) => i.name), ['Angora', 'Saxon Creek']);
  const saxon = items[1];
  assert.equal(saxon.key, '7');
  assert.equal(saxon.group, 'B');
  assert.equal(saxon.color, '#89bf40');
  assert.equal(saxon.meta, 'Channeled Meadow · 16.7 acres');
  assert.equal(items[0].group, null);
  assert.equal(items[0].color, INACTIVE_COLOR);
  assert.deepEqual(areaGroups(SEZ).map((g) => g.label), ['Rating A', 'Rating B', 'Rating C', 'Rating D', 'Not Assessed', 'Other']);
});

test('sitesCsv has the six standard columns and quotes names with commas', () => {
  const sites = collapseSites(
    [
      point(-119.95, 39.0, { SITE_NAME: 'Nevada Beach', YEAR_OF_COUNT: 2025 }),
      point(-119.9, 38.9, { SITE_NAME: 'Nevada Beach', YEAR_OF_COUNT: 1978 }),
      point(-120.0, 39.1, { SITE_NAME: 'Camp, Pump House', YEAR_OF_COUNT: 2020 }),
    ],
    TYC,
  );
  const csv = sitesCsv(sites);
  const lines = csv.split('\r\n');
  assert.equal(lines[0], SITES_CSV_COLUMNS.join(','));
  assert.equal(lines[0], 'Site,Status,First observation,Last observation,Latitude,Longitude');
  assert.equal(lines.length, 3);
  assert.equal(lines[1], '"Camp, Pump House",Monitoring station,2020,2020,39.1,-120');
  assert.equal(lines[2], 'Nevada Beach,Monitoring station,1978,2025,39,-119.95');
});

test('areasCsv labels columns from the config and appends the picked value', () => {
  const features: Feature[] = [
    { type: 'Feature', id: 7, geometry: null, properties: { Assessment_Unit_Name: 'Saxon Creek', Final_Rating: 'B', Final_Percent: 80.5, SEZ_Type: 'Channeled Meadow', Acres: 16.66, Ownership_Primary: 'USFS' } },
  ];
  const file = areasCsv(SEZ, features, '2023', 'SEZ Basin-wide Monitoring and Assessment Plan');
  assert.deepEqual(file.columns, ['Name', 'Overall rating', 'Score (%)', 'SEZ type', 'Acres', 'Primary owner', 'Evaluation year']);
  assert.equal(file.fileName, 'sez-basin-wide-monitoring-and-assessment-plan-sez-assessment-units-2023.csv');
  assert.equal(file.text.split('\r\n')[1], 'Saxon Creek,B,80.5,Channeled Meadow,16.66,USFS,2023');
});

test('countLine reads 36 sites, Showing 4 of 36 sites, and No matches', () => {
  assert.equal(countLine(36, 36, false, 'site'), '36 sites');
  assert.equal(countLine(36, 4, true, 'site'), 'Showing 4 of 36 sites');
  assert.equal(countLine(36, 0, true, 'site'), 'No matches');
  assert.equal(countLine(1, 1, false, 'assessment unit'), '1 assessment unit');
  assert.equal(countLine(641, 641, false, 'assessment unit'), '641 assessment units');
});

test('queryUrl drops undefined and empty parameters', () => {
  const url = new URL(queryUrl(9, { where: "STATUS = 'Surveyed'", outFields: 'SITE_NAME', orderByFields: undefined, f: 'geojson', outSR: 4326 }));
  assert.equal(url.pathname, '/server/rest/services/LTInfo_Monitoring/MapServer/9/query');
  assert.equal(url.searchParams.get('where'), "STATUS = 'Surveyed'");
  assert.equal(url.searchParams.get('outSR'), '4326');
  assert.equal(url.searchParams.has('orderByFields'), false);
});

test('fetchGeoJson pages with resultOffset until exceededTransferLimit is false', async () => {
  const calls: URL[] = [];
  const pages = [
    { type: 'FeatureCollection', features: [point(-120, 39, { n: 1 }), point(-120, 39, { n: 2 })], exceededTransferLimit: true },
    { type: 'FeatureCollection', features: [point(-120, 39, { n: 3 }), point(-120, 39, { n: 4 })], properties: { exceededTransferLimit: true } },
    { type: 'FeatureCollection', features: [point(-120, 39, { n: 5 })] },
  ];
  const fakeFetch = async (url: string) => {
    const parsed = new URL(url);
    calls.push(parsed);
    const offset = Number(parsed.searchParams.get('resultOffset'));
    return { json: async () => pages[offset / 2] };
  };
  const features = await fetchGeoJson(fakeFetch, 9, { where: '1=1', outFields: 'n' }, { pageSize: 2 });
  assert.equal(features.length, 5);
  assert.deepEqual(features.map((f) => f.properties.n), [1, 2, 3, 4, 5]);
  assert.deepEqual(calls.map((u) => u.searchParams.get('resultOffset')), ['0', '2', '4']);
  assert.ok(calls.every((u) => u.searchParams.get('resultRecordCount') === '2'));
  assert.ok(calls.every((u) => u.searchParams.get('f') === 'geojson' && u.searchParams.get('outSR') === '4326'));
});

test('fetchGeoJson stops after one page when the service does not report a limit, and throws on a service error', async () => {
  let n = 0;
  const onePage = async () => {
    n++;
    return { json: async () => ({ type: 'FeatureCollection', features: [point(-120, 39, {})] }) };
  };
  const features = await fetchGeoJson(onePage, 9, { where: '1=1' });
  assert.equal(features.length, 1);
  assert.equal(n, 1);
  const failing = async () => ({ json: async () => ({ error: { code: 400, message: 'Unable to complete operation.' } }) });
  await assert.rejects(() => fetchGeoJson(failing, 106, { where: 'Threshold_Year = 2023' }), /Unable to complete operation/);
});
