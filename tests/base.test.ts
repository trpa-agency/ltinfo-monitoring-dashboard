import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinBase } from '../src/lib/base.ts';

test('joinBase joins a dev base of "/" without doubling the slash', () => {
  assert.equal(joinBase('/', 'spikes/air-quality/ozone.html'), '/spikes/air-quality/ozone.html');
  assert.equal(joinBase('/', '/spikes/air-quality/ozone.html'), '/spikes/air-quality/ozone.html');
  assert.equal(joinBase('/', '/'), '/');
  assert.equal(joinBase('/', ''), '/');
});

test('joinBase accepts a production base with or without a trailing slash', () => {
  const expected = '/ltinfo-monitoring-dashboard/spikes/air-quality/ozone.html';
  assert.equal(joinBase('/ltinfo-monitoring-dashboard/', 'spikes/air-quality/ozone.html'), expected);
  assert.equal(joinBase('/ltinfo-monitoring-dashboard', 'spikes/air-quality/ozone.html'), expected);
  assert.equal(joinBase('/ltinfo-monitoring-dashboard', '/spikes/air-quality/ozone.html'), expected);
});

test('joinBase keeps hashes and query strings on root links', () => {
  assert.equal(joinBase('/ltinfo-monitoring-dashboard/', '/#about'), '/ltinfo-monitoring-dashboard/#about');
  assert.equal(joinBase('/', '/#about'), '/#about');
});
