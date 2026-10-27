# Templates

| File | Builds | Placeholders |
|---|---|---|
| [program-dashboard.html](program-dashboard.html) | Every program page (`<category>/<program>.html`) | `{{PROGRAM_NAME_HTML}}`, `{{CATEGORY_COLOR}}`, `{{PROGRAM_JSON}}` |
| [index.html](index.html) | The home page (`/index.html`) | `{{SNAPSHOT_JSON}}` |

`scripts/scaffold_programs.py` fills the placeholders from `programs.json` and the LT Info API. It always rebuilds `index.html` and the category READMEs. It leaves existing program pages alone unless you pass `--force`, which restamps every page from the template and overwrites any custom work in them.

## Home page (index.html)

Modeled on the Threshold Dashboard home. It has hash routes, so it works from `file://` and GitHub Pages:

- `#/` shows the 10 category cards, in two columns of five rows beside a site map. Each card uses its category's Threshold Dashboard color and icon, every collapsed card is the same height, and selecting one drops down its programs. Map sites show gray until you hover or select a category or program, which colors its sites. A search box finds programs by name or partner.
- `#/category/{folder}` opens the home page with that category selected.
- `#/all` lists every program in a table.
- `#/about` describes the dashboard.

Program and site data are a snapshot written into the page when the script runs, with the capture date shown under the map. Category colors are the Threshold Dashboard theme colors from `programs.json`.

## Program pages

Each page loads its data live from `internalapi.laketahoeinfo.org`: the program record, sites, partners, indicators, documents, and images. It shows:

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

To add program-specific measurement charts, fill in `renderCustom(ctx)` in the page's CUSTOM block. Use `chartPanel()` and `wireChart()` so each chart gets the same toggle, table, CSV, and empty state.

Stack: Calcite 2.13.2, Plotly 2.35.2, AG Grid 33.3.2, and ArcGIS Maps SDK 4.31, loaded in that order.
