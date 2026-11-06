// The spoke's prototype registry: the single source of truth that drives the
// working-screens list on the home page. Add a row here when you ship a new one.
//
// On this branch the registry holds the Phase 0 spike pages (src/pages/spikes/),
// which are kept as living checks of the theme, the chart module, and the map
// module. Program pages are not listed here; the home page links a few of them
// directly from programs.json through src/lib/programs.ts.

export type PrototypeStatus = 'live' | 'in-progress' | 'planned' | 'archived';

export interface Prototype {
  /** URL-safe id. */
  slug: string;
  title: string;
  description: string;
  /** Internal route, root-relative and base-less. Wrap with withBase() at render. */
  route: string;
  /** ISO date (YYYY-MM-DD) the prototype was first built. */
  createdAt: string;
  /** Tracking ticket id, e.g. a Jira key. Optional. */
  ticket?: string;
  status: PrototypeStatus;
}

export const prototypes: Prototype[] = [
  {
    slug: 'theme',
    title: 'Theme spike',
    description: 'Ecology legos wearing the LT Info theme inside a mock of the host Dashboard card, for side-by-side comparison with monitoring.laketahoeinfo.org.',
    route: '/spikes/theme',
    createdAt: '2026-11-05',
    status: 'live',
  },
  {
    slug: 'chart',
    title: 'Chart spike',
    description: 'The native SVG chart module against live measurement layers from the TRPA LTInfo_Monitoring map service, with its table and CSV.',
    route: '/spikes/chart',
    createdAt: '2026-11-05',
    status: 'live',
  },
  {
    slug: 'map',
    title: 'Map spike',
    description: 'The Leaflet map module: World Topo and Aerial basemaps, site markers, colored polygons, overlays, popups, legend, and the site list.',
    route: '/spikes/map',
    createdAt: '2026-11-05',
    status: 'live',
  },
];

/** Newest first, the order the home page renders. */
export const prototypesByNewest = (): Prototype[] =>
  [...prototypes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
