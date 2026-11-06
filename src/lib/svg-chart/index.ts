/*
 * svg-chart: zero-dependency native SVG charts for the Monitoring Dashboard.
 * Pure modules only; the DOM half (resize, hover, keyboard) is mon-chart.
 */

export type {
  AxisKind,
  ChartPoint,
  ChartSeries,
  ChartSpec,
  ChartThreshold,
  ChartType,
  HoverPosition,
  HoverValue,
  LegendItem,
  MarkerShape,
  RenderResult,
} from './types.ts';
export { MONTHS, formatDate, formatMonthDay, formatMonthYear, formatValue, isoParts } from './format.ts';
export { bandScale, isoToMs, linearScale, linearTicks, niceStep, timeTicks } from './scales.ts';
export type { BandScale, LinearScale, LinearTicks, TickOptions, TimeTick } from './scales.ts';
export {
  DASHES,
  FONT,
  MARKERS,
  dashFor,
  esc,
  markerFor,
  markerMarkup,
  renderChart,
  seriesClass,
  swatchMarkup,
  textWidth,
  truncate,
} from './render.ts';
