# Templates

| File | Builds | Placeholders |
|---|---|---|
| [program-dashboard.html](program-dashboard.html) | Every program page (`<category>/<program>.html`), in one of three page templates | `{{TEMPLATE}}`, `{{PROGRAM_NAME_HTML}}`, `{{CATEGORY_COLOR}}`, `{{PROGRAM_JSON}}` |
| [index.html](index.html) | The home page (`/index.html`) | `{{SNAPSHOT_JSON}}` |

`scripts/scaffold_programs.py` fills the placeholders from `programs.json` and the LT Info API. It always rebuilds `index.html` and the category READMEs. It leaves existing program pages alone unless you pass `--force`, which restamps every page from the template and overwrites any custom work in them.

## Home page (index.html)

Modeled on the Threshold Dashboard home. It has hash routes, so it works from `file://` and GitHub Pages:

- `#/` shows the 10 category cards, in two columns of five rows beside a site map. Each card uses its category's Threshold Dashboard color and icon, every collapsed card is the same height, and selecting one drops down its programs. Map sites start in their category colors. After the first hover, select, or search, sites rest in gray, and hovering or selecting a category or program colors just its sites. A search box finds programs by name or partner.
- `#/category/{folder}` opens the home page with that category selected.
- `#/all` lists every program in a table.
- `#/about` describes the dashboard.

Program and site data are a snapshot written into the page when the script runs, with the capture date shown under the map. Category colors are the Threshold Dashboard theme colors from `programs.json`.

## Program pages

Each page loads its data live from `internalapi.laketahoeinfo.org` (the program record, sites, partners, indicators, documents, and images) and its measurement charts from the TRPA map service. It shows:

- summary tiles
- a site map, with Legend and Home widgets
- "When monitoring began" and "How current is the record" charts, each with a Chart/Table toggle and CSV download
- partners, threshold indicators, and documents
- the monitoring approach and program description from LT Info
- a filterable sites grid; selecting a row zooms the map to that site
- the program's own dashboard in a frame, when LT Info has a dashboard URL for it

The page changes with how it is opened:

- **Standalone:** the LT Info header, a breadcrumb hero with the key photo, a side nav of the category's programs, and the footer.
- **In an iframe** (the Dashboard card on monitoring.laketahoeinfo.org): no chrome and a `#f7f7f7` background. It posts its height to the parent, per the `ltinfo-platform` embed contract.

## Page templates

Program pages come in three templates. They share the same panels and differ in what leads:

| Template | Use for | Order |
|---|---|---|
| `charts` | Programs with long data records and few mapped sites | measurement charts, map and site charts, partners, text, sites table |
| `map` | Programs with many mapped sites | full-width map, sites table, measurement charts, site charts, text, partners |
| `context` | Programs with little or no data on the page | monitoring approach and description, partners, indicators, and documents, then any dashboard, charts, and map |

Each page names its template near the top of the file, in the PAGE TEMPLATE note and on this line:

```html
<script>const TEMPLATE = 'map';</script>
```

To switch one page, change that word. To preview a template without editing, add `?template=charts` (or `map`, `context`) to the page URL. To keep the change when pages are restamped, also set `"template"` on the program in `programs.json`; `--force` restamps from there. The category READMEs list each program's template.

Current assignments: `charts` for Air Quality, Carbon Monoxide, Stream Habitat Condition, SEZ, Pelagic Water Quality, Periphyton, Congestion-Travel Time, Safety, Transit, and Travel Behavior; `map` for Tahoe Yellow Cress, Stream Bioassessment and Physical Habitat, LTIMP, the three Noise programs, Bicycle and Pedestrian, and Traffic Volumes; `context` for Subalpine Conifer, HAB, Nearshore Human Health, Regional Stormwater, and Socio-Economic.

## Measurement charts from the map service

A program's `measures` list in `programs.json` charts layers and tables from the TRPA [LTInfo_Monitoring map service](https://maps.trpa.org/server/rest/services/LTInfo_Monitoring/MapServer), the service behind the current Monitoring and Threshold dashboards. Pages query it live (it allows GitHub Pages, LT Info, and `file://` origins). Each chart gets the Chart/Table toggle, CSV, a source link to its layer, and an explicit empty or error state.

| Key | Meaning |
|---|---|
| `title`, `sub` | Panel heading and one-line description |
| `layer` | Layer or table ID in the service |
| `where` | Optional SQL filter, for example `"Pollutant = 'CO'"` |
| `x`, `xLabel`, `xType` | X field and label. `xType`: omit for years, `category` for text such as `2016-2019`, `date` for dates, `month` for month numbers |
| `y` | One field name, or a list of `{ "field", "name" }` for several series |
| `yName`, `yLabel`, `format` | Series name, axis title (with units), and `.0%` for shares |
| `stat` | `sum`, `count`, or `avg`, computed on the server grouped by `x`, `seriesBy`, and `pick` |
| `seriesBy`, `seriesLabel`, `seriesNames`, `seriesPrefix` | Split into one series per value of a field, with optional display names |
| `pick`, `pickLabel`, `pickDefault` | Adds a drop-down that filters the chart to one value of a field. It opens on `pickDefault`, or else the choice with the longest record |
| `type` | `line` (default), `bar`, or `stacked` |
| `orientation`, `sort`, `limit` | `h` for horizontal bars, `desc` to rank, and a row cap |
| `standard` | `{ "field" }` or `{ "value" }`, with optional `label`, for a dashed standard line |
| `zero` | `false` to let the value axis start above zero |
| `span` | `span-12` or `span-6`; otherwise charts pair up, and an unpaired last one fills the row |

A program can also set `sitesLayer` (`{ "layer", "name", "code" }`) to draw its map and sites table from a map service layer instead of LT Info, for programs LT Info has no sites for. LTIMP uses layer 33. Those sites have no status or dates, so the site-date charts are left off.

Page titles use the program name in `programs.json`, so a program can be renamed here before it is renamed in LT Info (program 63 is still "Streams" there).

Rerun `scripts/scaffold_programs.py --force` after changing measures or templates.

To add other program-specific sections, fill in `renderCustom(ctx)` in the page's CUSTOM block. Use `chartPanel()` and `wireChart()` so each chart gets the same toggle, table, CSV, and empty state.

Stack: Calcite 2.13.2, Plotly 2.35.2, AG Grid 33.3.2, and ArcGIS Maps SDK 4.31, loaded in that order.
