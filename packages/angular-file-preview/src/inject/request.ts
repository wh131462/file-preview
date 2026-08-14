import { computed, DestroyRef, inject, signal, type Signal } from '@angular/core';
import {
  createFetcher,
  fetchAsBlobUrl,
  type Fetcher,
  type PreviewFile,
  type ShouldFetchAsBlob,
} from '@eternalheart/file-preview-core';
import { AFP_REQUEST, type RequestContextValue } from './tokens';

function defaultContext(): RequestContextValue {
  return { fetcher: (url, init) => fetch(url, init) };
}

export function injectRequestContext(): Signal<RequestContextValue> {
  const injected = inject(AFP_REQUEST, { optional: true });
  if (injected) return injected;
  return computed(() => defaultContext());
}

export function injectFetcher(): Signal<Fetcher> {
  const ctx = injectRequestContext();
  return computed(() => ctx().fetcher);
}

export function injectResolvedUrl(file: Signal<PreviewFile | undefined>): Signal<string> {
  const ctx = injectRequestContext();
  const blobUrl = signal('');
  let createdBlobUrl: string | null = null;
  let generation = 0;

  const cleanup = () => {
    if (createdBlobUrl) {
      URL.revokeObjectURL(createdBlobUrl);
      createdBlobUrl = null;
    }
  };

  const destroyRef = inject(DestroyRef);
  destroyRef.onDestroy(cleanup);

  const resolved = computed(() => {
    const f = file();
    if (!f) return '';
    const need = !!ctx().shouldFetchAsBlob?.(f);
    if (!need) return f.url;
    const current = blobUrl();
    return current || '';
  });

  // Drive blob fetch via computed + effect-like subscription in the caller.
  // Expose a helper the content component can call when file/ctx change.
  void (ctx as Signal<RequestContextValue> & { __blob?: ShouldFetchAsBlob });

  return Object.assign(resolved, {
    async sync(f: PreviewFile | undefined, need: boolean, fetcher: Fetcher) {
      const gen = ++generation;
      if (!f || !need) {
        cleanup();
        blobUrl.set('');
        return;
      }
      blobUrl.set('');
      try {
        const next = await fetchAsBlobUrl(f.url, fetcher);
        if (gen !== generation) {
          URL.revokeObjectURL(next);
          return;
        }
        cleanup();
        createdBlobUrl = next;
        blobUrl.set(next);
      } catch (err) {
        if (gen === generation) {
          console.error('[file-preview] resolve blob url failed:', err);
          blobUrl.set(f.url);
        }
      }
    },
  }) as Signal<string> & { sync: (f: PreviewFile | undefined, need: boolean, fetcher: Fetcher) => Promise<void> };
}
