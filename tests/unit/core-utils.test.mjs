import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCore } from '../helpers/core.mjs';

const core = await loadCore();

test('extracts and decodes file names from URLs and paths', () => {
  assert.equal(
    core.getFileNameFromUrl('https://example.test/files/report%20final.pdf?token=1'),
    'report final.pdf',
  );
  assert.equal(core.getFileNameFromUrl('/local/path/data.csv'), 'data.csv');
});

test('normalizes URL and link inputs without losing public fields', () => {
  const fromUrl = core.normalizeFile('https://example.test/files/report.pdf', 2);
  assert.match(fromUrl.id, /^url-\d+-2$/);
  assert.equal(fromUrl.name, 'report.pdf');
  assert.equal(fromUrl.type, 'application/pdf');

  const fromLink = core.normalizeFile({
    id: 'known-id',
    name: 'data.tsv',
    url: '/data.tsv',
    type: '',
    size: 42,
  });
  assert.deepEqual(fromLink, {
    id: 'known-id',
    name: 'data.tsv',
    url: '/data.tsv',
    type: 'text/tab-separated-values',
    size: 42,
  });
});

test('normalizes File input and preserves the original object', () => {
  const input = new File(['hello'], 'note.txt', { type: '' });
  const normalized = core.normalizeFile(input, 1);

  try {
    assert.match(normalized.id, /^file-\d+-1$/);
    assert.equal(normalized.name, 'note.txt');
    assert.equal(normalized.type, 'text/plain');
    assert.equal(normalized.size, 5);
    assert.equal(normalized.file, input);
    assert.match(normalized.url, /^blob:/);
  } finally {
    URL.revokeObjectURL(normalized.url);
  }
});

test('resolves close-button defaults by preview mode', () => {
  assert.equal(core.resolveShowClose('modal'), true);
  assert.equal(core.resolveShowClose('embed'), false);
  assert.equal(core.resolveShowClose(undefined), false);
  assert.equal(core.resolveShowClose('modal', false), false);
  assert.equal(core.resolveShowClose('embed', true), true);
});

test('maps MIME types and detects advanced image categories', () => {
  assert.equal(core.getMimeTypeFromExtension('HEIC'), 'image/heic');
  assert.equal(core.getMimeTypeFromFileName('scan.TIFF'), 'image/tiff');
  assert.equal(core.getMimeTypeFromFileName('unknown.bin'), 'application/octet-stream');
  assert.equal(core.isAdvancedImageFormat('image/avif'), true);
  assert.equal(core.isAdvancedImageFormat('image/png'), false);
  assert.equal(core.isRawFormat('image/x-nikon-nef'), true);
  assert.equal(core.isRawFormat('image/heic'), false);
});

test('detects advanced images by explicit type, extension and magic number', async () => {
  assert.equal(
    await core.detectImageFormat(new File(['content'], 'unknown.bin', { type: 'image/avif' })),
    'image/avif',
  );
  assert.equal(await core.detectImageFormat(new File(['content'], 'scan.tiff')), 'image/tiff');

  const psdHeader = new Uint8Array([0x38, 0x42, 0x50, 0x53, 0, 0, 0, 0]);
  assert.equal(await core.detectImageFormat(new File([psdHeader], 'unknown.bin')), 'image/vnd.adobe.photoshop');
});

test('registers and retrieves custom image loaders', () => {
  const loader = { decode: async (blob) => blob };
  core.registerLoader('image/x-test', loader);

  assert.equal(core.hasLoader('image/x-test'), true);
  assert.equal(core.getLoader('image/x-test'), loader);
  assert.equal(core.getLoader('image/x-missing'), null);
});
