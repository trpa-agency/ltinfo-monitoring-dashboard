# How it works

The site is one web page per monitoring program. Each page is shown inside the Dashboard card on monitoring.laketahoeinfo.org, and it also works on its own.

## The pieces

- **programs.json** says what exists: the categories, the programs in each, which map service layers to chart and map, and which of three page layouts to use. Edit this file to change a page. Nothing else needs to change for ordinary edits.
- **Astro** turns programs.json into HTML files at build time, one per program, at `<category>/<program>.html`. Those are the same addresses the old site used, so LT Info keeps pointing at them.
- **Ecology** is ESA's design system, the same one LT Info is moving to. It lives in a sibling folder, `../ecology`, pinned to one commit by `ecology.ref`. Our pages are built from its components and tokens, re-skinned with an LT Info theme so they look native inside the host.
- **Data** comes from two places. Program text, partners, indicators, documents, and photos come from the LT Info API when the site builds, so pages open complete. Charts and maps read the TRPA map service live in the browser, so they change when GIS updates a layer.
- **Charts** are drawn as plain SVG by our own small module. **Maps** are Leaflet. Every chart has a table and a CSV behind it.

## How a change gets to the web

1. Edit programs.json (or a component) on the `v2` branch and push.
2. GitHub Actions checks out this repo and the Ecology hub side by side, runs the tests, builds the site, and publishes the result to the staging address `.../ltinfo-monitoring-dashboard/v2/`.
3. The old site stays live at the root until the cutover (Phase 5). A nightly build refreshes the LT Info text.

## Running it on a laptop

```bash
git clone https://github.com/esassoc/ecology ../ecology   # once, at the commit in ecology.ref
npm ci
npm run dev        # http://127.0.0.1:4330
npm test
```

Docker is optional and does the same thing in a container; see [docker.md](docker.md).

## Where to look

| Want to | Go to |
|---|---|
| Add or edit a program | `programs.json`, keys in [templates/README.md](../templates/README.md) |
| Change how a page is laid out | `src/layouts/Program.astro`, `src/components/mon/ProgramSections.astro` |
| Change a chart or map behavior | `src/lib/` and `src/components/mon/` |
| Change colors or type | `src/styles/theme-ltinfo.json`, then regenerate the CSS |
| Check a page as LT Info sees it | `public/host-harness.html` |
| Understand the plan and decisions | [v2-framework-plan.md](v2-framework-plan.md) |
