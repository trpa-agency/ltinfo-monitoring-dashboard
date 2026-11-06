# Monitoring Dashboard v2: an Astro spoke of the ESA Ecology design system, built in Docker

Status: draft for review. Written Nov. 5, 2026. Framework decided the same day: Astro spoke (Option B below). Nothing in this document has been built yet.

## Summary

The monitoring dashboard pages will be rebuilt as a spoke of ESA's [Ecology](https://github.com/esassoc/ecology) design system: an Astro site that links to the Ecology hub, re-skins it with an LT Info theme, and composes its components into the 37 pages this repo publishes today. Development runs in Docker so both of Mason's machines, CI, and anyone else who edits a page use the same Node, the same pinned hub commit, and no Python environment.

The original ask was Angular. Research showed that Ecology is an Astro and Lit hub, not an Angular library, and that its own Angular guide says the package cannot be installed into a stock Angular build today. The Angular path would have meant porting 13 presentational components by hand and bundling the Lit elements ourselves. The spoke is the path the hub is built for: every component works as shipped, ESA's spoke tooling applies, and the effort is roughly 40 percent lower. Section 3 keeps the comparison for the record.

What does not change: `programs.json` stays the content model, the data contracts with the LT Info API and the TRPA map service stay, the three page layouts stay, the embed contract stays, and every existing page URL keeps working.

One dependency outside this repo: Evelyn Malamut is leading an agency-wide re-evaluation of the Monitoring Dashboard's programs and categories, due before Thanksgiving 2026. Her categories are not the 10 Threshold Dashboard categories this repo is organized around, and the program inventory may change. Section 10 covers what that means for sequencing: the framework work (Phases 0 to 2) proceeds now, and the per-program and per-category build (Phases 3 and 4) starts from her outcome.

Decisions that need an answer before Phase 1 are listed in Section 9. Each has a default so work can start without a meeting.

Status, Nov. 5, 2026: Phase 0 is done. All five spikes passed in a scratch spoke, Spike 1 on bare Node because Docker Desktop is down on the TRPA machine. Section 11 has the results, three theme decisions for Mason, and the items Phase 1 must close before anything merges.

## 1. Where the repo is today

| Item | Current state |
|---|---|
| Pages | 36 program pages plus a home page (category cards, site map, All Programs, About). 10 Threshold Dashboard categories. |
| Content model | `programs.json` (259 lines) is the source of truth: categories, programs, `measures`, `sitesLayer`, `mapLayer`, `sitesPerYear`, `overlays`, and the `template` choice (`charts`, `map`, `context`). |
| Rendering | One template, `templates/program-dashboard.html` (1,324 lines, vanilla JS), stamped per program by `scripts/scaffold_programs.py` (Python, ArcGIS Pro env). Home page template is 802 lines. |
| Libraries | Calcite 2.13.2, Plotly 2.35.2, AG Grid 33.3.2, ArcGIS Maps SDK 4.31, all from CDN. No build step. |
| Data | Live at page load: LT Info API (`internalapi.laketahoeinfo.org`) for program text, partners, indicators, documents, photos; TRPA `LTInfo_Monitoring` map service for measurements, sites, and polygons. Home page uses a snapshot baked in by the Python script. |
| Hosting | GitHub Pages from `main`. Page URL pattern `<category>/<program>.html`. The LT Info admin points each program's `DashboardUrl` at that URL and the page renders inside an iframe in the Dashboard card. |
| Embed contract | No chrome when framed, `#f7f7f7` background, Lexend Deca, LT Info host colors, height posted to the parent, table and CSV behind every chart, explicit empty states. |

What survives the rewrite unchanged: `programs.json` and its schema, the data contracts with both services, the three page layouts, and the embed contract. What gets rewritten: everything that renders, and the Python script.

## 2. What Ecology is, as of Nov. 4, 2026

Source: the repo, its `CLAUDE.md`, `ONBOARDING.md`, token spec, package manifests, and the published site at [esassoc.github.io/ecology](https://esassoc.github.io/ecology/).

**Model.** A hub (the `ecology` repo) holds tokens, specs, and a reference implementation of the components. Each project gets a spoke, a separate Astro repo cloned beside the hub that re-skins it with a theme file and composes components into screens. Spokes link to the hub with `file:../ecology/packages/*` dependencies, so the two folders must be siblings. Nothing is published to npm or GitHub Packages yet; that is listed as an open seam. The hub's rules: never hand-copy `packages/spoke-template/`, create spokes with `/spoke-init` (which runs `scripts/create-spoke.mjs`); spokes never edit the hub (a `guard-hub-writes` hook enforces it); a dirty hub checkout can leak unmerged work into a spoke's build, which is why the hub's `/ship` command gates on it.

**Packages.** `@esa/tokens` 0.1.0 (DTCG source compiled to CSS and JS by Style Dictionary), `@esa/ecology` 0.2.0 (components, raw TypeScript and Astro source, depends on `lit`, peer dependency on `astro` ^5), `@esa/docs` (the documentation shell a spoke's design pages use), `@esa/handoff` and `@esa/design-layer` (dev-only tooling), and `spoke-template`.

**Components.** 68 files in `packages/ecology/src/components`:

| Kind | Count | Examples relevant to us |
|---|---|---|
| Lit web components (`.ts`), self-registering custom elements | 35 | `esa-select`, `esa-button-toggle` (segmented control), `esa-text-field`, `esa-tab-layout`, `esa-tooltip`, `esa-dialog`, `esa-sidebar-nav`, `esa-chip-group`, `esa-filter-dropdown`, `esa-pagination`, `esa-chart` |
| Astro components (`.astro`), rendered to HTML at build time | 31 | `esa-button`, `esa-card`, `esa-stat` (KPI tile), `esa-badge`, `esa-pill`, `esa-empty-state`, `esa-loading-spinner`, `esa-collapsible`, `esa-page-header`, `esa-breadcrumbs`, `esa-app-shell`, `esa-app-bar`, `esa-header-nav`, `esa-alert-box` |
| Reference only (static mock, non-functional) | 3 | `esa-grid` (an AG Grid skin), `esa-map` (a Leaflet wrapper), `esa-rich-text-editor` |

In an Astro spoke both of the first two groups work as shipped. The Astro group renders at build time, which suits everything on a page that is known at build (chrome, cards, tiles, labels, empty states). The Lit group handles anything that changes after load.

**Charts and data.** `esa-chart` wraps AG Charts Community (MIT), loaded by dynamic import, with an accessibility proxy DOM, keyboard navigation of data points, reduced motion, and forced colors handling. Series colors come from the `--color-background-dataviz-*` token family. The hub's rule is that a chart ships with its data as an `esa-grid`, which is the table-behind-every-chart pattern this repo already follows. The grid itself is a reference spec over AG Grid, not a component. The map reference describes Leaflet and states it is a static mock.

**Tokens and themes.** Three tiers: primitive (`--color-teal-9`, never themed), semantic (`--color-primary`, `--color-background-brand`, where a brand lives), and component (`--button-radius-md`, a fallback tier for components that themes would make diverge). A theme is a `[data-theme="x"]` scope that overrides the semantic and component tiers. Themes are generated from a recipe (`npm run theme:make`; the rule is to edit the recipe, never the generated CSS) and must emit hex. A font swap must also change the weight tokens. Spoke-specific tokens use a `--{spoke}-*` prefix, and Ecology components read only Ecology tokens.

**Angular, for the record.** The site has an Angular guide. It says the package cannot be npm installed into a stock Angular CLI build today (no build output, `.js` extensions in relative imports, `astro` as a hard peer) and that the Angular code samples are an interop contract. For existing Angular apps, `plugins/migrate-kit` guides the app to build its own Angular component library against the token contract. ESA's production Angular apps (Noria, Beacon) took that route. This is why the Angular option was more expensive than it looked.

**What is not there.** No Dockerfile anywhere in the hub or spokes. No LICENSE file on the hub (confirm terms with ESA before TRPA depends on it). No npm publication. The hub is active: pushed Nov. 4, 2026, 297 commits, 25 open issues.

**Why this matters for TRPA.** ESA's public org has a `firma2-design` spoke described as the design-system spoke for the 2.0 rebuild of their conservation project-tracking platform, with "ProjectFirma 2.0" as its display name, and a `ps-info-design` spoke for Puget Sound Info, LT Info's sibling. The next generation of the platform behind LT Info is being designed on Ecology, in exactly this spoke form. A TRPA spoke will look native when that lands, and it is a codebase ESA already knows how to read.

## 3. The framework decision (made: Option B)

| | A. Angular app on Ecology tokens | B. Astro spoke of Ecology (chosen) | C. Keep no-build HTML, adopt Ecology tokens |
|---|---|---|---|
| What it is | Angular standalone app, prerendered per program. Lit elements bundled by us. Astro primitives reimplemented as Angular components. | The path Ecology is built for. A spoke repo beside the hub; pages in Astro; interactivity in Lit elements and island scripts. | Current template plus `tokens.css` and the LT Info theme. |
| Alignment with ESA | Production stack of ESA's apps. | The stack ESA is designing the next ProjectFirma on. Spoke tooling (`/spoke-init`, `/design-qa`, `/ship`, doctor) applies. | Visual only. |
| Ecology coverage | Tokens: full. Lit elements: after a bundling spike. Astro primitives: port 13 by hand. | Everything works as shipped. | Tokens only, plus Lit elements after the same spike. |
| Fit for this site | Good, at a cost. | Very good. 37 static pages, build-time data where it is known, client scripts for the live parts. The current template's 2,100 lines of vanilla JS port to TypeScript modules almost one to one. | Fine; it is what runs today. |
| Rough effort | 25 to 37 focused days | 17 to 24 focused days | 5 to 8 focused days |
| Main risk | Hub packaging changes; our ports drift from the hub. | Spokes are built as design surfaces; we are using one as a production site. The sibling-folder convention needs care in Docker and CI. | Stays a template-stamping system only one person maintains. |

**Decision.** Option B, taken Nov. 5, 2026. The goal is a better dashboard site that matches where LT Info is heading, not production code inside LT Info's Angular app. If that goal changes, Section 3 of the previous draft (in git history) has the Angular plan.

## 4. Target architecture

### Repo layout

The repo stays `trpa-agency/ltinfo-monitoring-dashboard`. It becomes a spoke, scaffolded with the hub's `create-spoke.mjs` (never by copying the template) and then given the dashboard pages at its root.

```
ltinfo-monitoring-dashboard/        the spoke
  programs.json                     unchanged role: the content model
  ecology.ref                       the hub commit this spoke is pinned to
  docs/                             this plan, decision records, the embed contract
  src/
    pages/
      index.astro                   home: category cards and site map
      all.astro, about.astro        replace the hash routes
      category/[folder].astro       home with one category open
      [folder]/[program].astro      one page per program, from programs.json
      design/                       the spoke scaffold's design section (theme, catalog, prototypes), kept for ESA review
    layouts/
      Program.astro                 shared frame; orders sections by template (charts, map, context)
      Standalone.astro              LT Info header, hero, side nav, footer (hidden when embedded)
    components/mon/                 spoke components: KpiRow, ChartPanel, MapPanel, SiteList, Connections, CategoryCard, ...
    lib/                            TypeScript ported from the template: ltinfo-api, map-service, measures, sites, embed, csv
    styles/
      theme-ltinfo.css              generated LT Info theme (semantic and component overrides)
      embed.css                     chrome-less rules for the iframe case
    data/                           programs.json loader and schema, snapshot built at build time
  public/
  astro.config.mjs                  base '/ltinfo-monitoring-dashboard/' in production, build.format 'file'
  Dockerfile, compose.yaml
  .github/workflows/deploy.yml
  .claude/settings.json             trpa-claude-skills plus spoke-kit@ecology
  package.json                      @esa/* as file:../ecology/packages/*

../ecology/                         the hub, a sibling checkout at the commit in ecology.ref
```

The Python script retires. Stamping pages becomes Astro's `getStaticPaths` over `programs.json`. The home-page snapshot becomes a fetch in Astro frontmatter, which runs at build in Node, so every build refreshes it.

### Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Astro 5 (the hub's peer range), TypeScript, Node 24 LTS. Static output. | The spoke contract. Static HTML per page keeps GitHub Pages. |
| Design tokens and components | `@esa/tokens` and `@esa/ecology` through `file:../ecology/packages/*`, with the hub pinned by commit in `ecology.ref`. | The hub's distribution model until it publishes packages. Pinning prevents a hub change from altering a TRPA deploy unannounced. |
| Theme | `theme-ltinfo.css` generated with the hub's theme recipe from the LT Info host tokens already captured in the `ltinfo-platform` skill (navy `#2f3f56`, monitoring green `#789440`, primary `#3e72b0`, Lexend Deca). Applied as `data-theme="ltinfo"` on `<html>`. Spoke tokens use the `--mon-*` prefix. | Embedded pages must match monitoring.laketahoeinfo.org. The theme is where that lives. Lexend Deca means the weight tokens change too. |
| Charts | Native SVG, written in the spoke (`src/lib/svg-chart`) with no chart library: scales, axes, line, bar, stacked, and horizontal marks, a threshold line, a legend, hover and keyboard tooltips, and a `<title>` and `<desc>` for assistive technology. Series colors are the Ecology dataviz tokens, with marker shapes and dash patterns as a second encoding. | Decided Nov. 5, 2026 (Decision 3). SVG marks read CSS custom properties directly, which canvas charts cannot, so the theme reaches the marks. No Plotly, no AG Charts, and roughly 3 MB less on every page. |
| Tables and CSV | Plain accessible HTML tables behind every chart and map, with a CSV built from the same rows. | `esa-grid` is a reference spec, not a component, and nothing on these pages needs virtual scrolling or column filters. AG Grid can return later for a long table if one appears. |
| Maps | Leaflet 1.9 reading GeoJSON from the TRPA map service (`f=geojson`, confirmed on ArcGIS Server 11.5 with paging and CORS open), imported only in the map component so pages without a map never load it. Basemap tiles are the ones the host uses (Esri World Topo). Popups, legend, and list styled with Ecology tokens. | Decided Nov. 5, 2026 (Decision 4). The host's own maps are Leaflet, and Ecology's `esa-map` reference is Leaflet. |
| Build-time data | In frontmatter: `programs.json`, and from the LT Info API the program record, partners, indicators, documents, images, and the home-page snapshot. | Pages render complete, and `.astro` components (cards, tiles, lists) can be used for this content. Nightly CI rebuild plus a manual run keep it fresh; see Decision 5. |
| Live data | In client scripts: measurement charts, sites per year, sites, areas, and overlays from the map service. | Interactive, large, and changes when TRPA GIS updates a layer. Same as today. |
| Validation | A schema for `programs.json` checked at build. | Catches the JSON mistakes the editing guide lists under Troubleshooting before they reach a page. |
| Build and deploy | GitHub Actions: check out the spoke and the hub (at `ecology.ref`) as siblings in the workspace, build tokens, build the spoke, deploy to Pages. Pages source switches from branch to Actions. Nightly schedule and manual dispatch. | Replaces the hub's `/ship` (which pushes a `gh-pages` branch to ESA's org); see Decision 7. |

### Pages and URLs

Astro's `build.format: 'file'` writes `<folder>/<program>.html` instead of `<folder>/<program>/index.html`, so every URL the LT Info admin has set as a `DashboardUrl` keeps working with no redirect layer. The home page handles the old `#/all`, `#/about`, and `#/category/<folder>` hashes with a small redirect script.

| Page | Source | Data at build | Data live |
|---|---|---|---|
| `/index.html` | `index.astro` | categories, programs, partners, site snapshot | none (the snapshot is the map) |
| `/all.html`, `/about.html` | `all.astro`, `about.astro` | same snapshot | none |
| `/category/<folder>.html` | `category/[folder].astro` | same | none |
| `/<folder>/<program>.html` | `[folder]/[program].astro` over `programs.json` | program record, partners, indicators, documents, key image | measures, sites per year, sites, areas, overlays |

Each program page is one `Program.astro` layout whose sections are ordered by the program's `template`. The `?template=` preview override stays: sections carry a data attribute and a few lines of script reorder them.

### Interactivity

Ecology's Lit elements handle controls (`esa-select` for picks, `esa-button-toggle` for Chart and Table, `esa-text-field` for the site filter, `esa-chip-group` for category filters, `esa-sidebar-nav` for the standalone side nav). Dashboard behavior lives in TypeScript modules under `src/lib`, ported from the template function by function, and wired by `<script>` tags in the spoke components. Where a panel has enough state to warrant it (the chart panel with its pick, toggle, table, and CSV; the map panel with its list sync), it becomes a small Lit element in `src/components/mon` following the hub's decorator-free Lit pattern.

### Embed contract

Unchanged in behavior, implemented once in `src/lib/embed.ts`: detect `window.self !== window.top`, set `is-embed` on `<html>`, hide the standalone chrome, set the `#f7f7f7` background, and post `ltinfo-embed:height` on every layout change through a `ResizeObserver` instead of scattered `postHeight()` calls.

## 5. Docker setup

Docker's job is reproducibility: the same Node, the hub at the same commit, the sibling-folder convention satisfied without anyone arranging folders by hand, and no Python environment. `npm run dev` on bare Node still works for anyone who prefers it, provided they have `../ecology` checked out at `ecology.ref`.

```
Dockerfile (multi-stage)
  base     node:24-bookworm-slim with git; WORKDIR /work
  hub      ARG ECOLOGY_REF (read from ecology.ref); clone esassoc/ecology at that commit to /work/ecology;
           npm ci; npm run build:tokens
  deps     WORKDIR /work/ltinfo-monitoring-dashboard; COPY package*.json; npm ci
           (the file: links resolve to /work/ecology/packages/*, already present)
  dev      FROM deps; EXPOSE 4330; CMD astro dev --host 0.0.0.0
  build    FROM deps; COPY . ; npm run build
  preview  nginx:alpine; dist copied under /ltinfo-monitoring-dashboard/ to mirror the Pages base href

compose.yaml
  web       target dev, port 4330, bind mount . to /work/ltinfo-monitoring-dashboard,
            named volume for node_modules, vite polling on for Windows bind mounts
  preview   target preview, port 8080, serves the production build at the real subpath
  doctor    target deps, runs node ../ecology/scripts/doctor.mjs
```

Notes for Windows:

- Docker Desktop with the WSL2 backend. Bind mounts from `C:\` do not forward file change events, so Vite watch polling is on in the dev service. Keeping the clone inside the WSL filesystem makes `astro dev` several times faster; keeping it under `Documents\GitHub` works with polling.
- The hub's `ONBOARDING.md` says neither folder may live in OneDrive. The same applies here.
- Confirm Docker Desktop's license terms for TRPA with DTS. Podman Desktop and Rancher Desktop run the same `Dockerfile` and `compose.yaml` if a license is a problem.

Bumping the hub is one line in `ecology.ref`, a rebuild of the image, and a pass through the Phase 0 spikes.

CI does not need Docker. The workflow checks out both repos as siblings, reads `ecology.ref`, and runs the same `npm ci` and `npm run build` steps. The Node version is pinned in both places from one `.nvmrc`.

## 6. Component map

What each piece of the current template becomes.

| Current (template JS) | v2 | Ecology piece |
|---|---|---|
| Header, hero, breadcrumb, side nav, footer (`renderChrome`) | `Standalone.astro` layout | `esa-app-bar`, `esa-page-header`, `esa-breadcrumbs`, `esa-sidebar-nav` |
| KPI tiles (`kpi`, `noteYears`) | `KpiRow.astro`; values filled by script as chart data arrives | `esa-stat` |
| Chart panel with Chart/Table toggle, CSV, source line (`chartPanel`, `wireChart`, `wireTable`) | `mon-chart-panel` element on an `esa-card`, with a plain HTML table view | `esa-card`, `esa-button-toggle`, `esa-button`, `esa-select`, `esa-empty-state`, `esa-loading-spinner` |
| Measurement query and drawing (`queryMeasure`, `measureView`, `measureSeries`, `drawMeasure`, `measureColumns`) | `lib/map-service.ts`, `lib/measures.ts`, and the native SVG module `lib/svg-chart` (threshold line with label, stacked and grouped bars, horizontal ranked bars, date and category axes, tooltips) rendered by `mon-chart` | tokens: `--color-background-dataviz-*` |
| Pick drop-down (`calcite-select`) | `esa-select` | |
| Sites per year (`wireSitesPerYear`, `serviceSitesPerYear`) | same chart panel with its own data adapter in `lib/sites.ts` | |
| Site map and list (`renderMap`, `wireSiteList`, `placeList`, `selectSite`, popups) | `mon-map` (Leaflet) and `mon-site-list` elements inside an `esa-card` | `esa-text-field`, `esa-badge` or `esa-pill`, `esa-button`, `esa-empty-state` |
| Area map (`renderAreaMap`, `wireAreaMap`) | same map panel, polygon mode | `esa-select` |
| Overlays (`overlayLayers`) | map panel input from `programs.json` | |
| Partners, indicators, documents (`connectionsPanel`) | `Connections.astro`, rendered at build from the LT Info API | `esa-card`, `esa-collapsible` |
| Program text (`clean`, `lede`) | sanitized at build in `lib/ltinfo-api.ts` with the same allowlist | |
| Loading and empty states (`emptyState`, `calcite-loader`) | `esa-empty-state`, `esa-loading-spinner` | |
| Embedded dashboard frame (`dash-frame`) | `DashboardFrame.astro` | |
| Home: category cards, hover and select logic, search | `CategoryCard.astro`, `SiteMap` island, `lib/home.ts` | `esa-card`, `esa-filter-pills`, `esa-filter-container`, `esa-text-field` |
| Home: All Programs cards, filters, CSV | `all.astro` with cards at build and a filter script | `esa-chip-group`, `esa-card`, `esa-button` |

Nothing in this table is written from scratch except the SVG chart module and the two stateful panel elements; the data logic ports function by function from the template.

## 7. Phases

Effort is focused working days for one developer who knows the current template. Ranges are honest, not padded.

**Phase 0: spikes (2 to 3 days).** Each has a pass criterion. If any fails, the plan changes before more is built.

1. Scaffold the spoke with `create-spoke.mjs` from a hub checkout at a pinned commit, bring it up in Docker, and run the hub's doctor inside the container. Pass: doctor passes, `astro dev` serves the scaffold at port 4330 on both machines, and a file edit shows in the browser within a few seconds.
2. Draw the hardest current charts (ozone by station with a pick, several series, and a threshold line; a daily date-axis chart; a stacked share chart; a ranked horizontal bar chart) with the native SVG module, each with the Table toggle and CSV. Pass: they match the current charts' information, the table and CSV match today's columns, and the SVG re-renders at 375 px.
3. Leaflet maps from map service GeoJSON: Tahoe Yellow Cress sites with the lake level overlay, and the SEZ assessment units colored by rating with the evaluation year pick, each with the site list synced both ways, popups, and a legend. Pass: pages without a map never load Leaflet; the legend, popups, and list follow the theme; the wheel does not zoom the map.
4. Generate `theme-ltinfo.css` with the hub's theme recipe from the LT Info tokens, including the Lexend Deca weight tokens. Pass: a page with `esa-stat` and `esa-card` sits in the LT Info Dashboard card and is visually indistinguishable from the host's own cards. Run the hub's contrast check on it.
5. Build with `build.format: 'file'` under the Pages base path, serve with the preview container, open a program page at its legacy `.html` URL directly and in an iframe. Pass: real file per URL, height posting works, chrome hides when framed.

Phase 0 ran Nov. 5, 2026. All five spikes passed, Spike 1 on bare Node with the container run deferred until Docker Desktop is repaired. Results, open decisions, and the items carried into Phase 1 are in Section 11.

**Phase 1: scaffold (1 to 2 days).** The spoke scaffolded for real on a `v2` branch, `ecology.ref`, Dockerfile, compose, CI building to a staging path, `.claude/settings.json` with `spoke-kit@ecology` beside the TRPA skills, `programs.json` loader and schema, theme, `embed.ts`. Phase 0 produced most of these in the scratch spoke; Phase 1 moves them into the repo and closes the exit items in Section 11.

**Phase 2: core library (6 to 8 days).** `lib/` modules with the paging, statistics, unpivot, and date logic ported and tested against recorded service responses. Chart panel, map panel, and site list as Lit elements. KPI row, connections, empty and loading states as spoke components on Ecology primitives.

**Gate before Phase 3.** The category and program inventory from Evelyn's review (Section 10) is in hand and reflected in `programs.json`. Phases 0 to 2 do not depend on it; Phases 3 and 4 do.

**Phase 3: program pages (3 to 4 days).** `[folder]/[program].astro` over `programs.json`. The `Program.astro` layout with three section orders. Every `measures` key in `templates/README.md` supported and checked against the program that uses it; the README's table of keys becomes the test list. The `?template=` override.

**Phase 4: home (3 to 4 days).** Snapshot in frontmatter. Category cards with the hover and select behavior described in `templates/README.md`. Site map island. All Programs with filters and CSV. About. Hash redirects.

**Phase 5: QA and cutover (2 to 3 days).** `trpa-dashboard-qa` on every page and the hub's `/design-qa`. Side-by-side check of all 36 programs against the current site: same panels, same numbers, same CSV columns. Switch Pages source to Actions, merge, confirm every existing `DashboardUrl` still resolves, then remove the generated HTML, the Python script, and the old templates. Update `CLAUDE.md`, `README.md`, and `EDITING-PROGRAM-PAGES.md`. The editing guide barely changes: `programs.json` is still where page owners work, and the restamp step becomes "push and let CI build."

Total: 17 to 24 days of effort. On the calendar, Phases 0 to 2 can run in November alongside Evelyn's review, and Phases 3 to 5 follow it in December. Develop on a `v2` branch; the current site stays live from `main` until Phase 5.

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A hub change breaks the spoke (component API, token rename, package layout) | Medium | Pin by `ecology.ref`. Bump deliberately and rerun the Phase 0 spikes on each bump. The hub's `migrations.json` records token renames. |
| Spokes are built as design prototypes, and ESA's tooling assumes that shape | Medium | Keep the scaffold's design section under `/design` so `/design-qa` and the doctor keep working. Replace `/ship` with our own Actions deploy. Tell ESA what we are doing (Decision 8). |
| The sibling-folder convention fails in Docker or CI | Low | Spike 1 proves it in Docker; CI checks both repos out side by side in the workspace. |
| No license on the hub | Low to medium | Ask ESA (through Jeanne) for written terms before Phase 1. TRPA already depends on ESA for LT Info, so this is a formality, but it should be on paper. |
| The native SVG chart module misses a behavior the current Plotly charts have (unified hover, date axes, stacked shares, ranked bars, threshold labels) | Medium | Spike 2 draws the four hardest chart shapes and the `measures` keys in `templates/README.md` become the test list. The module stays small and owned by TRPA; the hub's accessibility checks do not cover it, so the table behind every chart is the guarantee. |
| The dataviz palette sits at Ecology's color-vision floor | Medium | Marker shapes and dash patterns as a second encoding in every multi-series chart, and the table view. |
| Build-time LT Info content goes stale | Low | Nightly rebuild plus a manual run; the build date is printed in the footer as the snapshot date is today. A fix in the LT Info CMS appears within a day, or at once on request. |
| Leaflet has to read ArcGIS services without the Esri SDK | Low | Confirmed Nov. 5, 2026: the `LTInfo_Monitoring` service is ArcGIS Server 11.5 with `f=geojson`, paging, and CORS open to any origin. Leaflet draws the GeoJSON; styling comes from `programs.json` as it does today. |
| Windows bind mount performance | Medium | Polling by default; document the WSL filesystem option. |
| `DashboardUrl` breakage at cutover | Low | `build.format: 'file'` keeps the URLs; a script hits all 36 after deploy. |
| `deploy.yml` as built replaces the live site on the first merge to `main` | Certain until fixed | Phase 1 exit item: gate the workflow on `v2` and build to a staging base; Pages stays on the branch source until Phase 5. |
| The hub's theme tooling grades a dark scheme a light-only recipe does not declare, so it exits 1 and cannot gate CI | Certain today | Gate CI on `check-contrast.mjs`, which passes 66 of 66 pairs, and ask the hub to skip undeclared schemes. |
| SEZ GeoJSON is 2.9 MB per year even generalized, heavy for an iframe | Medium | Coarser overview with full geometry on focus, or vector tiles, decided before Phase 3 ships the map template. |

## 9. Decisions

Defaults apply unless you say otherwise.

1. **Framework.** Astro spoke. Decided Nov. 5, 2026.
2. **Hub location.** A sibling `../ecology` checkout pinned by `ecology.ref`, as the hub prescribes, with Docker and CI arranging the siblings; or a git submodule under the spoke with rewritten `file:` links. Default: sibling plus `ecology.ref`. It keeps the doctor, the spoke-kit hooks, and ESA's mental model intact.
3. **Charts.** Native SVG written in the spoke. Decided Nov. 5, 2026, in place of `esa-chart` (AG Charts) and Plotly. Tables behind charts are plain HTML. The `trpa-dashboard-stack` and `trpa-monitoring-dashboard` skills get updated at Phase 5 to describe the v2 stack.
4. **Maps.** Leaflet 1.9 reading GeoJSON from the map service. Decided Nov. 5, 2026, in place of the ArcGIS Maps SDK. Basemap tiles match the host (Esri World Topo, with Aerial as the second option).
5. **LT Info content at build or live.** Program text, partners, indicators, documents, and images fetched at build with a nightly rebuild and a manual run; or fetched live on open as today. Default: at build. Pages render complete, open with no API dependency, and use Ecology's Astro components for that content. Map service data stays live either way.
6. **Spoke design section.** Keep the scaffold's theme, catalog, and prototype pages under `/design`, or strip them. Default: keep. It is how ESA reviews a spoke and how the theme is documented, and it costs nothing in the deployed dashboard.
7. **Deploy.** GitHub Actions Pages deploy from `main`, or the hub's `/ship` (a `gh-pages` branch push aimed at ESA's org). Default: Actions. Same output, TRPA's org, and the nightly rebuild needs a workflow anyway.
8. **ESA involvement.** Tell ESA (through Jeanne, and Andy on the Ecology side) that TRPA is building a spoke, ask for license terms, a heads-up on breaking hub changes, and whether they want the LT Info theme recipe contributed back to the hub. Default: yes, before Phase 1. This also feeds the pending scoping request about TRPA-managed pages inside the dashboard framework, since a spoke is the form ESA's own next-generation screens are taking.
9. **Chart palette contrast.** Keep the same-hue shifts that pass Ecology's 3:1 graphic contrast gate (categorical slots 2, 3, 4, and 7 and the sequential ramp), or restore the exact host hexes with a documented waiver. Default: keep the shifts. Section 11 has the values.
10. **Selected toggle style.** Accept `esa-button-toggle`'s white chip with brand text, or wait on a hub hook for a brand fill. Default: accept, and file the hook request.
11. **Knockout text on brand fills.** Accept white on `#789440` at about 3.35:1, the host's own ratio, or pin a darker brand fill. Default: accept host parity.

## 10. Dependency: the agency's Monitoring Dashboard redesign

On Nov. 5, 2026, Evelyn Malamut (Natural Resource Analyst) wrote to the monitoring staff about a re-design of the LT Info Monitoring Dashboard. Her stated goals: display monitoring data in an accessible, intuitive, and interesting way; a more user-friendly web experience; better integration with the other LT Info sites and Tahoe Open Data; and an improved data ownership and site development process. The first step is a re-evaluation of the current programs and of the 281 LT Info indicators, by category, with category owners, to decide which indicators should have monitoring programs and which programs to keep, change, remove, or archive. She is scheduling owner meetings over the next few weeks with a goal of finishing before Thanksgiving (Nov. 26, 2026). Owners were asked to spend under 30 minutes reviewing a spreadsheet of their categories' indicators and programs and noting additional in-house or external programs worth displaying.

Her categories and owners, which she says are not set in stone:

| Category | Owners |
|---|---|
| Air Quality | Beth, Evelyn |
| Aquatic Invasive Species | Emily, Andy |
| Fire Dynamics | Mason |
| Fisheries | Andy, Beth |
| Forest Structure | Mason |
| Noise | Andy, Beth |
| Recreation | Devin, Amy |
| Scenic | Andy, Jeanne |
| Soils | Beth, Evelyn, Mason, Andy |
| Transportation | Rachael, Josh, Kira, Rory |
| Uncommon and Sensitive Plants | Beth |
| Water Quality | Evelyn, Dan |
| Wildlife | Beth |
| Other (no category fits) | Mason, Evelyn |

What this means for v2:

- **Categories are about to change.** This repo organizes everything around the 10 Threshold Dashboard categories, with their colors and icons. Evelyn's list has 14, splits Aquatic Invasive Species out of Water Quality, splits Vegetation Preservation into Forest Structure, Fire Dynamics, and Uncommon and Sensitive Plants, and adds Other. `programs.json` already treats categories as data, so the change is content, not code. The v2 home page must not assume ten categories or the Threshold Dashboard icon set; category color and icon become fields in `programs.json`.
- **The program inventory is about to change.** Programs may be added, merged, or archived. Phase 3 (per-program pages) and Phase 4 (home) wait for the outcome. Phases 0 to 2 build the framework against the current `programs.json` and are unaffected.
- **Two of Mason's categories have no pages yet.** Fire Dynamics and Forest Structure do not appear in `programs.json` today; Subalpine Conifer, under Vegetation Preservation, is the only forest program. The Forest Health reference dashboards named in the `trpa-monitoring-dashboard` skill are the starting point for both, and they are the natural first pages to build in Phase 3.
- **The data ownership goal is this repo's editing model.** `programs.json` with one category owner per section, `EDITING-PROGRAM-PAGES.md`, and CI builds on push are a concrete answer to "an improved data ownership and site development process." Offer it to Evelyn as the proposed process, with the v2 build as the vehicle.
- **The integration goal favors the spoke.** Matching Ecology is how the pages will look native beside the other LT Info sites as ESA moves them onto it. Tahoe Open Data integration is a content question (source links on every chart already point at the map service; adding the Open Data item link per layer is a `programs.json` field).

Mason's own action from the email, separate from this plan: review the spreadsheet for Fire Dynamics, Forest Structure, Soils, and Other, and note candidate programs before Evelyn schedules the meetings.

## 11. Phase 0 results (Nov. 5, 2026)

The five spikes ran on Nov. 5, 2026 in a scratch spoke at `C:\Users\mbindl\Documents\GitHub\ltinfo-monitoring-spoke`, created with the hub's `create-spoke.mjs` from the hub clone at `C:\Users\mbindl\Documents\GitHub\ecology`, pinned at commit `a7849d41` (Nov. 4, 2026). One agent built each spike, another verified it in the browser against its pass criteria, with up to two fix rounds, and a final critic looked for what the spikes did not cover. Nothing is committed: the spoke has no git history and this document is untracked in the dashboard repo. The dev server runs from the dashboard repo's `.claude/launch.json` at port 4330.

### Outcomes

| Spike | Result | What exists now | What it did not prove |
|---|---|---|---|
| 1. Scaffold and Docker | Passed on bare Node; the Docker run is deferred | The create-spoke scaffold, the doctor on the host, `astro dev` at port 4330, a six-stage Dockerfile, `compose.yaml` (web 4331:4330, preview 8080:80, doctor), `nginx/default.conf`, `.github/workflows/deploy.yml`, `docs/docker.md` | No image built, no container run, nginx config never loaded. Docker Desktop's engine is down on the TRPA machine (below). The container run is a Phase 1 exit item. |
| 2. Native SVG charts | Passed, 13 of 13 criteria, no fix rounds | `src/lib/map-service.ts` (paged queries, statistics, unpivot, dates), `measures.ts` (every key in `templates/README.md`), `csv.ts`, `src/lib/svg-chart/` (nice ticks, band and time scales, grouped, stacked, and horizontal bars, lines with rotating markers and dash patterns, dashed threshold with label, keyboard hit groups with tooltips), the `mon-chart` and `mon-chart-panel` elements, 81 unit tests passing | The panels never rendered inside the program layout; the empty state never triggered live. |
| 3. Leaflet maps | Passed, 12 of 12 plus the embed contract, no fix rounds | `src/lib/sites.ts` (GeoJSON paging, site collapsing, quoted where clauses, CSV), `mon-map` (World Topo and Aerial, wheel zoom off, markers, colorBy polygons, overlays, popups, legend, Home), `mon-site-list`, `MapPanel.astro`; pages without a map do not load Leaflet | Same as the charts: not yet inside the program layout. |
| 4. Theme | Passed after two fix rounds | `src/styles/theme-ltinfo.json` (light scheme only) and the generated `theme-ltinfo.css`; the light contrast gate passes 66 of 66 pairs; `HostCardMock.astro` reproduces the host card, and side by side with monitoring.laketahoeinfo.org the card header, body, type, and borders compute the same | Three owner decisions (Section 9, items 9 to 11). |
| 5. Build, URLs, embed | Passed after two fix rounds | `build.format: 'file'`, `trailingSlash: 'never'`, base `/ltinfo-monitoring-dashboard/` in production; 36 program pages build as real files; `Program.astro` with the three section orders and the `?template=` override; `StandaloneChrome.astro`; `src/lib/embed.ts` (framed detection, chrome hiding, debounced height posting); `public/host-harness.html` | Pages build under a `spikes/` prefix, not the legacy path. Framing was localhost inside localhost; cross-origin was never observed. |

### What the spikes settled

- The host's card and chrome values are reachable from Ecology tokens alone. Ten pins on top of the recipe seeds (backgrounds, text, link, font weights, and the chart palette) are enough, and no `.esa-*` internals are styled.
- Astro keeps `<folder>/<program>.html` with `build.format: 'file'` under the Pages base path, and the production preview serves the pages with every asset resolving.
- The height message and chrome hiding work through the harness on the dev server and on the production build.
- The map service answers GeoJSON for Leaflet. One year of SEZ assessment units is 17 MB at full precision and 2.9 MB with server generalization (about 2 m), still heavy for an iframe.
- The hub's HandoffInspector probes for a manifest on every page and logs a 404 when none exists. `BaseLayout.astro` now mounts it only when a handoff bundle exists on disk, so program pages carry neither the probe nor the inspector.

### Decisions for Mason

Three questions came out of the theme spike. The defaults are in Section 9.

1. **Chart palette.** Ecology's contrast gate wants 3:1 for chart graphics on the background. Four host chart colors fail it on `#f7f7f7`, as does the lightest sequential step. The fix round re-pinned them to the nearest same-hue values that pass: `#e49937` to `#c97f0d`, `#89bf40` to `#6b9e11`, `#5a9cb0` to `#5698ac`, `#89cad7` to `#3a8291`, and the sequential ramp re-spaced from `#7bbbc8` to the host's `#2c5f72`. The primary blue `#3e72b0` is unchanged. Keeping the shifts passes the gate the hub enforces, the charts already carry marker shapes and dash patterns, and the family resemblance holds. The alternative is the exact host hexes with a documented waiver.
2. **Selected toggle segment.** `esa-button-toggle` paints its selected segment as a white chip with brand text, and the hub exposes no hook to fill it with the brand green. The component's own documentation still says the selected segment fills with the primary color.
3. **White text on brand green.** `esa-button` and `esa-badge` render `#fcfcfc` on `#789440`, about 3.35:1, the same as the host's own buttons at 3.44:1. That passes 3:1 for UI and large text. The generator chose `#202020` (4.74:1) for `--color-content-on-brand`, but those components do not read it.

### Carried into Phase 1

The critic's verdict was "not ready for Phase 1" on these grounds. None changes the architecture. They are listed here so none is lost, and they are Phase 1's definition of done.

1. **Deploy path.** As built, `deploy.yml` deploys to the production Pages site on every push to `main`, so a first merge would replace the live site and break every `DashboardUrl`. Gate the workflow on the `v2` branch, build to a staging base (for example `/ltinfo-monitoring-dashboard/v2/`), keep Pages on the branch source until Phase 5, and script a check of all 36 legacy URLs after each deploy.
2. **Legacy route.** Move `src/pages/spikes/[folder]/[program].astro` to `src/pages/[folder]/[program].astro`, drop the `spikes/` prefix from `programPath()` in `src/lib/programs.ts`, and check the route against the design-system, patterns, index, and harness routes.
3. **One real page.** Put the chart panel (Ozone by station) and the map panel (Tahoe Yellow Cress or SEZ) into `ProgramSections.astro` for one program, delete the inline height scripts in the chart and map spike pages so every page uses `src/lib/embed.ts`, and confirm in the harness at 1280 and 375 px that the frame grows as data arrives, the empty state shows for a where clause with zero rows, and the console stays clean.
4. **Cross-origin test.** Serve the harness from a second origin against the 4330 page and confirm the height message crosses, the chrome hides, and Lexend Deca loads. Plan the first real test against the staging deploy, with the LT Info admin pointing one test program's `DashboardUrl` at it.
5. **Hub tooling on both machines.** Install the `spoke-kit@ecology` plugin (none of its hooks ran during Phase 0), authenticate `gh`, and get the doctor to exit 0: rename `--shadow-*` to the elevation tokens with `migrate-tokens.mjs`, reword the host-variable comments in `HostCardMock.astro` that the scanner reads as token uses, add manifest headers to the pages, and settle the escape comment (the hook reads `bcn-lego-checked:` literally; ask the hub to accept `<slug>-lego-checked:`, or write the literal).
6. **Gates.** A `test` script, `@types/node`, the seven strict-null fixes in `tests/programs.test.ts`, and test, `tsc --noEmit`, and `check-contrast` steps ahead of the build in CI. Today 81 tests pass, `tsc` fails only under `tests/`, and the contrast gate passes.
7. **Decision 5 spike.** Half a day: fetch one program's record, partners, indicators, documents, and images from `internalapi.laketahoeinfo.org` in frontmatter under `NODE_ENV=production`, save the responses as fixtures, and write the `programs.json` schema check. Nothing in the spoke touches the LT Info API yet.
8. **Housekeeping.** Commit the spoke and this document; point the loader at the root `programs.json` once the spoke moves into the dashboard repo; remove the `gh-pages` script and dependency; replace the scaffold `CLAUDE.md` and `README.md` text, which still describe Beacon and `bcn-`; fix the em-dashes in the `src/pages/index.astro` copy; choose `--mon-*` or `--ltinfo-*` for spoke-authored tokens; add `font-family: inherit` for Leaflet's zoom and close glyphs; pass `status: 'STATUS'` for Tahoe Yellow Cress so the list reads "Surveyed."
9. **Docker.** After DTS repairs the WSL 2 backend: `docker compose build web`, `docker compose run --rm doctor`, `docker compose up web` with an edit through port 4331, and `docker compose up preview` with a 302 from `/` and a 200 from `/ltinfo-monitoring-dashboard/`.

### Hub issues to raise with ESA

1. `--button-toggle-selected-bg` and `--button-toggle-selected-color` hooks on `esa-button-toggle`, and its stale documentation.
2. `check-themes.mjs` and `make-theme.mjs` grade a dark scheme the recipe does not declare, exit 1, and write dark FAIL lines and em-dashes into the generated CSS header, so neither can gate CI for a light-only spoke.
3. `packages/design-layer/src/handoff.ts` joins the manifest URL as `${BASE}handoff/...`; under `trailingSlash: 'never'` that yields `/ltinfo-monitoring-dashboardhandoff/`. Dormant for us, broken for any spoke that ships handoff bundles.
4. A dynamic import of `HandoffInspector`, so the orphan 35 KB chunk and the 101 KB Inter font stop shipping in every build.
5. Runtime (Lit) `esa-badge` and `esa-pill`. The Astro versions cannot be created at runtime, so list rows and popups clone build-time templates or hand-roll the markup.
6. The spoke-kit hook's escape token is hard-coded to `bcn-`.

### Data findings for TRPA GIS

- Layer 46 (ozone) mixes units on one indicator: 2025 rows are parts per billion (60 to 83) and older rows are parts per million (0.06 to 0.10), so the autoscale flattens the history. Normalize at the source or split the pick.
- Layer 46 has duplicate Year plus Station rows (2018 Lake Tahoe Community College, 2019 Tahoe City) that the chart collapses silently. Choose a rule: max, latest, or average.
- `Threshold_Value` is null for the 8-hour ozone statistic, the page's default pick, so no threshold line shows until the 1-hour statistic is chosen. The current site behaves the same.
- Layer 106 `Threshold_Year` is a string field; unquoted comparisons return HTTP 400.
- SEZ assessment units are 2.9 MB per year even generalized. Before Phase 3 ships the map template, decide between a coarser overview with full geometry on focus and vector tiles.
- The daily ozone chart carries 3,287 hit groups and about 800 KB of SVG re-rendered on each width change. A single overlay hit area for charts with more than a few hundred positions goes on the Phase 2 list.

### Docker Desktop on the TRPA machine

Docker Desktop 4.36.0 crashed on start with "running engine: waiting for the VM setup to be ready: context canceled," and WSL 2.3.26 now lists no distributions. `docker info` fails on the missing `dockerDesktopLinuxEngine` named pipe. The fix is a WSL update (`wsl --update`) and a Docker Desktop update or reinstall, which on this machine goes through DTS. Podman Desktop or Rancher Desktop would run the same Dockerfile and compose file if Docker Desktop licensing becomes a question. Nothing in Phases 1 and 2 needs the container; the host dev server and the production build both run on bare Node 22.

## Sources

- Evelyn Malamut, "Monitoring Dashboard Re-Design Program Input," email to monitoring staff, Nov. 5, 2026
- Ecology hub: [github.com/esassoc/ecology](https://github.com/esassoc/ecology), its `CLAUDE.md`, `ONBOARDING.md`, `packages/tokens/SPEC.md`, `packages/ecology/package.json`, `packages/tokens/package.json`, `packages/spoke-template/` (`astro.config.mjs`, `package.json.tmpl`), and `plugins/migrate-kit/README.md`
- Ecology site: [esassoc.github.io/ecology](https://esassoc.github.io/ecology/), the Angular guide, the Setup guide, and the `esa-chart`, `esa-grid`, `esa-map`, and component catalog pages
- ESA spokes: [firma2-design](https://github.com/esassoc/firma2-design), [ps-info-design](https://github.com/esassoc/ps-info-design), [cb-fish-design](https://github.com/esassoc/cb-fish-design)
- This repo: `README.md`, `templates/README.md`, `EDITING-PROGRAM-PAGES.md`, `programs.json`, `templates/program-dashboard.html`, `scripts/scaffold_programs.py`
