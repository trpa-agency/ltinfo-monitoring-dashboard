# LT Info Monitoring Dashboard

Program dashboards for the Dashboard card of each program page on https://monitoring.laketahoeinfo.org/. The LT Info admin points each program's `DashboardUrl` at `https://trpa-agency.github.io/ltinfo-monitoring-dashboard/<category-folder>/<program>.html`.

This branch (`v2`) rebuilds the site as an Astro spoke of ESA's Ecology design system. The short explanation is [docs/how-it-works.md](docs/how-it-works.md); the plan, the Phase 0 and 1 results, and the open decisions are in [docs/v2-framework-plan.md](docs/v2-framework-plan.md). `main` still carries the generated HTML pages, the Python scaffold script, and the old templates; they stay live until Phase 5 cuts over, and they are not edited on this branch.

## Layout

- `programs.json`: the content model. Categories and the programs in each, with their measures, site layers, map layers, overlays, and template. Unchanged role from `main`; every key is documented in [templates/README.md](templates/README.md).
- `ecology.ref`: the commit of https://github.com/esassoc/ecology this spoke is pinned to. The hub is a sibling checkout at `../ecology`; `package.json` links `@esa/*` to `file:../ecology/packages/*`. Never edit the hub. Bump the pin deliberately and rerun the Phase 0 spike pages.
- `src/pages/[folder]/[program].astro`: one page per program from `programs.json`, built as a real file at `<folder>/<program>.html`.
- `src/pages/spikes/`: the Phase 0 spike pages (theme, chart, map). Kept as living checks of the theme, the chart module, and the map module.
- `src/pages/index.astro`, `design-system/`, `patterns/`: the spoke scaffold's design section, kept for ESA review until Phase 4 replaces the home page.
- `src/layouts/`: `BaseLayout.astro` (tokens, theme, font) and `Program.astro` (the program page frame).
- `src/components/mon/`: spoke components and Lit elements, all prefixed `mon-`. `ltinfo/` holds the build-time LT Info content components (about, partners, indicators, documents, key photo, dashboard frame).
- `src/lib/`: TypeScript with no DOM dependencies where possible, tested under Node: `map-service`, `measures`, `sites`, `csv`, `svg-chart/`, `embed`, `programs`, `programs-schema` (validates programs.json at build), `ltinfo-api` (LT Info fetch at build with fixture fallback), `sanitize`, `base`.
- `src/styles/theme-ltinfo.json` and `theme-ltinfo.css`: the LT Info theme recipe and the CSS generated from it.
- `tests/`: Node test files, run with `npm test`. `tests/fixtures/ltinfo/` holds recorded LT Info responses; refresh them with `node scripts/record-ltinfo-fixtures.mjs 41 63 39 83 68`.
- `scripts/check-urls.mjs`: checks every program URL after a publish (`npm run check:urls`); CI runs it for the staging and legacy sets.
- `public/host-harness.html`: a stand-in for the LT Info Dashboard card, for checking the embed contract.
- `Dockerfile`, `compose.yaml`, `nginx/`, `.github/workflows/deploy.yml`, `docs/docker.md`: container and CI setup.

## Commands

Node 22 (`.nvmrc`). The hub must be cloned beside this repo at the commit in `ecology.ref`, with `npm ci` and `npm run build:tokens` run inside it once.

```bash
npm ci
npm run dev          # http://127.0.0.1:4330, base /
npm test
npm run typecheck
npm run check:contrast
npm run doctor       # the hub's spoke health check
NODE_ENV=production npm run build   # base /ltinfo-monitoring-dashboard/, output in dist/
```

The Claude Code browser pane starts the dev server through `.claude/launch.json` (`spoke-dev`). Docker is optional; see `docs/docker.md`.

## Required skills for HTML

Before writing or editing any page or component, load all four skills:

1. `trpa-brand:trpa-brand`
2. `trpa-monitoring-dashboard:trpa-monitoring-dashboard`
3. `ltinfo-platform:ltinfo-platform`
4. `trpa-dashboard-stack:trpa-dashboard-stack`

Where they conflict on visual styling inside an LT Info embed, the LT Info host tokens in `ltinfo-platform` and `trpa-monitoring-dashboard` win, because embeds must match monitoring.laketahoeinfo.org. Apply `trpa-brand` for writing style and tone. The `trpa-dashboard-stack` library list (Plotly, Calcite, AG Grid, ArcGIS SDK) describes `main`; this branch uses native SVG charts, Leaflet, plain HTML tables, and Ecology components instead, by decision on Nov. 5, 2026.

## Spoke rules

- Component first. Reach for an `@esa/ecology` component before writing markup. When no component fits, say so in a comment that starts with `mon-lego-checked:` naming the legos in use and why the rest is custom.
- Theme through the recipe only. Edit `src/styles/theme-ltinfo.json` and regenerate with `node ../ecology/scripts/make-theme.mjs --recipe src/styles/theme-ltinfo.json --out src/styles --force`. Never hand-edit `theme-ltinfo.css`. The theme is light only; the hub's dark-scheme gate failing is expected.
- Tokens, not literals. Colors come from `--color-*` tokens or `programs.json` fields. Spoke-authored tokens use the `--mon-*` prefix. The generated `--ltinfo-*` ramps are the hub's naming and stay as generated.
- One embed implementation. Framed detection, chrome hiding, the `#f7f7f7` background, and height posting live in `src/lib/embed.ts`. Pages call `initEmbed()` and nothing else.
- Embed contract: no chrome when framed, Lexend Deca on every text element including SVG, fluid to 375 px, a table and CSV behind every chart, explicit empty and error states, maps never capture wheel scroll, and no console errors on load.
- Pure logic in `src/lib` with a test in `tests/`. Run `npm test` and `npm run typecheck` before calling work done.
- Writing: no em-dashes, Oxford commas, spell out percent in prose, numerals for 10 and up, no emojis.

Run `trpa-dashboard-qa` before sending a URL to the LT Info admin.
