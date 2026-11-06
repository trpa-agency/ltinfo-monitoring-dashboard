# Docker for the spoke

Docker's job here is reproducibility: the same Node, the Ecology hub at the same commit, the sibling-folder convention satisfied inside the image, and no Python. `npm run dev` on bare Node still works if `../ecology` is checked out at the commit in `ecology.ref` with its tokens built.

Files: `Dockerfile` (stages base, hub, deps, dev, build, preview), `compose.yaml` (services web, preview, doctor), `.dockerignore`, `nginx/default.conf`. CI does not use Docker; `.github/workflows/deploy.yml` runs the same npm steps on a runner with the same sibling layout.

## Run

| Command | What you get |
|---|---|
| `docker compose up web` | Dev server with hot reload at http://localhost:4331/. The host dev server uses 4330, which is why the container maps to 4331. |
| `docker compose up preview` | Production build behind nginx at http://localhost:8080/, which redirects to http://localhost:8080/ltinfo-monitoring-dashboard/, the same subpath as GitHub Pages. |
| `docker compose run --rm doctor` | The hub's `doctor.mjs` run inside the image. Three checks fail there by design (git identity, gh CLI, Claude plugin), and the detached hub checkout shows as a warning. The checks that matter are node, git, hub sibling, hub tokens built, and spoke dependencies installed. |
| `docker compose build` | Rebuild every stage. Needed after a change to `package.json`, `package-lock.json`, or `ecology.ref`. |
| `docker compose down -v` | Stop and drop the `spoke_node_modules` volume. Run this before `up web` after a dependency change, or the container keeps the old `node_modules`. |

The first build clones the hub and runs `npm ci` twice, so it takes a few minutes. Later builds reuse those layers until `ecology.ref` or a lockfile changes.

## Windows notes

- Use Docker Desktop with the WSL2 backend (Settings, General, "Use the WSL 2 based engine").
- Bind mounts from `C:\` do not forward file change events into the container. The dev stage sets `CHOKIDAR_USEPOLLING=1` and `CHOKIDAR_INTERVAL=1000`, so Vite and Astro poll once a second. Edits show up within about a second. Keeping the clone inside the WSL filesystem (for example `\wsl$\Ubuntu\home\you\GitHub`) makes `astro dev` several times faster; under `Documents\GitHub` it works with polling.
- Neither this folder nor `../ecology` may live in OneDrive. OneDrive breaks the `file:` links and slows the bind mount. The hub's `ONBOARDING.md` says the same.
- `node_modules` on the host is the Windows install. The container never sees it: a named volume masks that path with the Linux install from the image.
- If `docker info` prints the Client block but the Server block shows an error such as "open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified", Docker Desktop's engine is not running. Start Docker Desktop. If it fails with "waiting for the VM setup to be ready", the WSL2 backend is broken; ask DTS rather than running `wsl --update` or reinstalling on an agency machine.

## Bump the hub

1. Edit `ecology.ref` to the new hub commit (a full 40-character SHA).
2. `docker compose build` and `docker compose down -v`, then `docker compose up web`.
3. Run the Phase 0 spikes and the doctor against the new hub.

CI reads the same file, so the next push or nightly run builds against the new commit.

## Node 22 now, Node 24 later

The image pins `node:22.12.0-bookworm-slim` and `.nvmrc` says `22`, matching the machines in use. The plan's target is Node 24 LTS. To move: change `NODE_IMAGE` in the `Dockerfile` and `.nvmrc` together (CI reads `.nvmrc`), rebuild, and check that the hub's `npm ci` and `build:tokens` still pass on 24 before changing anything else. `nginx:1.28-alpine` is pinned the same way; bump it on purpose.

## License

Docker Desktop is free only for small organizations; TRPA's use needs confirming. Check the current Docker Desktop terms with DTS before this becomes the standard setup. Podman Desktop and Rancher Desktop run the same `Dockerfile` and `compose.yaml` (through `podman compose` or `nerdctl compose`) if a license is a problem.
