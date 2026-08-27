import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

import { loadCore, resolveFromRoot } from '../helpers/core.mjs';

const requiredCoreExports = [
  'SUPPORTED_FILE_TYPES',
  'createFetcher',
  'createTranslator',
  'decodeText',
  'detectImageFormat',
  'getFileType',
  'getLanguageFromFileName',
  'normalizeFile',
  'parseCsv',
  'parseSubtitle',
  'resolveShowClose',
];

const requiredFrameworkTypes = [
  'CustomRenderer',
  'CustomRendererContext',
  'CustomRendererEventPayload',
  'Fetcher',
  'FileType',
  'PreviewFile',
  'PreviewFileInput',
  'RequestHandler',
  'RequestInitFactory',
  'RequestOptions',
  'ShouldFetchAsBlob',
];

function collectNamedExports(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const names = new Set();

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.exportClause) continue;
    if (!ts.isNamedExports(statement.exportClause)) continue;
    for (const element of statement.exportClause.elements) {
      names.add(element.name.text);
    }
  }

  return names;
}

test('core build exposes the supported public runtime surface', async () => {
  const core = await loadCore();

  for (const exportName of requiredCoreExports) {
    assert.ok(exportName in core, `core missing runtime export ${exportName}`);
  }
});

test('all framework entries expose the shared public type contract', async () => {
  const entries = [
    'packages/react-file-preview/src/index.ts',
    'packages/vue-file-preview/src/index.ts',
    'packages/angular-file-preview/src/index.ts',
  ];

  for (const entry of entries) {
    const source = await readFile(resolveFromRoot(entry), 'utf8');
    const exports = collectNamedExports(source, entry);
    for (const typeName of requiredFrameworkTypes) {
      assert.ok(exports.has(typeName), `${entry} missing type export ${typeName}`);
    }
  }
});
