/* mon-lego-checked: no esa-* component draws a map; mon-map is the reusable home for a Leaflet
   map with the LT Info basemaps, a legend, a home button, and token-styled popups, synced to
   mon-site-list through focus(key) and the featureselect event. Light DOM, so page tokens and
   Leaflet's own stylesheet both apply. */

/*
 * <mon-map>
 *
 * Usage (in a client script):
 *   import '../components/mon/mon-map.ts';
 *   const map = document.querySelector('mon-map');
 *   map.layers = { program, overlays };   // specs from src/lib/sites.ts
 *   map.addEventListener('featureselect', (e) => console.log(e.detail.key));
 *   map.focus('Nevada Beach');            // zooms to a feature and opens its popup
 *
 * The element imports Leaflet and its stylesheet itself, so Leaflet loads only on pages that use
 * it. Height comes from the host page through --mon-map-height (see mon-map.css). The wheel never
 * zooms the map (the LT Info embed contract); drag, touch, and the zoom buttons do.
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './mon-map.css';
import type { Feature, LegendEntry, MapLayers, OverlaySpec, PopupCard, ProgramLayerSpec } from '../../lib/sites.ts';

const TOPO_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
const IMAGERY_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION = 'Esri, HERE, Garmin, USGS, NGA, EPA, NPS';
const TAHOE_CENTER: L.LatLngTuple = [39.09, -120.04];
const SITE_ZOOM = 13;
/* Lucide "home", the same path the Ecology icon registry ships, inlined because a plain custom
   element cannot render the esa-icon Astro component. */
const HOME_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>';

const POINT_STYLE = { radius: 6, color: '#ffffff', weight: 1.5, opacity: 1, fillOpacity: 0.95 };
const SELECTED_POINT_STYLE = { radius: 8, weight: 3 };

export interface FeatureSelectDetail {
  key: string;
}

type GeoJsonInput = Parameters<typeof L.geoJSON>[0];

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, textContent?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent != null) node.textContent = textContent;
  return node;
}

/** The popupCard pattern as DOM: title, status pill, stat tiles, label and value rows, foot. */
export function popupElement(card: PopupCard): HTMLElement {
  const root = element('div', 'mon-popup');
  root.append(element('h3', 'mon-popup__title', card.title));
  if (card.pill) {
    const pill = element('span', 'mon-popup__pill', card.pill.text);
    pill.style.setProperty('--mon-pill', card.pill.color);
    root.append(pill);
  }
  const stats = (card.stats || []).filter(([, value]) => value !== '' && value != null);
  if (stats.length) {
    const grid = element('div', 'mon-popup__stats');
    grid.style.setProperty('--mon-stat-cols', String(Math.min(stats.length, 3)));
    for (const [label, value] of stats) {
      const tile = element('div', 'mon-popup__stat');
      tile.append(element('div', 'mon-popup__stat-label', label), element('div', 'mon-popup__stat-value', value));
      grid.append(tile);
    }
    root.append(grid);
  }
  const rows = (card.rows || []).filter(([, value]) => value !== '' && value != null);
  if (rows.length) {
    const list = element('dl', 'mon-popup__rows');
    for (const [label, value] of rows) {
      const dd = element('dd');
      if (typeof value === 'object') {
        const link = element('a', undefined, value.text);
        link.href = value.href;
        link.target = '_blank';
        link.rel = 'noopener';
        dd.append(link);
      } else {
        dd.textContent = value;
      }
      list.append(element('dt', undefined, label), dd);
    }
    root.append(list);
  }
  if (card.foot) root.append(element('p', 'mon-popup__foot', card.foot));
  return root;
}

export class MonMap extends HTMLElement {
  #map: L.Map | null = null;
  #overlayGroup: L.LayerGroup | null = null;
  #programGroup: L.LayerGroup | null = null;
  #legendBox: HTMLElement | null = null;
  #byKey = new Map<string, L.Layer>();
  #selected: L.Layer | null = null;
  #bounds: L.LatLngBounds | null = null;
  #layers: MapLayers | null = null;
  #resize: ResizeObserver | null = null;
  #colorCache = new Map<string, string>();

  connectedCallback(): void {
    if (!this.#map) this.#init();
    if (this.#layers) this.#render();
  }

  disconnectedCallback(): void {
    this.#resize?.disconnect();
    this.#resize = null;
    this.#map?.remove();
    this.#map = null;
    this.#byKey.clear();
    this.#selected = null;
  }

  /** The program layer and its overlays. Setting it redraws the map and refits the view. */
  get layers(): MapLayers | null {
    return this.#layers;
  }

  set layers(value: MapLayers | null) {
    this.#layers = value;
    if (this.#map) this.#render();
  }

  /** The Leaflet map, for pages that need to listen to it directly. */
  get map(): L.Map | null {
    return this.#map;
  }

  /**
   * Zoom to a site or area by its key and open its popup. Called with a FocusOptions object (or
   * nothing) it behaves like HTMLElement.focus, so the element keeps the platform contract.
   */
  focus(key?: string | FocusOptions): void {
    if (typeof key !== 'string') {
      super.focus(key);
      return;
    }
    const map = this.#map;
    const layer = this.#byKey.get(key);
    if (!map || !layer) return;
    this.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this.#highlight(layer);
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      map.off('moveend', open);
      if ('openPopup' in layer) (layer as L.Layer).openPopup();
    };
    map.once('moveend', open);
    if (layer instanceof L.CircleMarker) {
      map.flyTo(layer.getLatLng(), Math.max(map.getZoom(), SITE_ZOOM), { duration: 0.6 });
    } else if (layer instanceof L.Polyline) {
      const bounds = layer.getBounds();
      if (!bounds.isValid()) {
        open();
        return;
      }
      map.flyToBounds(bounds.pad(0.6), { duration: 0.6, maxZoom: 16 });
    } else {
      open();
      return;
    }
    // A fly that ends where it started may not fire moveend, so open the popup after the animation anyway.
    window.setTimeout(open, 900);
  }

  /** Refit the view to the program layer, as the Home button does. */
  home(animate: boolean = true): void {
    const map = this.#map;
    if (!map) return;
    const bounds = this.#bounds;
    if (!bounds || !bounds.isValid()) {
      map.setView(TAHOE_CENTER, 10, { animate });
      return;
    }
    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
      map.setView(bounds.getCenter(), SITE_ZOOM, { animate });
      return;
    }
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15, animate });
  }

  #init(): void {
    this.classList.add('mon-map');
    const canvas = element('div', 'mon-map__canvas');
    this.append(canvas);
    const topo = L.tileLayer(TOPO_URL, { attribution: ATTRIBUTION, maxZoom: 19 });
    const aerial = L.tileLayer(IMAGERY_URL, { attribution: ATTRIBUTION, maxZoom: 19 });
    const map = L.map(canvas, {
      center: TAHOE_CENTER,
      zoom: 10,
      layers: [topo],
      // The embed contract: the wheel scrolls the host page, never the map.
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      zoomControl: true,
      attributionControl: true,
    });
    L.control.layers({ Topographic: topo, Aerial: aerial }, undefined, { position: 'topright', collapsed: true }).addTo(map);
    this.#overlayGroup = L.layerGroup().addTo(map);
    this.#programGroup = L.layerGroup().addTo(map);

    const HomeControl = L.Control.extend({
      onAdd: () => {
        const bar = L.DomUtil.create('div', 'leaflet-bar mon-map__home');
        const button = L.DomUtil.create('button', 'mon-map__home-button', bar) as HTMLButtonElement;
        button.type = 'button';
        button.title = 'Zoom to all';
        button.setAttribute('aria-label', 'Zoom to all features');
        button.innerHTML = HOME_ICON;
        L.DomEvent.disableClickPropagation(bar);
        L.DomEvent.on(button, 'click', (event: Event) => {
          L.DomEvent.stop(event);
          this.home();
        });
        return bar;
      },
    });
    new HomeControl({ position: 'topleft' }).addTo(map);

    const LegendControl = L.Control.extend({
      onAdd: () => {
        const box = L.DomUtil.create('div', 'mon-map__legend');
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', 'Legend');
        box.hidden = true;
        L.DomEvent.disableClickPropagation(box);
        this.#legendBox = box;
        return box;
      },
    });
    new LegendControl({ position: 'bottomright' }).addTo(map);

    this.#map = map;
    this.#resize = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    this.#resize.observe(this);
  }

  /** A CSS color Leaflet can use. Token expressions such as var(--x, #fallback) resolve through a probe element in this light DOM. */
  #resolveColor(value: string): string {
    if (!value) return '#8d8d8d';
    if (!value.includes('var(')) return value;
    const cached = this.#colorCache.get(value);
    if (cached) return cached;
    const probe = element('span');
    probe.hidden = true;
    probe.style.color = value;
    this.append(probe);
    const resolved = getComputedStyle(probe).color || value;
    probe.remove();
    this.#colorCache.set(value, resolved);
    return resolved;
  }

  #render(): void {
    const map = this.#map;
    const overlays = this.#overlayGroup;
    const program = this.#programGroup;
    if (!map || !overlays || !program) return;
    map.closePopup();
    overlays.clearLayers();
    program.clearLayers();
    this.#byKey.clear();
    this.#selected = null;
    this.#bounds = null;
    const layers = this.#layers;
    this.#renderLegend(layers);
    if (!layers) return;
    for (const overlay of layers.overlays) this.#addOverlay(overlay);
    const drawn = this.#addProgram(layers.program);
    const bounds = drawn.getBounds();
    if (bounds.isValid()) this.#bounds = bounds;
    this.home(false);
  }

  #addProgram(spec: ProgramLayerSpec): L.GeoJSON {
    const collection = { type: 'FeatureCollection', features: spec.features } as unknown as GeoJsonInput;
    const layer = L.geoJSON(collection, {
      pointToLayer: (feature, latlng) =>
        L.circleMarker(latlng, { ...POINT_STYLE, fillColor: this.#resolveColor(spec.color(feature as unknown as Feature)) }),
      style: (feature) => {
        const color = this.#resolveColor(spec.color(feature as unknown as Feature));
        return spec.geometry === 'line'
          ? { color, weight: 3, opacity: 0.95 }
          : { color, weight: 1, opacity: 0.9, fillColor: color, fillOpacity: 0.55 };
      },
      onEachFeature: (feature, drawn) => {
        const typed = feature as unknown as Feature;
        const key = spec.key(typed);
        this.#byKey.set(key, drawn);
        drawn.bindPopup(() => popupElement(spec.popup(typed)), { maxWidth: 320, autoPanPadding: [24, 24] });
        drawn.on('click', () => {
          this.#highlight(drawn);
          this.dispatchEvent(new CustomEvent<FeatureSelectDetail>('featureselect', { detail: { key }, bubbles: true, composed: true }));
        });
      },
    });
    this.#programGroup?.addLayer(layer);
    return layer;
  }

  #addOverlay(spec: OverlaySpec): void {
    const color = this.#resolveColor(spec.color);
    const collection = { type: 'FeatureCollection', features: spec.features } as unknown as GeoJsonInput;
    const layer = L.geoJSON(collection, {
      pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 5, color: '#ffffff', weight: 1, fillColor: color, fillOpacity: 0.9 }),
      style: () =>
        spec.geometry === 'line'
          ? { color, weight: 2, opacity: 0.9 }
          : { color, weight: 1, opacity: 0.9, fillColor: color, fillOpacity: 0.25 },
      onEachFeature: (feature, drawn) => {
        drawn.bindPopup(() => popupElement(spec.popup(feature as unknown as Feature)), { maxWidth: 320 });
      },
    });
    this.#overlayGroup?.addLayer(layer);
    // Overlays are reference layers: keep them under the program layer whatever the add order.
    layer.bringToBack();
  }

  #highlight(layer: L.Layer): void {
    const previous = this.#selected;
    if (previous && previous !== layer) {
      if (previous instanceof L.CircleMarker) previous.setStyle({ radius: POINT_STYLE.radius, weight: POINT_STYLE.weight });
      else if (previous instanceof L.Path) previous.setStyle({ weight: this.#layers?.program.geometry === 'line' ? 3 : 1 });
    }
    this.#selected = layer;
    if (layer instanceof L.CircleMarker) {
      layer.setStyle(SELECTED_POINT_STYLE);
      layer.bringToFront();
    } else if (layer instanceof L.Path) {
      layer.setStyle({ weight: 3 });
      layer.bringToFront();
    }
  }

  #renderLegend(layers: MapLayers | null): void {
    const box = this.#legendBox;
    if (!box) return;
    box.replaceChildren();
    const entries: LegendEntry[] = layers
      ? [...layers.program.legend, ...layers.overlays.map((o) => ({ label: o.title, color: o.color, shape: o.geometry }))]
      : [];
    if (!entries.length) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    box.append(element('p', 'mon-map__legend-title', layers?.program.title || 'Legend'));
    const list = element('ul');
    for (const entry of entries) {
      const item = element('li');
      const swatch = element('i', `mon-map__swatch mon-map__swatch--${entry.shape}`);
      swatch.setAttribute('aria-hidden', 'true');
      // The swatch color is data, not design: it is the series or rating color of that entry.
      swatch.style.setProperty('--mon-swatch', entry.color);
      item.append(swatch, element('span', undefined, entry.label));
      list.append(item);
    }
    box.append(list);
  }
}

if (!customElements.get('mon-map')) customElements.define('mon-map', MonMap);

declare global {
  interface HTMLElementTagNameMap {
    'mon-map': MonMap;
  }
}
