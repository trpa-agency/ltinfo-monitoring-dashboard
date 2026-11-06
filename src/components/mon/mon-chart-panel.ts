/* mon-lego-checked: composes esa-card, esa-select, esa-button-toggle, esa-button,
   esa-empty-state, and esa-loading-spinner (declared in ChartPanel.astro); no esa-*
   joins a chart to a table view and a CSV, so mon-chart-panel is the reusable home
   for that behavior. */

/*
 * <mon-chart-panel>: the measurement panel contract. ChartPanel.astro renders
 * the markup (an esa-card with title, sub, tools, chart, table, states, and
 * source line) and this element wires it: it queries the TRPA map service for
 * the measure in data-measure, fills the pick select, draws the chart, builds
 * the table view on demand, downloads a CSV from the same rows and columns,
 * and shows the empty or error state with the tools hidden.
 *
 * Rows come from queryMeasure unless data-source names another query (the
 * sites-per-year count); see queryPanelRows in src/lib/measures.ts.
 *
 * Events (bubbling), for the page's summary tiles:
 *   mon-chart-panel:data     detail { measure, rows }, once the rows have loaded
 *   mon-chart-panel:settled  detail { state: 'ready' | 'empty' | 'error' }
 * A listener attached late reads the same values from the `data` and
 * dataset.state properties.
 */

import '@esa/ecology/esa-select';
import '@esa/ecology/esa-button-toggle';
import './mon-chart.ts';
import type { MonChart } from './mon-chart.ts';
import type { Measure, MeasureColumn, PanelSource } from '../../lib/measures.ts';
import {
  defaultPick,
  fmtValue,
  measureChartSpec,
  measureColumns,
  measureView,
  pickChoices,
  pickedRows,
  queryPanelRows,
} from '../../lib/measures.ts';
import type { Attributes } from '../../lib/map-service.ts';
import { csvFileName, toCsv } from '../../lib/csv.ts';
import { esc } from '../../lib/svg-chart/render.ts';

interface Option {
  label: string;
  value: string;
}
interface SelectLike extends HTMLElement {
  options: Option[];
  value: string | string[];
}
interface ToggleLike extends HTMLElement {
  options: Option[];
  value: string;
}

/** Plain HTML table: thead from the columns, numeric cells right aligned, caption equal to the title. */
export function tableMarkup(title: string, columns: MeasureColumn[], rows: Attributes[], format?: string): string {
  const head = columns.map((c) => `<th scope="col"${c.num ? ' class="mon-num"' : ''}>${esc(c.headerName)}</th>`).join('');
  const body = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) =>
            c.num
              ? `<td class="mon-num">${esc(fmtValue(r[c.field], format))}</td>`
              : `<td>${esc(r[c.field] == null ? '' : r[c.field])}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('');
  return `<table class="mon-chart-panel__grid"><caption class="visually-hidden">${esc(title)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function downloadText(text: string, name: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface PanelData {
  measure: Measure;
  /** Every row loaded, before the pick filter. */
  rows: Attributes[];
}

export class MonChartPanel extends HTMLElement {
  private started = false;
  private data_: PanelData | null = null;

  /** The measure and every loaded row, or null until the rows arrive. */
  get data(): PanelData | null {
    return this.data_;
  }

  connectedCallback(): void {
    if (this.started) return;
    this.started = true;
    void this.start();
  }

  private q<T extends Element>(selector: string): T | null {
    return this.querySelector<T>(selector);
  }

  private settle(state: 'ready' | 'empty' | 'error'): void {
    this.dataset.state = state;
    this.dispatchEvent(new CustomEvent('mon-chart-panel:settled', { bubbles: true, detail: { state } }));
  }

  /** Shows the empty or error state and hides the tools, per the embed contract. */
  private showState(kind: 'empty' | 'error'): void {
    const loading = this.q<HTMLElement>('[data-loading]');
    const tools = this.q<HTMLElement>('[data-tools]');
    const chart = this.q<HTMLElement>('mon-chart');
    const state = this.q<HTMLElement>(`[data-${kind}]`);
    if (loading) loading.hidden = true;
    if (tools) tools.hidden = true;
    if (chart) chart.hidden = true;
    if (state) state.hidden = false;
    this.settle(kind);
  }

  private async start(): Promise<void> {
    let measure: Measure;
    let source: PanelSource | null = null;
    try {
      measure = JSON.parse(this.dataset.measure || '') as Measure;
      if (this.dataset.source) source = JSON.parse(this.dataset.source) as PanelSource;
    } catch {
      console.warn('mon-chart-panel: data-measure or data-source is not valid JSON');
      this.showState('error');
      return;
    }
    const program = this.dataset.program || '';
    const tools = this.q<HTMLElement>('[data-tools]');
    const pickWrap = this.q<HTMLElement>('[data-pick-wrap]');
    const pick = this.q<SelectLike>('[data-pick]');
    const view = this.q<ToggleLike>('[data-view]');
    const csv = this.q<HTMLElement>('[data-csv]');
    const loading = this.q<HTMLElement>('[data-loading]');
    const chart = this.q<MonChart>('mon-chart');
    const tableWrap = this.q<HTMLElement>('[data-table]');
    if (!chart || !tableWrap || !view) {
      console.warn('mon-chart-panel: missing chart, table, or view toggle markup');
      return;
    }

    await customElements.whenDefined('esa-button-toggle');
    view.options = [
      { label: 'Chart', value: 'chart' },
      { label: 'Table', value: 'table' },
    ];
    view.value = 'chart';

    let all: Attributes[];
    try {
      all = await queryPanelRows(measure, source);
    } catch (err) {
      console.warn(`${measure.title}: ${err instanceof Error ? err.message : String(err)}`);
      this.showState('error');
      return;
    }
    this.data_ = { measure, rows: all };
    this.dispatchEvent(new CustomEvent<PanelData>('mon-chart-panel:data', { bubbles: true, detail: this.data_ }));
    if (!all.length) {
      this.showState('empty');
      return;
    }

    const choices = pickChoices(measure, all);
    let picked = defaultPick(measure, all, choices);
    const columns = measureColumns(measure);
    let rows: Attributes[] = [];
    let tableBuilt = false;
    const buildTable = (): void => {
      if (tableBuilt) return;
      tableWrap.innerHTML = tableMarkup(measure.title, columns, rows, measure.format);
      tableBuilt = true;
    };
    const draw = (): void => {
      rows = measureView(measure, pickedRows(measure, all, picked));
      chart.spec = measureChartSpec(measure, rows);
      tableBuilt = false;
      if (!tableWrap.hidden) buildTable();
    };
    draw();

    if (pick && pickWrap) {
      if (choices.length > 1) {
        await customElements.whenDefined('esa-select');
        pick.options = choices.map((c) => ({ label: c, value: c }));
        pick.value = picked ?? '';
        pick.addEventListener('change', (e) => {
          const value = (e as CustomEvent<{ value?: string | string[] }>).detail?.value;
          if (typeof value === 'string' && value !== picked) {
            picked = value;
            draw();
          }
        });
        pickWrap.hidden = false;
      } else {
        pickWrap.remove();
      }
    }

    view.addEventListener('change', (e) => {
      const table = (e as CustomEvent<{ value?: string }>).detail?.value === 'table';
      if (table) buildTable();
      tableWrap.hidden = !table;
      chart.hidden = table;
    });

    if (csv) {
      csv.addEventListener('click', () => {
        downloadText(toCsv(columns, rows), csvFileName([program, measure.title, picked]), 'text/csv;charset=utf-8');
      });
    }

    if (loading) loading.hidden = true;
    chart.hidden = false;
    if (tools) tools.hidden = false;
    this.dataset.rows = String(rows.length);
    this.settle('ready');
  }
}

if (!customElements.get('mon-chart-panel')) customElements.define('mon-chart-panel', MonChartPanel);

declare global {
  interface HTMLElementTagNameMap {
    'mon-chart-panel': MonChartPanel;
  }
}
