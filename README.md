# ltinfo-monitoring-dashboard

Program dashboards for the [Lake Tahoe Info Monitoring Dashboard](https://monitoring.laketahoeinfo.org/), the inventory of environmental monitoring programs in the Tahoe Region. Each program gets one single-page HTML file. The file shows what the program monitors, where, by whom, and what the record shows so far. The program's Dashboard card on monitoring.laketahoeinfo.org embeds the file by URL.

## About the dashboard

The dashboard has 36 program pages, grouped under the 10 [Threshold Dashboard](https://thresholds.laketahoeinfo.org/) categories. Each category uses its Threshold Dashboard color and icon.

| Category | Programs |
|---|---|
| Air Quality | 5: ozone, carbon monoxide, oxides of nitrogen, PM2.5, PM10 |
| Fisheries | 1: Stream Bioassessment and Physical Habitat |
| Recreation | none yet |
| Scenic Resources | 1: Scenic Monitoring |
| Soil Conservation | 1: SEZ Basin-wide Monitoring and Assessment Plan |
| Vegetation Preservation | 2: Tahoe Yellow Cress, Subalpine Conifer |
| Water Quality | 11: clarity, periphyton, stormwater, LTIMP streams, nearshore, harmful algae, and aquatic invasive species programs |
| Wildlife | 5: Osprey, Bald Eagle, Peregrine Falcon, Northern Goshawk, Waterfowl |
| Noise | 3: highways, plan areas, shorezone |
| Transportation and Sustainable Communities | 7: bicycle and pedestrian, congestion, safety, socio-economic, traffic volumes, transit, travel behavior |

**Home page** ([index.html](index.html)). It has the category cards beside a map of every monitoring site. Hovering over or selecting a category or program highlights its sites. It also has an All Programs page and an About page.

**Program pages.** Each page is built from one of three templates, chosen by what the program's data supports:

- `map`: leads with a site map and a searchable site list beside it.
- `charts`: leads with measurement charts.
- `context`: for programs with little data so far. It leads with the program's description and approach.

Every page has:

- summary tiles
- a chart of the sites monitored each year
- partners, threshold indicators, and documents
- a table view and a CSV download behind every chart

A page opened on its own shows the LT Info header and navigation. Embedded in an LT Info Dashboard card, it drops that chrome and matches the host page's styling.

**Data sources.** Pages load their data live when they open:

- Measurements, sites, and polygons come from the TRPA [LTInfo_Monitoring map service](https://maps.trpa.org/server/rest/services/LTInfo_Monitoring/MapServer).
- Program descriptions, partners, indicators, documents, and photos come from the Lake Tahoe Info API (`internalapi.laketahoeinfo.org`).

The home page uses a snapshot of the same data. The snapshot is saved into the page each time the build script runs.

## Repo structure

```
programs.json                  source of truth: categories, programs, and each page's charts, maps, and layers
index.html                     home page (generated from templates/index.html; don't edit by hand)
templates/
  program-dashboard.html       template for every program page
  index.html                   template for the home page
  README.md                    how the pages are built and every programs.json option
scripts/
  scaffold_programs.py         builds program pages, index.html, and the category READMEs
<category-folder>/             one folder per Threshold Dashboard category
  <program>.html               one dashboard per program (generated)
  README.md                    list of the category's programs (generated)
EDITING-PROGRAM-PAGES.md       guide for program page owners
CLAUDE.md                      instructions for Claude Code in this repo
.claude/settings.json          TRPA skills for Claude Code
```

The category folders are `air-quality`, `fisheries`, `recreation`, `scenic-resources`, `soil-conservation`, `vegetation-preservation`, `water-quality`, `wildlife`, `noise`, and `transportation-and-sustainable-communities`.

Everything outside `programs.json`, `templates/`, and `scripts/` is generated. To change a page, edit `programs.json` or a template, then run the script.

## Build and publish

Run the script from the repo root with the ArcGIS Pro Python environment:

```
"%LOCALAPPDATA%\ESRI\conda\envs\arcgispro-py3-plotly\python.exe" scripts/scaffold_programs.py
```

- Without flags, it creates pages for new programs and rebuilds `index.html` and the category READMEs.
- `--force` restamps every program page from the template. Use it after you change a template or a program's settings.

The site is published through GitHub Pages. A program page is served at `https://trpa-agency.github.io/ltinfo-monitoring-dashboard/<category-folder>/<program>.html`. The LT Info admin points the program's `DashboardUrl` at it. Run the `trpa-dashboard-qa` checklist before sending a URL to the admin.

## More

- Add a program: add it to `programs.json` and run the script.
- Own a program page? [EDITING-PROGRAM-PAGES.md](EDITING-PROGRAM-PAGES.md) covers what you can change, the chart settings, and what not to touch.
- [templates/README.md](templates/README.md) explains how a page is built and lists every option.
- Claude Code skills come from the TRPA marketplace. Opening the repo in Claude Code prompts you to install them, or run `/plugin marketplace add trpa-agency/trpa-claude-skills`.
