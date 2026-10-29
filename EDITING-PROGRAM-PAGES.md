# Editing a program page

This guide is for the person who owns one program's dashboard page and wants to update it: change its charts, layout, or title, or add a section. You don't need to know JavaScript for most changes. Nearly everything is a setting in one file, `programs.json`.

## How a program page works

Each program has one HTML page, for example [fisheries/stream-bioassessment.html](fisheries/stream-bioassessment.html). The page is not written by hand. A script stamps it from a shared template, [templates/program-dashboard.html](templates/program-dashboard.html), using that program's settings in [programs.json](programs.json).

The page holds no numbers of its own. It loads everything live each time someone opens it, from two places:

| Content on the page | Where it comes from | Where you change it |
|---|---|---|
| Program description, monitoring approach, partners, documents, threshold indicators, key photo | LT Info program record (`internalapi.laketahoeinfo.org`) | In the LT Info CMS, not in this repo |
| Monitoring sites on the map and in the site list beside it | The map service layer in `sitesLayer` (or `mapLayer`); LT Info sites only for programs without one | `programs.json`, or the map service data |
| Measurement charts | TRPA `LTInfo_Monitoring` map service | `programs.json` (`measures`) for the chart setup; the map service for the data itself |
| Page layout | The page's template (`charts`, `map`, or `context`) | `programs.json` (`template`) |
| Page title | `programs.json` (`name`) | `programs.json` |

So if a partner is missing or the description is out of date, fix it in LT Info. The page picks it up the next time it loads. If a chart shows old data, the map service layer needs updating. The page itself doesn't change.

## What you need

- A clone of this repo and a branch to work on.
- The ArcGIS Pro Python environment. Other Python installs may work but aren't tested:
  ```
  "%LOCALAPPDATA%\ESRI\conda\envs\arcgispro-py3-plotly\python.exe"
  ```
- A text editor. VS Code will flag a broken `programs.json` (a missing comma or bracket) as you type.
- Optional: Claude Code with the TRPA skills. The repo prompts you to install them, or run `/plugin marketplace add trpa-agency/trpa-claude-skills`.

## The basic workflow

1. Find your program in `programs.json`. Search for its LT Info ID or file name.
2. Make your change (see the recipes below).
3. Restamp the pages from the repo root:
   ```
   "%LOCALAPPDATA%\ESRI\conda\envs\arcgispro-py3-plotly\python.exe" scripts/scaffold_programs.py --force
   ```
   This rebuilds every program page, the category READMEs, and `index.html`. It takes about a minute because it also pulls a fresh snapshot from LT Info for the home page. You need `--force` because without it, the script only creates pages that don't exist yet.
4. Open your page in a browser by double-clicking the HTML file. It works from your disk, with no server needed. Check the charts, the Table view, and the CSV button.
5. Commit your branch and open a pull request. Include `programs.json`, your page, and any other files the script changed. Once it's merged, GitHub Pages serves the page at:
   ```
   https://trpa-agency.github.io/ltinfo-monitoring-dashboard/<category-folder>/<file>.html
   ```

`--force` restamps every page, not just yours, so other pages will show up as changed in git if the template changed since they were last stamped. That's expected, because all pages are generated. The one case that loses work is described under [Custom sections](#custom-sections-advanced).

## Recipes

### Change the layout

There are three templates. All of them have the same panels; what differs is what comes first.

| Template | Use for | Leads with |
|---|---|---|
| `charts` | Long data records, few mapped sites | Measurement charts |
| `map` | Many mapped sites | A taller map and the site list |
| `context` | Little or no data on the page | Monitoring approach, description, partners, documents |

To try one without changing anything, add `?template=map` (or `charts`, `context`) to the end of the page's address in your browser.

To make it stick, set `"template"` on your program in `programs.json` and restamp. Each page also shows its template near the top of the file, on the line `<script>const TEMPLATE = 'map';</script>`. You can edit that line for a quick test, but the next restamp resets it to what `programs.json` says.

### Rename the program

Change `"name"` in `programs.json` and restamp. The page title, the breadcrumb, and the home page all use it. LT Info keeps its own name for the program, so ask the LT Info admin to rename it there too.

### Add, change, or remove a chart

Charts are the `measures` list on your program. Each entry is one chart panel. Here is a real one from Stream Bioassessment:

```json
{ "title": "Condition score by site",
  "sub": "CSCI score each year the site was sampled, for trend and reference sites. Choose a site.",
  "layer": 8,
  "where": "STATION_TYPE IN ('Trend', 'Trend Panel A', 'Trend Panel B', 'Reference')",
  "x": "YEAR_OF_COUNT", "y": "COUNT_VALUE",
  "yName": "CSCI score", "yLabel": "CSCI score",
  "pick": "SITE_NAME", "pickLabel": "Site",
  "span": "span-12" }
```

In plain terms: chart layer 8 of the map service, keeping only trend and reference sites. Put year on the x axis and score on the y axis. Add a drop-down to choose one site, and make the panel full width.

- **To add a chart,** copy an entry that looks close to what you want, change the fields, and restamp. The [measures reference](#measures-reference) lists every setting.
- **To remove a chart,** delete its entry. Watch the commas: entries are separated by commas, and the last one has none after it.
- **To reorder charts,** reorder the entries.
- **If your program has no `measures`,** add the key: `"measures": [ { ... } ]`.

Every chart automatically gets a Chart/Table toggle, a CSV download, a source link to its layer, and a message when there's no data or the service is down. You don't build any of that yourself.

### Common chart tweaks

| You want to | Set |
|---|---|
| Show only some records | `"where": "Pollutant = 'CO'"`. This is a SQL filter run by the map service; text values go in single quotes. |
| Let readers choose a site, station, or statistic | `"pick": "<field>", "pickLabel": "Site"`. Add `"pickDefault": "<value>"` to choose which option it opens on; otherwise it opens on the option with the most data. |
| One line or bar per site, type, or panel | `"seriesBy": "<field>", "seriesLabel": "Site type"`. Use `"seriesNames": { "A": "Panel A" }` to rename values in the legend. |
| Bars instead of lines | `"type": "bar"`, or `"type": "stacked"` for stacked bars |
| Average, total, or count per year | `"stat": "avg"`, `"sum"`, or `"count"`. The service does the math, grouped by `x` and any `seriesBy` and `pick`. For a count, use `"y": "OBJECTID"`. |
| Show the threshold line | `"standard": { "field": "Threshold_Value" }` when the value is in the data, or `{ "value": 6 }` when it isn't. The line is labeled "Threshold"; add `"label"` to say more, such as `"AQ1 threshold"`. |
| Show shares as percents | `"format": ".0%"` |
| Let the axis start above zero | `"zero": false` (good for lake level or elevation) |
| Full-width or half-width panel | `"span": "span-12"` or `"span-6"`. Without a span, charts pair up two to a row. |
| Rank categories in horizontal bars | `"orientation": "h", "sort": "desc", "limit": 15` |

### Draw the map from a map service layer

Most programs draw their sites from a layer in the map service. Tahoe Yellow Cress, for example:

```json
"sitesLayer": { "layer": 9, "name": "SITE_NAME", "year": "YEAR_OF_COUNT", "where": "STATUS = 'Surveyed'" }
```

`name` is the field to show as the site name. Many layers hold one record per site per year; `year` tells the page to collapse those to one point per site and read each site's first and last year. Other keys (`code`, `status`, `active`, `unit`) are listed in [templates/README.md](templates/README.md#measurement-charts-from-the-map-service).

### Programs with no LT Info record

A program that LT Info doesn't have (Watercraft Inspections, Submerged Aquatic Vegetation) sets `"ltinfo": false` and writes its own one-paragraph `description` in `programs.json`. Give it an `id` of 9000 plus its main layer number.

### Extra map layers

To show another service layer on your map as reference, add it to `overlays`. Tahoe Yellow Cress, for example, shows the 2024 lake level. The keys are listed in [templates/README.md](templates/README.md#measurement-charts-from-the-map-service).

### Map areas instead of sites

For a polygon layer, such as SEZ assessment units, use `mapLayer`. The map colors each area by a field, the list beside it groups areas the same way, and an optional drop-down switches between values such as evaluation years. The SEZ program is the working example; copy its `mapLayer` from `programs.json` and change the fields. Every key is listed in [templates/README.md](templates/README.md#measurement-charts-from-the-map-service).

## Measures reference

| Key | Required | Meaning |
|---|---|---|
| `title` | yes | Panel heading. Keep it short and plain: "Average stream condition score". |
| `sub` | yes | One sentence under the heading: what is shown, and units if the service doesn't state them. If there's a drop-down, end with "Choose a site." |
| `layer` | yes | Layer or table number in the [LTInfo_Monitoring map service](https://maps.trpa.org/server/rest/services/LTInfo_Monitoring/MapServer) |
| `x` | yes | Field for the x axis, usually a year |
| `xType` | | Leave it out for years. Use `category` for text such as `2016-2019`, `date` for dates, or `month` for month numbers 1 to 12. |
| `xLabel` | | X axis title. Without it the axis has no title and the table column reads "Year", so set it whenever x isn't a year. |
| `y` | yes | Field for the values. For several series from different fields, use a list instead: `[{ "field": "TP", "name": "Phosphorus" }, ...]`. |
| `yName` | | Series name in the legend and table |
| `yLabel` | | Y axis title, with units: "Concentration (mg/L)" |
| `format` | | `.0%` for shares |
| `stat` | | `sum`, `count`, or `avg`, computed on the server |
| `where` | | SQL filter on the layer |
| `seriesBy`, `seriesLabel`, `seriesNames`, `seriesPrefix` | | Split into one series per value of a field, with optional display names or a prefix |
| `pick`, `pickLabel`, `pickDefault` | | A drop-down that filters the chart to one value of a field |
| `type` | | `line` (default), `bar`, or `stacked` |
| `orientation`, `sort`, `limit` | | `h` for horizontal bars, `desc` to rank, and a cap on bars shown |
| `standard` | | `{ "field" }` or `{ "value" }`, with optional `label`, for a dashed threshold line, labeled "Threshold" unless `label` is set |
| `zero` | | `false` to let the value axis start above zero |
| `span` | | `span-12` (full width) or `span-6` (half) |

### Finding layer numbers and field names

1. Open the [map service directory](https://maps.trpa.org/server/rest/services/LTInfo_Monitoring/MapServer) and find your layer or table. The number in parentheses is the `layer`.
2. Open the layer. The Fields list gives the exact field names, and you need to match their capitalization: `YEAR_OF_COUNT`, not `Year_of_count`.
3. To test a filter before you use it, open the layer's Query link at the bottom of the page. Put your `where` text in the Where box, `*` in Out Fields, choose Format HTML, and run it. If it returns the rows you expect, it will work on the page.

If the data you need isn't in the service yet, ask TRPA GIS to publish it there. The pages can only chart what the service holds.

## Custom sections (advanced)

For something `measures` can't do, such as a different chart type or a combined view, each page has an empty `renderCustom(ctx)` function in its CUSTOM block. Code you write there runs after the standard panels. Build panels with `chartPanel()` and `wireChart()` so they get the same Chart/Table toggle, CSV, and empty state as everything else.

> **Warning:** code you write in a program page is overwritten the next time anyone runs the script with `--force`, and `--force` is how every `programs.json` change gets applied. Before you add custom code, talk to the repo maintainer about a safe place for it, and keep a copy. Wherever you can, use `programs.json` instead.

## What not to edit

- **`index.html`** at the repo root. The script generates it. Change `templates/index.html` instead.
- **The shared template, `templates/program-dashboard.html`.** A change there reaches every program page at the next restamp. If you need a template change, coordinate it with the repo maintainer.
- **Styling.** Pages must look like monitoring.laketahoeinfo.org when they are embedded there: Lexend Deca, a `#f7f7f7` background, LT Info colors, and no TRPA or EIP branding. The template already does this, so don't override colors or fonts in a page.
- **Other programs' entries** in `programs.json`, unless you've agreed it with their owners.

## Before you publish

- Open the page from disk and check that every chart loads, the Table view and CSV work, and the drop-downs offer sensible choices.
- Narrow the browser window to phone width and make sure nothing spills off the side.
- Run the `trpa-dashboard-qa` skill in Claude Code before sending a URL to the LT Info admin.
- To put the page in the Dashboard card on LT Info, send the GitHub Pages URL to the LT Info admin. They set it as the program's `DashboardUrl`.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| The script stops with a JSON error | A missing or extra comma, bracket, or quote in `programs.json`. The error gives the line number. |
| The script says `template must be one of charts, map, context` | A typo in `"template"` |
| A chart says "Data could not be loaded" | Usually a misspelled field name or a bad `where`, not an outage. Press F12, open the Console tab, and reload; the warning names the chart and the real error. |
| A chart says "No ... data loaded yet" | The `where` filter matched nothing, or the layer is empty. Test it on the layer's Query page. |
| A drop-down is missing options | Your `where` filter is excluding them, or the field is blank on those records |
| The page didn't change after editing `programs.json` | You didn't rerun the script, or you ran it without `--force` |
| "Python was not found" | Use the full path to the ArcGIS Pro Python shown above, not `python`. |
| Partners, description, or photos are wrong | They come from LT Info. Fix them in the CMS. |
