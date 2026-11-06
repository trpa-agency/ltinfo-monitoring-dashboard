#!/usr/bin/env node
// Check that every program page in programs.json answers 200 at a site base.
//
// The staging workflow (.github/workflows/deploy.yml) runs this twice after it
// pushes a build to main: once for the v2 staging set under
// /ltinfo-monitoring-dashboard/v2/, and once for the legacy set at the root, so
// a staging publish can never take a live DashboardUrl down unnoticed. It also
// works against a local preview (npx astro preview) or the Docker preview.
//
// Node 22, no dependencies.
//
//   node scripts/check-urls.mjs [options]
//
//   --base URL         site root, no trailing slash needed
//                      (default https://trpa-agency.github.io/ltinfo-monitoring-dashboard)
//   --prefix PATH      folder between the base and the pages, for example v2
//                      (default none, which is the legacy set)
//   --programs FILE    programs.json to read (default the one beside scripts/)
//   --retries N        extra rounds for URLs that are not 200 yet (default 0)
//   --delay SECONDS    wait between rounds (default 30). GitHub Pages takes a
//                      minute or more to publish a branch commit.
//   --concurrency N    requests in flight at once (default 6)
//   --timeout SECONDS  per-request timeout (default 20)
//   --no-bust          do not append a cache-busting query string
//   --list             print the URLs and exit without requesting them
//
// Each URL gets a HEAD request; a 405 falls back to GET. Redirects are
// followed, so the status reported is the final one. By default every request
// carries ?check=<timestamp> so the Pages CDN cannot answer from a cached 404
// taken before the publish landed. Exit 1 if any URL is not 200 after the last
// round; one line per failure, then a one-line summary.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const DEFAULT_BASE = 'https://trpa-agency.github.io/ltinfo-monitoring-dashboard';
const here = path.dirname(fileURLToPath(import.meta.url));

// ---- arguments --------------------------------------------------------------

const parseArgs = (argv) => {
  const opts = {
    base: DEFAULT_BASE,
    prefix: '',
    programs: path.join(here, '..', 'programs.json'),
    retries: 0,
    delay: 30,
    concurrency: 6,
    timeout: 20,
    bust: true,
    list: false,
  };
  const numeric = new Set(['retries', 'delay', 'concurrency', 'timeout']);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'list') {
      opts.list = true;
    } else if (key === 'noBust') {
      opts.bust = false;
    } else if (key === 'help' || key === 'h') {
      opts.help = true;
    } else if (key in opts) {
      const value = inlineValue ?? argv[++i];
      if (value === undefined) throw new Error(`--${rawKey} needs a value`);
      if (numeric.has(key)) {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) throw new Error(`--${rawKey} must be a non-negative number`);
        opts[key] = n;
      } else {
        opts[key] = value;
      }
    } else {
      throw new Error(`Unknown option: --${rawKey}`);
    }
  }
  if (opts.concurrency < 1) opts.concurrency = 1;
  return opts;
};

// ---- URL list ---------------------------------------------------------------

const trimSlashes = (s) => s.replace(/^\/+|\/+$/g, '');

export const buildUrls = (programs, base, prefix = '') => {
  const root = [base.replace(/\/+$/, ''), trimSlashes(prefix)].filter(Boolean).join('/');
  const urls = [`${root}/index.html`];
  for (const category of programs.categories ?? []) {
    const folder = trimSlashes(category.folder ?? '');
    for (const program of category.programs ?? []) {
      if (!program.file) continue;
      urls.push(`${root}/${folder}/${trimSlashes(program.file)}`);
    }
  }
  return urls;
};

// ---- requests ---------------------------------------------------------------

const withBuster = (url, bust) => {
  if (!bust) return url;
  const u = new URL(url);
  u.searchParams.set('check', String(Date.now()));
  return u.toString();
};

const request = async (url, method, timeoutMs) => {
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(url, { method, redirect: 'follow', signal });
  // Drain or cancel the body so the socket is released.
  if (res.body) await res.body.cancel().catch(() => {});
  return res.status;
};

const check = async (url, opts) => {
  const target = withBuster(url, opts.bust);
  const timeoutMs = opts.timeout * 1000;
  try {
    let status = await request(target, 'HEAD', timeoutMs);
    if (status === 405) status = await request(target, 'GET', timeoutMs);
    return { url, status, ok: status === 200 };
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? 'timeout' : err?.cause?.code ?? err?.message ?? String(err);
    return { url, status: 0, ok: false, error: reason };
  }
};

const runPool = async (items, size, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker));
  return results;
};

const sleep = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

// ---- main -------------------------------------------------------------------

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    const header = (await readFile(fileURLToPath(import.meta.url), 'utf8')).split('\n');
    console.log(header.slice(1, header.findIndex((l) => l.startsWith('import '))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
    return 0;
  }

  const programs = JSON.parse(await readFile(opts.programs, 'utf8'));
  const urls = buildUrls(programs, opts.base, opts.prefix);

  if (opts.list) {
    for (const url of urls) console.log(url);
    return 0;
  }

  const rounds = opts.retries + 1;
  let pending = urls;
  let failures = [];
  for (let round = 1; round <= rounds; round += 1) {
    const results = await runPool(pending, opts.concurrency, (url) => check(url, opts));
    failures = results.filter((r) => !r.ok);
    const label = round === 1 ? 'Round 1' : `Round ${round} (retry)`;
    console.log(`${label}: ${results.length - failures.length} of ${results.length} returned 200`);
    if (failures.length === 0 || round === rounds) break;
    pending = failures.map((r) => r.url);
    console.log(`Waiting ${opts.delay}s before retrying ${pending.length} URL${pending.length === 1 ? '' : 's'}`);
    await sleep(opts.delay);
  }

  for (const f of failures) {
    console.log(`FAIL ${f.status || 'ERR'} ${f.url}${f.error ? ` (${f.error})` : ''}`);
  }
  const where = opts.prefix ? `${opts.base} prefix ${trimSlashes(opts.prefix)}` : opts.base;
  const summary = `${urls.length - failures.length} of ${urls.length} URLs returned 200 at ${where}`;
  console.log(failures.length ? `FAILED: ${summary}` : `OK: ${summary}`);
  return failures.length ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`check-urls: ${err.message}`);
      process.exit(2);
    },
  );
}
