import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMBED_CLASS,
  HEIGHT_DEBOUNCE_MS,
  HEIGHT_MESSAGE_TYPE,
  STANDALONE_ATTRIBUTE,
  createHeightPoster,
  debounce,
  heightMessage,
  isEmbedded,
  isHeightMessage,
  parseTemplateOverride,
} from '../src/lib/embed.ts';
import { TEMPLATES } from '../src/lib/programs.ts';

test('the contract constants match the host side', () => {
  assert.equal(HEIGHT_MESSAGE_TYPE, 'ltinfo-embed:height');
  assert.equal(EMBED_CLASS, 'is-embed');
  assert.equal(STANDALONE_ATTRIBUTE, 'data-standalone');
  assert.equal(HEIGHT_DEBOUNCE_MS, 100);
});

test('heightMessage builds the message the host listens for', () => {
  assert.deepEqual(heightMessage(1234), { type: 'ltinfo-embed:height', height: 1234 });
  assert.equal(isHeightMessage(heightMessage(10)), true);
  assert.equal(isHeightMessage({ type: 'ltinfo-embed:height', height: 'tall' }), false);
  assert.equal(isHeightMessage({ type: 'other', height: 10 }), false);
  assert.equal(isHeightMessage(null), false);
  assert.equal(isHeightMessage('ltinfo-embed:height'), false);
});

test('isEmbedded compares self with top and treats a throwing top as framed', () => {
  const same = {};
  assert.equal(isEmbedded({ self: same, top: same }), false);
  assert.equal(isEmbedded({ self: {}, top: {} }), true);
  const hostile = {
    self: {},
    get top(): unknown {
      throw new Error('cross-origin');
    },
  };
  assert.equal(isEmbedded(hostile), true);
});

test('parseTemplateOverride accepts only charts, map, and context', () => {
  assert.equal(parseTemplateOverride('?template=map'), 'map');
  assert.equal(parseTemplateOverride('?x=1&template=context'), 'context');
  assert.equal(parseTemplateOverride('?template=charts'), 'charts');
  assert.equal(parseTemplateOverride('?template=Map'), null);
  assert.equal(parseTemplateOverride('?template=table'), null);
  assert.equal(parseTemplateOverride('?template='), null);
  assert.equal(parseTemplateOverride(''), null);
  assert.equal(parseTemplateOverride('?other=map'), null);
});

test('the template names in embed.ts agree with TEMPLATES in programs.ts', () => {
  for (const template of TEMPLATES) {
    assert.equal(parseTemplateOverride(`?template=${template}`), template);
  }
});

test('createHeightPoster sends only when the rounded height changes', () => {
  const sent: number[] = [];
  let height = 600.2;
  const post = createHeightPoster((message) => sent.push(message.height), () => height);
  post();
  post();
  assert.deepEqual(sent, [601], 'a repeat of the same height is not sent');
  height = 601;
  post();
  assert.deepEqual(sent, [601], 'a change inside the rounding is not sent');
  height = 742;
  post();
  height = 0;
  post();
  height = Number.NaN;
  post();
  height = 742;
  post();
  assert.deepEqual(sent, [601, 742], 'zero and NaN are skipped and do not reset the last height');
});

test('debounce runs once, after the quiet period, with the last arguments', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const calls: number[] = [];
    const fn = debounce((n: number) => calls.push(n), 100);
    fn(1);
    fn(2);
    mock.timers.tick(99);
    assert.deepEqual(calls, []);
    fn(3);
    mock.timers.tick(99);
    assert.deepEqual(calls, [], 'each call restarts the wait');
    mock.timers.tick(1);
    assert.deepEqual(calls, [3]);
    fn(4);
    mock.timers.tick(100);
    assert.deepEqual(calls, [3, 4]);
  } finally {
    mock.timers.reset();
  }
});
