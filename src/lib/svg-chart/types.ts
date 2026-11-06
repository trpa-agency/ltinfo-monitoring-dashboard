/*
 * svg-chart/types.ts: the chart spec a page hands to mon-chart, and the result
 * the renderer returns. No DOM types so the module stays testable under Node.
 */

/** How the category axis is scaled. "band" for text categories and years drawn as bars. */
export type AxisKind = 'linear' | 'band' | 'time';

export type ChartType = 'line' | 'bar' | 'stacked';

export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond';

export interface ChartPoint {
  /** Category key: a number for linear axes, an ISO date for time axes, a string otherwise. */
  x: string | number;
  /** Null draws a gap (lines) or nothing (bars). */
  y: number | null;
}

export interface ChartSeries {
  name: string;
  points: ChartPoint[];
}

export interface ChartThreshold {
  value: number;
  /** Full label drawn at the right end of the line, for example "Threshold: 0.08". */
  label: string;
}

export interface ChartSpec {
  /** Accessible title, usually the panel title. */
  title: string;
  type?: ChartType;
  /** Horizontal bars: categories on the y axis, values along x, ranked top to bottom. */
  horizontal?: boolean;
  xKind: AxisKind;
  xLabel?: string;
  yLabel?: string;
  /** ".0%" renders shares as percents; anything else is a plain number. */
  format?: string;
  /** Include zero on the value axis. Default true. */
  zero?: boolean;
  /** Ordered category keys for band axes. Derived from the data when omitted. */
  categories?: string[];
  /** Display names for category keys (month names, habitat codes). */
  categoryLabels?: Record<string, string>;
  threshold?: ChartThreshold | null;
  series: ChartSeries[];
  /** SVG height in CSS pixels. Default 320. Horizontal charts grow with their bar count. */
  height?: number;
}

export interface HoverValue {
  /** Series index, 0-based. */
  index: number;
  name: string;
  value: number;
  text: string;
}

/** One x position of the chart: what the tooltip shows and where the hit area sits. */
export interface HoverPosition {
  index: number;
  key: string;
  label: string;
  /** Center of the position along the category axis, in SVG units. */
  at: number;
  values: HoverValue[];
}

export interface LegendItem {
  index: number;
  name: string;
  kind: 'line' | 'bar';
  marker: MarkerShape;
  /** stroke-dasharray for the series line, or null for a solid line. */
  dash: string | null;
  hatch: boolean;
}

export interface RenderResult {
  svg: string;
  width: number;
  height: number;
  positions: HoverPosition[];
  legend: LegendItem[];
  /** Plot area in SVG units, for positioning a tooltip. */
  plot: { x0: number; y0: number; x1: number; y1: number };
  horizontal: boolean;
  desc: string;
}
