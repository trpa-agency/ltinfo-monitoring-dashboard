#!/usr/bin/env node
/**
 * Record LT Info API responses as fixtures for offline builds and tests.
 *
 *   node scripts/record-ltinfo-fixtures.mjs 41 63 39 83
 *
 * Writes tests/fixtures/ltinfo/<id>/{record,partners,indicators,documents,images,
 * sites,feature-collection}.json plus meta.json (recordedAt and byte sizes), and
 * prints the size of each file. Pass --list to also record /monitoring-programs
 * as tests/fixtures/ltinfo/programs.json. Responses over 500 KB are flagged.
 *
 * Plain Node, no imports from src/, so it runs without the TypeScript loader.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://internalapi.laketahoeinfo.org';
const TIMEOUT_MS = 15_000;
const BIG_BYTES = 500 * 1024;
const ROUTES = {
  record: (id) => `/monitoring-programs/${id}`,
  partners: (id) => `/monitoring-programs/${id}/partners`,
  indicators: (id) => `/monitoring-programs/${id}/indicators`,
  documents: (id) => `/monitoring-programs/${id}/documents`,
  images: (id) => `/monitoring-programs/${id}/images`,
  sites: (id) => `/monitoring-programs/${id}/sites?activeOnly=false`,
  'feature-collection': (id) => `/monitoring-programs/${id}/sites-as-feature-collection`,
};

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(here, '..', 'tests', 'fixtures', 'ltinfo');

const args = process.argv.slice(2);
const wantList = args.includes('--list');
const ids = args.filter((a) => /^\d+$/.test(a)).map(Number);
if (!ids.length && !wantList) {
  console.error('Usage: node scripts/record-ltinfo-fixtures.mjs <program id> [<program id> ...] [--list]');
  process.exit(2);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

async function getJson(route) {
  const res = await fetch(`${API}${route}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  JSON.parse(text); // validate before writing
  return text;
}

/** Pretty JSON with LF endings and a trailing newline, as a committed fixture should be. */
function pretty(text) {
  return `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
}

let failures = 0;
for (const id of ids) {
  const dir = path.join(FIXTURES, String(id));
  mkdirSync(dir, { recursive: true });
  const meta = { recordedAt: new Date().toISOString(), api: API, sizes: {} };
  console.log(`program ${id}`);
  for (const [name, build] of Object.entries(ROUTES)) {
    const route = build(id);
    try {
      const text = await getJson(route);
      const body = pretty(text);
      writeFileSync(path.join(dir, `${name}.json`), body, { encoding: 'utf8' });
      const bytes = Buffer.byteLength(body, 'utf8');
      meta.sizes[name] = bytes;
      console.log(`  ${name.padEnd(19)} ${kb(bytes).padStart(10)}${bytes > BIG_BYTES ? '  OVER 500 KB' : ''}`);
    } catch (err) {
      failures++;
      console.log(`  ${name.padEnd(19)} FAILED ${err instanceof Error ? err.message : err}`);
    }
  }
  writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, { encoding: 'utf8' });
}

if (wantList) {
  mkdirSync(FIXTURES, { recursive: true });
  try {
    const body = pretty(await getJson('/monitoring-programs'));
    writeFileSync(path.join(FIXTURES, 'programs.json'), body, { encoding: 'utf8' });
    const bytes = Buffer.byteLength(body, 'utf8');
    console.log(`programs.json ${kb(bytes)}${bytes > BIG_BYTES ? '  OVER 500 KB' : ''}`);
  } catch (err) {
    failures++;
    console.log(`programs.json FAILED ${err instanceof Error ? err.message : err}`);
  }
}

process.exit(failures ? 1 : 0);
