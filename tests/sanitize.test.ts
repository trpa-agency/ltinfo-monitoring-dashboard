import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { decodeEntities, isBlank, isSafeHref, sanitizeHtml, textContent } from '../src/lib/sanitize.ts';

const fixture = (id: number) =>
  JSON.parse(readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'ltinfo', String(id), 'record.json'), 'utf8')) as {
    MonitoringApproach: string | null;
    MonitoringProgramDescription: string | null;
  };

test('keeps the allowlisted tags and drops the rest, keeping their text', () => {
  const html = '<div><p>One <strong>two</strong> <em>three</em> <b>b</b> <i>i</i> <u>u</u></p><span>four</span><ul><li>a</li><li>b</li></ul><ol><li>c</li></ol><h3>H3</h3><h4>H4</h4><blockquote>q</blockquote></div>';
  assert.equal(
    sanitizeHtml(html),
    '<p>One <strong>two</strong> <em>three</em> <b>b</b> <i>i</i> <u>u</u></p>four<ul><li>a</li><li>b</li></ul><ol><li>c</li></ol><h3>H3</h3><h4>H4</h4><blockquote>q</blockquote>',
  );
});

test('demotes h1 and h2 to h3 and h5 and h6 to h4', () => {
  assert.equal(sanitizeHtml('<h1>a</h1><h2>b</h2><h5>c</h5><h6>d</h6>'), '<h3>a</h3><h3>b</h3><h4>c</h4><h4>d</h4>');
});

test('removes script and style with their contents', () => {
  assert.equal(sanitizeHtml('<p>a</p><script>alert(1)</script><p>b</p>'), '<p>a</p><p>b</p>');
  assert.equal(sanitizeHtml('<p>a</p><style>p{display:none}</style>b'), '<p>a</p>b');
  assert.equal(sanitizeHtml('<SCRIPT SRC="x.js"></SCRIPT ><p>ok</p>'), '<p>ok</p>');
  // An unclosed script swallows the rest of the input rather than leaking it.
  assert.equal(sanitizeHtml('<p>a</p><script>alert(1)<p>b</p>'), '<p>a</p>');
});

test('drops event handlers, style, class, id, and data attributes', () => {
  assert.equal(sanitizeHtml('<p onclick="x()" style="color:red" class="c" id="i" data-x="1">t</p>'), '<p>t</p>');
  assert.equal(sanitizeHtml('<strong onmouseover=alert(1)>t</strong>'), '<strong>t</strong>');
  assert.equal(sanitizeHtml('<img src=x onerror=alert(1)>text'), 'text');
  assert.equal(sanitizeHtml('<svg onload=alert(1)><circle/></svg>t'), 't');
});

test('keeps only safe link schemes and adds rel noopener', () => {
  assert.equal(
    sanitizeHtml('<a href="https://www.census.gov/x" title="Census">ACS</a>'),
    '<a href="https://www.census.gov/x" title="Census" target="_blank" rel="noopener">ACS</a>',
  );
  assert.equal(sanitizeHtml('<a href="http://example.org">h</a>'), '<a href="http://example.org" target="_blank" rel="noopener">h</a>');
  assert.equal(sanitizeHtml('<a href="mailto:a@b.org">m</a>'), '<a href="mailto:a@b.org" target="_blank" rel="noopener">m</a>');
  assert.equal(sanitizeHtml("<a href='https://x.org/?a=1&b=2'>q</a>"), '<a href="https://x.org/?a=1&amp;b=2" target="_blank" rel="noopener">q</a>');
  // Other attributes on a link go.
  assert.equal(
    sanitizeHtml('<a href="https://x.org" target="_top" onclick="x()" rel="x" download>l</a>'),
    '<a href="https://x.org" target="_blank" rel="noopener">l</a>',
  );
});

test('drops javascript, data, vbscript, relative, and obfuscated hrefs, keeping the text', () => {
  for (const href of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java&Tab;script:alert(1)',
    'java&#9;script:alert(1)',
    'java&#x09;script:alert(1)',
    '&#106;avascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox',
    '/relative/path',
    '#anchor',
    '//protocol-relative.example',
    'ftp://files.example',
    '',
  ]) {
    assert.equal(sanitizeHtml(`<a href="${href}">text</a>`), 'text', `href ${JSON.stringify(href)} must be dropped`);
    assert.equal(isSafeHref(href), false, `isSafeHref(${JSON.stringify(href)})`);
  }
  assert.equal(sanitizeHtml('<a href=javascript:alert(1)>x</a>'), 'x');
  assert.equal(sanitizeHtml('<a name="n">no href</a>'), 'no href');
});

test('escapes stray angle brackets and ampersands but leaves written entities alone', () => {
  assert.equal(sanitizeHtml('a < b & c > d'), 'a &lt; b &amp; c &gt; d');
  assert.equal(sanitizeHtml('<p>Tom &amp; Jerry&nbsp;&ldquo;quoted&rdquo; &#8217; &#x2019;</p>'), '<p>Tom &amp; Jerry&nbsp;&ldquo;quoted&rdquo; &#8217; &#x2019;</p>');
  assert.equal(sanitizeHtml('<p>x <3 y</p>'), '<p>x &lt;3 y</p>');
  assert.equal(sanitizeHtml('<p>a<!-- hidden <script>alert(1)</script> -->b</p>'), '<p>ab</p>');
  assert.equal(sanitizeHtml('<!DOCTYPE html><?xml version="1.0"?><p>d</p>'), '<p>d</p>');
});

test('closes unclosed tags, drops stray closers, and handles nesting', () => {
  assert.equal(sanitizeHtml('<p>one<p>two'), '<p>one<p>two</p></p>'.replace('<p>one<p>two</p></p>', '<p>one<p>two</p></p>'));
  assert.equal(sanitizeHtml('<ul><li>a<li>b</ul>'), '<ul><li>a<li>b</li></li></ul>');
  assert.equal(sanitizeHtml('</p>text</strong>'), 'text');
  assert.equal(sanitizeHtml('<strong><em>x</strong></em>'), '<strong><em>x</em></strong>');
  assert.equal(sanitizeHtml('<p>a <br> b <br/> c</p>'), '<p>a <br> b <br> c</p>');
  assert.equal(sanitizeHtml('<p>unterminated <a href="https://x.org"'), '<p>unterminated </p>');
  assert.equal(sanitizeHtml('<p title="a>b">x</p>'), '<p>x</p>');
  assert.equal(sanitizeHtml('<p/>after'), '<p></p>after');
});

test('hostile payloads produce no executable markup', () => {
  const payloads = [
    '<img src="x" onerror="alert(1)">',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<object data="x"></object><embed src="x">',
    '<form action="https://evil"><input name=a></form>',
    '<a href="https://x.org"><script>alert(1)</script>t</a>',
    '<p><!--><script>alert(1)</script>--></p>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=1 onerror=alert(1)&gt;">',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    '<<script>script>alert(1)<</script>/script>',
    '<a href="https://x.org" href="javascript:alert(1)">double</a>',
    '<p style="background:url(javascript:alert(1))">s</p>',
    '<svg><a xlink:href="javascript:alert(1)"><text>s</text></a></svg>',
  ];
  for (const p of payloads) {
    const out = sanitizeHtml(p);
    assert.doesNotMatch(out, /<(script|img|iframe|object|embed|form|input|svg|math|style|noscript)\b/i, `${p} -> ${out}`);
    assert.doesNotMatch(out, /\son\w+\s*=/i, `${p} -> ${out}`);
    assert.doesNotMatch(out, /javascript:/i, `${p} -> ${out}`);
    assert.doesNotMatch(out, /<[^>]*<[^>]*>/, `${p} -> ${out} (nested bracket)`);
  }
});

test('output is stable under a second pass', () => {
  const samples = [
    '<p>Tom &amp; Jerry <a href="https://x.org/?a=1&b=2">l</a></p>',
    'a < b & c',
    '<ul><li>a<li>b</ul>',
    '<<script>script>alert(1)<</script>/script>',
  ];
  for (const s of samples) {
    const once = sanitizeHtml(s);
    assert.equal(sanitizeHtml(once), once, s);
  }
});

test('blank and null input return an empty string', () => {
  assert.equal(sanitizeHtml(null), '');
  assert.equal(sanitizeHtml(undefined), '');
  assert.equal(sanitizeHtml(''), '');
  assert.equal(sanitizeHtml('<p>&nbsp;</p>'), '');
  assert.equal(sanitizeHtml('<p>  </p><br>'), '');
  assert.equal(sanitizeHtml('<script>alert(1)</script>'), '');
  assert.equal(isBlank('<p>&nbsp;&nbsp;</p>'), true);
  assert.equal(isBlank('<p>a</p>'), false);
});

test('textContent and decodeEntities', () => {
  assert.equal(textContent('<p>Tom &amp; Jerry</p> <script>x</script><b>b</b>'), 'Tom & Jerry b');
  assert.equal(decodeEntities('&lt;&gt;&quot;&#39;&#x41;&unknown;'), '<>"\'A&unknown;');
  assert.equal(decodeEntities('&#1114112;'), '&#1114112;', 'out of range code point stays as written');
});

test('real CMS text from the fixtures survives with its markup and links', () => {
  const tyc = fixture(39);
  const approach = sanitizeHtml(tyc.MonitoringApproach);
  assert.match(approach, /^<p>Knowledge of TYC distribution/);
  assert.match(approach, /&ldquo;site&rdquo;/, 'written entities pass through');
  assert.match(approach, /<a href="http:\/\/www\.tahoeopendata\.org\/datasets\/yellow-cress" target="_blank" rel="noopener">Tahoe Open Data\.<\/a>/);
  assert.equal((approach.match(/<p>/g) ?? []).length, 2);
  assert.equal((approach.match(/<\/p>/g) ?? []).length, 2);

  const desc = sanitizeHtml(tyc.MonitoringProgramDescription);
  assert.match(desc, /Rorippa subumbellata/);
  assert.match(desc, /1970&rsquo;s/);

  const ozone = fixture(41);
  assert.equal(sanitizeHtml(ozone.MonitoringProgramDescription), '', 'null description is an empty string');
  assert.match(sanitizeHtml(ozone.MonitoringApproach), /^<p>Ozone is monitored/);

  const subalpine = fixture(83);
  assert.equal(sanitizeHtml(subalpine.MonitoringApproach), '<p>Ground-based plot data that inform remote sensing techniques to track change over time in species composition, health, and distribution in the subalpine zone.&nbsp;&nbsp;</p>');
});
