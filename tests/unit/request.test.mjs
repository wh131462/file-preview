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
    /Request failed: 404/,
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

test('wraps handler failures and reports the original error', async () => {
  const original = new TypeError('Failed to fetch');
  let reported;

  const fetcher = core.createFetcher({
    requestHandler: async () => {
      throw original;
    },
    onRequestError: (url, error) => {
      reported = { url, error };
    },
  });

  await assert.rejects(fetcher('/broken.png'), (error) => {
    assert.ok(error instanceof core.PreviewRequestError);
    assert.ok(error instanceof core.PreviewError);
    assert.equal(error.cause, original);
    assert.equal(error.message, 'Failed to fetch');
    assert.equal(core.resolveErrorStage(error), 'request');
    return true;
  });

  assert.deepEqual(reported, { url: '/broken.png', error: original });
});

test('keeps abort errors untouched and does not report them', async () => {
  const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
  let reported = false;

  const fetcher = core.createFetcher({
    requestHandler: async () => {
      throw abortError;
    },
    onRequestError: () => {
      reported = true;
    },
  });

  await assert.rejects(fetcher('/file'), (error) => error === abortError);
  assert.equal(reported, false);
});

test('infers request stage from HTTP status errors thrown by renderers', () => {
  assert.equal(core.resolveErrorStage(new core.PreviewError('request.failed', { status: 404 })), 'request');
  assert.equal(core.resolveErrorStage(new core.PreviewError('file.load_failed')), 'request');
  assert.equal(core.resolveErrorStage(new core.PreviewError('file.load_failed_status', { status: 500 })), 'request');
  assert.equal(core.resolveErrorStage(new core.PreviewError('common.load_failed')), 'request');
  assert.equal(core.resolveErrorStage(new Error('parse failed')), 'parse');
  assert.equal(core.resolveErrorStage(new Error('render failed'), 'render'), 'render');
});

test('wraps non-2xx text responses as request errors', async () => {
  await assert.rejects(
    core.fetchTextUtf8('/missing.txt', {
      fetcher: async () => new Response('', { status: 404 }),
    }),
    (error) => {
      assert.ok(error instanceof core.PreviewRequestError);
      assert.equal(error.key, 'request.failed');
      assert.deepEqual(error.params, { status: 404 });
      assert.equal(core.resolveErrorStage(error), 'request');
      return true;
    },
  );
});

test('does not let a throwing onRequestError replace the original error', async () => {
  const original = new Error('network down');
  const fetcher = core.createFetcher({
    requestHandler: async () => {
      throw original;
    },
    onRequestError: () => {
      throw new Error('host callback boom');
    },
  });

  await assert.rejects(fetcher('/file'), (error) => {
    assert.ok(error instanceof core.PreviewRequestError);
    assert.equal(error.cause, original);
    return true;
  });
});

test('bypasses request init and handler for blob:/data: urls', async () => {
  const originalFetch = globalThis.fetch;
  let factoryCalls = 0;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response('inline');
  };

  try {
    const fetcher = core.createFetcher({
      requestInit: () => {
        factoryCalls += 1;
        return { headers: { Authorization: 'Bearer token' } };
      },
      requestHandler: async () => {
        throw new Error('handler should not be used for inline urls');
      },
      onRequestError: () => {
        throw new Error('inline urls must not be reported');
      },
    });

    const response = await fetcher('blob:http://localhost/abc', { method: 'GET' });
    assert.equal(await response.text(), 'inline');
    assert.equal(factoryCalls, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'blob:http://localhost/abc');
    assert.deepEqual(calls[0].init, { method: 'GET' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('converts Blob content to a revocable url and passes { url } through', () => {
  const resolved = core.resolveConsumableUrl(new Blob(['x'], { type: 'text/plain' }));
  assert.match(resolved.url, /^blob:/);
  assert.equal(typeof resolved.revoke, 'function');
  resolved.revoke();

  const direct = core.resolveConsumableUrl({ url: 'https://example.com/a.mp4' });
  assert.equal(direct.url, 'https://example.com/a.mp4');
  assert.equal(direct.revoke, null);

  assert.equal(core.isInlineResourceUrl('blob:http://localhost/abc'), true);
  assert.equal(core.isInlineResourceUrl('data:text/plain;base64,eA=='), true);
  assert.equal(core.isInlineResourceUrl('https://example.com/a.png'), false);
});

test('withHeaders builds a Blob loader, merges headers and wraps non-2xx responses', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let received;
  globalThis.fetch = async (url, init) => {
    received = { url, init };
    return new Response(new Blob(['payload'], { type: 'text/plain' }), { status: 200 });
  };

  try {
    const loader = core.withHeaders(
      { Authorization: 'Bearer token', 'X-Shared': 'user' },
      {
        headers: { 'X-Shared': 'init', 'X-Base': 'base' },
        credentials: 'include',
        signal: new AbortController().signal,
      },
    );
    const content = await loader(
      { id: 'f1', name: 'a.txt', url: '/api/a', type: 'text/plain' },
      { signal: controller.signal },
    );

    assert.ok(content instanceof Blob);
    assert.equal(await content.text(), 'payload');
    assert.equal(received.url, '/api/a');
    assert.equal(received.init.credentials, 'include');
    // 组件传入的取消信号优先于 init.signal
    assert.equal(received.init.signal, controller.signal);

    const headers = new Headers(received.init.headers);
    assert.equal(headers.get('authorization'), 'Bearer token');
    assert.equal(headers.get('x-shared'), 'user');
    assert.equal(headers.get('x-base'), 'base');
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = async () => new Response('', { status: 403 });
  try {
    await assert.rejects(
      core.withHeaders({ Authorization: 'x' })(
        { id: 'f', name: 'a', url: '/x', type: 'text/plain' },
        { signal: new AbortController().signal },
      ),
      (error) => {
        assert.ok(error instanceof core.PreviewRequestError);
        assert.equal(error.key, 'request.failed');
        assert.deepEqual(error.params, { status: 403 });
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('infers request stage from third-party response and network errors', () => {
  const responseError = Object.assign(new Error('Unexpected server response (404)'), {
    name: 'ResponseException',
    status: 404,
  });

  assert.equal(core.resolveErrorStage(responseError), 'request');
  assert.equal(core.resolveErrorStage(new TypeError('Failed to fetch')), 'request');
  assert.equal(core.resolveErrorStage(new TypeError('Load failed')), 'request');
  assert.equal(
    core.resolveErrorStage(new TypeError("Cannot read properties of undefined (reading 'load')")),
    'parse',
  );
  assert.equal(core.resolveErrorStage(new Error('Unexpected end of JSON input')), 'parse');
  assert.equal(core.resolveErrorStage(responseError, 'parse'), 'parse');
});

test('noop reporter exposes the rendered ready hook', () => {
  assert.equal(typeof core.noopReporter.ready, 'function');
  assert.doesNotThrow(() => core.noopReporter.ready());
});
