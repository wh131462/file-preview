import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCore, readTextFixture } from '../helpers/core.mjs';

const core = await loadCore();

test('parses quoted CSV fields, escaped quotes and embedded newlines', async () => {
  const result = core.parseCsv(await readTextFixture('sample.csv'));

  assert.deepEqual(result.header, ['name', 'note', 'count']);
  assert.deepEqual(result.rows, [
    ['alpha', 'contains, comma', '1'],
    ['beta', 'line one\nline two', '2'],
    ['gamma', 'said "hello"', '3'],
  ]);
  assert.equal(result.columnCount, 3);
  assert.equal(result.delimiter, ',');
});

test('parses TSV without treating the first row as a header', () => {
  const result = core.parseCsv('a\tb\n1\t2', {
    delimiter: core.guessCsvDelimiter('data.tsv'),
    firstRowAsHeader: false,
  });

  assert.deepEqual(result.header, []);
  assert.deepEqual(result.rows, [['a', 'b'], ['1', '2']]);
  assert.equal(result.delimiter, '\t');
});

test('parses SRT and preserves cue timing', async () => {
  const result = core.parseSubtitle(await readTextFixture('sample.srt'));

  assert.equal(result.format, 'srt');
  assert.deepEqual(result.cues, [
    { id: '1', start: 1, end: 3.5, text: 'First line' },
    { id: '2', start: 62.25, end: 64, text: 'Second line' },
  ]);
});

test('parses TTML without requiring a browser DOM', async () => {
  const result = core.parseSubtitle(await readTextFixture('sample.ttml'), 'ttml');

  assert.equal(result.format, 'ttml');
  assert.deepEqual(result.cues, [
    { start: 2, end: 3.5, text: 'Hello & goodbye\nnext line' },
  ]);
});

test('decodes UTF-8 and UTF-16 BOM text', () => {
  const utf8 = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('中文')]);
  const utf16 = new Uint8Array([0xff, 0xfe, 0x41, 0x00, 0x42, 0x00]);

  assert.equal(core.decodeText(utf8), '中文');
  assert.equal(core.decodeText(utf16), 'AB');
});

test('applies custom translations and interpolates parameters', () => {
  const translate = core.createTranslator({
    locale: 'en-US',
    messages: {
      'en-US': {
        'common.unsupported_preview': 'Cannot preview {type}',
      },
    },
  });

  assert.equal(translate('common.unsupported_preview', { type: 'binary' }), 'Cannot preview binary');
  assert.equal(translate('common.loading'), 'Loading');
});
