import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCore, readJsonFixture } from '../helpers/core.mjs';

const core = await loadCore();
const cases = await readJsonFixture('file-types.json');

test('detects representative file types from shared cases', () => {
  for (const [name, expected] of Object.entries(cases.fileTypes)) {
    assert.equal(
      core.getFileType({ id: name, name, url: name, type: '' }),
      expected,
      name,
    );
  }
});

test('normalizes MIME types before detecting the file type', () => {
  const file = {
    id: 'download',
    name: 'download',
    url: '/download',
    type: 'Application/PDF; charset=binary',
  };

  assert.equal(core.getFileType(file), 'pdf');
});

test('previews extensionless files as plain text by default', () => {
  for (const name of ['README', 'folder/README', '.gitignore']) {
    assert.equal(
      core.getFileType({ id: name, name, url: name, type: 'application/octet-stream' }),
      'text',
      name,
    );
  }
  assert.equal(
    core.getFileType({ id: 'report', name: 'report', url: 'report', type: 'application/pdf' }),
    'pdf',
  );
  assert.equal(
    core.getFileType({ id: 'binary', name: 'unknown.binary', url: 'unknown.binary', type: 'application/octet-stream' }),
    'unsupported',
  );
});

test('distinguishes TypeScript sources from MPEG transport streams', () => {
  assert.equal(
    core.getFileType({ id: 'source-default', name: 'source.ts', url: 'source.ts', type: '' }),
    'text',
  );
  assert.equal(
    core.getFileType({ id: 'source', name: 'source.ts', url: 'source.ts', type: 'text/typescript' }),
    'text',
  );
  assert.equal(
    core.getFileType({ id: 'stream', name: 'stream.ts', url: 'stream.ts', type: 'video/mp2t' }),
    'video',
  );
  assert.equal(core.getVideoMimeType('stream.ts', 'video/mp2t'), 'video/mp2t');
});

test('maps representative file names to highlighting languages', () => {
  for (const [name, expected] of Object.entries(cases.languages)) {
    assert.equal(core.getLanguageFromFileName(name), expected, name);
  }
});

test('formats video MIME, file size and duration edge cases', () => {
  assert.equal(core.getVideoMimeType('movie.webm?token=1'), 'video/webm');
  assert.equal(core.getVideoMimeType('movie.unknown'), 'video/mp4');
  assert.equal(core.formatFileSize(512), '512 B');
  assert.equal(core.formatFileSize(1536), '1.5 KB');
  assert.equal(core.formatFileSize(2 * 1024 * 1024), '2.0 MB');
  assert.equal(core.formatTime(62.9), '1:02');
  assert.equal(core.formatTime(Number.NaN), '0:00');
  assert.equal(core.formatTime(-1), '0:00');
});
