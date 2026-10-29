"""Build the monitoring dashboard repo from programs.json.

- Stamps templates/program-dashboard.html into <category-folder>/<program-file>.html for each
  program. Existing program pages are left alone unless --force is passed, so pages that have
  been built out are safe.
- Pulls a snapshot of programs and sites from the LT Info API and writes index.html from
  templates/index.html with that snapshot inlined, so the home page opens from disk.
- Regenerates each category folder's README.

Run with the ArcGIS Pro Python env:
    "%LOCALAPPDATA%\\ESRI\\conda\\envs\\arcgispro-py3-plotly\\python.exe" scripts/scaffold_programs.py [--force]
"""
import argparse
import datetime
import html
import json
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
API = "https://internalapi.laketahoeinfo.org"
SERVICE = "https://maps.trpa.org/server/rest/services/LTInfo_Monitoring/MapServer"
# Page layouts in templates/program-dashboard.html: chart-heavy, map-focused, context-heavy.
TEMPLATES_ALLOWED = ("charts", "map", "context")


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def get(route, fallback):
    try:
        with urllib.request.urlopen(f"{API}{route}", timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:  # a missing route should not stop the build
        print(f"  skipped {route}: {exc}")
        return fallback


def script_json(obj):
    """JSON safe to inline in a <script> block."""
    return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")


def stamp_program(template, category, program, force):
    out = ROOT / category["folder"] / program["file"]
    if out.exists() and not force:
        return False
    config = {
        "id": program["id"],
        "name": program["name"],
        "category": category["name"],
        "categoryFolder": category["folder"],
        "categoryColor": category["themeColor"],
        "siblings": [{"id": p["id"], "name": p["name"], "file": p["file"]} for p in category["programs"]],
        # Charts of LTInfo_Monitoring map service layers; keys are documented in templates/README.md.
        "measures": program.get("measures", []),
        # Map service layer to draw sites from when LT Info has none for the program.
        "sitesLayer": program.get("sitesLayer"),
    }
    layout = program.get("template", "charts")
    if layout not in TEMPLATES_ALLOWED:
        raise SystemExit(f"Program {program['id']}: template must be one of {', '.join(TEMPLATES_ALLOWED)}, not {layout!r}")
    page = (template
            .replace("{{TEMPLATE}}", layout)
            .replace("{{PROGRAM_NAME_HTML}}", html.escape(program["name"]))
            .replace("{{CATEGORY_COLOR}}", category["themeColor"])
            .replace("{{PROGRAM_JSON}}", script_json(config)))
    write(out, page)
    return True


def service_sites(cfg):
    """[lat, lon, name] points from a LTInfo_Monitoring map service layer ({layer, name})."""
    query = urllib.parse.urlencode({"where": "1=1", "outFields": cfg["name"], "outSR": 4326, "returnGeometry": "true", "f": "json"})
    try:
        with urllib.request.urlopen(f"{SERVICE}/{cfg['layer']}/query?{query}", timeout=60) as resp:
            feats = json.loads(resp.read().decode("utf-8")).get("features") or []
    except Exception as exc:
        print(f"  skipped sites layer {cfg['layer']}: {exc}")
        return []
    return [[round(f["geometry"]["y"], 5), round(f["geometry"]["x"], 5), f["attributes"].get(cfg["name"])]
            for f in feats if f.get("geometry")]


def program_snapshot(args):
    category, program, summary = args
    pid = program["id"]
    record = get(f"/monitoring-programs/{pid}", {})
    geo = get(f"/monitoring-programs/{pid}/sites-as-feature-collection", {})
    partners = get(f"/monitoring-programs/{pid}/partners", [])
    sites = []
    if program.get("sitesLayer"):
        sites = service_sites(program["sitesLayer"])
    for feat in [] if sites else geo.get("features") or []:
        geom = feat.get("geometry") or {}
        coords = geom.get("coordinates") or []
        if geom.get("type") == "Point" and len(coords) >= 2:
            sites.append([round(coords[1], 5), round(coords[0], 5), (feat.get("properties") or {}).get("MonitoringSiteName")])
    dashboard = record.get("Dashboard") or {}
    return {
        "id": pid,
        "name": program["name"],
        "shortName": summary.get("ShortName") or program["name"],
        "folder": category["folder"],
        "href": f"{category['folder']}/{program['file']}",
        "featured": bool(summary.get("IsFeaturedProgram")),
        "type": record.get("MonitoringProgramTypeDisplayName") or summary.get("MonitoringProgramTypeDisplayName"),
        "hasDashboard": record.get("MonitoringProgramTypeID") == 6 or bool(dashboard.get("DashboardUrl")),
        "keyImage": record.get("KeyImageFileResourceGUID") or summary.get("KeyPhotoFileResourceInfoGUID"),
        "partners": [p.get("OrganizationName") for p in partners if isinstance(p, dict) and p.get("OrganizationName")],
        "sites": sites,
    }


def build_snapshot(categories):
    summaries = {p["MonitoringProgramID"]: p for p in get("/monitoring-programs", [])}
    threshold_cats = {c["ThresholdCategoryID"]: c for c in get("/threshold-categories", [])}
    jobs = [(c, p, summaries.get(p["id"], {})) for c in categories for p in c["programs"]]
    print(f"Pulling {len(jobs)} programs from {API}")
    with ThreadPoolExecutor(max_workers=8) as pool:
        programs = list(pool.map(program_snapshot, jobs))
    return {
        "captured": datetime.date.today().isoformat(),
        # apiName names the Threshold Dashboard icon; description is the text its category tiles show on hover.
        "categories": [{"id": c["thresholdCategoryId"], "name": c["name"], "folder": c["folder"], "color": c["themeColor"],
                        "apiName": threshold_cats.get(c["thresholdCategoryId"], {}).get("ThresholdCategoryName", ""),
                        "description": threshold_cats.get(c["thresholdCategoryId"], {}).get("ThresholdCategoryDescription", "")}
                       for c in categories],
        "programs": programs,
    }


def category_readme(category):
    lines = [f"# {category['name']}", "",
             f"Threshold category {category['thresholdCategoryId']}. "
             "One single-page dashboard per monitoring program, built from "
             "[templates/program-dashboard.html](../templates/program-dashboard.html).", ""]
    if category["programs"]:
        lines += ["| Program | LT Info ID | Template | Page |", "|---|---|---|---|"]
        lines += [f"| {p['name']} | {p['id']} | {p.get('template', 'charts')} | [{p['file']}]({p['file']}) |" for p in category["programs"]]
    else:
        lines.append("No monitoring programs are assigned to this category yet. "
                     "Add one to programs.json and rerun scripts/scaffold_programs.py.")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--force", action="store_true", help="restamp program pages that already exist")
    args = parser.parse_args()

    categories = json.loads((ROOT / "programs.json").read_text(encoding="utf-8"))["categories"]
    template = (TEMPLATES / "program-dashboard.html").read_text(encoding="utf-8")

    stamped = 0
    for c in categories:
        for p in c["programs"]:
            stamped += stamp_program(template, c, p, args.force)
        write(ROOT / c["folder"] / "README.md", category_readme(c))

    snapshot = build_snapshot(categories)
    index = (TEMPLATES / "index.html").read_text(encoding="utf-8").replace("{{SNAPSHOT_JSON}}", script_json(snapshot))
    write(ROOT / "index.html", index)

    n_sites = sum(len(p["sites"]) for p in snapshot["programs"])
    print(f"{stamped} program pages stamped; index.html written with {len(snapshot['programs'])} programs and {n_sites} mapped sites.")


if __name__ == "__main__":
    main()
