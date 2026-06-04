import { inject, provide, computed, ref, watch, onBeforeUnmount, type ComputedRef, type Ref } from 'vue';
import type {
  Fetcher,
  PreviewFile,
  RequestHandler,
  RequestInitFactory,
  ShouldFetchAsBlob,
} from '@eternalheart/file-preview-core';
import { createFetcher, fetchAsBlobUrl } from '@eternalheart/file-preview-core';

export interface RequestContextValue {
  fetcher: Fetcher;
  shouldFetchAsBlob?: ShouldFetchAsBlob;
}

const REQUEST_KEY = Symbol('file-preview:request');

export function provideRequestContext(
  options: {
    requestInit?: RequestInitFactory;
    requestHandler?: RequestHandler;
    shouldFetchAsBlob?: ShouldFetchAsBlob;
  } | (() => {
    requestInit?: RequestInitFactory;
    requestHandler?: RequestHandler;
    shouldFetchAsBlob?: ShouldFetchAsBlob;
  }),
) {
  const value = computed<RequestContextValue>(() => {
    const opts = typeof options === 'function' ? options() : options;
    return {
      fetcher: createFetcher({
        requestInit: opts.requestInit,
        requestHandler: opts.requestHandler,
      }),
      shouldFetchAsBlob: opts.shouldFetchAsBlob,
    };
  });
  provide(REQUEST_KEY, value);
  return value;
}

function defaultContext(): RequestContextValue {
  return { fetcher: (url, init) => fetch(url, init) };
}

export function useRequestContext(): ComputedRef<RequestContextValue> {
  const injected = inject<ComputedRef<RequestContextValue> | undefined>(REQUEST_KEY, undefined);
  if (injected) return injected;
  return computed(() => defaultContext());
}

export function useFetcher(): ComputedRef<Fetcher> {
  const ctx = useRequestContext();
  return computed(() => ctx.value.fetcher);
}

/**
 * 解析 file 的可消费 URL：
 * - 未配置 shouldFetchAsBlob 或返回 false：直接派生自 file.url（不入 ref，避免切换文件时残留旧值）
 * - 返回 true：用 fetcher 拉成 blob: URL，组件卸载或 file 变化时 revoke
 */
export function useResolvedUrl(file: Ref<PreviewFile | undefined>): ComputedRef<string> {
  const ctx = useRequestContext();
  const blobUrlRef = ref<string>('');
  let createdBlobUrl: string | null = null;

  const cleanup = () => {
    if (createdBlobUrl) {
      URL.revokeObjectURL(createdBlobUrl);
      createdBlobUrl = null;
    }
  };

  watch(
    () => {
      const f = file.value;
      const need = !!(f && ctx.value.shouldFetchAsBlob?.(f));
      return { f, need, fetcher: ctx.value.fetcher };
    },
    async ({ f, need, fetcher }, _old, onCleanup) => {
      if (!f || !need) {
        cleanup();
        blobUrlRef.value = '';
        return;
      }
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });
      blobUrlRef.value = '';
      try {
        const blobUrl = await fetchAsBlobUrl(f.url, fetcher);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        cleanup();
        createdBlobUrl = blobUrl;
        blobUrlRef.value = blobUrl;
      } catch (err) {
        if (!cancelled) {
          console.error('[file-preview] resolve blob url failed:', err);
          blobUrlRef.value = f.url;
        }
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(cleanup);

  // 同步派生：非 blob 模式始终直接返回 file.url，确保切换文件时不会残留上一帧的 URL
  return computed(() => {
    const f = file.value;
    if (!f) return '';
    const need = !!ctx.value.shouldFetchAsBlob?.(f);
    if (!need) return f.url;
    return blobUrlRef.value;
  });
}
