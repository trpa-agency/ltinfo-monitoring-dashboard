import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TEMPLATE,
  RESERVED_ROUTES,
  TEMPLATES,
  allPrograms,
  categories,
  categoryOf,
  isTemplate,
  programPath,
  programSlug,
  siblings,
  templateOf,
  type Category,
  type Program,
} from '../src/lib/programs.ts';

test('programs.json holds the ten categories and 36 programs', () => {
  assert.equal(categories().length, 10);
  assert.equal(allPrograms().length, 36);
  const folders = categories().map((c) => c.folder);
  assert.equal(new Set(folders).size, 10, 'category folders are unique');
  assert.ok(folders.every((f) => /^[a-z0-9-]+$/.test(f)), 'folders are URL safe');
  assert.ok(categories().every((c) => /^#[0-9a-fA-F]{6}$/.test(c.themeColor)), 'theme colors are hex');
});

test('every program has a unique id and a unique page path', () => {
  const entries = allPrograms();
  const ids = entries.map((e) => e.program.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  const paths = entries.map((e) => programPath(e.program, e.category));
  assert.equal(new Set(paths).size, paths.length, 'paths are unique');
  assert.ok(entries.every((e) => e.program.file.endsWith('.html')), 'files end in .html');
  assert.ok(entries.every((e) => e.program.name.trim().length > 0), 'names are set');
});

test('allPrograms pairs each program with the category that holds it', () => {
  for (const { program, category } of allPrograms()) {
    assert.equal(categoryOf(program), category);
    assert.ok(category.programs.includes(program));
  }
});

test('programSlug and programPath build the legacy ozone page address', () => {
  const ozone = allPrograms().find((e) => e.program.id === 41);
  assert.ok(ozone, 'ozone (41) is in programs.json');
  const { program, category } = ozone as { program: Program; category: Category };
  assert.equal(programSlug(program), 'ozone');
  // The live DashboardUrl pattern: <folder>/<file> with no spikes/ prefix.
  assert.equal(programPath(program, category), 'air-quality/ozone.html');
  assert.equal(programPath(program), 'air-quality/ozone.html', 'category is looked up when omitted');
});

test('programPath throws for a program that is in no category', () => {
  const stray: Program = { id: -1, name: 'Stray', file: 'stray.html', featured: false };
  assert.throws(() => programPath(stray), /not in any category/);
});

test('no category folder collides with a top-level route of the spoke', () => {
  for (const folder of ['spikes', 'design-system', 'patterns', 'index']) assert.ok(RESERVED_ROUTES.includes(folder));
  for (const category of categories()) {
    assert.ok(!RESERVED_ROUTES.includes(category.folder), `${category.folder} is not a reserved route`);
  }
  const clash: Category = { thresholdCategoryId: 0, name: 'Clash', folder: 'spikes', themeColor: '#000000', programs: [] };
  const program: Program = { id: -2, name: 'Clash', file: 'clash.html', featured: false };
  assert.throws(() => programPath(program, clash), /collides with a top-level route/);
});

test('siblings returns the category programs in order, as a copy', () => {
  const found = categories().find((c) => c.folder === 'air-quality');
  assert.ok(found);
  const air = found as Category;
  const list = siblings(air);
  assert.deepEqual(list.map((p) => p.file), air.programs.map((p) => p.file));
  assert.notEqual(list, air.programs, 'a new array, so callers can sort without touching the data');
  assert.equal(list[0]?.file, 'ozone.html');
});

test('templateOf falls back to charts and every program resolves to a known template', () => {
  assert.equal(DEFAULT_TEMPLATE, 'charts');
  assert.deepEqual([...TEMPLATES], ['charts', 'map', 'context']);
  assert.equal(templateOf({ id: 0, name: 'x', file: 'x.html', featured: false }), 'charts');
  assert.equal(templateOf({ id: 0, name: 'x', file: 'x.html', featured: false, template: 'map' }), 'map');
  for (const { program } of allPrograms()) {
    assert.ok(isTemplate(templateOf(program)));
    if (program.template !== undefined) assert.ok(isTemplate(program.template), `${program.file} has a known template`);
  }
  const counts = { charts: 0, map: 0, context: 0 };
  for (const { program } of allPrograms()) counts[templateOf(program)] += 1;
  assert.equal(counts.charts + counts.map + counts.context, 36);
  assert.ok(counts.charts > 0 && counts.map > 0 && counts.context > 0, 'all three templates are in use');
});

test('isTemplate rejects anything but the three names', () => {
  assert.equal(isTemplate('charts'), true);
  assert.equal(isTemplate('Charts'), false);
  assert.equal(isTemplate(''), false);
  assert.equal(isTemplate(undefined), false);
  assert.equal(isTemplate(3), false);
});
