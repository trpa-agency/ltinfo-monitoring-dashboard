/**
 * Schema check for programs.json, run at build so a JSON mistake fails the build
 * with a message naming the category, program, and key instead of reaching a page.
 *
 * The keys and types are the ones documented in templates/README.md and typed in
 * src/lib/programs.ts. Unknown keys are errors so that typos surface
 * ("sitesLayers", "colourBy"). `_comment` is allowed at the top level only.
 *
 * Pure TypeScript, no Astro or DOM, so tests run under Node.
 */
import { TEMPLATES } from './programs.ts';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

type Kind = 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object' | 'record';

interface FieldSpec {
  kind: Kind;
  required?: boolean;
  /** Allowed values for a string field. */
  enum?: readonly string[];
  /** Pattern a string field must match, with a description for the message. */
  pattern?: { re: RegExp; describe: string };
  /** For 'record': the pattern each value must match (values are strings). */
  valuePattern?: { re: RegExp; describe: string };
  /** A string field may not be empty or whitespace. */
  nonEmpty?: boolean;
}

type Spec = Record<string, FieldSpec>;

const HEX = { re: /^#[0-9a-fA-F]{6}$/, describe: 'a hex color such as "#0072CE"' };
const KEBAB = { re: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, describe: 'lowercase kebab-case such as "air-quality"' };
const HTML_FILE = { re: /^[^/\\]+\.html$/, describe: 'a file name ending in .html with no folder' };

const str = (extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'string', ...extra });
const int = (extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'integer', ...extra });
const bool = (extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'boolean', ...extra });
const arr = (extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'array', ...extra });
const obj = (extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'object', ...extra });
const rec = (extra: Partial<FieldSpec> = {}): FieldSpec => ({ kind: 'record', ...extra });

const TOP_SPEC: Spec = {
  _comment: str(),
  categories: arr({ required: true }),
};

const CATEGORY_SPEC: Spec = {
  thresholdCategoryId: int({ required: true }),
  name: str({ required: true, nonEmpty: true }),
  folder: str({ required: true, pattern: KEBAB }),
  themeColor: str({ required: true, pattern: HEX }),
  programs: arr({ required: true }),
};

const PROGRAM_SPEC: Spec = {
  id: int({ required: true }),
  name: str({ required: true, nonEmpty: true }),
  file: str({ required: true, pattern: HTML_FILE }),
  featured: bool({ required: true }),
  template: str({ enum: TEMPLATES }),
  ltinfo: bool(),
  description: str({ nonEmpty: true }),
  approach: str({ nonEmpty: true }),
  sitesLayer: obj(),
  sitesPerYear: obj(),
  mapLayer: obj(),
  overlays: arr(),
  measures: arr(),
};

const MEASURE_SPEC: Spec = {
  title: str({ required: true, nonEmpty: true }),
  sub: str(),
  layer: int({ required: true }),
  where: str(),
  x: str({ required: true, nonEmpty: true }),
  xLabel: str(),
  xType: str({ enum: ['category', 'date', 'month'] }),
  // y is a string or a list of { field, name }; checked by hand below.
  y: { kind: 'string', required: true },
  yName: str(),
  yLabel: str(),
  format: str(),
  stat: str({ enum: ['sum', 'count', 'avg'] }),
  seriesBy: str(),
  seriesLabel: str(),
  seriesNames: rec(),
  seriesPrefix: str(),
  pick: str(),
  pickLabel: str(),
  pickDefault: str(),
  type: str({ enum: ['line', 'bar', 'stacked'] }),
  orientation: str({ enum: ['h'] }),
  sort: str({ enum: ['desc'] }),
  limit: int(),
  standard: obj(),
  zero: bool(),
  span: str({ enum: ['span-12', 'span-6'] }),
  xNames: rec(),
  unpivot: obj(),
};

const Y_SERIES_SPEC: Spec = {
  field: str({ required: true, nonEmpty: true }),
  name: str({ required: true, nonEmpty: true }),
};

const STANDARD_SPEC: Spec = {
  field: str({ nonEmpty: true }),
  value: { kind: 'number' },
  label: str(),
};

const UNPIVOT_SPEC: Spec = {
  prefix: str({ required: true, nonEmpty: true }),
};

const SITES_LAYER_SPEC: Spec = {
  layer: int({ required: true }),
  name: str({ required: true, nonEmpty: true }),
  code: str(),
  year: str(),
  status: str(),
  active: str(),
  where: str(),
  unit: str(),
};

const SITES_PER_YEAR_SPEC: Spec = {
  layer: int({ required: true }),
  year: str({ required: true, nonEmpty: true }),
  site: str({ required: true, nonEmpty: true }),
  where: str(),
  extract: bool(),
  unit: str(),
};

const MAP_LAYER_SPEC: Spec = {
  layer: int({ required: true }),
  title: str(),
  unit: str(),
  unitPlural: str(),
  name: str(),
  geometry: str({ enum: ['line', 'polygon'] }),
  list: bool(),
  countAsSites: bool(),
  colorBy: str(),
  colorByLabel: str(),
  colors: rec({ valuePattern: HEX }),
  labels: rec(),
  pick: str(),
  pickLabel: str(),
  where: str(),
  meta: arr(),
  fields: arr(),
};

const META_SPEC: Spec = {
  field: str({ required: true, nonEmpty: true }),
  suffix: str(),
};

const FIELD_SPEC: Spec = {
  field: str({ required: true, nonEmpty: true }),
  label: str({ required: true, nonEmpty: true }),
};

const OVERLAY_SPEC: Spec = {
  layer: int({ required: true }),
  title: str({ required: true, nonEmpty: true }),
  name: str(),
  geometry: str({ required: true, enum: ['point', 'line', 'fill'] }),
  color: str({ pattern: HEX }),
  where: str(),
  fields: arr(),
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function describe(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'an array';
  return typeof v === 'object' ? 'an object' : `${typeof v} ${JSON.stringify(v)}`;
}

/**
 * Check one object against a spec: required keys present, each present key of the
 * right kind, enums and patterns honored, no unknown keys. Nested objects and
 * arrays are only checked for kind here; callers descend into them.
 */
function checkObject(value: unknown, at: string, spec: Spec, errors: string[]): value is Record<string, unknown> {
  if (!isPlainObject(value)) {
    errors.push(`${at}: expected an object, got ${describe(value)}`);
    return false;
  }
  for (const [key, field] of Object.entries(spec)) {
    if (field.required && !(key in value)) errors.push(`${at}.${key}: required`);
  }
  for (const [key, v] of Object.entries(value)) {
    const field = spec[key];
    if (!field) {
      errors.push(`${at}.${key}: unknown key (allowed: ${Object.keys(spec).join(', ')})`);
      continue;
    }
    checkField(v, `${at}.${key}`, field, errors);
  }
  return true;
}

function checkField(v: unknown, at: string, field: FieldSpec, errors: string[]): void {
  switch (field.kind) {
    case 'string':
      if (typeof v !== 'string') return void errors.push(`${at}: expected a string, got ${describe(v)}`);
      if (field.nonEmpty && v.trim() === '') return void errors.push(`${at}: may not be empty`);
      if (field.enum && !field.enum.includes(v)) {
        return void errors.push(`${at}: ${JSON.stringify(v)} is not one of ${field.enum.map((e) => JSON.stringify(e)).join(', ')}`);
      }
      if (field.pattern && !field.pattern.re.test(v)) return void errors.push(`${at}: ${JSON.stringify(v)} is not ${field.pattern.describe}`);
      return;
    case 'integer':
      if (typeof v !== 'number' || !Number.isInteger(v)) return void errors.push(`${at}: expected an integer, got ${describe(v)}`);
      return;
    case 'number':
      if (typeof v !== 'number' || !Number.isFinite(v)) return void errors.push(`${at}: expected a number, got ${describe(v)}`);
      return;
    case 'boolean':
      if (typeof v !== 'boolean') return void errors.push(`${at}: expected true or false, got ${describe(v)}`);
      return;
    case 'array':
      if (!Array.isArray(v)) return void errors.push(`${at}: expected an array, got ${describe(v)}`);
      return;
    case 'object':
      if (!isPlainObject(v)) return void errors.push(`${at}: expected an object, got ${describe(v)}`);
      return;
    case 'record':
      if (!isPlainObject(v)) return void errors.push(`${at}: expected an object of string values, got ${describe(v)}`);
      for (const [k, val] of Object.entries(v)) {
        if (typeof val !== 'string') errors.push(`${at}.${k}: expected a string, got ${describe(val)}`);
        else if (field.valuePattern && !field.valuePattern.re.test(val)) errors.push(`${at}.${k}: ${JSON.stringify(val)} is not ${field.valuePattern.describe}`);
      }
      return;
  }
}

function checkList(value: unknown, at: string, spec: Spec, errors: string[], each?: (item: Record<string, unknown>, at: string) => void): void {
  if (!Array.isArray(value)) return;
  value.forEach((item, i) => {
    const here = `${at}[${i}]`;
    if (checkObject(item, here, spec, errors) && each) each(item, here);
  });
}

function checkMeasure(m: Record<string, unknown>, at: string, errors: string[]): void {
  // y: a field name, or a list of { field, name } series.
  const y = m.y;
  const yErrorsBefore = errors.length;
  // checkObject already reported y as "expected a string" when it was not; take that
  // message back when y is a valid series list.
  if (Array.isArray(y)) {
    const idx = errors.findIndex((e, i) => i >= 0 && e.startsWith(`${at}.y: expected a string`));
    if (idx >= 0) errors.splice(idx, 1);
    if (y.length === 0) errors.push(`${at}.y: a series list may not be empty`);
    checkList(y, `${at}.y`, Y_SERIES_SPEC, errors);
  } else if (typeof y === 'string' && y.trim() === '') {
    errors.push(`${at}.y: may not be empty`);
  }
  void yErrorsBefore;
  if ('standard' in m && isPlainObject(m.standard)) {
    checkObject(m.standard, `${at}.standard`, STANDARD_SPEC, errors);
    if (!('field' in m.standard) && !('value' in m.standard)) errors.push(`${at}.standard: needs "field" or "value"`);
  }
  if ('unpivot' in m && isPlainObject(m.unpivot)) checkObject(m.unpivot, `${at}.unpivot`, UNPIVOT_SPEC, errors);
}

function checkMapLayer(ml: Record<string, unknown>, at: string, errors: string[]): void {
  checkList(ml.meta, `${at}.meta`, META_SPEC, errors);
  checkList(ml.fields, `${at}.fields`, FIELD_SPEC, errors);
}

function checkProgram(p: Record<string, unknown>, at: string, errors: string[]): void {
  if (p.ltinfo === false && typeof p.description !== 'string') {
    errors.push(`${at}.description: required when ltinfo is false (the program has no LT Info record to read text from)`);
  }
  if (isPlainObject(p.sitesLayer)) checkObject(p.sitesLayer, `${at}.sitesLayer`, SITES_LAYER_SPEC, errors);
  if (isPlainObject(p.sitesPerYear)) checkObject(p.sitesPerYear, `${at}.sitesPerYear`, SITES_PER_YEAR_SPEC, errors);
  if (isPlainObject(p.mapLayer) && checkObject(p.mapLayer, `${at}.mapLayer`, MAP_LAYER_SPEC, errors)) {
    checkMapLayer(p.mapLayer, `${at}.mapLayer`, errors);
  }
  checkList(p.overlays, `${at}.overlays`, OVERLAY_SPEC, errors, (o, here) => checkList(o.fields, `${here}.fields`, FIELD_SPEC, errors));
  checkList(p.measures, `${at}.measures`, MEASURE_SPEC, errors, (m, here) => checkMeasure(m, here, errors));
}

function programLabel(p: unknown, i: number): string {
  if (isPlainObject(p)) {
    if (typeof p.id === 'number') return String(p.id);
    if (typeof p.name === 'string') return JSON.stringify(p.name);
  }
  return String(i);
}

function categoryLabel(c: unknown, i: number): string {
  if (isPlainObject(c)) {
    if (typeof c.folder === 'string') return c.folder;
    if (typeof c.name === 'string') return JSON.stringify(c.name);
  }
  return String(i);
}

/**
 * Validate a parsed programs.json. Every problem found is reported, each with
 * the path to it, for example
 * `categories[air-quality].programs[41].measures[0].xType: "year" is not one of "category", "date", "month"`.
 */
export function validateProgramsFile(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!checkObject(data, 'programs.json', TOP_SPEC, errors) || !Array.isArray(data.categories)) {
    return { ok: errors.length === 0, errors };
  }
  const ids = new Map<number, string>();
  const folders = new Map<string, string>();
  data.categories.forEach((c, ci) => {
    const at = `categories[${categoryLabel(c, ci)}]`;
    if (!checkObject(c, at, CATEGORY_SPEC, errors)) return;
    if (typeof c.folder === 'string') {
      const seen = folders.get(c.folder);
      if (seen) errors.push(`${at}.folder: "${c.folder}" is also the folder of ${seen}`);
      else folders.set(c.folder, at);
    }
    if (!Array.isArray(c.programs)) return;
    const files = new Map<string, string>();
    c.programs.forEach((p, pi) => {
      const here = `${at}.programs[${programLabel(p, pi)}]`;
      if (!checkObject(p, here, PROGRAM_SPEC, errors)) return;
      if (typeof p.id === 'number' && Number.isInteger(p.id)) {
        const seen = ids.get(p.id);
        if (seen) errors.push(`${here}.id: ${p.id} is also the id of ${seen}`);
        else ids.set(p.id, here);
      }
      if (typeof p.file === 'string') {
        const key = p.file.toLowerCase();
        const seen = files.get(key);
        if (seen) errors.push(`${here}.file: "${p.file}" is also the file of ${seen} in the same category`);
        else files.set(key, here);
      }
      checkProgram(p, here, errors);
    });
  });
  return { ok: errors.length === 0, errors };
}

/** Validate and throw an Error listing every problem, for the build to call on programs.json. */
export function assertProgramsFile(data: unknown): void {
  const result = validateProgramsFile(data);
  if (!result.ok) {
    throw new Error(`programs.json failed validation with ${result.errors.length} error${result.errors.length === 1 ? '' : 's'}:\n  ${result.errors.join('\n  ')}`);
  }
}
