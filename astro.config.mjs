import { defineConfig } from 'astro/config';
import designLayer from '@esa/design-layer/astro';

// Minimal, mirroring the ecology hub and the other spokes. The spoke ships
// static HTML/CSS; interactivity comes from the hub's Lit web components
// (self-registering) and any island scripts a prototype adds.
//
// Publishes to GitHub Pages as a project site of the trpa-agency org, in the
// same repo and base path as the dashboard it replaces, so production builds
// need the subpath as `base`. Dev stays at root for clean local URLs:
// withBase() (src/lib/base.ts) reads whichever base is active.
const base = process.env.NODE_ENV === 'production' ? '/ltinfo-monitoring-dashboard/' : '/';

export default defineConfig({
  site: 'https://trpa-agency.github.io',
  base,
  // Every route is written as its own .html file (src/pages/a/b.astro becomes
  // dist/a/b.html), so the LT Info admin can point a program's Dashboard card at
  // a plain file URL, and so program pages keep the <folder>/<program>.html
  // addresses the current site uses. trailingSlash 'never' keeps those URLs
  // canonical without a slash.
  trailingSlash: 'never',
  build: { format: 'file' },
  server: { port: 4330 },
  // Off: the Design pill (dev) and the Handoff pill (every build) are the way
  // into Ecology's tools, and the toolbar sits over the prototype.
  devToolbar: { enabled: false },
  // Dev-only token tuning panel and click-to-comment (@esa/design-layer);
  // absent from builds. Controls: design-layer.config.mjs, optional.
  integrations: [designLayer()],
});
