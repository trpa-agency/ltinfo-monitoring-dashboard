/**
 * Typed access to programs.json at the repo root, the source of truth for the ten
 * Threshold Dashboard categories and the monitoring programs in each.
 *
 * The shape mirrors the reference repo's templates/README.md
 * (ltinfo-monitoring-dashboard). Every key is documented there; the interfaces
 * below carry the same names so a program entry can be copied between repos.
 *
 * Build-time only. Pages import this in frontmatter; nothing here reaches the
 * browser bundle. Pure helpers (no Astro, no DOM) so tests can run under Node.
 */
import programsJson from '../../programs.json' with { type: 'json' };
import { withBase } from './base.ts';

/** The three page layouts. The order of the dashboard sections follows it. */
export type Template = 'charts' | 'map' | 'context';
export const TEMPLATES: readonly Template[] = ['charts', 'map', 'context'];
export const DEFAULT_TEMPLATE: Template = 'charts';

/** One measurement chart from the TRPA LTInfo_Monitoring map service. */
export interface Measure {
  title: string;
  sub?: string;
  layer: number;
  where?: string;
  x: string;
  xLabel?: string;
  xType?: 'category' | 'date' | 'month';
  y: string | { field: string; name: string }[];
  yName?: string;
  yLabel?: string;
  format?: string;
  stat?: 'sum' | 'count' | 'avg';
  seriesBy?: string;
  seriesLabel?: string;
  seriesNames?: Record<string, string>;
  seriesPrefix?: string;
  pick?: string;
  pickLabel?: string;
  pickDefault?: string;
  type?: 'line' | 'bar' | 'stacked';
  orientation?: 'h';
  sort?: 'desc';
  limit?: number;
  standard?: { field?: string; value?: number; label?: string };
  zero?: boolean;
  span?: 'span-12' | 'span-6';
  xNames?: Record<string, string>;
  unpivot?: { prefix: string };
}

/** Site points drawn from a map service layer instead of LT Info sites. */
export interface SitesLayer {
  layer: number;
  name: string;
  code?: string;
  year?: string;
  status?: string;
  active?: string;
  where?: string;
  unit?: string;
}

/** Where to count distinct sites per year for the "Sites monitored each year" chart. */
export interface SitesPerYear {
  layer: number;
  year: string;
  site: string;
  where?: string;
  extract?: boolean;
  unit?: string;
}

/** A polygon or line layer mapped in place of sites (SEZ units, routes, segments). */
export interface MapLayer {
  layer: number;
  title?: string;
  unit?: string;
  unitPlural?: string;
  name?: string;
  geometry?: 'line' | 'polygon';
  list?: boolean;
  countAsSites?: boolean;
  colorBy?: string;
  colorByLabel?: string;
  colors?: Record<string, string>;
  labels?: Record<string, string>;
  pick?: string;
  pickLabel?: string;
  where?: string;
  meta?: { field: string; suffix?: string }[];
  fields?: { field: string; label: string }[];
}

/** Reference layers drawn under a program's sites or areas. */
export interface Overlay {
  layer: number;
  title: string;
  name?: string;
  geometry: 'point' | 'line' | 'fill';
  color?: string;
  where?: string;
  fields?: { field: string; label: string }[];
}

export interface Program {
  /** LT Info monitoring program id, or 9000 plus the main layer when ltinfo is false. */
  id: number;
  name: string;
  /** Page file name inside the category folder, for example "ozone.html". */
  file: string;
  featured: boolean;
  template?: Template;
  /** false when LT Info has no record; the program then carries its own text. */
  ltinfo?: boolean;
  description?: string;
  approach?: string;
  sitesLayer?: SitesLayer;
  sitesPerYear?: SitesPerYear;
  mapLayer?: MapLayer;
  overlays?: Overlay[];
  measures?: Measure[];
}

export interface Category {
  thresholdCategoryId: number;
  name: string;
  /** URL folder, for example "air-quality". */
  folder: string;
  /** Threshold Dashboard theme color for the category, as a hex string. */
  themeColor: string;
  programs: Program[];
}

export interface ProgramsFile {
  _comment?: string;
  categories: Category[];
}

/** A program paired with the category it sits in. */
export interface ProgramEntry {
  program: Program;
  category: Category;
}

const data = programsJson as unknown as ProgramsFile;

/** The ten categories, in programs.json order. */
export function categories(): Category[] {
  return data.categories;
}

/** Every program of every category, each with its category, in file order. */
export function allPrograms(): ProgramEntry[] {
  return data.categories.flatMap((category) =>
    category.programs.map((program) => ({ program, category })),
  );
}

/** The category that holds a program, matched by id. */
export function categoryOf(program: Program): Category | undefined {
  return data.categories.find((category) => category.programs.some((p) => p.id === program.id));
}

/** The URL slug for a program: its file name without the .html extension. */
export function programSlug(program: Program): string {
  return program.file.replace(/\.html$/i, '');
}

/**
 * The program page's path under the site base, as "spikes/<folder>/<file>".
 * Pass the category when it is already in hand; otherwise it is looked up.
 */
export function programPath(program: Program, category?: Category): string {
  const owner = category ?? categoryOf(program);
  if (!owner) throw new Error(`Program ${program.id} (${program.name}) is not in any category`);
  return `spikes/${owner.folder}/${program.file}`;
}

/** The program page's .html URL under the configured base. */
export function programHref(program: Program, category?: Category): string {
  return withBase(programPath(program, category));
}

/** The programs that share a category, in programs.json order, as a new array. */
export function siblings(category: Category): Program[] {
  return [...category.programs];
}

export function isTemplate(value: unknown): value is Template {
  return typeof value === 'string' && (TEMPLATES as readonly string[]).includes(value);
}

/** A program's template, falling back to charts when unset or unknown. */
export function templateOf(program: Program): Template {
  return isTemplate(program.template) ? program.template : DEFAULT_TEMPLATE;
}
