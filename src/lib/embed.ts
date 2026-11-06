/**
 * The LT Info embed contract for program pages.
 *
 * Every program page is shown inside an iframe in the Dashboard card of its
 * program page on monitoring.laketahoeinfo.org, and is also opened standalone.
 * Framed, the page drops its chrome, takes the card body color, and posts its
 * height to the parent so the card can grow to fit. The reference template in
 * ltinfo-monitoring-dashboard does the same with inline script; this module is
 * its typed home for the Astro spoke.
 *
 * The functions at the top are pure (no DOM at module scope) so Node can run
 * the unit tests in tests/embed.test.ts. DOM access happens only inside the
 * functions that take a Document or Window, and only when they are called.
 */
import type { Template } from './programs.ts';

/** Message type the parent page listens for. Keep in step with host-harness.html. */
export const HEIGHT_MESSAGE_TYPE = 'ltinfo-embed:height';
/** Class set on <html> when the page is framed. CSS keys the chrome off it. */
export const EMBED_CLASS = 'is-embed';
/** Attribute that marks chrome shown only standalone (app bar, hero, side nav, footer). */
export const STANDALONE_ATTRIBUTE = 'data-standalone';
/** Debounce for resize and ResizeObserver driven height posts. */
export const HEIGHT_DEBOUNCE_MS = 100;

/* Mirrors TEMPLATES in programs.ts. Duplicated on purpose: importing it from
   there would pull programs.json into the browser bundle. tests/embed.test.ts
   asserts the two lists agree. */
const TEMPLATE_VALUES: ReadonlySet<string> = new Set(['charts', 'map', 'context']);

export interface HeightMessage {
  type: typeof HEIGHT_MESSAGE_TYPE;
  height: number;
}

export function heightMessage(height: number): HeightMessage {
  return { type: HEIGHT_MESSAGE_TYPE, height };
}

export function isHeightMessage(data: unknown): data is HeightMessage {
  if (typeof data !== 'object' || data === null) return false;
  const record = data as Record<string, unknown>;
  return record.type === HEIGHT_MESSAGE_TYPE && typeof record.height === 'number' && Number.isFinite(record.height);
}

/**
 * True when the page is inside a frame. Reading `top` across origins can
 * throw in some browsers; a throw means there is a parent, so that counts as framed.
 */
export function isEmbedded(win: { self: unknown; top: unknown } = window): boolean {
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}

/** The ?template= value from a query string, when it names one of the three layouts. */
export function parseTemplateOverride(search: string): Template | null {
  const value = new URLSearchParams(search).get('template');
  return value !== null && TEMPLATE_VALUES.has(value) ? (value as Template) : null;
}

/** Trailing debounce: the call runs once, `ms` after the last invocation. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number = HEIGHT_DEBOUNCE_MS): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, ms);
  };
}

/**
 * Builds the poster: measure the page, and send only when the height changed
 * since the last send. Heights are rounded up so a fractional layout never
 * leaves a one pixel scrollbar in the host's iframe.
 */
export function createHeightPoster(send: (message: HeightMessage) => void, measure: () => number): () => void {
  let last = -1;
  return () => {
    const height = Math.ceil(measure());
    if (!Number.isFinite(height) || height <= 0 || height === last) return;
    last = height;
    send(heightMessage(height));
  };
}

/**
 * Framed only: marks <html> with is-embed, paints the page the card body color
 * (the theme pins --color-background-default to #f7f7f7), and hides every
 * element marked data-standalone. Returns whether the page is framed.
 */
export function applyEmbedMode(doc: Document = document): boolean {
  const win = doc.defaultView ?? window;
  if (!isEmbedded(win)) return false;
  doc.documentElement.classList.add(EMBED_CLASS);
  doc.body.style.background = 'var(--color-background-default, #f7f7f7)';
  doc.querySelectorAll<HTMLElement>(`[${STANDALONE_ATTRIBUTE}]`).forEach((el) => {
    el.hidden = true;
  });
  return true;
}

/**
 * Posts { type: 'ltinfo-embed:height', height } to the parent now, on load, on
 * resize, and on any size change of document.body (ResizeObserver), the last
 * two debounced to HEIGHT_DEBOUNCE_MS, and only when the height changed.
 * Returns a function that stops posting.
 */
export function startHeightPosting(win: Window = window): () => void {
  const doc = win.document;
  const post = createHeightPoster(
    (message) => win.parent.postMessage(message, '*'),
    () => doc.documentElement.scrollHeight,
  );
  const debounced = debounce(post, HEIGHT_DEBOUNCE_MS);
  post();
  win.addEventListener('load', post);
  win.addEventListener('resize', debounced);
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(debounced);
  observer?.observe(doc.body);
  return () => {
    win.removeEventListener('load', post);
    win.removeEventListener('resize', debounced);
    observer?.disconnect();
  };
}

/**
 * Reads ?template= from the page URL and, when it is charts, map, or context,
 * sets data-template on <main>. The section order is CSS keyed off that
 * attribute, so the page reorders without re-rendering. Returns the override.
 */
export function applyTemplateOverride(doc: Document = document, search: string = doc.location.search): Template | null {
  const template = parseTemplateOverride(search);
  if (template) doc.querySelector('main')?.setAttribute('data-template', template);
  return template;
}

/**
 * Everything a program page does on the client for the embed contract. Height
 * posting starts only when framed: standalone, window.parent is the page
 * itself and the messages would have no listener.
 */
export function initEmbed(): void {
  applyTemplateOverride();
  if (applyEmbedMode()) startHeightPosting();
}
