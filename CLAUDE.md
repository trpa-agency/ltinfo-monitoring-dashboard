# LT Info Monitoring Dashboard

Single-page HTML dashboards that embed in the Dashboard card of each program page on https://monitoring.laketahoeinfo.org/. Published through GitHub Pages; the LT Info admin points each program's `DashboardUrl` at its page.

## Layout

- `programs.json`: source of truth for categories (the 10 Threshold Dashboard categories) and the programs in each.
- `<category-folder>/<program>.html`: one self-contained dashboard per program. Each folder has a generated README.
- `templates/`: `program-dashboard.html` (program pages) and `index.html` (main page).
- `scripts/scaffold_programs.py`: stamps new program pages (`--force` restamps all), pulls the API snapshot into `index.html`, and regenerates the category READMEs.
- `index.html`: home page (category cards, site map, All Programs, About). Program pages are standalone pages that drop their chrome when embedded in the LT Info Dashboard card.
- `.claude/settings.json`: registers the `trpa-agency/trpa-claude-skills` plugin marketplace and enables the skills this repo uses. Claude Code prompts to install them when you trust the folder; or run `/plugin marketplace add trpa-agency/trpa-claude-skills`.

## Required skills for HTML

Before writing or editing any HTML in this repo (program pages, templates, index), load all four skills:

1. `trpa-brand:trpa-brand`
2. `trpa-monitoring-dashboard:trpa-monitoring-dashboard`
3. `ltinfo-platform:ltinfo-platform`
4. `trpa-dashboard-stack:trpa-dashboard-stack`

Where they conflict on visual styling inside an LT Info embed (colors, fonts, card look), the LT Info host tokens in `ltinfo-platform` and `trpa-monitoring-dashboard` win, because embeds must match monitoring.laketahoeinfo.org. Apply `trpa-brand` for writing style, tone, and anything not covered by the LT Info tokens.

## Conventions

- Python: use the ArcGIS Pro env `%LOCALAPPDATA%\ESRI\conda\envs\arcgispro-py3-plotly\python.exe`.
- Program pages use one of three templates (`charts`, `map`, `context`), set by `"template"` in `programs.json` and shown on the `const TEMPLATE` line at the top of each page. See [templates/README.md](templates/README.md).
- Measurement charts come from the TRPA `LTInfo_Monitoring` map service via each program's `measures` in `programs.json`.
- To add a program, add it to `programs.json` and run the scaffold script. Do not hand-edit `index.html`; edit `templates/index.html`.
- Program pages follow the embed contract in the `ltinfo-platform` and `trpa-monitoring-dashboard` skills: no chrome, `#f7f7f7` background, Lexend Deca, host styling (not TRPA or EIP brand), table plus CSV behind every chart, explicit empty states, and height posting.
- Run `trpa-dashboard-qa` before sending a URL to the LT Info admin.
