# Docker for the spoke

Docker's job here is reproducibility: the same Node, the Ecology hub at the same commit, the sibling-folder convention satisfied inside the image, and no Python. `npm run dev` on bare Node still works if `../ecology` is checked out at the commit in `ecology.ref` with its tokens built.

Files: `Dockerfile` (stages base, hub, deps, dev, build, preview), `compose.yaml` (services web, preview, doctor), `.dockerignore`, `nginx/default.conf`. CI does not use Docker; `.github/workflows/deploy.yml` runs the same npm steps on a runner with the same sibling layout, with the test, type, and contrast gates ahead of the build (see Deploy below).

Status: no image has been built and no container has run yet. Docker Desktop's engine is down on the TRPA machine (see Windows notes), so `nginx/default.conf` has not been loaded on a machine with a working engine. `docker compose config --quiet` passes, which checks the compose file but not the stages or the nginx config. Running the stack is Phase 1 exit item 9 in `docs/v2-framework-plan.md`.

## Run

| Command | What you get |
|---|---|
| `docker compose up web` | Dev server with hot reload at http://localhost:4331/. The host dev server uses 4330, which is why the container maps to 4331. |
| `docker compose up preview` | Production build behind nginx at http://localhost:8080/, which redirects to http://localhost:8080/ltinfo-monitoring-dashboard/, the subpath the site will have at the Pages root from Phase 5. The preview image bakes `dist/` in at build time, so a source edit shows only after `docker compose build preview` and then `docker compose up preview`. |
| `docker compose run --rm doctor` | The hub's `doctor.mjs` run inside the image. Three checks fail there by design (git identity, gh CLI, Claude plugin), and the detached hub checkout shows as a warning. The checks that matter are node, git, hub sibling, hub tokens built, and spoke dependencies installed. |
| `docker compose build` | Rebuild every stage. Needed after a change to `package.json`, `package-lock.json`, or `ecology.ref`, and for the preview service after any source change. |
| `docker compose down -v` | Stop and drop the `spoke_node_modules` volume. Run this before `up web` after a dependency change, or the container keeps the old `node_modules`. |

The first build clones the hub and runs `npm ci` twice, so it takes a few minutes. Later builds reuse those layers until `ecology.ref` or a lockfile changes.

The build context is trimmed by `.dockerignore`. Besides installs and caches it leaves out the legacy site that main carries beside the spoke until Phase 5: the ten category folders, `templates/`, `scripts/scaffold_programs.py`, `index.html`, and the root Markdown files. None of those feed the Astro build, which reads `programs.json`, `src/`, and `public/`.

## Deploy

The GitHub Pages site for this repo serves the `main` branch root at https://trpa-agency.github.io/ltinfo-monitoring-dashboard/. That is the live legacy dashboard, and every `DashboardUrl` in the LT Info admin points at a page under it, so nothing may replace it before Phase 5. The spoke therefore publishes to a staging path on the same site.

`.github/workflows/deploy.yml` runs on a push to the `v2` branch, by hand (workflow_dispatch), and nightly at 11:00 UTC. The build job checks out `v2` and the hub side by side, installs both, runs `npm test`, `npm run typecheck`, and `npm run check:contrast`, and then builds with `NODE_ENV=production` and `SITE_BASE=/ltinfo-monitoring-dashboard/v2/`. The publish job checks out `main`, replaces its `v2/` folder with the build, makes sure `.nojekyll` exists at the root (Jekyll would otherwise skip Astro's `_astro/` folder), and commits to `main` as `github-actions[bot]` when anything changed. The result is https://trpa-agency.github.io/ltinfo-monitoring-dashboard/v2/, with program pages at `v2/<folder>/<program>.html`. Pages settings do not change.

After the push, `scripts/check-urls.mjs` runs twice: the staging set (`v2/index.html` plus one URL per program in `programs.json`, with retries while Pages publishes the commit) and the legacy set at the root. If any legacy page stops answering 200 the job fails. The same script works locally:

```
npm run check:urls                      # the live legacy set
npm run check:urls -- --prefix v2       # the staging set
npm run check:urls -- --list            # print the URLs, no requests
npm run check:urls -- --base http://127.0.0.1:4332/ltinfo-monitoring-dashboard --prefix v2
```

The last line checks a local preview of the staging build: `npm run build` with the two variables above, then `npx astro preview --host 127.0.0.1 --port 4332` with the same variables set, because `astro preview` reads `astro.config.mjs` and needs the same base the build used.

Two GitHub rules apply:

- The publish job pushes to `main` with the workflow's default token. If `main` becomes a protected branch, that token cannot push; add a `DEPLOY_TOKEN` repository secret holding a fine-grained personal access token for this repo with Contents read and write, from an account allowed to bypass the protection. The workflow uses the secret when it exists and the default token otherwise.
- Scheduled workflows run only from the default branch, so the nightly run fires once a copy of `deploy.yml` is on `main`; the build still checks out `v2`. GitHub also disables a schedule after 60 days without repository activity. Re-enable it under Actions, or push a commit.

Phase 5 replaces this flow: Pages switches to the GitHub Actions source, the workflow triggers on `main`, builds with the root base (no `SITE_BASE`), and deploys `dist/` through `actions/upload-pages-artifact` and `actions/deploy-pages`. The Docker preview service already mirrors that shape, which is why it serves `/ltinfo-monitoring-dashboard/` and not `/ltinfo-monitoring-dashboard/v2/`.

## Windows notes

- Use Docker Desktop with the WSL2 backend (Settings, General, "Use the WSL 2 based engine").
- Bind mounts from `C:\` do not forward file change events into the container. The dev stage sets `CHOKIDAR_USEPOLLING=1` and `CHOKIDAR_INTERVAL=1000`, so Vite and Astro poll once a second. Edits show up within about a second. Keeping the clone inside the WSL filesystem (for example `\wsl$\Ubuntu\home\you\GitHub`) makes `astro dev` several times faster; under `Documents\GitHub` it works with polling.
- Neither this folder nor `../ecology` may live in OneDrive. OneDrive breaks the `file:` links and slows the bind mount. The hub's `ONBOARDING.md` says the same.
- `node_modules` on the host is the Windows install. The container never sees it: a named volume masks that path with the Linux install from the image.
- If `docker info` prints the Client block but the Server block shows an error such as "open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified", Docker Desktop's engine is not running. Start Docker Desktop. If it fails with "waiting for the VM setup to be ready", the WSL2 backend is broken; ask DTS rather than running `wsl --update` or reinstalling on an agency machine.
- Line endings: `.gitattributes` sets `* text=auto eol=lf`, so the Dockerfile, `compose.yaml`, `nginx/default.conf`, and the workflow's shell steps check out with LF even with `core.autocrlf` on. A CR at the end of a line is a syntax error in nginx and a stray byte in a shell variable.
- Git Bash rewrites an environment value that looks like a POSIX path when it starts a Windows program: `SITE_BASE=/ltinfo-monitoring-dashboard/v2/ npm run build` arrives in Node as `C:/Program Files/Git/ltinfo-monitoring-dashboard/v2/`. Set `MSYS2_ENV_CONV_EXCL='*'` on the same line, or set the variable in PowerShell (`$env:SITE_BASE = '/ltinfo-monitoring-dashboard/v2/'`).

## Bump the hub

1. Edit `ecology.ref` to the new hub commit (a full 40-character SHA).
2. `docker compose build` and `docker compose down -v`, then `docker compose up web`.
3. Run the Phase 0 spikes and the doctor against the new hub.

CI reads the same file, so the next push to `v2`, manual run, or nightly run builds against the new commit (the nightly run only while the schedule is enabled; see Deploy).

## Node 22 now, Node 24 later

The image pins `node:22.12.0-bookworm-slim` and `.nvmrc` says `22`, matching the machines in use. The plan's target is Node 24 LTS. To move: change `NODE_IMAGE` in the `Dockerfile` and `.nvmrc` together (CI reads `.nvmrc`), rebuild, and check that the hub's `npm ci` and `build:tokens` still pass on 24 before changing anything else. `nginx:1.28-alpine` is pinned the same way; bump it on purpose.

## License

Docker Desktop is free only for small organizations; TRPA's use needs confirming. Check the current Docker Desktop terms with DTS before this becomes the standard setup. Podman Desktop and Rancher Desktop run the same `Dockerfile` and `compose.yaml` (through `podman compose` or `nerdctl compose`) if a license is a problem.
