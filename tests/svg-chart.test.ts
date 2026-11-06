import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bandScale,
  dashFor,
  formatDate,
  formatValue,
  isoToMs,
  linearScale,
  linearTicks,
  markerFor,
  niceStep,
  renderChart,
  seriesClass,
  timeTicks,
  truncate,
} from '../src/lib/svg-chart/index.ts';
import type { ChartSpec } from '../src/lib/svg-chart/index.ts';

test('niceStep follows 1-2-5 stepping', () => {
  assert.equal(niceStep(10, 5), 2);
  assert.equal(niceStep(100, 5), 20);
  assert.equal(niceStep(0.1, 5), 0.02);
  assert.equal(niceStep(7, 5), 2);
  assert.equal(niceStep(30, 5), 10);
  assert.equal(niceStep(1, 5), 0.2);
});

test('linearTicks includes zero by default and covers the data', () => {
  const t = linearTicks(0.05, 0.095);
  assert.deepEqual(t.ticks, [0, 0.02, 0.04, 0.06, 0.08, 0.1]);
  assert.deepEqual(t.domain, [0, 0.1]);
});

test('linearTicks with zero false starts above zero', () => {
  const t = linearTicks(6225.3, 6228.9, { zero: false });
  assert.equal(t.ticks[0], 6225);
  assert.equal(t.ticks[t.ticks.length - 1], 6229);
  assert.ok(t.domain[0] > 0);
});

test('linearTicks on a percent domain gives whole-percent ticks', () => {
  const t = linearTicks(0.1807, 1.0, {});
  assert.deepEqual(t.ticks, [0, 0.2, 0.4, 0.6, 0.8, 1]);
  assert.deepEqual(t.ticks.map((v) => formatValue(v, '.0%')), ['0%', '20%', '40%', '60%', '80%', '100%']);
});

test('linearTicks integer keeps whole-year steps', () => {
  const t = linearTicks(2019, 2021, { zero: false, integer: true });
  assert.ok(t.ticks.every((v) => Number.isInteger(v)));
  assert.equal(t.ticks[0], 2019);
  assert.equal(t.ticks[t.ticks.length - 1], 2021);
});

test('linearScale maps the domain onto the range, including an inverted range', () => {
  const s = linearScale([0, 10], [300, 100]);
  assert.equal(s(0), 300);
  assert.equal(s(10), 100);
  assert.equal(s(5), 200);
});

test('bandScale spaces categories evenly with padding', () => {
  const b = bandScale(['a', 'b', 'c'], [0, 300], 0.2, 0.2);
  assert.equal(b.domain.length, 3);
  assert.ok(b('a')! < b('b')! && b('b')! < b('c')!);
  assert.ok(Math.abs(b('b')! - b('a')! - b.step) < 1e-9);
  assert.ok(b.bandwidth < b.step);
  assert.equal(b('missing'), undefined);
  assert.ok(Math.abs(b.center('a')! - (b('a')! + b.bandwidth / 2)) < 1e-9);
});

test('timeTicks picks years for long spans and months for short ones', () => {
  const years = timeTicks(isoToMs('2017-01-09'), isoToMs('2025-12-31'), 8);
  assert.ok(years.length >= 2 && years.length <= 8);
  assert.ok(years.every((t) => /^\d{4}$/.test(t.label)));
  const months = timeTicks(isoToMs('2021-01-01'), isoToMs('2021-12-31'), 8);
  assert.ok(months.length >= 2 && months.length <= 8);
  assert.ok(months.every((t) => /^[A-Za-z.]+ 2021$/.test(t.label)), months.map((t) => t.label).join(' | '));
  const days = timeTicks(isoToMs('2021-03-01'), isoToMs('2021-03-20'), 6);
  assert.ok(days.length >= 2 && days.length <= 6);
  assert.equal(days[0].label, 'March 1');
});

test('formatValue rounds to 3 decimals, groups thousands, and renders percents', () => {
  assert.equal(formatValue(1959238), '1,959,238');
  assert.equal(formatValue(0.08333), '0.083');
  assert.equal(formatValue(0.6506, '.0%'), '65%');
  assert.equal(formatValue(null), '');
  assert.equal(formatValue('abc'), '');
  assert.equal(formatValue('0.08'), '0.08');
  assert.equal(formatDate('2017-01-09'), 'Jan. 9, 2017');
});

test('series encodings rotate: class wraps after 8, markers after 4, dashes start at the third series', () => {
  assert.equal(seriesClass(0), 'mon-chart__series--1');
  assert.equal(seriesClass(8), 'mon-chart__series--1');
  assert.equal(seriesClass(9), 'mon-chart__series--2');
  assert.deepEqual([0, 1, 2, 3, 4].map(markerFor), ['circle', 'square', 'triangle', 'diamond', 'circle']);
  assert.equal(dashFor(0), null);
  assert.equal(dashFor(1), null);
  assert.equal(dashFor(2), '6 3');
  assert.equal(truncate('Shared-use path - Camp Richardson', 12), 'Shared-use…');
  assert.equal(truncate('short', 12), 'short');
});

const lineSpec: ChartSpec = {
  title: 'Ozone by station',
  type: 'line',
  xKind: 'linear',
  xLabel: 'Year',
  yLabel: 'O3 (ppm)',
  threshold: { value: 0.08, label: 'Threshold: 0.08' },
  series: [
    { name: 'Stateline', points: [{ x: 2019, y: 0.067 }, { x: 2020, y: 0.071 }, { x: 2021, y: null }, { x: 2022, y: 0.065 }] },
    { name: 'Tahoe City', points: [{ x: 2019, y: 0.06 }, { x: 2020, y: 0.064 }, { x: 2022, y: 0.062 }] },
    { name: 'Incline Village', points: [{ x: 2020, y: 0.07 }, { x: 2022, y: 0.066 }] },
  ],
};

test('renderChart draws a line chart with markers, dashes, threshold, and one hit group per x', () => {
  const r = renderChart(lineSpec, 800, 'c1');
  assert.ok(r.svg.startsWith('<svg class="mon-chart__svg"'));
  assert.ok(r.svg.includes('role="img"'));
  assert.ok(r.svg.includes('aria-labelledby="c1-title c1-desc"'));
  assert.ok(r.svg.includes('<title id="c1-title">Ozone by station</title>'));
  assert.ok(r.svg.includes('<desc id="c1-desc">3 series (Stateline, Tahoe City, Incline Village). Year from 2019 to 2022. Threshold: 0.08 drawn as a dashed line.</desc>'));
  assert.equal((r.svg.match(/class="mon-chart__series mon-chart__series--/g) || []).length, 3);
  assert.ok(r.svg.includes('mon-chart__series--1'));
  assert.ok(r.svg.includes('mon-chart__series--3'));
  assert.ok(r.svg.includes('<circle class="mon-chart__marker"'));
  assert.ok(r.svg.includes('<rect class="mon-chart__marker"'));
  assert.ok(r.svg.includes('<polygon class="mon-chart__marker"'));
  assert.ok(r.svg.includes('stroke-dasharray="6 3"'), 'third series is dashed');
  assert.ok(r.svg.includes('<g class="mon-chart__threshold">'));
  assert.ok(r.svg.includes('text-anchor="end">Threshold: 0.08</text>'));
  assert.equal(r.positions.length, 4);
  assert.equal((r.svg.match(/class="mon-chart__hit"/g) || []).length, 4);
  assert.ok(r.svg.includes('tabindex="0" data-i="0"'));
  assert.ok(r.svg.includes('aria-label="2019: Stateline 0.067, Tahoe City 0.06"'));
  assert.deepEqual(r.positions[2].values, [], 'a null point and missing points leave no tooltip values');
  assert.equal(r.positions[2].label, '2021');
  assert.ok(r.svg.includes('aria-label="2021: no data"'));
  assert.equal(r.legend.length, 3);
  assert.deepEqual(r.legend.map((l) => l.marker), ['circle', 'square', 'triangle']);
  assert.ok(!r.svg.includes('style='), 'no inline styles');
  assert.ok(!r.svg.includes('#3e72b0'), 'no literal colors in the markup');
  assert.equal(r.height, 320);
});

test('renderChart re-renders narrower at 375 px with the same positions', () => {
  const wide = renderChart(lineSpec, 900, 'w');
  const narrow = renderChart(lineSpec, 375, 'n');
  assert.ok(narrow.svg.includes('viewBox="0 0 375 320"'));
  assert.ok(wide.svg.includes('viewBox="0 0 900 320"'));
  assert.equal(narrow.positions.length, wide.positions.length);
  assert.ok(narrow.plot.x1 - narrow.plot.x0 < wide.plot.x1 - wide.plot.x0);
});

test('renderChart stacks bars to the total and hatches alternate series', () => {
  const spec: ChartSpec = {
    title: 'Streams by condition class',
    type: 'stacked',
    xKind: 'band',
    xLabel: 'Period',
    yLabel: 'Share of streams',
    format: '.0%',
    categories: ['2009-2015', '2016-2019'],
    series: [
      { name: 'Excellent', points: [{ x: '2009-2015', y: 0.55 }, { x: '2016-2019', y: 0.6506 }] },
      { name: 'Good', points: [{ x: '2009-2015', y: 0.19 }, { x: '2016-2019', y: 0.168 }] },
      { name: 'Marginal', points: [{ x: '2009-2015', y: 0.26 }, { x: '2016-2019', y: 0.1807 }] },
    ],
  };
  const r = renderChart(spec, 480, 's');
  assert.equal((r.svg.match(/<rect class="mon-chart__bar/g) || []).length, 6);
  assert.ok(r.svg.includes('<pattern id="s-hatch-1"'), 'second series carries the hatch pattern');
  assert.ok(r.svg.includes('fill="url(#s-hatch-1)"'));
  assert.ok(!r.svg.includes('s-hatch-0'), 'first series is solid');
  assert.ok(r.svg.includes('>100%</text>'), 'percent axis tops out at 100 percent');
  assert.deepEqual(r.legend.map((l) => l.hatch), [false, true, false]);
  // The stacked bars for one period reach from the baseline to the sum of the shares.
  const bars = [...r.svg.matchAll(/<rect class="mon-chart__bar[^"]*" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
  const firstBand = bars.filter((b) => b[1] === bars[0][1]);
  const totalHeight = firstBand.reduce((h, b) => h + Number(b[4]), 0);
  const plotHeight = r.plot.y1 - r.plot.y0;
  assert.ok(Math.abs(totalHeight - plotHeight) < 1.5, `stack should fill the plot height: ${totalHeight} vs ${plotHeight}`);
  assert.equal(r.positions[0].values.map((v) => v.text).join(','), '55%,19%,26%');
});

test('renderChart ranks horizontal bars top to bottom in category order and grows with the bar count', () => {
  const names = Array.from({ length: 15 }, (_, i) => `Counter ${String.fromCharCode(65 + i)}`);
  const spec: ChartSpec = {
    title: 'Busiest counters',
    type: 'bar',
    horizontal: true,
    xKind: 'band',
    yLabel: 'Total count',
    categories: names,
    series: [{ name: 'Total count', points: names.map((n, i) => ({ x: n, y: 1000 * (15 - i) })) }],
  };
  const r = renderChart(spec, 480, 'h');
  const bars = [...r.svg.matchAll(/<rect class="mon-chart__bar" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
  assert.equal(bars.length, 15);
  const ys = bars.map((b) => Number(b[2]));
  for (let i = 1; i < ys.length; i += 1) assert.ok(ys[i] > ys[i - 1], 'first category sits at the top');
  const widths = bars.map((b) => Number(b[3]));
  for (let i = 1; i < widths.length; i += 1) assert.ok(widths[i] < widths[i - 1], 'bars shrink down the ranking');
  assert.ok(r.svg.includes('>Counter A</text>'));
  assert.ok(r.svg.includes('>Total count</text>'), 'value axis title along the bottom');
  assert.ok(r.height >= 320);
  assert.equal(r.positions.length, 15);
  assert.equal(r.legend.length, 1);
});

test('renderChart draws a time axis with year ticks and no markers past 40 points', () => {
  const points = [];
  for (let i = 0; i < 400; i += 1) {
    const d = new Date(Date.UTC(2017, 0, 1) + i * 7 * 86400000);
    points.push({ x: d.toISOString().slice(0, 10), y: 20 + (i % 10) });
  }
  const spec: ChartSpec = { title: 'Daily ozone', xKind: 'time', xLabel: 'Date', yLabel: 'O3', series: [{ name: 'Stateline', points }] };
  const r = renderChart(spec, 900, 't');
  assert.ok(r.svg.includes('>2018</text>'));
  assert.ok(!r.svg.includes('mon-chart__marker'), 'long series draw lines only');
  assert.equal(r.positions.length, 400);
  assert.equal(r.positions[0].label, 'Jan. 1, 2017');
});

test('renderChart survives an empty series list', () => {
  const r = renderChart({ title: 'Nothing', xKind: 'linear', series: [] }, 600, 'e');
  assert.ok(r.svg.includes('<svg'));
  assert.equal(r.positions.length, 0);
});
