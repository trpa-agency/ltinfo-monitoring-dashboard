/* mon-lego-checked: esa-select is the pick control and the panel markup is MapPanel.astro
   (esa-card, esa-button, esa-empty-state, esa-loading-spinner); no esa-* loads a program's
   sites or areas from the map service and drives a map, a list, and a CSV from them, so
   mon-sites-panel is the reusable home for that wiring. Light DOM. */

/*
 * <mon-sites-panel data-config='{"program":...}'>
 *   <MapPanel ...>  (rendered by SitesPanel.astro)
 * </mon-sites-panel>
 *
 * The one implementation of the Sites section, shared by the program pages and the
 * /spikes/map page. It reads a SitesPanelConfig (src/lib/sites.ts) from data-config and
 * loads exactly one source:
 *   mapLayer    areas (polygons or lines) colored by colorBy, one pick value at a time
 *   sitesLayer  points from a layer with one feature per site per year, collapsed per site
 *   geojson     points from a GeoJSON URL (the LT Info sites hook)
 * plus the overlays drawn under it. It then fills the mon-map and mon-site-list inside, keeps
 * them in sync, wires the CSV button, and shows the loading, empty, and error states.
 *
 * Events (bubbling), for the page's summary tiles:
 *   mon-sites:loaded   detail: SitesSummary, once the rows are on the map
 *   mon-sites:settled  detail { state: 'ready' | 'empty' | 'error' }
 * A listener attached late reads the same values from `summary` and dataset.state.
 */

import '@esa/ecology/esa-select';
import './mon-map.ts';
import './mon-site-list.ts';
import type { MonMap } from './mon-map.ts';
import type { MonSiteList } from './mon-site-list.ts';
import {
  areaGroups,
  areaListItems,
  areaQueryParams,
  areasCsv,
  areasLayerSpec,
  areasSummary,
  collapseSites,
  fetchAttributes,
  fetchGeoJson,
  overlayQueryParams,
  overlaySpec,
  pickChoices,
  pickStatsParams,
  siteGroups,
  siteListItems,
  siteStatus,
  sitesCsv,
  sitesLayerSpec,
  sitesQueryParams,
  sitesSourceKind,
  sitesSummary,
  slugify,
  statusColors,
  type Feature,
  type FeatureCollection,
  type OverlaySpec,
  type PanelState,
  type SitesPanelConfig,
  type SitesSummary,
} from '../../lib/sites.ts';

type PickSelect = HTMLElement & { options: { label: string; value: string }[]; value: string | string[] };

const http = (url: string) => fetch(url);

function download(fileName: string, text: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export class MonSitesPanel extends HTMLElement {
  private started = false;
  private summary_: SitesSummary | null = null;
  private csvHandler: (() => void) | null = null;
  private map: MonMap | null = null;
  private list: MonSiteList | null = null;
  private states: HTMLElement[] = [];
  private root: HTMLElement | null = null;

  /** What loaded, or null until the rows are on the map. */
  get summary(): SitesSummary | null {
    return this.summary_;
  }

  connectedCallback(): void {
    if (this.started) return;
    this.started = true;
    void this.start();
  }

  private setState(state: PanelState): void {
    this.states.forEach((el) => {
      el.hidden = el.dataset.monState !== state;
    });
    this.root?.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    this.dataset.state = state;
    if (state !== 'loading') this.dispatchEvent(new CustomEvent('mon-sites:settled', { bubbles: true, detail: { state } }));
  }

  private loaded(summary: SitesSummary): void {
    this.summary_ = summary;
    this.dispatchEvent(new CustomEvent<SitesSummary>('mon-sites:loaded', { bubbles: true, detail: summary }));
  }

  private message(text: string): void {
    if (this.list) this.list.message = text;
  }

  private async start(): Promise<void> {
    let cfg: SitesPanelConfig;
    try {
      cfg = JSON.parse(this.dataset.config || '') as SitesPanelConfig;
    } catch {
      console.warn('mon-sites-panel: data-config is not valid JSON');
      return;
    }
    await Promise.all([customElements.whenDefined('mon-map'), customElements.whenDefined('mon-site-list')]);
    this.root = this.querySelector<HTMLElement>('[data-mon-panel]');
    this.map = this.querySelector<MonMap>('mon-map');
    this.list = this.querySelector<MonSiteList>('mon-site-list');
    this.states = [...this.querySelectorAll<HTMLElement>('[data-mon-state]')];
    if (!this.root || !this.map) {
      console.warn('mon-sites-panel: missing the MapPanel markup');
      return;
    }
    const map = this.map;
    const list = this.list;
    if (list) {
      map.addEventListener('featureselect', (event) => {
        list.select((event as CustomEvent<{ key: string }>).detail.key, { scroll: true });
      });
      list.addEventListener('siteselect', (event) => {
        map.focus((event as CustomEvent<{ key: string }>).detail.key);
      });
    }
    this.querySelector<HTMLElement>('[data-mon-csv]')?.addEventListener('click', () => this.csvHandler?.());

    switch (sitesSourceKind(cfg)) {
      case 'areas':
        await this.loadAreas(cfg);
        break;
      case 'sites':
        await this.loadSites(cfg);
        break;
      case 'geojson':
        await this.loadGeoJson(cfg);
        break;
      default:
        this.message('');
        this.setState('empty');
    }
  }

  /** The overlays, each on its own; one that fails is logged and left off rather than failing the panel. */
  private async overlays(cfg: SitesPanelConfig): Promise<OverlaySpec[]> {
    const configs = cfg.overlays ?? [];
    const results = await Promise.allSettled(
      configs.map((o) => fetchGeoJson(http, o.layer, overlayQueryParams(o)).then((f) => overlaySpec(o, f, cfg.program))),
    );
    const out: OverlaySpec[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') out.push(result.value);
      else console.warn(`Overlay layer ${configs[i].layer} did not load: ${String(result.reason)}`);
    });
    return out;
  }

  /* ---------- sitesLayer: points collapsed per site, grouped by status ---------- */

  private async loadSites(cfg: SitesPanelConfig): Promise<void> {
    const layer = cfg.sitesLayer!;
    this.setState('loading');
    this.message('Loading sites');
    try {
      const [features, overlays] = await Promise.all([fetchGeoJson(http, layer.layer, sitesQueryParams(layer)), this.overlays(cfg)]);
      this.showSites(cfg, collapseSites(features, layer), overlays);
    } catch (error) {
      console.warn(`Sites layer ${layer.layer} did not load: ${String(error)}`);
      this.message('Sites could not be loaded. Reload the page to try again.');
      this.setState('error');
    }
  }

  /* ---------- geojson: LT Info sites as a FeatureCollection ---------- */

  private async loadGeoJson(cfg: SitesPanelConfig): Promise<void> {
    const source = cfg.geojson!;
    this.setState('loading');
    this.message('Loading sites');
    try {
      const [collection, overlays] = await Promise.all([
        http(source.url).then((r) => r.json() as Promise<FeatureCollection | null>),
        this.overlays(cfg),
      ]);
      if (!collection || typeof collection !== 'object') throw new Error('no JSON');
      if (collection.error) throw new Error(collection.error.message || 'GeoJSON request failed');
      const features = Array.isArray(collection.features) ? collection.features : [];
      this.showSites(cfg, collapseSites(features, source), overlays);
    } catch (error) {
      console.warn(`Sites GeoJSON ${source.url} did not load: ${String(error)}`);
      this.message('Sites could not be loaded. Reload the page to try again.');
      this.setState('error');
    }
  }

  private showSites(cfg: SitesPanelConfig, sites: ReturnType<typeof collapseSites>, overlays: OverlaySpec[]): void {
    if (!sites.length) {
      this.list?.setItems([], []);
      this.loaded(sitesSummary(cfg, sites));
      this.setState('empty');
      return;
    }
    const fields = cfg.sitesLayer ?? { layer: 0, ...cfg.geojson! };
    const colors = statusColors(sites.map(siteStatus), cfg.color);
    this.map!.layers = { program: sitesLayerSpec(fields, sites, colors, cfg.program), overlays };
    this.list?.setItems(siteListItems(sites, colors), siteGroups(sites));
    this.csvHandler = () => download(`${slugify(cfg.program)}-sites.csv`, sitesCsv(sites));
    this.loaded(sitesSummary(cfg, sites));
    this.setState('ready');
  }

  /* ---------- mapLayer: areas colored by a field, one pick value at a time ---------- */

  private async loadAreas(cfg: SitesPanelConfig): Promise<void> {
    const layer = cfg.mapLayer!;
    const unitPlural = (layer.unitPlural || `${layer.unit || 'area'}s`).toLowerCase();
    const select = this.querySelector<PickSelect>('[data-mon-pick]');
    this.setState('loading');
    this.message(`Loading ${unitPlural}`);

    let choices: (string | number)[] = [];
    if (layer.pick) {
      try {
        choices = pickChoices(await fetchAttributes(http, layer.layer, pickStatsParams(layer)), layer.pick);
      } catch (error) {
        console.warn(`Map layer ${layer.layer} pick values did not load: ${String(error)}`);
      }
    }
    let picked: string | number | null = choices[0] ?? null;
    let features: Feature[] = [];
    const overlaysPromise = this.overlays(cfg);

    const load = async (): Promise<void> => {
      const current = picked;
      this.setState('loading');
      this.message(`Loading ${unitPlural}`);
      try {
        const [loaded, overlays] = await Promise.all([fetchGeoJson(http, layer.layer, areaQueryParams(layer, current)), overlaysPromise]);
        if (current !== picked) return; // the pick changed while this request was in flight
        features = loaded;
        if (!loaded.length) {
          this.list?.setItems([], []);
          this.loaded(areasSummary(cfg, loaded, current));
          this.setState('empty');
          return;
        }
        this.map!.layers = { program: areasLayerSpec(layer, loaded, cfg.color, cfg.program), overlays };
        this.list?.setItems(areaListItems(layer, loaded, cfg.color), areaGroups(layer));
        this.loaded(areasSummary(cfg, loaded, current));
        this.setState('ready');
      } catch (error) {
        if (current !== picked) return;
        console.warn(`Map layer ${layer.layer} did not load: ${String(error)}`);
        this.message(`${unitPlural[0].toUpperCase()}${unitPlural.slice(1)} could not be loaded. Reload the page to try again.`);
        this.setState('error');
      }
    };

    if (select) {
      if (choices.length > 1) {
        await customElements.whenDefined('esa-select');
        select.options = choices.map((v) => ({ label: String(v), value: String(v) }));
        select.value = String(picked);
        select.hidden = false;
        select.addEventListener('change', (event) => {
          const value = (event as CustomEvent<{ value: string | string[] }>).detail?.value;
          const next = Array.isArray(value) ? value[0] : value;
          if (!next || next === String(picked)) return;
          picked = next;
          void load();
        });
      } else {
        select.remove();
      }
    }
    this.csvHandler = () => {
      const file = areasCsv(layer, features, picked, cfg.program);
      download(file.fileName, file.text);
    };
    await load();
  }
}

if (!customElements.get('mon-sites-panel')) customElements.define('mon-sites-panel', MonSitesPanel);

declare global {
  interface HTMLElementTagNameMap {
    'mon-sites-panel': MonSitesPanel;
  }
}
