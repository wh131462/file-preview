import { PreviewError } from '../i18n';
import { PreviewRequestError } from '../events';
import type {
  Fetcher,
  FileContent,
  FileLoader,
  RequestHandler,
  RequestInitFactory,
  RequestOptions,
} from '../types';

/**
 * 判断 URL 是否为库内已解析的本地资源（object URL / data URL）。
 * 这类 URL 不需要也不能再经过用户的 requestInit / requestHandler。
 */
export function isInlineResourceUrl(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith('data:');
}

/**
 * 构造一个只负责注入 headers / RequestInit 的 FileLoader。
 *
 * 适合「只想补一个 Authorization / Cookie」的迁移场景：
 * ```ts
 * loadFile={withHeaders({ Authorization: `Bearer ${token}` })}
 * ```
 * 复杂逻辑（签名刷新、加解密、大文件直链）请直接写 `loadFile`。
 * `init.signal` 会被组件传入的取消信号覆盖。
 */
export function withHeaders(
  headers: HeadersInit,
  init?: RequestInit,
): FileLoader {
  return async (file, ctx) => {
    const mergedHeaders = new Headers(init?.headers ?? undefined);
    new Headers(headers).forEach((value, key) => {
      mergedHeaders.set(key, value);
    });
    const response = await fetch(file.url, {
      ...init,
      headers: mergedHeaders,
      signal: ctx.signal,
    });
    if (!response.ok) {
      throw new PreviewRequestError(
        new PreviewError('request.failed', { status: response.status }),
      );
    }
    return response.blob();
  };
}

/**
 * 把 FileLoader 的返回值转成可直接消费的 URL。
 * - Blob：创建 `blob:` URL，并通过 `revoke` 交还释放责任；
 * - `{ url }`：原样返回，`revoke` 为 null（生命周期由调用方管理）。
 */
export function resolveConsumableUrl(content: FileContent): {
  url: string;
  revoke: (() => void) | null;
} {
  if (typeof Blob !== 'undefined' && content instanceof Blob) {
    const url = URL.createObjectURL(content);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  }
  return { url: (content as { url: string }).url, revoke: null };
}

/**
 * 解析 RequestInitFactory 为 RequestInit。
 */
async function resolveInitFactory(
  factory: RequestInitFactory | undefined,
  url: string,
): Promise<RequestInit | undefined> {
  if (!factory) return undefined;
  if (typeof factory === 'function') {
    return await factory(url);
  }
  return factory;
}

/**
 * 合并两个 RequestInit：base 作为底，override 覆盖；headers 走 Headers 合并语义。
 */
function mergeInit(
  base?: RequestInit,
  override?: RequestInit,
): RequestInit | undefined {
  if (!base && !override) return undefined;
  if (!base) return override;
  if (!override) return base;
  const headers = new Headers(base.headers || {});
  if (override.headers) {
    new Headers(override.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return {
    ...base,
    ...override,
    headers,
  };
}

/**
 * 判断异常是否来自主动取消（AbortController / AbortSignal）。
 *
 * 取消不是取数失败：既不能回调 onRequestError，也不能包装成
 * PreviewRequestError，否则会丢掉 `name === 'AbortError'`，让渲染器
 * 无法走取消分支（StrictMode 双调用、切换文件都会触发 abort）。
 */
function isAbortError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const { name, code } = err as { name?: unknown; code?: unknown };
  return name === 'AbortError' || code === 'ABORT_ERR';
}

/**
 * 构造一个统一的 fetcher：
 * - 调用方 init 与外部 RequestInitFactory 合并（外部为底，调用方为优先级更高的覆盖层）
 * - 提供 requestHandler 时由 handler 接管，否则走原生 fetch
 * - 失败统一包装成 PreviewRequestError，并回调 options.onRequestError
 * - 主动取消（AbortError）原样抛出，不视为失败
 *
 * 不传 options 时，等价于直接返回原生 fetch。
 */
export function createFetcher(options?: RequestOptions): Fetcher {
  const handler: RequestHandler =
    options?.requestHandler ?? ((url, init) => fetch(url, init));
  const factory = options?.requestInit;
  const onRequestError = options?.onRequestError;

  return async (url, callerInit) => {
    try {
      // blob:/data: 是库内或宿主已解析的本地资源，直接原生取用，
      // 避免请求注入（如 axios 拼 baseURL）污染假 URL，也避免重复鉴权。
      if (isInlineResourceUrl(url)) {
        return await fetch(url, callerInit);
      }
      const factoryInit = await resolveInitFactory(factory, url);
      const merged = mergeInit(factoryInit, callerInit);
      return await handler(url, merged);
    } catch (err) {
      if (err instanceof PreviewRequestError) throw err;
      if (isAbortError(err)) throw err;
      try {
        onRequestError?.(url, err);
      } catch (callbackError) {
        // 宿主回调异常不能替换原始取数异常，也不能中断请求链路
        console.error('[file-preview] onRequestError handler failed:', callbackError);
      }
      throw new PreviewRequestError(err);
    }
  };
}

/**
 * 用 fetcher 把 URL 拉成 blob: URL，方便喂给 <img src> / <Document file> 等。
 * 调用方负责在不再需要时 URL.revokeObjectURL(blobUrl)。
 */
export async function fetchAsBlobUrl(
  url: string,
  fetcher: Fetcher = fetch,
  init?: RequestInit,
): Promise<string> {
  const res = await fetcher(url, init);
  if (!res.ok) {
    throw new PreviewRequestError(new PreviewError('request.failed', { status: res.status }));
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * 通过 fetcher 下载文件到本地：
 * - 先用 fetcher 拉成 Blob（自动复用鉴权 init / handler）
 * - createObjectURL → 触发 <a download> → revokeObjectURL
 *
 * 鉴权 URL 场景下，比直接 `<a href={url} download>` 更可靠（后者不带自定义 header）。
 */
export async function downloadFileWithFetcher(
  url: string,
  fileName: string,
  fetcher: Fetcher = fetch,
  init?: RequestInit,
): Promise<void> {
  const res = await fetcher(url, init);
  if (!res.ok) {
    throw new PreviewRequestError(new PreviewError('request.failed', { status: res.status }));
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // 给浏览器一点时间触发下载再 revoke
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }
}
