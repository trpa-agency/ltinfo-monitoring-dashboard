import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SITES_PER_YEAR_X,
  SITES_PER_YEAR_Y,
  defaultPick,
  emptyStateText,
  fmtValue,
  measureChartSpec,
  measureColumns,
  measureSeries,
  measureThreshold,
  measureView,
  measureYs,
  panelSpans,
  pickChoices,
  pickedRows,
  queryMeasure,
  queryPanelRows,
  querySitesPerYear,
  sitesPerYearMeasure,
  sitesPerYearRows,
  sitesPerYearYearKey,
  xDisplay,
} from '../src/lib/measures.ts';
import type { Measure, SitesPerYearConfig } from '../src/lib/measures.ts';
import type { FetchLike } from '../src/lib/map-service.ts';

const ozone: Measure = {
  title: 'Ozone by station',
  layer: 46,
  where: "Pollutant = 'O3'",
  x: 'Year',
  y: 'Value',
  yLabel: 'O3 (ppm)',
  seriesBy: 'Site',
  seriesLabel: 'Station',
  pick: 'Indicator',
  pickLabel: 'Statistic',
  pickDefault: 'O3 - HIGH 8 HR',
  standard: { field: 'Threshold_Value' },
  span: 'span-12',
};

const daily: Measure = {
  title: 'Daily ozone by station',
  layer: 17,
  where: "variable LIKE 'O3%'",
  x: 'date',
  xType: 'date',
  xLabel: 'Date',
  y: 'value',
  yName: 'O3',
  seriesBy: 'id',
  seriesLabel: 'Station',
  seriesNames: { STL: 'Stateline', TC: 'Tahoe City' },
  pick: 'variable',
  pickLabel: 'Statistic',
};

const clarity: Measure = {
  title: 'Lake clarity',
  layer: 14,
  x: 'year',
  y: [
    { field: 'annual_average', name: 'Annual' },
    { field: 'winter_average', name: 'Winter' },
  ],
  yLabel: 'Secchi depth (m)',
};

const counters: Measure = {
  title: 'Busiest counters',
  layer: 1,
  x: 'counter_name',
  xLabel: 'Counter',
  y: 'count_of_bike_ped',
  stat: 'sum',
  yName: 'Total count',
  type: 'bar',
  orientation: 'h',
  sort: 'desc',
  limit: 15,
};

test('measureYs: statistic, listed fields, single field', () => {
  assert.deepEqual(measureYs(counters), [{ field: 'value', name: 'Total count' }]);
  assert.deepEqual(measureYs(clarity), clarity.y);
  assert.deepEqual(measureYs(ozone), [{ field: 'Value', name: 'O3 (ppm)' }]);
});

test('measureSeries with seriesBy uses seriesNames, falls back to the prefix, and sorts groups', () => {
  const rows = [
    { date: '2017-01-09', id: 'TC', value: 30 },
    { date: '2017-01-09', id: 'STL', value: 44 },
    { date: '2017-01-10', id: 'STL', value: 29 },
    { date: '2017-01-10', id: 'IV', value: 31 },
  ];
  const s = measureSeries(daily, rows);
  assert.deepEqual(s.map((x) => x.name), ['IV', 'Stateline', 'Tahoe City']);
  assert.deepEqual(s.map((x) => x.rows.length), [1, 2, 1]);
  assert.ok(s.every((x) => x.field === 'value'));
  const prefixed = measureSeries({ ...daily, seriesNames: undefined, seriesPrefix: 'Station ' }, rows);
  assert.equal(prefixed[0].name, 'Station IV');
});

test('measureSeries with several y fields makes one series per field over the same rows', () => {
  const rows = [{ year: 2020, annual_average: 63, winter_average: 70 }];
  const s = measureSeries(clarity, rows);
  assert.deepEqual(s.map((x) => [x.name, x.field]), [['Annual', 'annual_average'], ['Winter', 'winter_average']]);
  assert.equal(s[0].rows, rows);
});

test('measureView drops rows without x, sorts years numerically, and sorts dates as text', () => {
  const years = measureView(ozone, [{ Year: 2020, Value: 1 }, { Year: null, Value: 2 }, { Year: 1999, Value: 3 }]);
  assert.deepEqual(years.map((r) => r.Year), [1999, 2020]);
  const dates = measureView(daily, [{ date: '2017-02-01' }, { date: '2017-01-09' }, { date: '' }]);
  assert.deepEqual(dates.map((r) => r.date), ['2017-01-09', '2017-02-01']);
});

test('measureView ranks by value with sort desc and caps rows at limit', () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ counter_name: `C${i}`, value: (i * 7) % 20 }));
  const view = measureView(counters, rows);
  assert.equal(view.length, 15);
  for (let i = 1; i < view.length; i += 1) assert.ok(Number(view[i].value) <= Number(view[i - 1].value));
  const asc = measureView({ ...counters, sort: 'asc', limit: undefined }, rows);
  assert.equal(asc.length, 20);
  assert.equal(asc[0].value, 0);
});

test('measureColumns lists x, series, pick, y, and threshold columns', () => {
  assert.deepEqual(measureColumns(ozone), [
    { field: 'Year', headerName: 'Year' },
    { field: 'Site', headerName: 'Station' },
    { field: 'Indicator', headerName: 'Statistic' },
    { field: 'Value', headerName: 'O3 (ppm)', num: true },
    { field: 'Threshold_Value', headerName: 'Threshold' },
  ]);
  assert.deepEqual(measureColumns(clarity).map((c) => c.headerName), ['Year', 'Annual', 'Winter']);
  assert.deepEqual(measureColumns(counters).map((c) => c.headerName), ['Counter', 'Total count']);
});

test('pick choices, default pick, and picked rows', () => {
  const rows = [
    { Year: 2019, Indicator: 'O3 - HIGH 1 HR' },
    { Year: 2020, Indicator: 'O3 - HIGH 1 HR' },
    { Year: 2020, Indicator: 'O3 - HIGH 8 HR' },
    { Year: 2021, Indicator: null },
  ];
  const choices = pickChoices(ozone, rows);
  assert.deepEqual(choices, ['O3 - HIGH 1 HR', 'O3 - HIGH 8 HR']);
  assert.equal(defaultPick(ozone, rows, choices), 'O3 - HIGH 8 HR');
  assert.equal(defaultPick({ ...ozone, pickDefault: 'missing' }, rows, choices), 'O3 - HIGH 1 HR', 'longest record wins');
  assert.equal(pickedRows(ozone, rows, 'O3 - HIGH 1 HR').length, 2);
  assert.equal(pickedRows(counters, rows, undefined).length, 4);
  assert.deepEqual(pickChoices(counters, rows), []);
});

test('xDisplay maps months and xNames', () => {
  assert.equal(xDisplay({ ...counters, xType: 'month' }, 3), 'March');
  assert.equal(xDisplay({ ...counters, xNames: { KMC: 'Klamath mixed conifer' } }, 'KMC'), 'Klamath mixed conifer');
  assert.equal(xDisplay(ozone, 2019), '2019');
});

test('measureThreshold reads standard.value or the first finite standard.field', () => {
  assert.equal(measureThreshold(ozone, [{ Threshold_Value: null }, { Threshold_Value: '0.08' }]), 0.08);
  assert.equal(measureThreshold(ozone, [{ Threshold_Value: null }]), null);
  assert.equal(measureThreshold({ ...ozone, standard: { value: 9, label: 'Standard' } }, []), 9);
  assert.equal(measureThreshold(clarity, []), null);
});

test('measureChartSpec builds a linear line chart with a labeled threshold and named series', () => {
  const rows = measureView(ozone, [
    { Year: 2020, Site: 'Tahoe City', Indicator: 'O3 - HIGH 1 HR', Value: 0.064, Threshold_Value: '0.08' },
    { Year: 2019, Site: 'Stateline TRPA', Indicator: 'O3 - HIGH 1 HR', Value: 0.067, Threshold_Value: '0.08' },
  ]);
  const spec = measureChartSpec(ozone, rows);
  assert.equal(spec.type, 'line');
  assert.equal(spec.xKind, 'linear');
  assert.equal(spec.xLabel, undefined);
  assert.equal(spec.yLabel, 'O3 (ppm)');
  assert.deepEqual(spec.threshold, { value: 0.08, label: 'Threshold: 0.08' });
  assert.deepEqual(spec.series.map((s) => s.name), ['Stateline TRPA', 'Tahoe City']);
  assert.deepEqual(spec.series[0].points, [{ x: 2019, y: 0.067 }]);
  assert.equal(spec.categories, undefined);
});

test('measureChartSpec builds a stacked band chart with percent format and category labels', () => {
  const m: Measure = {
    title: 'Streams by condition class',
    layer: 83,
    x: 'Year',
    xType: 'category',
    xLabel: 'Period',
    y: 'Value',
    yLabel: 'Share of streams',
    format: '.0%',
    type: 'stacked',
    seriesBy: 'Condition_Class',
  };
  const rows = measureView(m, [
    { Year: '2016-2019', Condition_Class: 'Good', Value: 0.168 },
    { Year: '2009-2015', Condition_Class: 'Excellent', Value: 0.55 },
    { Year: '2016-2019', Condition_Class: 'Excellent', Value: 0.6506 },
  ]);
  const spec = measureChartSpec(m, rows);
  assert.equal(spec.type, 'stacked');
  assert.equal(spec.xKind, 'band');
  assert.deepEqual(spec.categories, ['2009-2015', '2016-2019']);
  assert.equal(spec.format, '.0%');
  assert.equal(spec.threshold, null);
  assert.deepEqual(spec.series.map((s) => s.name), ['Excellent', 'Good']);
});

test('measureChartSpec builds a horizontal ranked bar chart without an x title', () => {
  const rows = measureView(counters, [
    { counter_name: 'B', value: 5 },
    { counter_name: 'A', value: 9 },
  ]);
  const spec = measureChartSpec(counters, rows);
  assert.equal(spec.horizontal, true);
  assert.equal(spec.type, 'bar');
  assert.deepEqual(spec.categories, ['A', 'B']);
  assert.equal(spec.xLabel, undefined);
  assert.equal(spec.yLabel, '');
  assert.deepEqual(spec.series[0].points, [{ x: 'A', y: 9 }, { x: 'B', y: 5 }]);
});

test('measureChartSpec marks months as a band axis with month names', () => {
  const m: Measure = { ...counters, x: 'month_of_year', xType: 'month', xLabel: 'Month', orientation: undefined, sort: undefined, limit: undefined };
  const spec = measureChartSpec(m, measureView(m, [{ month_of_year: 3, value: 2 }, { month_of_year: 1, value: 1 }]));
  assert.deepEqual(spec.categories, ['1', '3']);
  assert.deepEqual(spec.categoryLabels, { '1': 'Jan.', '3': 'March' });
});

test('emptyStateText and panelSpans follow the panel contract', () => {
  assert.deepEqual(emptyStateText(ozone), {
    title: 'No ozone by station loaded yet',
    description: 'This section will show O3 (ppm) by year.',
  });
  const spans = panelSpans([ozone, { ...daily, span: 'span-12' }, { ...clarity }, { ...counters }, { ...counters, title: 'Broken' }]);
  assert.deepEqual(spans, ['span-12', 'span-12', 'span-6', 'span-6', 'span-12'], 'an unpaired last measure fills the row');
  assert.deepEqual(panelSpans([{ ...clarity }, { ...counters }]), ['span-6', 'span-6']);
  assert.deepEqual(panelSpans([{ ...clarity }]), ['span-12']);
});

test('fmtValue is the shared formatter', () => {
  assert.equal(fmtValue(0.08, undefined), '0.08');
  assert.equal(fmtValue(0.6506, '.0%'), '65%');
});

test('queryMeasure: statistics path groups by x, seriesBy, and pick in one request', async () => {
  const urls: string[] = [];
  const fakeFetch: FetchLike = async (url) => {
    urls.push(url);
    return { ok: true, status: 200, json: async () => ({ features: [{ attributes: { counter_name: 'A', value: 10 } }] }) };
  };
  const rows = await queryMeasure(counters, { fetch: fakeFetch });
  assert.equal(urls.length, 1);
  const p = new URL(urls[0]).searchParams;
  assert.equal(p.get('groupByFieldsForStatistics'), 'counter_name');
  assert.equal(JSON.parse(p.get('outStatistics') ?? '[]')[0].onStatisticField, 'count_of_bike_ped');
  assert.deepEqual(rows, [{ counter_name: 'A', value: 10 }]);
});

test('queryMeasure: feature path pages, normalizes dates, and fills seriesBy nulls', async () => {
  const urls: string[] = [];
  const fakeFetch: FetchLike = async (url) => {
    urls.push(url);
    const p = new URL(url).searchParams;
    const offset = Number(p.get('resultOffset'));
    const features =
      offset === 0
        ? [
            { attributes: { date: '1/9/2017', id: 'STL', value: 44.6, variable: 'O3 - 8 hr max (ppm)' } },
            { attributes: { date: 1483920000000, id: null, value: 29.1, variable: 'O3 - 8 hr max (ppm)' } },
          ]
        : [];
    return { ok: true, status: 200, json: async () => ({ features, exceededTransferLimit: offset === 0 }) };
  };
  const rows = await queryMeasure(daily, { fetch: fakeFetch, pageSize: 2 });
  assert.equal(urls.length, 2, 'a full first page is followed by one more request');
  const p = new URL(urls[0]).searchParams;
  assert.equal(p.get('outFields'), 'date,id,variable,value');
  assert.equal(p.get('orderByFields'), 'date');
  assert.deepEqual(rows.map((r) => r.date), ['2017-01-09', '2017-01-09']);
  assert.deepEqual(rows.map((r) => r.id), ['STL', 'Not stated']);
});

test('queryMeasure: unpivot path reads every field and reshapes year columns', async () => {
  const m: Measure = { title: 'Turbidity', layer: 111, x: 'Year', y: 'value', unpivot: { prefix: 'NTU' }, seriesBy: 'Location' };
  const fakeFetch: FetchLike = async (url) => {
    const p = new URL(url).searchParams;
    assert.equal(p.get('outFields'), '*');
    return { ok: true, status: 200, json: async () => ({ features: [{ attributes: { Location: 'Tahoe City', NTU2015: 0.5, NTU2016: 0.7 } }] }) };
  };
  const rows = await queryMeasure(m, { fetch: fakeFetch });
  assert.deepEqual(rows, [
    { Location: 'Tahoe City', Year: 2015, value: 0.5 },
    { Location: 'Tahoe City', Year: 2016, value: 0.7 },
  ]);
});

test('queryMeasure surfaces a service error', async () => {
  const fakeFetch: FetchLike = async () => ({ ok: true, status: 200, json: async () => ({ error: { code: 400, message: 'Failed to execute query.' } }) });
  await assert.rejects(queryMeasure({ ...ozone, where: "Pollutnt = 'O3'" }, { fetch: fakeFetch }), /Failed to execute query/);
});

/* ---------- Sites monitored each year ---------- */

const perYearOzone: SitesPerYearConfig = { layer: 46, year: 'Year', site: 'Site', where: "Pollutant = 'O3'", unit: 'station' };
const perYearLtimp: SitesPerYearConfig = { layer: 99, year: 'SampleDatetime', site: 'SiteName', extract: true, unit: 'station' };

test('sitesPerYearMeasure is a bar chart of the unit count by year with the contract wording', () => {
  const m = sitesPerYearMeasure(perYearOzone);
  assert.equal(m.title, 'Stations monitored each year');
  assert.equal(m.sub, 'Number of stations with a record in each year.');
  assert.equal(m.layer, 46);
  assert.equal(m.type, 'bar');
  assert.equal(m.x, SITES_PER_YEAR_X);
  assert.equal(m.y, SITES_PER_YEAR_Y);
  assert.equal(m.yLabel, 'Stations monitored');
  assert.deepEqual(measureColumns(m).map((c) => c.headerName), ['Year', 'Stations monitored']);
  assert.equal(sitesPerYearMeasure({ layer: 9, year: 'Y', site: 'S' }).title, 'Sites monitored each year');
});

test('sitesPerYearYearKey wraps a date field in EXTRACT when extract is set', () => {
  assert.equal(sitesPerYearYearKey(perYearOzone), 'Year');
  assert.equal(sitesPerYearYearKey(perYearLtimp), 'EXTRACT(YEAR FROM SampleDatetime)');
});

test('sitesPerYearRows counts distinct sites per year, sorted, reading Expr1 for an EXTRACT', () => {
  const rows = sitesPerYearRows(perYearOzone, [
    { Year: 2019, Site: 'A', n: 12 },
    { Year: 2019, Site: 'B', n: 3 },
    { Year: 2018, Site: 'A', n: 5 },
    { Year: 2019, Site: '', n: 1 },
    { Year: null, Site: 'C', n: 1 },
  ]);
  assert.deepEqual(rows, [
    { year: 2018, count: 1 },
    { year: 2019, count: 2 },
  ]);
  const extracted = sitesPerYearRows(perYearLtimp, [
    { Expr1: 2021, SiteName: 'Ward Creek', n: 40 },
    { Expr1: 2021, SiteName: 'Blackwood Creek', n: 38 },
    { EXPR1: '2022', SiteName: 'Ward Creek', n: 41 },
  ]);
  assert.deepEqual(extracted, [
    { year: 2021, count: 2 },
    { year: 2022, count: 1 },
  ]);
  // Epoch milliseconds for a year field that is a date, without EXTRACT.
  const epoch = sitesPerYearRows({ layer: 1, year: 'd', site: 's' }, [{ d: Date.UTC(2020, 5, 1), s: 'x' }]);
  assert.deepEqual(epoch, [{ year: 2020, count: 1 }]);
});

test('querySitesPerYear sends one grouped count request and returns the per-year rows', async () => {
  const calls: URLSearchParams[] = [];
  const fakeFetch: FetchLike = async (url) => {
    calls.push(new URL(url).searchParams);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        features: [
          { attributes: { Expr1: 2021, SiteName: 'Ward Creek', n: 40 } },
          { attributes: { Expr1: 2022, SiteName: 'Ward Creek', n: 41 } },
          { attributes: { Expr1: 2022, SiteName: 'Blackwood Creek', n: 7 } },
        ],
      }),
    };
  };
  const rows = await querySitesPerYear(perYearLtimp, { fetch: fakeFetch });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].get('groupByFieldsForStatistics'), 'EXTRACT(YEAR FROM SampleDatetime),SiteName');
  assert.equal(calls[0].get('where'), '1=1');
  const stats = JSON.parse(calls[0].get('outStatistics') ?? '[]');
  assert.deepEqual(stats, [{ statisticType: 'count', onStatisticField: 'OBJECTID', outStatisticFieldName: 'n' }]);
  assert.deepEqual(rows, [
    { year: 2021, count: 1 },
    { year: 2022, count: 2 },
  ]);
});

test('queryPanelRows routes a sites-per-year source to its query and everything else to queryMeasure', async () => {
  const urls: string[] = [];
  const fakeFetch: FetchLike = async (url) => {
    urls.push(url);
    return { ok: true, status: 200, json: async () => ({ features: [] }) };
  };
  await queryPanelRows(sitesPerYearMeasure(perYearOzone), { kind: 'sites-per-year', config: perYearOzone }, { fetch: fakeFetch });
  assert.match(urls[0], /\/46\/query\?/);
  assert.match(urls[0], /groupByFieldsForStatistics=Year%2CSite/);
  await queryPanelRows(ozone, null, { fetch: fakeFetch });
  assert.match(urls[1], /\/46\/query\?/);
  assert.match(urls[1], /outFields=/);
});
