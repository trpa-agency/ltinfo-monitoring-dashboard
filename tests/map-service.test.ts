import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVICE_URL,
  layerUrl,
  normalizeDate,
  queryFeatures,
  queryStatistics,
  queryUrl,
  unpivot,
} from '../src/lib/map-service.ts';
import type { FetchLike } from '../src/lib/map-service.ts';

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

test('layerUrl and queryUrl build service URLs', () => {
  assert.equal(layerUrl(46), `${SERVICE_URL}/46`);
  const url = queryUrl(17, { where: "variable LIKE 'O3%'", f: 'json' });
  assert.ok(url.startsWith(`${SERVICE_URL}/17/query?`));
  const params = new URL(url).searchParams;
  assert.equal(params.get('where'), "variable LIKE 'O3%'");
  assert.equal(params.get('f'), 'json');
});

test('queryFeatures pages with resultOffset and stops on a short page', async () => {
  const pageSize = 3;
  const total = 7;
  const calls: URLSearchParams[] = [];
  const fakeFetch: FetchLike = async (url) => {
    const p = new URL(url).searchParams;
    calls.push(p);
    const offset = Number(p.get('resultOffset'));
    const count = Number(p.get('resultRecordCount'));
    const features = [];
    for (let i = offset; i < Math.min(total, offset + count); i += 1) features.push({ attributes: { OBJECTID: i + 1 } });
    return jsonResponse({ features, exceededTransferLimit: offset + count < total });
  };
  const rows = await queryFeatures(46, { where: "Pollutant = 'O3'", outFields: ['Year', 'Value'] }, { fetch: fakeFetch, pageSize });
  assert.equal(rows.length, total);
  assert.deepEqual(rows.map((r) => r.OBJECTID), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((p) => p.get('resultOffset')), ['0', '3', '6']);
  assert.equal(calls[0].get('resultRecordCount'), '3');
  assert.equal(calls[0].get('outFields'), 'Year,Value');
  assert.equal(calls[0].get('returnGeometry'), 'false');
  assert.equal(calls[0].get('where'), "Pollutant = 'O3'");
});

test('queryFeatures stops when exceededTransferLimit is false on a full page', async () => {
  let calls = 0;
  const fakeFetch: FetchLike = async () => {
    calls += 1;
    return jsonResponse({ features: [{ attributes: { a: 1 } }, { attributes: { a: 2 } }], exceededTransferLimit: false });
  };
  const rows = await queryFeatures(1, {}, { fetch: fakeFetch, pageSize: 2 });
  assert.equal(rows.length, 2);
  assert.equal(calls, 1);
});

test('queryFeatures defaults where to 1=1 and outFields to *', async () => {
  let seen: URLSearchParams | null = null;
  const fakeFetch: FetchLike = async (url) => {
    seen = new URL(url).searchParams;
    return jsonResponse({ features: [] });
  };
  const rows = await queryFeatures(83, {}, { fetch: fakeFetch });
  assert.equal(rows.length, 0);
  assert.ok(seen);
  assert.equal(seen!.get('where'), '1=1');
  assert.equal(seen!.get('outFields'), '*');
  assert.equal(seen!.get('resultRecordCount'), '2000');
});

test('queryFeatures throws on an ArcGIS error payload and on HTTP errors', async () => {
  const errorFetch: FetchLike = async () => jsonResponse({ error: { code: 400, message: 'Failed to execute query.' } });
  await assert.rejects(queryFeatures(46, {}, { fetch: errorFetch }), /Failed to execute query/);
  const httpFetch: FetchLike = async () => jsonResponse(null, false, 503);
  await assert.rejects(queryFeatures(46, {}, { fetch: httpFetch }), /HTTP 503/);
});

test('queryStatistics sends outStatistics and groupByFieldsForStatistics in one request', async () => {
  const calls: URLSearchParams[] = [];
  const fakeFetch: FetchLike = async (url) => {
    calls.push(new URL(url).searchParams);
    return jsonResponse({ features: [{ attributes: { counter_name: 'A', value: 10 } }, { attributes: { counter_name: 'B', value: 4 } }] });
  };
  const rows = await queryStatistics(
    1,
    { groupBy: ['counter_name'], statisticType: 'sum', onField: 'count_of_bike_ped' },
    { fetch: fakeFetch },
  );
  assert.equal(rows.length, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].get('groupByFieldsForStatistics'), 'counter_name');
  assert.deepEqual(JSON.parse(calls[0].get('outStatistics') ?? '[]'), [
    { statisticType: 'sum', onStatisticField: 'count_of_bike_ped', outStatisticFieldName: 'value' },
  ]);
  assert.equal(calls[0].get('resultOffset'), null);
});

test('unpivot turns wide year columns into long rows and drops empty cells', () => {
  const rows = [
    { Location: 'Tahoe City', NTU2015: 0.5, NTU2016: null, NTU2017: 0.7, Notes: 'x' },
    { Location: 'Kings Beach', NTU2015: '', NTU2016: 1.1, Notes: null },
  ];
  const long = unpivot(rows, 'NTU', 'Year', 'value');
  assert.deepEqual(long, [
    { Location: 'Tahoe City', Notes: 'x', Year: 2015, value: 0.5 },
    { Location: 'Tahoe City', Notes: 'x', Year: 2017, value: 0.7 },
    { Location: 'Kings Beach', Notes: null, Year: 2016, value: 1.1 },
  ]);
});

test('unpivot escapes regex characters in the prefix', () => {
  const long = unpivot([{ 'PM2.5_2020': 3, PM25_2021: 4 }], 'PM2.5_', 'Year', 'v');
  assert.deepEqual(long, [{ PM25_2021: 4, Year: 2020, v: 3 }]);
});

test('normalizeDate handles epoch milliseconds, M/D/YYYY, ISO, and passthrough', () => {
  assert.equal(normalizeDate(Date.UTC(2017, 0, 9)), '2017-01-09');
  assert.equal(normalizeDate('1/9/2017'), '2017-01-09');
  assert.equal(normalizeDate('12/31/2025 0:00:00'), '2025-12-31');
  assert.equal(normalizeDate('2017-01-09T00:00:00Z'), '2017-01-09');
  assert.equal(normalizeDate('not a date'), 'not a date');
  assert.equal(normalizeDate(null), null);
});
