import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { assertProgramsFile, validateProgramsFile } from '../src/lib/programs-schema.ts';

const real = () => JSON.parse(readFileSync(path.join(process.cwd(), 'programs.json'), 'utf8')) as Record<string, unknown>;

/** Loosely typed shapes so the tests can plant any key or value the validator should catch. */
type Loose = Record<string, unknown>;
interface LooseProgram extends Loose {
  id: number;
  name: string;
  file: string;
  featured: boolean;
}
interface LooseCategory extends Loose {
  folder: string;
  programs: LooseProgram[];
}
interface LooseFile extends Loose {
  categories: LooseCategory[];
}

/** A minimal valid file to mutate. */
const minimal = (): LooseFile => ({
  _comment: 'test',
  categories: [
    {
      thresholdCategoryId: 2,
      name: 'Air Quality',
      folder: 'air-quality',
      themeColor: '#8BC2E8',
      programs: [
        { id: 41, name: 'Ozone (O3)', file: 'ozone.html', featured: true, template: 'charts' },
        { id: 9093, name: 'Watercraft', file: 'watercraft.html', featured: false, ltinfo: false, description: 'Text.' },
      ],
    },
  ],
});

const errorsOf = (data: unknown) => validateProgramsFile(data).errors;

test('the real programs.json passes', () => {
  const result = validateProgramsFile(real());
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.doesNotThrow(() => assertProgramsFile(real()));
});

test('the minimal file passes', () => {
  assert.deepEqual(errorsOf(minimal()), []);
});

test('top level must be an object with a categories array and no unknown keys', () => {
  assert.match(errorsOf(null)[0], /programs\.json: expected an object/);
  assert.match(errorsOf([])[0], /programs\.json: expected an object/);
  assert.match(errorsOf({})[0], /programs\.json\.categories: required/);
  assert.match(errorsOf({ categories: 'x' })[0], /programs\.json\.categories: expected an array/);
  const extra = { ...minimal(), categoreis: [] };
  assert.ok(errorsOf(extra).some((e) => /programs\.json\.categoreis: unknown key/.test(e)));
});

test('category fields are checked and named by folder', () => {
  const d = minimal();
  const c = d.categories[0];
  c.folder = 'Air Quality';
  c.themeColor = 'blue';
  delete c.name;
  c.colour = '#000000';
  const errors = errorsOf(d);
  assert.ok(errors.some((e) => e === 'categories[Air Quality].name: required'), errors.join('\n'));
  assert.ok(errors.some((e) => /categories\[Air Quality\]\.folder: "Air Quality" is not lowercase kebab-case/.test(e)));
  assert.ok(errors.some((e) => /categories\[Air Quality\]\.themeColor: "blue" is not a hex color/.test(e)));
  assert.ok(errors.some((e) => /categories\[Air Quality\]\.colour: unknown key/.test(e)));
});

test('duplicate folders and ids across the file, duplicate files within a category', () => {
  const d = minimal();
  const copy = JSON.parse(JSON.stringify(d.categories[0])) as LooseCategory;
  copy.programs = [{ id: 41, name: 'Dup', file: 'dup.html', featured: false }];
  d.categories.push(copy);
  d.categories[0].programs.push({ id: 7, name: 'Same file', file: 'Ozone.html', featured: false });
  const errors = errorsOf(d);
  assert.ok(errors.some((e) => /categories\[air-quality\]\.folder: "air-quality" is also the folder of categories\[air-quality\]/.test(e)), errors.join('\n'));
  assert.ok(errors.some((e) => /programs\[41\]\.id: 41 is also the id of categories\[air-quality\]\.programs\[41\]/.test(e)), errors.join('\n'));
  assert.ok(errors.some((e) => /programs\[7\]\.file: "Ozone.html" is also the file of .*programs\[41\] in the same category/.test(e)), errors.join('\n'));
});

test('program fields: integer id, .html file, template enum, ltinfo false needs description, unknown keys', () => {
  const d = minimal();
  d.categories[0].programs = [
    { id: 41.5, name: '', file: 'ozone', featured: 'yes' as unknown as boolean, template: 'cards', sitesLayers: {} },
    { id: 9034, name: 'SAV', file: 'sav.html', featured: false, ltinfo: false },
  ];
  const errors = errorsOf(d);
  const at = 'categories[air-quality].programs[';
  assert.ok(errors.includes(`${at}41.5].id: expected an integer, got number 41.5`), errors.join('\n'));
  assert.ok(errors.includes(`${at}41.5].name: may not be empty`));
  assert.ok(errors.some((e) => e.startsWith(`${at}41.5].file: "ozone" is not a file name ending in .html`)));
  assert.ok(errors.includes(`${at}41.5].featured: expected true or false, got string "yes"`));
  assert.ok(errors.includes(`${at}41.5].template: "cards" is not one of "charts", "map", "context"`));
  assert.ok(errors.some((e) => e.startsWith(`${at}41.5].sitesLayers: unknown key`)));
  assert.ok(errors.some((e) => e.startsWith(`${at}9034].description: required when ltinfo is false`)));
});

test('measures: required keys, enums, y as a string or a series list, standard and unpivot', () => {
  const d = minimal();
  d.categories[0].programs[0].measures = [
    { title: 'Ok', layer: 46, x: 'Year', y: 'Value', xType: 'date', type: 'bar', stat: 'avg', span: 'span-6', standard: { field: 'T' }, unpivot: { prefix: 'NTU' }, seriesNames: { a: 'A' } },
    { title: 'Series', layer: 1, x: 'Year', y: [{ field: 'a', name: 'A' }, { field: 'b' }] },
    { title: 'Bad', layer: '46', x: 'Year', y: 7, xType: 'year', type: 'area', stat: 'median', span: 'span-4', orientation: 'v', sort: 'asc', limit: 2.5, standard: { label: 'x' }, unpivot: {}, seriesNames: { a: 1 }, colour: 'red' },
    { title: 'Empty series', layer: 1, x: 'Year', y: [] },
  ];
  const errors = errorsOf(d);
  const at = 'categories[air-quality].programs[41].measures';
  assert.ok(!errors.some((e) => e.startsWith(`${at}[0]`)), `measure 0 is valid:\n${errors.join('\n')}`);
  assert.ok(!errors.some((e) => e.startsWith(`${at}[1].y: expected a string`)), 'a series list is accepted for y');
  assert.ok(errors.includes(`${at}[1].y[1].name: required`));
  assert.ok(errors.includes(`${at}[2].layer: expected an integer, got string "46"`));
  assert.ok(errors.includes(`${at}[2].y: expected a string, got number 7`));
  assert.ok(errors.includes(`${at}[2].xType: "year" is not one of "category", "date", "month"`));
  assert.ok(errors.includes(`${at}[2].type: "area" is not one of "line", "bar", "stacked"`));
  assert.ok(errors.includes(`${at}[2].stat: "median" is not one of "sum", "count", "avg"`));
  assert.ok(errors.includes(`${at}[2].span: "span-4" is not one of "span-12", "span-6"`));
  assert.ok(errors.includes(`${at}[2].orientation: "v" is not one of "h"`));
  assert.ok(errors.includes(`${at}[2].sort: "asc" is not one of "desc"`));
  assert.ok(errors.includes(`${at}[2].limit: expected an integer, got number 2.5`));
  assert.ok(errors.includes(`${at}[2].standard: needs "field" or "value"`));
  assert.ok(errors.includes(`${at}[2].unpivot.prefix: required`));
  assert.ok(errors.includes(`${at}[2].seriesNames.a: expected a string, got number 1`));
  assert.ok(errors.some((e) => e.startsWith(`${at}[2].colour: unknown key`)));
  assert.ok(errors.includes(`${at}[3].y: a series list may not be empty`));
});

test('sitesLayer, sitesPerYear, mapLayer, and overlays follow the README keys', () => {
  const d = minimal();
  Object.assign(d.categories[0].programs[0], {
    sitesLayer: { layer: 1, name: 'SITE', colour: 'x' },
    sitesPerYear: { layer: 1, year: 'Y', extract: 'yes' },
    mapLayer: { layer: 106, geometry: 'point', colors: { Good: 'green', Fair: '#B5A64C' }, meta: [{ suffix: ' ft' }], fields: [{ field: 'A' }], list: 'no' },
    overlays: [{ layer: 2, title: 'Lake level', geometry: 'fill', color: '#3e72b0', fields: [{ field: 'A', label: 'a' }] }, { layer: 3, geometry: 'area', color: 'blue' }],
  });
  const errors = errorsOf(d);
  const at = 'categories[air-quality].programs[41]';
  assert.ok(errors.some((e) => e.startsWith(`${at}.sitesLayer.colour: unknown key`)), errors.join('\n'));
  assert.ok(errors.includes(`${at}.sitesPerYear.site: required`));
  assert.ok(errors.includes(`${at}.sitesPerYear.extract: expected true or false, got string "yes"`));
  assert.ok(errors.includes(`${at}.mapLayer.geometry: "point" is not one of "line", "polygon"`));
  assert.ok(errors.includes(`${at}.mapLayer.colors.Good: "green" is not a hex color such as "#0072CE"`));
  assert.ok(errors.includes(`${at}.mapLayer.meta[0].field: required`));
  assert.ok(errors.includes(`${at}.mapLayer.fields[0].label: required`));
  assert.ok(errors.includes(`${at}.mapLayer.list: expected true or false, got string "no"`));
  assert.ok(!errors.some((e) => e.startsWith(`${at}.overlays[0]`)), 'overlay 0 is valid');
  assert.ok(errors.includes(`${at}.overlays[1].title: required`));
  assert.ok(errors.includes(`${at}.overlays[1].geometry: "area" is not one of "point", "line", "fill"`));
  assert.ok(errors.includes(`${at}.overlays[1].color: "blue" is not a hex color such as "#0072CE"`));
});

test('a program or category that is not an object is reported by index', () => {
  const d = minimal();
  (d.categories as unknown[]).push('nope');
  (d.categories[0].programs as unknown[]).push(42);
  const errors = errorsOf(d);
  assert.ok(errors.includes('categories[1]: expected an object, got string "nope"'), errors.join('\n'));
  assert.ok(errors.includes('categories[air-quality].programs[2]: expected an object, got number 42'));
});

test('assertProgramsFile throws with every error joined', () => {
  const d = minimal();
  d.categories[0].themeColor = 'red';
  d.categories[0].programs[0].file = 'ozone.htm';
  assert.throws(
    () => assertProgramsFile(d),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /failed validation with 2 errors/);
      assert.match(err.message, /themeColor: "red" is not a hex color/);
      assert.match(err.message, /file: "ozone.htm" is not a file name ending in \.html/);
      return true;
    },
  );
});
