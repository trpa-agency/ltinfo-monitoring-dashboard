# ltinfo-monitoring-dashboard

Program dashboards for the [Lake Tahoe Info Monitoring Dashboard](https://monitoring.laketahoeinfo.org/). Each program gets one single-page HTML file, organized by [Threshold Dashboard](https://thresholds.laketahoeinfo.org/) category, which the program's Dashboard card embeds by URL.

```
index.html                      main page linking every program dashboard (generated)
programs.json                   categories and programs: edit this to add a program
templates/                      program-dashboard.html and index.html templates
scripts/scaffold_programs.py    builds new program pages, category READMEs, and index.html
<category>/<program>.html       one dashboard per program
.claude/settings.json           TRPA skills for Claude Code (trpa-agency/trpa-claude-skills)
```

Claude Code skills come from the TRPA marketplace. Opening the repo in Claude Code prompts you to install them, or run `/plugin marketplace add trpa-agency/trpa-claude-skills`.

Add a program: add it to `programs.json`, then run

```
"%LOCALAPPDATA%\ESRI\conda\envs\arcgispro-py3-plotly\python.exe" scripts/scaffold_programs.py
```

See [templates/README.md](templates/README.md) for how a program page is built out.

Own a program page? [EDITING-PROGRAM-PAGES.md](EDITING-PROGRAM-PAGES.md) covers updating one: what to change in `programs.json`, the chart settings, running the script, and what not to touch.
