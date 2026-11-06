/**
 * Allowlist HTML sanitizer for LT Info CMS rich text (MonitoringApproach,
 * MonitoringProgramDescription). No dependency, no DOM: it runs at build time in
 * Node and in tests.
 *
 * How it works: a small tokenizer walks the string once with explicit states
 * (text, comment, tag with quoted attributes, raw text inside script and style)
 * and REBUILDS the output from parsed pieces. Nothing from the input is copied
 * through except text characters, which are escaped. Tags not on the allowlist
 * are dropped and their contents kept (script and style lose their contents too);
 * attributes not on the allowlist are dropped; a closing tag only ever closes an
 * element this sanitizer opened, and anything left open is closed at the end, so
 * the output is well formed.
 *
 * Kept: p, br, strong, b, em, i, u, ul, ol, li, h3, h4, blockquote, and a with
 * href (http, https, mailto only) and title. h1 and h2 become h3, h5 and h6
 * become h4, so a heading the CMS author set still reads as one. Links get
 * target="_blank" and rel="noopener" because the pages render inside the LT Info
 * Dashboard card iframe and a same-frame navigation would replace the dashboard.
 * Text entities the CMS wrote (&nbsp;, &ldquo;) pass through untouched; only
 * attribute values are decoded, and only to check the URL scheme.
 *
 * Character escapes are written with String.fromCharCode rather than \u
 * sequences so no editor can turn them into raw control characters in source.
 */

const ALLOWED = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote', 'a']);
const VOID = new Set(['br']);
/** Tags whose contents are dropped along with the tag. */
const RAW_TEXT = new Set(['script', 'style']);
const DEMOTE: Record<string, string> = { h1: 'h3', h2: 'h3', h5: 'h4', h6: 'h4' };
const SAFE_HREF = /^(?:https?:\/\/|mailto:)/i;

export const SANITIZE_ALLOWED_TAGS: readonly string[] = [...ALLOWED];

const ch = (code: number) => String.fromCharCode(code);
const NBSP = ch(0xa0);

/**
 * Characters stripped from an href before the scheme check and from the emitted
 * value: C0 controls and space (0x00 to 0x20), DEL and C1 controls (0x7f to
 * 0x9f), zero-width characters (0x200b to 0x200f), the line and paragraph
 * separators (0x2028, 0x2029), and the byte order mark (0xfeff). Browsers strip
 * most of these when parsing a URL, which is how "java\tscript:" sneaks past a
 * naive prefix test.
 */
const CONTROL_CHARS = new RegExp(
  `[${ch(0)}-${ch(0x20)}${ch(0x7f)}-${ch(0x9f)}${ch(0x200b)}-${ch(0x200f)}${ch(0x2028)}${ch(0x2029)}${ch(0xfeff)}]`,
  'g',
);

/** Escape text for a text node. Existing entities stay; stray &, <, and > are escaped. */
function escapeText(s: string): string {
  return s
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d{1,7}|#[xX][0-9a-fA-F]{1,6});)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape a decoded string for an attribute value in double quotes. */
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: NBSP,
  tab: '\t',
  newline: '\n',
  colon: ':',
  sol: '/',
  ldquo: ch(0x201c),
  rdquo: ch(0x201d),
  lsquo: ch(0x2018),
  rsquo: ch(0x2019),
  ndash: ch(0x2013),
  mdash: ch(0x2014),
  hellip: ch(0x2026),
  copy: ch(0xa9),
  reg: ch(0xae),
  deg: ch(0xb0),
};

/** Decode the entities this module knows. Unknown named entities are left as written. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#[xX][0-9a-fA-F]{1,6}|#\d{1,7}|[a-zA-Z][a-zA-Z0-9]{1,31});?/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const named = NAMED[body.toLowerCase()];
    return named ?? whole;
  });
}

/** True for an href this sanitizer will keep: http, https, or mailto after decoding and stripping control characters. */
export function isSafeHref(raw: string): boolean {
  const decoded = decodeEntities(raw).replace(CONTROL_CHARS, '');
  return SAFE_HREF.test(decoded);
}

const ATTR = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** The attribute string for an <a>: href and title only, or null when there is no safe href. */
function linkAttrs(attrText: string): string | null {
  let href: string | null = null;
  let title: string | null = null;
  ATTR.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR.exec(attrText))) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    if (name === 'href' && href === null && isSafeHref(value)) {
      href = decodeEntities(value).replace(CONTROL_CHARS, '');
    } else if (name === 'title' && title === null) {
      title = decodeEntities(value);
    }
  }
  if (!href) return null;
  let out = ` href="${escapeAttr(href)}"`;
  if (title) out += ` title="${escapeAttr(title)}"`;
  out += ' target="_blank" rel="noopener"';
  return out;
}

/**
 * Sanitize CMS HTML to the allowlist. Returns '' for null, undefined, or input
 * with no text left after sanitizing (so callers can test for an empty state).
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  const s = String(input);
  const out: string[] = [];
  const stack: string[] = [];
  const tagStart = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)/y;
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt < 0) {
      out.push(escapeText(s.slice(i)));
      break;
    }
    if (lt > i) out.push(escapeText(s.slice(i, lt)));
    if (s.startsWith('<!--', lt)) {
      const end = s.indexOf('-->', lt + 4);
      i = end < 0 ? s.length : end + 3;
      continue;
    }
    const next = s[lt + 1];
    if (next === '!' || next === '?') {
      const end = s.indexOf('>', lt);
      i = end < 0 ? s.length : end + 1;
      continue;
    }
    tagStart.lastIndex = lt;
    const m = tagStart.exec(s);
    if (!m) {
      out.push('&lt;');
      i = lt + 1;
      continue;
    }
    // Find the end of the tag, honoring quoted attribute values.
    let j = lt + m[0].length;
    let quote: string | null = null;
    while (j < s.length) {
      const c = s[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
      j++;
    }
    if (j >= s.length) {
      // An unterminated tag: drop it and whatever trailed it.
      break;
    }
    const attrText = s.slice(lt + m[0].length, j);
    const closing = m[1] === '/';
    let name = m[2].toLowerCase();
    i = j + 1;

    if (RAW_TEXT.has(name)) {
      if (!closing) {
        const closer = new RegExp(`</${name}\\s*>`, 'ig');
        closer.lastIndex = i;
        const mm = closer.exec(s);
        i = mm ? mm.index + mm[0].length : s.length;
      }
      continue;
    }
    name = DEMOTE[name] ?? name;
    if (!ALLOWED.has(name)) continue;

    if (closing) {
      if (VOID.has(name)) continue;
      const idx = stack.lastIndexOf(name);
      if (idx < 0) continue;
      while (stack.length > idx) out.push(`</${stack.pop() as string}>`);
      continue;
    }
    if (VOID.has(name)) {
      out.push(`<${name}>`);
      continue;
    }
    let attrs = '';
    if (name === 'a') {
      const link = linkAttrs(attrText);
      // An anchor with no safe href is dropped; its text stays. Its closing tag
      // finds nothing on the stack and is dropped too.
      if (!link) continue;
      attrs = link;
    }
    out.push(`<${name}${attrs}>`);
    stack.push(name);
    if (/\/\s*$/.test(attrText)) out.push(`</${stack.pop() as string}>`);
  }
  while (stack.length) out.push(`</${stack.pop() as string}>`);
  const html = out.join('').trim();
  return isBlank(html) ? '' : html;
}

/** The text of an HTML string: tags removed (script and style with their contents), entities decoded, whitespace collapsed. */
export function textContent(html: string | null | undefined): string {
  if (!html) return '';
  const noRaw = String(html).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  const noTags = noRaw.replace(/<[^>]*>/g, ' ');
  return decodeEntities(noTags).replace(/\s+/g, ' ').trim();
}

/** True when the HTML carries no visible text. */
export function isBlank(html: string | null | undefined): boolean {
  return textContent(html).split(NBSP).join('').trim() === '';
}
