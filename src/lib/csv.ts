/*
 * csv.ts: RFC 4180 CSV from rows and columns. Pure, no DOM. The download step
 * (Blob plus an anchor click) lives in the component that owns the button.
 */

export interface CsvColumn {
  /** Row key. */
  field: string;
  /** Header text. */
  headerName: string;
}

/** One field, quoted when it holds a comma, a quote, or a line break. Quotes are doubled. */
export function csvField(v: unknown): string {
  if (v == null) return '';
  let s: string;
  if (typeof v === 'string') s = v;
  else if (typeof v === 'number') s = Number.isFinite(v) ? String(v) : '';
  else s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text with a header row, CRLF line endings, and a trailing line break. */
export function toCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const lines: string[] = [columns.map((c) => csvField(c.headerName)).join(',')];
  for (const r of rows) lines.push(columns.map((c) => csvField(r[c.field])).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

/** Lowercase, ASCII letters and digits, hyphens between words. */
export function slugify(s: string): string {
  const slug = s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'data';
}

/** File name from the parts that identify the data: program, title, and picked value. */
export function csvFileName(parts: (string | number | null | undefined)[]): string {
  return `${slugify(parts.filter((p) => p != null && p !== '').join(' '))}.csv`;
}
