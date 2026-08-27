import assert from 'node:assert/strict';
import test from 'node:test';

import { loadCore } from '../helpers/core.mjs';

const core = await loadCore();

test('merges async request init with caller overrides and delegates to the handler', async () => {
  let received;
  const fetcher = core.createFetcher({
    requestInit: async (url) => ({
      headers: { Authorization: `Bearer ${url}`, 'X-Shared': 'user' },
      credentials: 'include',
    }),
    requestHandler: async (url, init) => {
      received = { url, init };
      return new Response('ok');
    },
  });

  const response = await fetcher('/protected', {
    headers: { 'X-Shared': 'library' },
    credentials: 'omit',
  });
  const headers = new Headers(received.init.headers);

  assert.equal(await response.text(), 'ok');
  assert.equal(received.url, '/protected');
  assert.equal(received.init.credentials, 'omit');
  assert.equal(headers.get('authorization'), 'Bearer /protected');
  assert.equal(headers.get('x-shared'), 'library');
});

test('uses the current global fetch when no request handler is supplied', async () => {
  const originalFetch = globalThis.fetch;
  let received;
  globalThis.fetch = async (url, init) => {
    received = { url, init };
    return new Response('native');
  };

  try {
    const response = await core.createFetcher()('/plain', { method: 'POST' });
    assert.equal(await response.text(), 'native');
    assert.deepEqual(received, { url: '/plain', init: { method: 'POST' } });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('creates Blob URLs through an injected fetcher and rejects failed responses', async () => {
  const blobUrl = await core.fetchAsBlobUrl(
    '/file',
    async () => new Response('content', { status: 200 }),
  );

  try {
    assert.match(blobUrl, /^blob:/);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  await assert.rejects(
    core.fetchAsBlobUrl('/missing', async () => new Response('', { status: 404 })),
    /请求失败: 404/,
  );
});

test('fetches and decodes text through an injected fetcher', async () => {
  const controller = new AbortController();
  let received;
  const text = await core.fetchTextUtf8('/text', {
    signal: controller.signal,
    init: { headers: { Authorization: 'token' } },
    fetcher: async (url, init) => {
      received = { url, init };
      return new Response(new TextEncoder().encode('hello'));
    },
  });

  assert.equal(text, 'hello');
  assert.equal(received.url, '/text');
  assert.equal(received.init.signal, controller.signal);
  assert.equal(new Headers(received.init.headers).get('authorization'), 'token');
});
