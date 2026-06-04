import type { Fetcher } from '../types';

/**
 * 文本编码解码工具
 * 自动检测 BOM → 严格 UTF-8 → GBK 降级，覆盖绝大多数中文文本场景
 */

/**
 * 智能解码：自动识别编码并解码为字符串
 *
 * 检测优先级：
 * 1. BOM（UTF-8 / UTF-16 LE / UTF-16 BE）
 * 2. 严格 UTF-8（`fatal: true`，所有字节均为合法 UTF-8 序列）
 * 3. GBK（中文 Windows 常见默认编码，兼容 GB2312 / GBK / GB18030 子集）
 * 4. 兜底：有损 UTF-8（替换非法字节为 U+FFFD）
 */
export function decodeText(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // --- BOM 检测 ---
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes);
  }

  // --- 严格 UTF-8 ---
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // 非合法 UTF-8
  }

  // --- GBK（涵盖 GB2312 / GBK 双字节中文） ---
  try {
    return new TextDecoder('gbk').decode(bytes);
  } catch {
    // 极罕见：浏览器不支持 GBK
  }

  // --- 兜底 ---
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/** @deprecated 请使用 decodeText，此别名保留兼容 */
export const decodeUtf8 = decodeText;

export interface FetchTextOptions {
  fetcher?: Fetcher;
  init?: RequestInit;
  signal?: AbortSignal;
}

/**
 * 从 URL fetch 文本资源，自动检测编码。
 *
 * 兼容两种调用方式：
 * - `fetchTextUtf8(url, init)` —— 兼容旧 API
 * - `fetchTextUtf8(url, { fetcher, init })` —— 注入自定义 fetcher（鉴权场景）
 */
export async function fetchTextUtf8(
  url: string,
  optionsOrInit?: FetchTextOptions | RequestInit,
): Promise<string> {
  const isOptions =
    !!optionsOrInit &&
    ('fetcher' in (optionsOrInit as FetchTextOptions) ||
      'init' in (optionsOrInit as FetchTextOptions) ||
      'signal' in (optionsOrInit as FetchTextOptions));
  const fetcher = isOptions
    ? (optionsOrInit as FetchTextOptions).fetcher ?? fetch
    : fetch;
  const signal = isOptions
    ? (optionsOrInit as FetchTextOptions).signal
    : undefined;
  const init = isOptions
    ? (optionsOrInit as FetchTextOptions).init
    : (optionsOrInit as RequestInit | undefined);

  // 合并 signal 到 init
  const mergedInit = signal ? { ...init, signal } : init;

  const res = await fetcher(url, mergedInit);
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  const buf = await res.arrayBuffer();
  return decodeText(buf);
}
