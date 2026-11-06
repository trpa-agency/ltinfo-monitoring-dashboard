/*
 * svg-chart/render.ts: native SVG rendering of a ChartSpec to a markup string.
 * Zero dependencies and no DOM: mon-chart sets the string as innerHTML and wires
 * hover and keyboard on the hit groups it finds. Colors come only from the CSS
 * classes in mon-chart.css (mon-chart__series--1 to --8 read the Ecology
 * dataviz tokens; the threshold reads --color-content-default-secondary).
 *
 * Second encoding beside color: line series rotate marker shapes and take dash
 * patterns after the first two; alternate bar series carry a diagonal hatch.
 */

import type {
  AxisKind,
  ChartSpec,
  ChartType,
  HoverPosition,
  HoverValue,
  LegendItem,
  MarkerShape,
  RenderResult,
} from './types.ts';
import { bandScale, isoToMs, linearScale, linearTicks, timeTicks } from './scales.ts';
import type { BandScale } from './scales.ts';
import { formatDate, formatValue } from './format.ts';

/** Tick and label font size in SVG units. */
export const FONT = 11;
/** Average glyph width at FONT size. Lexend Deca is a wide face, about 0.6 em. */
const CHAR_W = 6.6;
const PALETTE = 8;

export const MARKERS: MarkerShape[] = ['circle', 'square', 'triangle', 'diamond'];
export const DASHES = ['6 3', '2 3', '8 3 2 3', '1 3'];

/** CSS class that colors series i (0-based); the palette wraps after 8. */
export function seriesClass(i: number): string {
  return `mon-chart__series--${(i % PALETTE) + 1}`;
}

export function markerFor(i: number): MarkerShape {
  return MARKERS[i % MARKERS.length];
}

/** stroke-dasharray for series i; the first two series are solid. */
export function dashFor(i: number): string | null {
  return i < 2 ? null : DASHES[(i - 2) % DASHES.length];
}

export function esc(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const n2 = (v: number): string => String(Math.round(v * 100) / 100);

export function markerMarkup(shape: MarkerShape, cx: number, cy: number, r: number, cls = 'mon-chart__marker'): string {
  switch (shape) {
    case 'square':
      return `<rect class="${cls}" x="${n2(cx - r)}" y="${n2(cy - r)}" width="${n2(2 * r)}" height="${n2(2 * r)}"/>`;
    case 'triangle': {
      const h = r * 1.2;
      return `<polygon class="${cls}" points="${n2(cx)},${n2(cy - h)} ${n2(cx + h)},${n2(cy + h * 0.8)} ${n2(cx - h)},${n2(cy + h * 0.8)}"/>`;
    }
    case 'diamond': {
      const d = r * 1.3;
      return `<polygon class="${cls}" points="${n2(cx)},${n2(cy - d)} ${n2(cx + d)},${n2(cy)} ${n2(cx)},${n2(cy + d)} ${n2(cx - d)},${n2(cy)}"/>`;
    }
    default:
      return `<circle class="${cls}" cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}"/>`;
  }
}

/** Cuts a label to maxChars with an ellipsis. */
export function truncate(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  if (maxChars < 2) return s.slice(0, 1);
  return `${s.slice(0, maxChars - 1).trimEnd()}…`;
}

export function textWidth(s: string, font: number = FONT): number {
  return s.length * CHAR_W * (font / FONT);
}

function hatchPattern(uid: string, i: number): string {
  return (
    `<pattern id="${uid}-hatch-${i}" class="${seriesClass(i)}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">` +
    '<rect class="mon-chart__hatch-fill" width="6" height="6"/>' +
    '<line class="mon-chart__hatch-line" x1="0" y1="0" x2="0" y2="6"/>' +
    '</pattern>'
  );
}

/** Legend swatch: a line with its marker and dash, or a bar with its hatch. uid keeps pattern ids unique. */
export function swatchMarkup(item: LegendItem, uid: string): string {
  const open = `<svg class="mon-chart__swatch ${seriesClass(item.index)}" viewBox="0 0 22 12" width="22" height="12" aria-hidden="true" focusable="false">`;
  if (item.kind === 'bar') {
    const defs = item.hatch ? `<defs>${hatchPattern(uid, item.index)}</defs>` : '';
    const fill = item.hatch ? ` fill="url(#${uid}-hatch-${item.index})"` : '';
    return `${open}${defs}<rect class="mon-chart__bar${item.hatch ? ' mon-chart__bar--hatch' : ''}" x="1" y="1" width="20" height="10"${fill}/></svg>`;
  }
  const dash = item.dash ? ` stroke-dasharray="${item.dash}"` : '';
  return `${open}<line class="mon-chart__line" x1="0" y1="6" x2="22" y2="6"${dash}/>${markerMarkup(item.marker, 11, 6, 3.5)}</svg>`;
}

function categoryKeys(spec: ChartSpec, kind: AxisKind): string[] {
  if (spec.categories && kind === 'band') return spec.categories.slice();
  const seen = new Set<string>();
  for (const s of spec.series) for (const p of s.points) seen.add(String(p.x));
  const keys = [...seen];
  if (kind === 'linear') keys.sort((a, b) => Number(a) - Number(b));
  else if (kind === 'time') keys.sort();
  return keys;
}

function describe(spec: ChartSpec, labels: string[], horizontal: boolean): string {
  const n = spec.series.length;
  const names = spec.series.map((s) => s.name);
  const shown = names.slice(0, 4).join(', ') + (n > 4 ? `, and ${n - 4} more` : '');
  const first = labels[0] ?? '';
  const last = labels[labels.length - 1] ?? '';
  const range = horizontal
    ? `${labels.length} bars ranked from ${first} to ${last}`
    : `${spec.xLabel || 'Position'} from ${first} to ${last}`;
  const threshold = spec.threshold && !horizontal ? ` ${spec.threshold.label} drawn as a dashed line.` : '';
  return `${n} series (${shown}). ${range}.${threshold}`;
}

const maxWidth = (labels: string[]): number => labels.reduce((w, s) => Math.max(w, textWidth(s)), 0);

/**
 * Renders the chart at the given width in SVG units. Height is spec.height
 * (default 320); horizontal charts grow to fit their bars. The result carries
 * the hover positions in the same order as the hit groups' data-i attributes.
 */
export function renderChart(spec: ChartSpec, width: number, uid: string): RenderResult {
  const W = Math.max(200, Math.round(width));
  const horizontal = !!spec.horizontal;
  const type: ChartType = spec.type ?? 'line';
  const isBar = type === 'bar' || type === 'stacked';
  const stacked = type === 'stacked';
  const kind: AxisKind = horizontal || isBar ? 'band' : spec.xKind;
  const series = spec.series;
  const fmt = (v: number): string => formatValue(v, spec.format);

  // Category keys in order, with display labels.
  const keys = categoryKeys(spec, kind);
  const labelOf = (k: string): string => spec.categoryLabels?.[k] ?? (kind === 'time' ? formatDate(k) : k);
  const labels = keys.map(labelOf);

  // Values per series per key.
  const valueAt: Map<string, number | null>[] = series.map((s) => {
    const m = new Map<string, number | null>();
    for (const p of s.points) m.set(String(p.x), p.y);
    return m;
  });
  let vmin = Infinity;
  let vmax = -Infinity;
  if (stacked) {
    for (const k of keys) {
      let pos = 0;
      let neg = 0;
      for (const m of valueAt) {
        const v = m.get(k);
        if (v != null && Number.isFinite(v)) {
          if (v >= 0) pos += v;
          else neg += v;
        }
      }
      vmin = Math.min(vmin, neg);
      vmax = Math.max(vmax, pos);
    }
  } else {
    for (const m of valueAt) {
      for (const v of m.values()) {
        if (v != null && Number.isFinite(v)) {
          vmin = Math.min(vmin, v);
          vmax = Math.max(vmax, v);
        }
      }
    }
  }
  if (spec.threshold) {
    vmin = Math.min(vmin, spec.threshold.value);
    vmax = Math.max(vmax, spec.threshold.value);
  }
  if (!Number.isFinite(vmin) || !Number.isFinite(vmax)) {
    vmin = 0;
    vmax = 1;
  }
  const zero = spec.zero !== false;

  // Layout. Margins come from estimated label widths.
  let height = spec.height ?? 320;
  const titleGap = FONT + 8;
  let vt = linearTicks(vmin, vmax, { zero, count: 5 });
  let vLabels = vt.ticks.map(fmt);
  let left: number;
  let right: number;
  let top: number;
  let bottom: number;
  if (!horizontal) {
    left = Math.ceil(maxWidth(vLabels)) + 10 + (spec.yLabel ? titleGap : 0);
    bottom = FONT + 10 + (spec.xLabel ? titleGap : 0);
    const lastW = kind === 'band' ? 0 : textWidth(labels[labels.length - 1] ?? '') / 2;
    right = Math.ceil(Math.max(12, lastW + 4));
    top = spec.threshold ? FONT + 12 : 10;
  } else {
    const catW = Math.min(Math.floor(W * 0.4), Math.ceil(maxWidth(labels)));
    left = catW + 10;
    bottom = FONT + 10 + (spec.yLabel ? titleGap : 0);
    right = Math.ceil(Math.max(12, textWidth(vLabels[vLabels.length - 1] ?? '') / 2 + 4));
    top = 10;
    height = Math.max(height, keys.length * 22 + top + bottom);
  }
  const x0 = left;
  const x1 = W - right;
  const y0 = top;
  const y1 = height - bottom;
  const plotW = Math.max(10, x1 - x0);
  const plotH = Math.max(10, y1 - y0);
  if (horizontal) {
    vt = linearTicks(vmin, vmax, { zero, count: Math.max(2, Math.min(6, Math.floor(plotW / 90))) });
    vLabels = vt.ticks.map(fmt);
  }
  const vScale = linearScale(vt.domain, horizontal ? [x0, x1] : [y1, y0]);

  // Category scale and ticks.
  const inset = kind === 'band' ? 0 : 8;
  let centerOf: (k: string) => number;
  let band: BandScale | null = null;
  let catTicks: { at: number; label: string }[] = [];
  if (kind === 'band') {
    const b = bandScale(keys, horizontal ? [y0, y1] : [x0, x1], isBar ? 0.25 : 0, isBar ? 0.15 : 0.5);
    band = b;
    centerOf = (k) => b.center(k) ?? NaN;
    const every = horizontal
      ? Math.max(1, Math.ceil((FONT + 4) / b.step))
      : Math.max(1, Math.ceil((maxWidth(labels) + 10) / b.step));
    const maxChars = horizontal
      ? Math.max(3, Math.floor((left - 10) / CHAR_W))
      : Math.max(3, Math.floor((b.step * every - 6) / CHAR_W));
    catTicks = keys
      .map((k, i) => ({ at: centerOf(k), label: i % every === 0 ? truncate(labels[i], maxChars) : '' }))
      .filter((t) => t.label);
  } else if (kind === 'linear') {
    const nums = keys.map(Number);
    let lo = nums.reduce((a, v) => Math.min(a, v), Infinity);
    let hi = nums.reduce((a, v) => Math.max(a, v), -Infinity);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 1;
    }
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const sc = linearScale([lo, hi], [x0 + inset, x1 - inset]);
    centerOf = (k) => sc(Number(k));
    // With only a few years, mark just those years so ticks do not repeat one year.
    const tickVals =
      nums.length < 6
        ? nums
        : linearTicks(lo, hi, { zero: false, integer: true, count: Math.max(2, Math.floor(plotW / 70)) }).ticks.filter(
            (t) => t >= lo && t <= hi,
          );
    catTicks = tickVals.map((v) => ({ at: sc(v), label: String(v) }));
  } else {
    const ms = keys.map(isoToMs);
    let lo = ms.reduce((a, v) => Math.min(a, v), Infinity);
    let hi = ms.reduce((a, v) => Math.max(a, v), -Infinity);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0;
      hi = 86400000;
    }
    if (lo === hi) {
      lo -= 86400000;
      hi += 86400000;
    }
    const sc = linearScale([lo, hi], [x0 + inset, x1 - inset]);
    centerOf = (k) => sc(isoToMs(k));
    catTicks = timeTicks(lo, hi, Math.max(2, Math.floor(plotW / 80))).map((t) => ({ at: sc(t.ms), label: t.label }));
  }

  const out: string[] = [];
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const desc = describe(spec, labels, horizontal);
  out.push(
    `<svg class="mon-chart__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" role="img" aria-labelledby="${titleId} ${descId}">`,
  );
  out.push(`<title id="${titleId}">${esc(spec.title)}</title><desc id="${descId}">${esc(desc)}</desc>`);

  const hatched = (i: number): boolean => isBar && series.length > 1 && i % 2 === 1;
  if (isBar && series.length > 1) {
    out.push('<defs>');
    series.forEach((_, i) => {
      if (hatched(i)) out.push(hatchPattern(uid, i));
    });
    out.push('</defs>');
  }

  // Gridlines on the value axis.
  out.push('<g class="mon-chart__grid">');
  for (const t of vt.ticks) {
    const p = n2(vScale(t));
    out.push(horizontal ? `<line x1="${p}" x2="${p}" y1="${y0}" y2="${y1}"/>` : `<line x1="${x0}" x2="${x1}" y1="${p}" y2="${p}"/>`);
  }
  out.push('</g>');

  // Axes: baselines and tick labels.
  out.push('<g class="mon-chart__axis">');
  out.push(`<line class="mon-chart__axis-line" x1="${x0}" x2="${x1}" y1="${y1}" y2="${y1}"/>`);
  out.push(`<line class="mon-chart__axis-line" x1="${x0}" x2="${x0}" y1="${y0}" y2="${y1}"/>`);
  vt.ticks.forEach((t, i) => {
    const p = n2(vScale(t));
    out.push(
      horizontal
        ? `<text class="mon-chart__tick" x="${p}" y="${y1 + FONT + 4}" text-anchor="middle">${esc(vLabels[i])}</text>`
        : `<text class="mon-chart__tick" x="${x0 - 6}" y="${p}" dy="0.35em" text-anchor="end">${esc(vLabels[i])}</text>`,
    );
  });
  for (const t of catTicks) {
    const p = n2(t.at);
    out.push(
      horizontal
        ? `<text class="mon-chart__tick" x="${x0 - 6}" y="${p}" dy="0.35em" text-anchor="end">${esc(t.label)}</text>`
        : `<text class="mon-chart__tick" x="${p}" y="${y1 + FONT + 4}" text-anchor="middle">${esc(t.label)}</text>`,
    );
  }
  out.push('</g>');

  // Axis titles. A horizontal chart titles only its value axis, along the bottom.
  const bottomTitle = horizontal ? spec.yLabel : spec.xLabel;
  const leftTitle = horizontal ? '' : spec.yLabel;
  if (bottomTitle) {
    out.push(
      `<text class="mon-chart__axis-title" x="${n2((x0 + x1) / 2)}" y="${height - 4}" text-anchor="middle">${esc(bottomTitle)}</text>`,
    );
  }
  if (leftTitle) {
    out.push(
      `<text class="mon-chart__axis-title" transform="translate(${FONT} ${n2((y0 + y1) / 2)}) rotate(-90)" text-anchor="middle">${esc(leftTitle)}</text>`,
    );
  }

  // Marks.
  out.push('<g class="mon-chart__marks">');
  if (isBar && band) {
    const b = band;
    const stackPos = new Map<string, number>();
    const stackNeg = new Map<string, number>();
    const groupN = stacked ? 1 : Math.max(1, series.length);
    const slot = b.bandwidth / groupN;
    const thickness = stacked ? b.bandwidth : slot * 0.92;
    series.forEach((_, i) => {
      out.push(`<g class="mon-chart__series ${seriesClass(i)}" data-series="${i}">`);
      const fill = hatched(i) ? ` fill="url(#${uid}-hatch-${i})"` : '';
      const cls = `mon-chart__bar${hatched(i) ? ' mon-chart__bar--hatch' : ''}`;
      for (const k of keys) {
        const v = valueAt[i].get(k);
        if (v == null || !Number.isFinite(v)) continue;
        const start = b(k);
        if (start == null) continue;
        let a = 0;
        let bEnd = v;
        if (stacked) {
          const stack = v >= 0 ? stackPos : stackNeg;
          a = stack.get(k) ?? 0;
          bEnd = a + v;
          stack.set(k, bEnd);
        }
        const pa = vScale(a);
        const pb = vScale(bEnd);
        const lo = Math.min(pa, pb);
        const len = Math.abs(pb - pa);
        const offset = start + (stacked ? 0 : i * slot);
        if (horizontal) {
          out.push(`<rect class="${cls}" x="${n2(lo)}" y="${n2(offset)}" width="${n2(len)}" height="${n2(thickness)}"${fill}/>`);
        } else {
          out.push(`<rect class="${cls}" x="${n2(offset)}" y="${n2(lo)}" width="${n2(thickness)}" height="${n2(len)}"${fill}/>`);
        }
      }
      out.push('</g>');
    });
  } else {
    series.forEach((_, i) => {
      const dash = dashFor(i);
      const shape = markerFor(i);
      const m = valueAt[i];
      let d = '';
      let open = false;
      let finite = 0;
      for (const k of keys) {
        const v = m.get(k);
        if (v != null && Number.isFinite(v)) finite += 1;
      }
      const showMarkers = finite <= 40;
      const markers: string[] = [];
      for (const k of keys) {
        if (!m.has(k)) continue;
        const v = m.get(k);
        if (v == null || !Number.isFinite(v)) {
          open = false;
          continue;
        }
        const cx = centerOf(k);
        const cy = vScale(v);
        d += `${open ? 'L' : 'M'}${n2(cx)} ${n2(cy)}`;
        open = true;
        if (showMarkers) markers.push(markerMarkup(shape, cx, cy, 4));
      }
      const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
      out.push(
        `<g class="mon-chart__series ${seriesClass(i)}" data-series="${i}"><path class="mon-chart__line" d="${d}"${dashAttr}/>${markers.join('')}</g>`,
      );
    });
  }
  out.push('</g>');

  // Threshold line with a right-anchored label above it.
  if (spec.threshold && !horizontal) {
    const ty = vScale(spec.threshold.value);
    const labelY = ty - 5 - FONT < 0 ? ty + FONT + 3 : ty - 5;
    out.push(
      `<g class="mon-chart__threshold"><line x1="${x0}" x2="${x1}" y1="${n2(ty)}" y2="${n2(ty)}"/>` +
        `<text class="mon-chart__threshold-label" x="${x1}" y="${n2(labelY)}" text-anchor="end">${esc(spec.threshold.label)}</text></g>`,
    );
  }

  // Hit groups: one focusable group per position, tiling the plot.
  const positions: HoverPosition[] = [];
  const centers = keys.map((k) => centerOf(k));
  out.push('<g class="mon-chart__hits">');
  keys.forEach((k, i) => {
    const c = centers[i];
    const lo = horizontal ? y0 : x0;
    const hi = horizontal ? y1 : x1;
    const from = i > 0 ? (centers[i - 1] + c) / 2 : lo;
    const to = i < keys.length - 1 ? (c + centers[i + 1]) / 2 : hi;
    const values: HoverValue[] = [];
    series.forEach((s, si) => {
      const v = valueAt[si].get(k);
      if (v != null && Number.isFinite(v)) values.push({ index: si, name: s.name, value: v, text: fmt(v) });
    });
    const label = labels[i];
    const aria = values.length ? `${label}: ${values.map((v) => `${v.name} ${v.text}`).join(', ')}` : `${label}: no data`;
    positions.push({ index: i, key: k, label, at: c, values });
    const size = Math.max(1, to - from);
    const rect = horizontal
      ? `x="${x0}" y="${n2(from)}" width="${n2(plotW)}" height="${n2(size)}"`
      : `x="${n2(from)}" y="${y0}" width="${n2(size)}" height="${n2(plotH)}"`;
    out.push(
      `<g class="mon-chart__hit" role="group" tabindex="${i === 0 ? 0 : -1}" data-i="${i}" aria-label="${esc(aria)}"><rect ${rect}/></g>`,
    );
  });
  out.push('</g></svg>');

  const legend: LegendItem[] = series.map((s, i) => ({
    index: i,
    name: s.name,
    kind: isBar ? 'bar' : 'line',
    marker: markerFor(i),
    dash: dashFor(i),
    hatch: hatched(i),
  }));

  return { svg: out.join(''), width: W, height, positions, legend, plot: { x0, y0, x1, y1 }, horizontal, desc };
}
