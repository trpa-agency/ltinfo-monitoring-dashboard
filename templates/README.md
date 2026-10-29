# Templates

| File | Builds | Placeholders |
|---|---|---|
| [program-dashboard.html](program-dashboard.html) | Every program page (`<category>/<program>.html`), in one of three page templates | `{{TEMPLATE}}`, `{{PROGRAM_NAME_HTML}}`, `{{CATEGORY_COLOR}}`, `{{PROGRAM_JSON}}` |
| [index.html](index.html) | The home page (`/index.html`) | `{{SNAPSHOT_JSON}}` |

`scripts/scaffold_programs.py` fills the placeholders from `programs.json` and the LT Info API. It always rebuilds `index.html` and the category READMEs. It leaves existing program pages alone unless you pass `--force`, which restamps every page from the template and overwrites any custom work in them.

## Home page (index.html)

Modeled on the Threshold Dashboard home. It has hash routes, so it works from `file://` and GitHub Pages:

- `#/` shows the 10 category cards, in two columns of five rows beside a site map. Each card uses its category's Threshold Dashboard color and icon, every collapsed card is the same height, and selecting one drops down its programs. Map sites start in their category colors. Hovering a category or program colors just its sites and grays the rest, and the last hover stays on the map until you hover something else. Selecting (clicking) a category holds its sites on the map whatever you hover, except that hovering one of its own programs shows that program while the pointer is on it. Clicking blank space closes the open category and returns every site to its category color, as on arrival. Clearing a search leaves every site gray. A search box finds programs by name or partner.
- `#/category/{folder}` opens the home page with that category selected.
- `#/all` lists every program as a card (key photo, partners, mapped sites, partner count, and a Dashboard tag), grouped under each category's color and icon, with a search box, category filter chips, and a CSV download.
- `#/about` describes the dashboard.

Program and site data are a snapshot written into the page when the script runs, with the capture date shown under the map. Category colors are the Threshold Dashboard theme colors from `programs.json`.

## Program pages

Each page loads its data live from `internalapi.laketahoeinfo.org` (the program record, sites, partners, indicators, documents, and images) and its measurement charts from the TRPA map service. It shows:

- summary tiles
- a site map, with Legend and Home widgets and a source line linking the data behind it, and a site list beside it: grouped by status, searchable, with a CSV download. Selecting a site in the list zooms the map to it, and selecting one on the map marks it in the list
- a "Sites monitored each year" chart, with a Chart/Table toggle and CSV download. With `sitesPerYear` set it counts the distinct sites with a record each year in a map service layer; otherwise it counts each LT Info site in every year from its first to its last observation, and is left off when LT Info has no dates
- partners, threshold indicators, and documents
- the monitoring approach and program description from LT Info
- the program's own dashboard in a frame, when LT Info has a dashboard URL for it

The page changes with how it is opened:

- **Standalone:** the LT Info header, a breadcrumb hero with the key photo, a side nav of the category's programs, and the footer.
- **In an iframe** (the Dashboard card on monitoring.laketahoeinfo.org): no chrome and a `#f7f7f7` background. It posts its height to the parent, per the `ltinfo-platform` embed contract.

## Page templates

Program pages come in three templates. They share the same panels and differ in what leads:

| Template | Use for | Order |
|---|---|---|
| `charts` | Programs with long data records and few mapped sites | measurement charts, map and site list, site chart, partners, text |
| `map` | Programs with many mapped sites | a taller map and site list, measurement charts, site chart, text, partners |
| `context` | Programs with little or no data on the page | monitoring approach and description, partners, indicators, and documents, then any dashboard, charts, and map |

Each page names its template near the top of the file, in the PAGE TEMPLATE note and on this line:

```html
<script>const TEMPLATE = 'map';</script>
```

To switch one page, change that word. To preview a template without editing, add `?template=charts` (or `map`, `context`) to the page URL. To keep the change when pages are restamped, also set `"template"` on the program in `programs.json`; `--force` restamps from there. The category READMEs list each program's template.

Current assignments: `charts` for the five air quality programs (Ozone, Carbon Monoxide, Oxides of Nitrogen, PM2.5, and PM10), Pelagic Water Quality, Periphyton, Congestion-Travel Time, Safety, Transit, and Travel Behavior; `map` for SEZ, Tahoe Yellow Cress, Stream Bioassessment and Physical Habitat, LTIMP, the three Noise programs, Bicycle and Pedestrian, and Traffic Volumes; `context` for Subalpine Conifer, HAB, Nearshore Human Health, Regional Stormwater, and Socio-Economic.

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
| `standard` | `{ "field" }` or `{ "value" }`, with optional `label`, for a dashed threshold line, labeled "Threshold" unless `label` is set |
| `zero` | `false` to let the value axis start above zero |
| `span` | `span-12` or `span-6`; otherwise charts pair up, and an unpaired last one fills the row |
| `xNames` | Display names for x values, such as habitat codes: `{ "KMC": "Klamath mixed conifer" }` |
| `unpivot` | `{ "prefix": "NTU" }` for tables with one column per year (`NTU2015`, `NTU2016`). Each becomes a row with the year in `x` and the value in `y` (name both, for example `"x": "Year", "y": "value"`) |

Dates stored as `M/D/YYYY` text are read as dates when `xType` is `date`.

A program can instead set `mapLayer` to map a polygon layer from the service, such as the SEZ assessment units (layer 106). The map colors each area by a field, the list beside it groups the areas the same way, and selecting one zooms to it. The map panel's CSV downloads the areas shown.

| `mapLayer` key | Meaning |
|---|---|
| `layer`, `title` | Layer ID and the layer's name on the map and legend |
| `unit`, `unitPlural` | What one area is called: `assessment unit`, `Assessment units` |
| `name` | Field to show as each area's name |
| `geometry` | `line` for routes and road segments; polygons otherwise |
| `list` | `false` for areas with no names worth listing (such as submerged aquatic vegetation); the map fills the panel |
| `countAsSites` | `false` to draw the areas on the home page map without counting them as mapped sites |
| `colorBy`, `colorByLabel`, `colors`, `labels` | Optional. Field to color by, its legend title, a color for each value (values without one are not drawn), and optional display names. Without `colorBy`, everything is drawn in the category color |
| `pick`, `pickLabel` | Adds a drop-down that shows one value of a field at a time, latest first, such as the evaluation year |
| `where` | Optional SQL filter |
| `meta` | Fields on the second line of each list row: `[{ "field", "suffix" }]` |
| `fields` | Fields in the popup and the CSV: `[{ "field", "label" }]` |

The page uses `mapLayer` in place of LT Info sites. SEZ (layer 106), Congestion (travel time segments, layer 109), and Transit (routes, layer 2) use it. The home page map draws the areas and lines too, in the category color, for the latest `pick` value (2023 for SEZ), and counts each area as a mapped site.

`sitesPerYear` (`{ "layer", "year", "site", "where", "extract", "unit" }`) names the layer, year field, and site field to count sites per year from. Set `extract: true` when the year field is a date, so the server groups by its year. `unit` renames what is counted (`station`, `counter`, `segment`).

`overlays` (`[{ "layer", "title", "name", "geometry", "color", "where", "fields" }]`) draws other map service layers under a program's sites or areas, as reference, with a legend entry and popup but no list. `geometry` is `point`, `line`, or `fill`. Examples: scenic viewpoints on Scenic Monitoring, the 2024 lake level on Tahoe Yellow Cress, the winter count site on Traffic Volumes, and the congestion road segments on Congestion.

Programs with no LT Info record set `"ltinfo": false` and give their own `description` (and optional `approach`) text. They skip the LT Info API. Their `id` is 9000 plus their main layer, so it never collides with an LT Info ID.

Site locations come from the map service too: a program's `sitesLayer` draws its map, site list, and home page points from a service layer instead of LT Info. Programs without one (Safety, Regional Stormwater, and the programs with no data yet) still use LT Info sites.

| `sitesLayer` key | Meaning |
|---|---|
| `layer`, `name`, `code` | Layer ID, the site name field, and an optional site ID field |
| `year` | Year field, for layers with one feature per site per year. Sites are collapsed to one point each (keyed by `code`, else `name`) at the latest location, with first and last year from this field |
| `status` | Optional field to group and color sites by, such as `STATION_TYPE` or `SiteClass` |
| `active` | Optional 1/0 field for the Active sites tile, such as `Active_2023` |
| `where`, `unit` | Optional SQL filter (Tahoe Yellow Cress keeps `STATUS = 'Surveyed'`) and what a site is called (`station`, `counter`) |

Page titles use the program name in `programs.json`, so a program can be renamed here before it is renamed in LT Info (program 63 is still "Streams" there).

Rerun `scripts/scaffold_programs.py --force` after changing measures or templates.

To add other program-specific sections, fill in `renderCustom(ctx)` in the page's CUSTOM block. Use `chartPanel()` and `wireChart()` so each chart gets the same toggle, table, CSV, and empty state.

Stack: Calcite 2.13.2, Plotly 2.35.2, AG Grid 33.3.2, and ArcGIS Maps SDK 4.31, loaded in that order.
