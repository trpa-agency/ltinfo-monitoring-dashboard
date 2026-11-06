/* mon-lego-checked: esa-text-field is the filter and esa-badge the "Not mapped" tag (cloned from a
   template the panel renders at build time, because esa-badge is an Astro lego and rows render in
   the browser); no esa-* lists grouped, selectable rows synced to a map, so mon-site-list is the
   reusable home. Light DOM, so the Ecology legos and page tokens apply. */

/*
 * <mon-site-list unit="site">
 *   <template data-mon-badge><EsaBadge value="Not mapped" size="xs" /></template>
 * </mon-site-list>
 *
 * API:
 *   list.setItems(items, groups)      rows and their groups, from src/lib/sites.ts
 *   list.select(key, { scroll })      mark a row current (and scroll it into view in the list)
 *   list.message = 'Loading sites'    replaces the count line while loading or after an error
 *   'siteselect' CustomEvent          detail.key, when a row is clicked
 *
 * Ported from placeList and wireSiteList in templates/program-dashboard.html: grouped rows with
 * sticky headings and counts, a filter box, a count line, and a click that hands the key back.
 */

import '@esa/ecology/esa-text-field';
import { countLine, plural, type ListGroup, type ListItem } from '../../lib/sites.ts';

export interface SiteSelectDetail {
  key: string;
}

type TextField = HTMLElement & { value: string };

const STYLE_ID = 'mon-site-list-styles';

/* Light DOM styles, added to the document once. Every value reads an Ecology token with a literal fallback. */
const STYLES = `
.mon-site-list {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
  border-radius: var(--radius-sm, 0.25rem);
  background: var(--color-background-elevation-raised, #ffffff);
  color: var(--color-content-default, #333333);
  font-family: var(--typography-font-family-sans, 'Lexend Deca', system-ui, sans-serif);
}
.mon-site-list__tools {
  flex: none;
  display: grid;
  gap: var(--spacing-100, 0.25rem);
  padding: var(--spacing-300, 0.75rem);
  border-bottom: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
}
.mon-site-list__tools esa-text-field {
  display: block;
}
.mon-site-list__count {
  margin: 0;
  min-height: 1.2em;
  font-size: var(--font-size-050, 0.75rem);
  line-height: 1.4;
  color: var(--color-content-default-secondary, #646464);
}
.mon-site-list__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.mon-site-list__groups,
.mon-site-list__rows {
  margin: 0;
  padding: 0;
  list-style: none;
}
.mon-site-list__heading {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0;
  padding: var(--spacing-150, 0.375rem) var(--spacing-300, 0.75rem);
  font-size: var(--font-size-050, 0.75rem);
  font-weight: var(--typography-font-weight-semibold, 600);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-content-default-secondary, #646464);
  background: var(--color-background-default, #f7f7f7);
  border-bottom: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
}
.mon-site-list__n {
  font-weight: var(--typography-font-weight-regular, 400);
}
.mon-site-list__row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-200, 0.5rem);
  width: 100%;
  padding: var(--spacing-200, 0.5rem) var(--spacing-300, 0.75rem);
  border: 0;
  border-bottom: var(--border-width-default, 1px) solid var(--color-border-default-subtle, #d9d9d9);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.mon-site-list__row:hover {
  background: var(--color-background-elevation-sunken, #efefef);
}
.mon-site-list__row[aria-current="true"] {
  background: var(--color-background-brand-subtle, #fcfdfb);
  box-shadow: inset 3px 0 0 var(--color-background-brand, #789440);
}
.mon-site-list__row:disabled {
  cursor: default;
  color: var(--color-content-disabled, #8d8d8d);
}
.mon-site-list__row:disabled:hover {
  background: transparent;
}
.mon-site-list__row:focus-visible {
  outline: var(--border-width-focus, 2px) solid var(--color-border-default-focus, #789440);
  outline-offset: -2px;
}
.mon-site-list__dot {
  flex: none;
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--mon-dot, #8d8d8d);
  box-shadow: 0 0 0 1.5px var(--color-background-elevation-raised, #ffffff), 0 0 0 2.5px var(--color-border-default-subtle, #d9d9d9);
}
.mon-site-list__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.mon-site-list__name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-100, 0.25rem);
  font-size: var(--font-size-100, 0.875rem);
  font-weight: var(--typography-font-weight-medium, 500);
  line-height: 1.3;
}
.mon-site-list__meta {
  font-size: var(--font-size-050, 0.75rem);
  line-height: 1.4;
  color: var(--color-content-default-secondary, #646464);
}
.mon-site-list__empty {
  margin: 0;
  padding: var(--spacing-400, 1rem);
  font-size: var(--font-size-100, 0.875rem);
  text-align: center;
  color: var(--color-content-default-secondary, #646464);
}
`;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.append(style);
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, textContent?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent != null) node.textContent = textContent;
  return node;
}

export class MonSiteList extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['unit'];
  }

  #items: ListItem[] = [];
  #groups: ListGroup[] = [{ value: null, label: '' }];
  #query = '';
  #message = '';
  #built = false;
  #badge: HTMLTemplateElement | null = null;
  #field: TextField | null = null;
  #count: HTMLElement | null = null;
  #scroll: HTMLElement | null = null;

  /** What one row is called: "site", "station", "assessment unit". */
  get unit(): string {
    return this.getAttribute('unit') || 'site';
  }

  set unit(value: string) {
    this.setAttribute('unit', value);
  }

  connectedCallback(): void {
    if (this.#built) return;
    ensureStyles();
    this.#build();
  }

  attributeChangedCallback(): void {
    if (this.#built) this.#updateCount();
  }

  get items(): ListItem[] {
    return this.#items;
  }

  /** Rows and the groups they file under, in group order. The current row and any message are cleared. */
  setItems(items: ListItem[], groups: ListGroup[]): void {
    this.#items = items;
    this.#groups = groups.length ? groups : [{ value: null, label: '' }];
    this.#message = '';
    this.#render();
  }

  /** Text for the count line while loading or after an error. Setting it clears the rows. */
  get message(): string {
    return this.#message;
  }

  set message(text: string) {
    this.#message = text;
    if (text) {
      this.#items = [];
      this.#render();
    } else {
      this.#updateCount();
    }
  }

  /** Mark one row current (null clears). With scroll, bring it into view inside the list without moving the page. */
  select(key: string | null, options: { scroll?: boolean } = {}): void {
    const rows = this.#scroll?.querySelectorAll<HTMLButtonElement>('.mon-site-list__row') ?? [];
    let target: HTMLButtonElement | null = null;
    rows.forEach((row) => {
      const on = key != null && row.dataset.key === key;
      row.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) target = row;
    });
    if (target && options.scroll) this.#reveal(target);
  }

  #build(): void {
    this.classList.add('mon-site-list');
    this.#badge = this.querySelector<HTMLTemplateElement>('template[data-mon-badge]');
    this.#badge?.remove();

    const tools = element('div', 'mon-site-list__tools');
    const field = document.createElement('esa-text-field') as TextField;
    field.setAttribute('label', 'Filter sites');
    field.setAttribute('size', 'sm');
    field.setAttribute('placeholder', 'Part of a name');
    field.setAttribute('autocomplete', 'off');
    field.addEventListener('change', (event) => {
      const detail = (event as CustomEvent<{ value?: string }>).detail;
      const value = detail && typeof detail.value === 'string' ? detail.value : field.value || '';
      this.#query = value.trim().toLowerCase();
      this.#applyFilter();
    });
    const count = element('p', 'mon-site-list__count');
    count.setAttribute('aria-live', 'polite');
    tools.append(field, count);

    const scroll = element('div', 'mon-site-list__scroll');
    scroll.addEventListener('click', (event) => {
      const row = (event.target as HTMLElement).closest<HTMLButtonElement>('.mon-site-list__row');
      if (!row || row.disabled) return;
      const key = row.dataset.key || '';
      this.select(key);
      this.dispatchEvent(new CustomEvent<SiteSelectDetail>('siteselect', { detail: { key }, bubbles: true, composed: true }));
    });

    this.append(tools, scroll);
    this.#field = field;
    this.#count = count;
    this.#scroll = scroll;
    this.#built = true;
    this.#render();
  }

  #render(): void {
    const scroll = this.#scroll;
    if (!scroll) return;
    scroll.replaceChildren();
    if (!this.#items.length) {
      if (!this.#message) scroll.append(element('p', 'mon-site-list__empty', `No ${plural(0, this.unit)} to list.`));
      this.#updateCount(0);
      return;
    }
    const groups = element('ul', 'mon-site-list__groups');
    groups.setAttribute('role', 'list');
    for (const group of this.#groups) {
      const inGroup = this.#items.filter((item) => item.group === group.value);
      if (!inGroup.length) continue;
      const wrapper = element('li', 'mon-site-list__group');
      if (group.label) {
        const heading = element('h4', 'mon-site-list__heading', `${group.label} `);
        heading.append(element('span', 'mon-site-list__n', `(${inGroup.length.toLocaleString('en-US')})`));
        wrapper.append(heading);
      }
      const rows = element('ul', 'mon-site-list__rows');
      rows.setAttribute('role', 'list');
      for (const item of inGroup) rows.append(this.#row(item));
      wrapper.append(rows);
      groups.append(wrapper);
    }
    scroll.append(groups);
    this.#applyFilter();
  }

  #row(item: ListItem): HTMLLIElement {
    const li = element('li', 'mon-site-list__item');
    li.dataset.search = item.search || item.name.toLowerCase();
    const button = element('button', 'mon-site-list__row');
    button.type = 'button';
    button.dataset.key = item.key;
    button.setAttribute('aria-current', 'false');
    if (!item.mapped) button.disabled = true;
    const dot = element('span', 'mon-site-list__dot');
    dot.setAttribute('aria-hidden', 'true');
    // The dot color is data: the status or rating color of this row.
    dot.style.setProperty('--mon-dot', item.color);
    const text = element('span', 'mon-site-list__text');
    const name = element('span', 'mon-site-list__name', item.name);
    if (!item.mapped) name.append(this.#badgeNode());
    text.append(name);
    if (item.meta) text.append(element('span', 'mon-site-list__meta', item.meta));
    button.append(dot, text);
    li.append(button);
    return li;
  }

  #badgeNode(): Node {
    const source = this.#badge?.content.firstElementChild;
    if (source) {
      const clone = source.cloneNode(true) as HTMLElement;
      clone.classList.add('mon-site-list__tag');
      return clone;
    }
    return element('span', 'mon-site-list__tag', 'Not mapped');
  }

  #applyFilter(): void {
    const scroll = this.#scroll;
    if (!scroll) return;
    const query = this.#query;
    let shown = 0;
    scroll.querySelectorAll<HTMLLIElement>('.mon-site-list__item').forEach((li) => {
      const hit = !query || (li.dataset.search || '').includes(query);
      li.hidden = !hit;
      if (hit) shown++;
    });
    scroll.querySelectorAll<HTMLLIElement>('.mon-site-list__group').forEach((group) => {
      group.hidden = !group.querySelector('.mon-site-list__item:not([hidden])');
    });
    this.#updateCount(shown);
  }

  #updateCount(shown?: number): void {
    const count = this.#count;
    if (!count) return;
    if (this.#message) {
      count.textContent = this.#message;
      return;
    }
    const total = this.#items.length;
    if (!total) {
      count.textContent = '';
      return;
    }
    const visible = shown ?? this.#scroll?.querySelectorAll('.mon-site-list__item:not([hidden])').length ?? total;
    count.textContent = countLine(total, visible, !!this.#query, this.unit);
  }

  #reveal(row: HTMLButtonElement): void {
    const scroll = this.#scroll;
    if (!scroll) return;
    const item = row.closest<HTMLElement>('.mon-site-list__item');
    if (item?.hidden) {
      // The row is filtered out: clear the filter so the selection is visible.
      this.#query = '';
      if (this.#field) this.#field.value = '';
      this.#applyFilter();
    }
    const heading = row.closest('.mon-site-list__group')?.querySelector<HTMLElement>('.mon-site-list__heading');
    const headingHeight = heading ? heading.offsetHeight : 0;
    const rowRect = row.getBoundingClientRect();
    const scrollRect = scroll.getBoundingClientRect();
    const top = rowRect.top - scrollRect.top;
    const bottom = rowRect.bottom - scrollRect.top;
    if (top < headingHeight || bottom > scroll.clientHeight) {
      scroll.scrollTo({ top: scroll.scrollTop + top - headingHeight - 8, behavior: 'smooth' });
    }
  }
}

if (!customElements.get('mon-site-list')) customElements.define('mon-site-list', MonSiteList);

declare global {
  interface HTMLElementTagNameMap {
    'mon-site-list': MonSiteList;
  }
}
