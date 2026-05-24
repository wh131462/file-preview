import type {
  Fetcher,
  RequestHandler,
  RequestInitFactory,
  RequestOptions,
} from '../types';

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
 * 构造一个统一的 fetcher：
 * - 调用方 init 与外部 RequestInitFactory 合并（外部为底，调用方为优先级更高的覆盖层）
 * - 提供 requestHandler 时由 handler 接管，否则走原生 fetch
 *
 * 不传 options 时，等价于直接返回原生 fetch。
 */
export function createFetcher(options?: RequestOptions): Fetcher {
  const handler: RequestHandler =
    options?.requestHandler ?? ((url, init) => fetch(url, init));
  const factory = options?.requestInit;

  return async (url, callerInit) => {
    const factoryInit = await resolveInitFactory(factory, url);
    const merged = mergeInit(factoryInit, callerInit);
    return handler(url, merged);
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
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
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
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
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
