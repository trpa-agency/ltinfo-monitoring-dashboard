# syntax=docker/dockerfile:1
# LT Info Monitoring Dashboard v2: the Astro spoke of the ESA Ecology hub.
#
# Why Docker here: the spoke depends on the hub through file:../ecology/packages/*
# links in package.json, so the hub must sit beside the spoke at the same relative
# path, checked out at the commit in ecology.ref, with its tokens built. These
# stages arrange that without anyone placing folders by hand. See docs/docker.md.
#
# Layout inside the image (the same sibling layout as a laptop and as CI):
#   /work/ecology                   the hub at the commit in ecology.ref
#   /work/ltinfo-monitoring-spoke   this repo
#
# Stages (compose.yaml picks them by name):
#   base     Node plus git
#   hub      clone the hub, npm ci, build tokens
#   deps     npm ci for the spoke (the file: links resolve into /work/ecology)
#   dev      astro dev on 4330, source bind-mounted by compose
#   build    production build to dist/
#   preview  nginx serving dist/ at the GitHub Pages subpath
#
# Node 22 matches the local toolchain (.nvmrc says 22, the machine runs 22.12.0).
# The plan names Node 24 LTS as the target; bump NODE_IMAGE and .nvmrc together.
# Both image tags are pinned; bump them on purpose, not by accident.

ARG NODE_IMAGE=node:22.12.0-bookworm-slim
ARG NGINX_IMAGE=nginx:1.28-alpine

# ---- base: Node plus git ----------------------------------------------------
FROM ${NODE_IMAGE} AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false
WORKDIR /work

# ---- hub: the Ecology hub at the pinned commit ------------------------------
FROM base AS hub
# Only ecology.ref enters this layer, so the clone reruns only when the pin moves.
COPY ecology.ref /work/ecology.ref
RUN ref="$(tr -d '[:space:]' < /work/ecology.ref)" \
 && git clone --quiet https://github.com/esassoc/ecology.git /work/ecology \
 && git -C /work/ecology checkout --quiet --detach "$ref" \
 && echo "hub at $(git -C /work/ecology rev-parse HEAD)"
WORKDIR /work/ecology
# The hub is an npm workspace. npm ci at its root installs every package's
# dependencies, which the spoke's linked @esa/* packages resolve from here.
RUN npm ci \
 && npm run build:tokens

# ---- deps: spoke dependencies -----------------------------------------------
FROM hub AS deps
WORKDIR /work/ltinfo-monitoring-spoke
# Lockfiles before sources, so this layer survives source edits.
COPY package.json package-lock.json ./
# No NODE_ENV=production on this line. astro.config.mjs imports
# @esa/design-layer, a devDependency, and npm ci omits devDependencies when
# NODE_ENV is production.
RUN npm ci

# ---- dev: hot-reloading dev server ------------------------------------------
FROM deps AS dev
# Bind mounts from Windows do not forward file change events, so poll instead.
# chokidar (Vite's watcher and Astro's) reads both variables.
ENV CHOKIDAR_USEPOLLING=1 \
    CHOKIDAR_INTERVAL=1000
EXPOSE 4330
# The source arrives through compose's bind mount; this image carries only
# dependencies. Run it through compose, not docker run.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4330"]

# ---- build: production build ------------------------------------------------
FROM deps AS build
COPY . .
# astro.config.mjs uses the Pages root subpath (/ltinfo-monitoring-dashboard/)
# when NODE_ENV is production and SITE_BASE is unset. That is the Phase 5
# production shape, which nginx/default.conf mirrors; the staging workflow
# builds with SITE_BASE=/ltinfo-monitoring-dashboard/v2/ instead.
RUN NODE_ENV=production npm run build

# ---- preview: serve dist/ at the Pages subpath ------------------------------
FROM ${NGINX_IMAGE} AS preview
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /work/ltinfo-monitoring-spoke/dist /usr/share/nginx/html/ltinfo-monitoring-dashboard
EXPOSE 80
