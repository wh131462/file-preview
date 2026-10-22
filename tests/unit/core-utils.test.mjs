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

test('normalizes local TypeScript files as source even when the browser reports video/mp2t', () => {
  const input = new File(['const answer: number = 42;'], 'source.ts', { type: 'video/mp2t' });
  const normalized = core.normalizeFile(input);

  try {
    assert.equal(normalized.type, 'text/typescript');
    assert.equal(core.getFileType(normalized), 'text');
  } finally {
    URL.revokeObjectURL(normalized.url);
  }
});

test('normalizes wrapped local TypeScript files as source', () => {
  const input = new File(['const answer: number = 42;'], 'source.ts', { type: 'video/mp2t' });
  const normalized = core.normalizeFile({
    id: 'wrapped-source',
    name: input.name,
    url: 'blob:source',
    type: input.type,
    size: input.size,
    file: input,
  });

  assert.equal(normalized.type, 'text/typescript');
  assert.equal(normalized.file, input);
  assert.equal(core.getFileType(normalized), 'text');
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

test('uses English fallback while respecting explicit fallback locales and custom messages', () => {
  const t = core.createTranslator({ locale: 'fr-FR', messages: { 'fr-FR': { 'common.close': 'Fermer' } } });
  assert.equal(t('common.close'), 'Fermer');
  assert.equal(t('zip.file_tree'), 'File tree');
  assert.equal(core.createTranslator({ locale: 'fr-FR', fallbackLocale: 'zh-CN' })('zip.file_tree'), '文件树');
  assert.equal(core.createTranslator({ locale: 'fr-FR', fallbackLocale: 'unknown' })('common.close'), 'Close');
  assert.equal(t('missing.key'), 'missing.key');
  for (const key of Object.keys(core.builtInMessages['zh-CN'])) {
    assert.ok(key in core.builtInMessages['en-US'], `Missing English translation: ${key}`);
    assert.doesNotMatch(core.builtInMessages['en-US'][key], /\p{Script=Han}/u);
  }
  assert.deepEqual(Object.keys(core.builtInMessages['en-US']).sort(), Object.keys(core.builtInMessages['zh-CN']).sort());
});

test('translates nested decoder errors and Worker payloads without losing parameters', () => {
  const detail = new core.PreviewError('image.canvas_export_failed', { format: 'TIFF', output: 'PNG' });
  const error = new core.PreviewError('image.tiff_decode_failed', undefined, detail);
  const en = core.createTranslator({ locale: 'en-US' });
  const zh = core.createTranslator({ locale: 'zh-CN' });
  assert.equal(error.message, 'TIFF decode failed: Failed to convert TIFF Canvas to PNG');
  assert.equal(core.translateError(zh, error), 'TIFF 解码失败: TIFF Canvas 转换为 PNG 失败');
  const payload = JSON.parse(JSON.stringify({ key: error.key, params: error.params, detail: error.detail }));
  assert.equal(core.translateError(zh, payload), core.translateError(zh, error));
  assert.equal(core.translateError(en, payload), error.message);
  const customized = core.createTranslator({ locale: 'en-US', messages: { 'en-US': { 'image.tiff_decode_failed': 'Cannot decode TIFF: {error}' } } });
  assert.equal(core.translateError(customized, error), 'Cannot decode TIFF: Failed to convert TIFF Canvas to PNG');
  assert.equal(core.translateError(en, new Error('Original decoder detail')), 'Original decoder detail');
  assert.equal(core.translateError(en, new core.PreviewError('image.heic_decode_failed', undefined, { message: 'Corrupt file' })), 'HEIC decode failed, file may be corrupted: Corrupt file');
});

test('localizes HTTP errors from both Blob and text requests', async () => {
  const zh = core.createTranslator({ locale: 'zh-CN' });
  for (const run of [
    () => core.fetchAsBlobUrl('/forbidden', async () => new Response('', { status: 403 })),
    () => core.fetchTextUtf8('/forbidden', { fetcher: async () => new Response('', { status: 403 }) }),
  ]) {
    await assert.rejects(run, (error) => {
      assert.equal(error.message, 'Request failed: 403');
      assert.equal(core.translateError(zh, error), '请求失败: 403');
      return true;
    });
  }
});
