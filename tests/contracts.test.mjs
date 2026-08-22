import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFile(path.join(root, relativePath), 'utf8');

test('framework entries export documented request types', async () => {
  const requiredTypes = [
    'RequestInitFactory',
    'RequestHandler',
    'RequestOptions',
    'Fetcher',
    'ShouldFetchAsBlob',
  ];

  for (const entry of [
    'packages/react-file-preview/src/index.ts',
    'packages/vue-file-preview/src/index.ts',
  ]) {
    const source = await read(entry);
    for (const typeName of requiredTypes) {
      assert.match(source, new RegExp(`\\b${typeName}\\b`), `${entry} missing ${typeName}`);
    }
  }
});

test('file type detection and highlighting cover documented representative formats', async () => {
  const coreUrl = pathToFileURL(path.join(root, 'packages/file-preview-core/lib/index.mjs')).href;
  const { getFileType, getLanguageFromFileName } = await import(coreUrl);
  const cases = {
    'photo.heic': 'image',
    'scan.tiff': 'image',
    'camera.nef': 'image',
    'report.doc': 'doc',
    'book.xls': 'xlsx',
    'slides.ppt': 'ppt',
    'book.azw3': 'mobi',
    'captions.ttml': 'subtitle',
    'model.glb': 'cad',
    'config.toml': 'text',
    'Component.vue': 'text',
    'App.svelte': 'text',
    'Page.astro': 'text',
    'main.dart': 'text',
    'schema.graphql': 'text',
    'query.gql': 'text',
    'api.proto': 'text',
    'schema.prisma': 'text',
    'main.tf': 'text',
    'production.tfvars': 'text',
    'deploy.ps1': 'text',
    'Main.scala': 'text',
    Dockerfile: 'text',
    Makefile: 'text',
    'docker/Dockerfile': 'text',
  };

  for (const [name, expected] of Object.entries(cases)) {
    assert.equal(getFileType({ id: name, name, url: name, type: '' }), expected);
  }

  const languageCases = {
    'Component.vue': 'vue',
    'App.svelte': 'svelte',
    'Page.astro': 'astro',
    'main.dart': 'dart',
    'schema.graphql': 'graphql',
    'query.gql': 'graphql',
    'api.proto': 'proto',
    'schema.prisma': 'prisma',
    'main.tf': 'terraform',
    'production.tfvars': 'terraform',
    'deploy.ps1': 'powershell',
    'Main.scala': 'scala',
    Dockerfile: 'dockerfile',
    Makefile: 'makefile',
    'docker/Dockerfile': 'dockerfile',
  };

  for (const [name, expected] of Object.entries(languageCases)) {
    assert.equal(getLanguageFromFileName(name), expected);
  }
});

test('request factory merges headers and delegates to the handler', async () => {
  const coreUrl = pathToFileURL(path.join(root, 'packages/file-preview-core/lib/index.mjs')).href;
  const { createFetcher } = await import(coreUrl);
  let received;
  const fetcher = createFetcher({
    requestInit: { headers: { Authorization: 'Bearer token', 'X-Shared': 'user' } },
    requestHandler: async (url, init) => {
      received = { url, init };
      return new Response('ok');
    },
  });

  await fetcher('/protected', { headers: { 'X-Shared': 'library' } });
  const headers = new Headers(received.init.headers);
  assert.equal(received.url, '/protected');
  assert.equal(headers.get('authorization'), 'Bearer token');
  assert.equal(headers.get('x-shared'), 'library');
});

test('both image renderers use worker-first decoding with fallback', async () => {
  for (const renderer of [
    'packages/react-file-preview/src/renderers/Image/index.tsx',
    'packages/vue-file-preview/src/renderers/Image/index.vue',
  ]) {
    const source = await read(renderer);
    assert.match(source, /shouldUseWorker\(mimeType\)/);
    assert.match(source, /decodeInWorker\(/);
    assert.match(source, /catch\s*\{/);
    assert.match(source, /loader(?:\.decode|Cache\.decode)\(/);
  }
});

test('root READMEs contain only current scripts, links, and renderer contract', async () => {
  const packageJson = JSON.parse(await read('package.json'));
  for (const readme of ['README.md', 'README.zh-CN.md']) {
    const source = await read(readme);
    assert.doesNotMatch(source, /supported-formats/);
    assert.doesNotMatch(source, /\bcomponent:\s*(?:CustomRenderer|\(\{ url \}\))/);
    assert.match(source, /\brender:\s*/);

    for (const command of source.matchAll(/^pnpm ([\w:-]+)/gm)) {
      assert.ok(
        command[1] === 'install' || packageJson.scripts[command[1]],
        `${readme} references missing script ${command[1]}`,
      );
    }
  }
});

test('VitePress type documentation has one request section and current labels', async () => {
  const types = await read('packages/docs/api/types.md');
  assert.equal((types.match(/^## 请求与鉴权$/gm) ?? []).length, 1);
  assert.doesNotMatch(types, /v2\.0\+/);
  assert.doesNotMatch(await read('packages/docs/guide/custom-renderers.md'), /v2\.0\+/);
});
