import { inject, provide, computed, ref, watch, onBeforeUnmount, type ComputedRef, type Ref } from 'vue';
import type {
  Fetcher,
  FileLoader,
  PreviewFile,
  RequestHandler,
  RequestInitFactory,
  ShouldFetchAsBlob,
} from '@eternalheart/file-preview-core';
import {
  createFetcher,
  fetchAsBlobUrl,
  getFileType,
  isInlineResourceUrl,
  resolveConsumableUrl,
} from '@eternalheart/file-preview-core';

export interface RequestContextValue {
  fetcher: Fetcher;
  loadFile?: FileLoader;
  shouldFetchAsBlob?: ShouldFetchAsBlob;
}

const REQUEST_KEY = Symbol('file-preview:request');

export function provideRequestContext(
  options: {
    loadFile?: FileLoader;
    requestInit?: RequestInitFactory;
    requestHandler?: RequestHandler;
    shouldFetchAsBlob?: ShouldFetchAsBlob;
    onRequestError?: (url: string, error: unknown) => void;
  } | (() => {
    loadFile?: FileLoader;
    requestInit?: RequestInitFactory;
    requestHandler?: RequestHandler;
    shouldFetchAsBlob?: ShouldFetchAsBlob;
    onRequestError?: (url: string, error: unknown) => void;
  }),
) {
  const value = computed<RequestContextValue>(() => {
    const opts = typeof options === 'function' ? options() : options;
    return {
      fetcher: createFetcher({
        requestInit: opts.requestInit,
        requestHandler: opts.requestHandler,
        onRequestError: opts.onRequestError,
      }),
      loadFile: opts.loadFile,
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

const DEPRECATED_REQUEST_PROPS = ['requestInit', 'requestHandler', 'shouldFetchAsBlob'] as const;
let deprecatedRequestWarningShown = false;

/** 过渡期提示：旧鉴权参数已废弃，1.8.0 移除。 */
export function warnDeprecatedRequestProps(
  used: Partial<Record<(typeof DEPRECATED_REQUEST_PROPS)[number], unknown>>,
): void {
  if (deprecatedRequestWarningShown) return;
  const names = DEPRECATED_REQUEST_PROPS.filter((name) => used[name] !== undefined);
  if (names.length === 0) return;
  deprecatedRequestWarningShown = true;
  console.warn(
    `[file-preview] ${names.map((name) => `\`${name}\``).join('、')} 已废弃，将在 1.8.0 移除；请改用 \`loadFile\`（简单场景可用 \`withHeaders\`）。`,
  );
}

/**
 * 解析 file 的可消费 URL：
 * - 配置了 loadFile 且是远程可预览文件：由宿主取数，Blob 转 blob: URL，`{ url }` 直接使用；
 * - 未配置 loadFile、shouldFetchAsBlob 返回 true：用 fetcher 拉成 blob: URL；
 * - 其余：直接派生自 file.url（不入 ref，避免切换文件时残留旧值）
 *
 * onError 用于把取数失败上报给宿主（默认仍回退原 URL 继续尝试）。
 */
export function useResolvedUrl(
  file: Ref<PreviewFile | undefined>,
  onError?: (error: unknown) => void,
): ComputedRef<string> {
  const ctx = useRequestContext();
  const blobUrlRef = ref<string>('');
  let createdBlobUrl: string | null = null;

  const cleanup = () => {
    if (createdBlobUrl) {
      URL.revokeObjectURL(createdBlobUrl);
      createdBlobUrl = null;
    }
  };

  // 只把「是否配置了 loadFile」作为依赖；函数引用每次父级渲染都可能变化，
  // 不能仅因引用变化就重新取数。
  const hasLoader = computed(() => !!ctx.value.loadFile);
  const needBlob = computed(() => !!file.value && !!ctx.value.shouldFetchAsBlob?.(file.value));

  watch(
    [() => file.value?.id ?? '', () => file.value?.url ?? '', hasLoader, needBlob],
    async ([, , loaderOn, needBlobNow], _old, onCleanup) => {
      // 回调内读取 ctx 属于非追踪读取，拿到最新实现
      const f = file.value;
      const { fetcher, loadFile } = ctx.value;
      const useLoader = !!(
        loaderOn &&
        f &&
        !f.file &&
        !isInlineResourceUrl(f.url) &&
        getFileType(f) !== 'unsupported'
      );
      if (!f || (!useLoader && !needBlobNow)) {
        cleanup();
        blobUrlRef.value = '';
        return;
      }
      let cancelled = false;
      const controller = useLoader ? new AbortController() : null;
      onCleanup(() => {
        cancelled = true;
        controller?.abort();
      });
      blobUrlRef.value = '';
      try {
        const resolved = useLoader && loadFile
          ? await loadFile(f, { signal: controller!.signal }).then(resolveConsumableUrl)
          : await fetchAsBlobUrl(f.url, fetcher).then((url) => ({
              url,
              revoke: () => URL.revokeObjectURL(url),
            }));
        if (cancelled) {
          resolved.revoke?.();
          return;
        }
        cleanup();
        if (resolved.revoke) {
          createdBlobUrl = resolved.url;
        }
        blobUrlRef.value = resolved.url;
      } catch (err) {
        if (!cancelled) {
          console.error('[file-preview] resolve file source failed:', err);
          onError?.(err);
          blobUrlRef.value = f.url;
        }
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(cleanup);

  // 同步派生：非取数模式始终直接返回 file.url，确保切换文件时不会残留上一帧的 URL
  return computed(() => {
    const f = file.value;
    if (!f) return '';
    const useLoader = !!(
      hasLoader.value &&
      !f.file &&
      !isInlineResourceUrl(f.url) &&
      getFileType(f) !== 'unsupported'
    );
    if (!useLoader && !needBlob.value) return f.url;
    return blobUrlRef.value;
  });
}
