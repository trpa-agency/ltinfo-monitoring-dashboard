import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvField, csvFileName, slugify, toCsv } from '../src/lib/csv.ts';

test('csvField quotes commas, quotes, and line breaks per RFC 4180', () => {
  assert.equal(csvField('plain'), 'plain');
  assert.equal(csvField('a,b'), '"a,b"');
  assert.equal(csvField('say "hi"'), '"say ""hi"""');
  assert.equal(csvField('line\nbreak'), '"line\nbreak"');
  assert.equal(csvField(null), '');
  assert.equal(csvField(undefined), '');
  assert.equal(csvField(0.083), '0.083');
  assert.equal(csvField(NaN), '');
});

test('toCsv writes a header row, CRLF line endings, and a trailing break', () => {
  const csv = toCsv(
    [
      { field: 'Year', headerName: 'Year' },
      { field: 'Site', headerName: 'Station' },
      { field: 'Value', headerName: 'O3 (ppm)' },
    ],
    [
      { Year: 2019, Site: 'Stateline, TRPA', Value: 0.067 },
      { Year: 2020, Site: 'Tahoe City', Value: null },
    ],
  );
  assert.equal(csv, 'Year,Station,O3 (ppm)\r\n2019,"Stateline, TRPA",0.067\r\n2020,Tahoe City,\r\n');
});

test('slugify and csvFileName', () => {
  assert.equal(slugify('Ozone (O3) Ozone by station O3 - HIGH 8 HR'), 'ozone-o3-ozone-by-station-o3-high-8-hr');
  assert.equal(slugify('PM2.5 (µg/m³)'), 'pm2-5-g-m3');
  assert.equal(slugify('***'), 'data');
  assert.equal(csvFileName(['Ozone (O3)', 'Ozone by station', undefined]), 'ozone-o3-ozone-by-station.csv');
});
