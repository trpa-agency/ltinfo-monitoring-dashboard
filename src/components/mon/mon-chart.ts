/* mon-lego-checked: no esa-* draws a native SVG chart (esa-chart wraps AG Charts on
   canvas, which the v2 stack decision replaced); mon-chart is the reusable home. */

/*
 * <mon-chart>: a plain custom element that renders a ChartSpec as native SVG
 * through src/lib/svg-chart and owns the DOM half of the chart: a
 * ResizeObserver that re-renders at the container width, hover and keyboard
 * tooltips on the hit groups, and the legend. Light DOM, so the page font and
 * the Ecology tokens reach every mark.
 *
 *   const chart = document.querySelector('mon-chart');
 *   chart.spec = { title, xKind, series, ... };
 *
 * Keyboard: Tab reaches the first position; ArrowRight or ArrowDown moves to
 * the next position, ArrowLeft or ArrowUp to the previous, Home and End jump,
 * Escape hides the tooltip. Each position announces its values through its
 * aria-label.
 */

import './mon-chart.css';
import type { ChartSpec, RenderResult } from '../../lib/svg-chart/types.ts';
import { esc, renderChart, seriesClass, swatchMarkup } from '../../lib/svg-chart/render.ts';

let counter = 0;

export class MonChart extends HTMLElement {
  private spec_: ChartSpec | null = null;
  private result: RenderResult | null = null;
  private readonly uid = `mon-chart-${(counter += 1)}`;
  private frame!: HTMLDivElement;
  private tooltip!: HTMLDivElement;
  private legend!: HTMLUListElement;
  private observer: ResizeObserver | null = null;
  private raf = 0;
  private renderedWidth = 0;
  private active = -1;
  private activeEl: Element | null = null;
  private built = false;

  get spec(): ChartSpec | null {
    return this.spec_;
  }

  set spec(value: ChartSpec | null) {
    this.spec_ = value;
    this.active = -1;
    this.renderedWidth = 0;
    this.scheduleRender();
  }

  /** The last render, for tests and for the panel to read positions. */
  get rendered(): RenderResult | null {
    return this.result;
  }

  connectedCallback(): void {
    if (!this.built) this.build();
    if (!this.observer && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.scheduleRender());
      this.observer.observe(this);
    }
    this.scheduleRender();
  }

  disconnectedCallback(): void {
    if (this.observer) this.observer.disconnect();
    this.observer = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private build(): void {
    this.built = true;
    this.innerHTML = '';
    this.frame = document.createElement('div');
    this.frame.className = 'mon-chart__frame';
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'mon-chart__tooltip';
    this.tooltip.setAttribute('role', 'tooltip');
    this.tooltip.hidden = true;
    this.legend = document.createElement('ul');
    this.legend.className = 'mon-chart__legend';
    this.legend.setAttribute('aria-label', 'Series');
    this.legend.hidden = true;
    this.append(this.frame, this.tooltip, this.legend);
    this.frame.addEventListener('pointermove', this.onPointerMove);
    this.frame.addEventListener('pointerleave', this.onPointerLeave);
    this.frame.addEventListener('focusin', this.onFocusIn);
    this.frame.addEventListener('focusout', this.onFocusOut);
    this.frame.addEventListener('keydown', this.onKeyDown);
  }

  private scheduleRender(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.render();
    });
  }

  /** Renders at the current width. Skips when hidden (zero width) or unchanged. */
  render(): void {
    if (!this.spec_ || !this.isConnected) return;
    const width = Math.round(this.clientWidth);
    if (width < 1) return;
    if (width === this.renderedWidth && this.result) return;
    this.renderedWidth = width;
    const hadFocus = this.active >= 0 && document.activeElement != null && this.frame.contains(document.activeElement);
    const keep = this.active;
    this.result = renderChart(this.spec_, width, this.uid);
    this.frame.innerHTML = this.result.svg;
    this.activeEl = null;
    this.renderLegend();
    this.hideTooltip();
    if (hadFocus) this.focusHit(keep);
  }

  private renderLegend(): void {
    const items = this.result ? this.result.legend : [];
    if (items.length < 2) {
      this.legend.hidden = true;
      this.legend.innerHTML = '';
      return;
    }
    this.legend.innerHTML = items
      .map((it) => `<li>${swatchMarkup(it, `${this.uid}-legend`)}<span>${esc(it.name)}</span></li>`)
      .join('');
    this.legend.hidden = false;
  }

  private hits(): HTMLElement[] {
    return Array.from(this.frame.querySelectorAll<HTMLElement>('.mon-chart__hit'));
  }

  private hitAt(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element ? target.closest<HTMLElement>('.mon-chart__hit') : null;
  }

  private onPointerMove = (e: PointerEvent): void => {
    const hit = this.hitAt(e.target);
    if (!hit) {
      if (!this.frame.contains(document.activeElement)) this.hideTooltip();
      return;
    }
    this.show(Number(hit.dataset.i), hit);
  };

  private onPointerLeave = (): void => {
    if (!this.frame.contains(document.activeElement)) this.hideTooltip();
  };

  private onFocusIn = (e: FocusEvent): void => {
    const hit = this.hitAt(e.target);
    if (hit) this.show(Number(hit.dataset.i), hit);
  };

  private onFocusOut = (e: FocusEvent): void => {
    const next = e.relatedTarget;
    if (!(next instanceof Node) || !this.frame.contains(next)) this.hideTooltip();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.result) return;
    const n = this.result.positions.length;
    if (!n) return;
    if (e.key === 'Escape') {
      this.hideTooltip();
      e.preventDefault();
      return;
    }
    const hit = this.hitAt(e.target);
    const current = hit ? Number(hit.dataset.i) : Math.max(0, this.active);
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = Math.min(n - 1, current + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = Math.max(0, current - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = n - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.focusHit(next);
  };

  /** Moves the roving tabindex and focus to position i; focusin then shows its tooltip. */
  private focusHit(i: number): void {
    const hits = this.hits();
    if (!hits.length) return;
    const index = Math.max(0, Math.min(hits.length - 1, i));
    hits.forEach((h, j) => h.setAttribute('tabindex', j === index ? '0' : '-1'));
    hits[index].focus({ preventScroll: true });
  }

  private show(i: number, el: HTMLElement): void {
    const r = this.result;
    if (!r || i < 0 || i >= r.positions.length) return;
    const p = r.positions[i];
    this.active = i;
    if (this.activeEl && this.activeEl !== el) this.activeEl.classList.remove('mon-chart__hit--active');
    el.classList.add('mon-chart__hit--active');
    this.activeEl = el;
    const rows = p.values.length
      ? p.values
          .map(
            (v) =>
              `<div class="mon-chart__tooltip-row ${seriesClass(v.index)}"><span class="mon-chart__dot" aria-hidden="true"></span>` +
              `<span class="mon-chart__tooltip-name">${esc(v.name)}</span><span class="mon-chart__tooltip-value">${esc(v.text)}</span></div>`,
          )
          .join('')
      : '<div class="mon-chart__tooltip-row">No data</div>';
    this.tooltip.innerHTML = `<div class="mon-chart__tooltip-title">${esc(p.label)}</div>${rows}`;
    this.tooltip.hidden = false;
    this.positionTooltip(p.at, r);
  }

  private positionTooltip(at: number, r: RenderResult): void {
    const svg = this.frame.querySelector('svg');
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const host = this.getBoundingClientRect();
    const scale = r.width ? box.width / r.width : 1;
    const tw = this.tooltip.offsetWidth;
    const th = this.tooltip.offsetHeight;
    let left: number;
    let top: number;
    if (r.horizontal) {
      const y = box.top - host.top + at * scale;
      left = box.left - host.left + r.plot.x0 * scale + 12;
      top = y - th / 2;
    } else {
      const x = box.left - host.left + at * scale;
      left = x + 12;
      if (left + tw > host.width) left = x - tw - 12;
      top = box.top - host.top + r.plot.y0 * scale + 4;
    }
    left = Math.max(0, Math.min(left, Math.max(0, host.width - tw)));
    top = Math.max(0, top);
    // Runtime-computed position: the one place an inline style is the right tool.
    this.tooltip.style.left = `${Math.round(left)}px`;
    this.tooltip.style.top = `${Math.round(top)}px`;
  }

  private hideTooltip(): void {
    this.tooltip.hidden = true;
    if (this.activeEl) this.activeEl.classList.remove('mon-chart__hit--active');
    this.activeEl = null;
  }
}

if (!customElements.get('mon-chart')) customElements.define('mon-chart', MonChart);

declare global {
  interface HTMLElementTagNameMap {
    'mon-chart': MonChart;
  }
}
