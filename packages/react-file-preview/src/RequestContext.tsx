import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

const defaultValue: RequestContextValue = {
  fetcher: (url, init) => fetch(url, init),
};

const RequestContext = createContext<RequestContextValue>(defaultValue);

export interface RequestProviderProps {
  /** 统一取数入口：鉴权 / 签名场景下由宿主决定文件怎么取 */
  loadFile?: FileLoader;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestInit?: RequestInitFactory;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestHandler?: RequestHandler;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  shouldFetchAsBlob?: ShouldFetchAsBlob;
  /** 请求阶段失败回调：handler / requestInit 抛出时触发，用于上报宿主 */
  onRequestError?: (url: string, error: unknown) => void;
  children: React.ReactNode;
}

export const RequestProvider: React.FC<RequestProviderProps> = ({
  loadFile,
  requestInit,
  requestHandler,
  shouldFetchAsBlob,
  onRequestError,
  children,
}) => {
  // fetcher 只随传输层配置变化；loadFile 引用变化不应重建 fetcher（否则会触发重复取数）
  const fetcher = useMemo(
    () => createFetcher({ requestInit, requestHandler, onRequestError }),
    [requestInit, requestHandler, onRequestError],
  );
  const value = useMemo<RequestContextValue>(
    () => ({ fetcher, loadFile, shouldFetchAsBlob }),
    [fetcher, loadFile, shouldFetchAsBlob],
  );
  return (
    <RequestContext.Provider value={value}>{children}</RequestContext.Provider>
  );
};

export function useFetcher(): Fetcher {
  return useContext(RequestContext).fetcher;
}

/**
 * 解析 file 的可消费 URL：
 * - 配置了 loadFile 且是远程可预览文件：由宿主取数，Blob 转 blob: URL，`{ url }` 直接使用；
 * - 未配置 loadFile、shouldFetchAsBlob 返回 true：用 fetcher 拉成 blob: URL；
 * - 其余：同步返回 file.url（不入 state，避免切换文件时残留旧值）
 *
 * 期间返回空字符串（表示 "还没准备好"），调用方应避免空 URL 时挂载到 <img src> 等。
 * onError 用于把取数失败上报给宿主（默认仍回退原 URL 继续尝试）。
 */
export function useResolvedUrl(
  file: PreviewFile | undefined,
  onError?: (error: unknown) => void,
): string {
  const { fetcher, loadFile, shouldFetchAsBlob } = useContext(RequestContext);
  const needBlob = !!(file && shouldFetchAsBlob?.(file));
  // loadFile 优先：本地文件 / 已解析 URL / 不支持的预览类型不触发取数
  const hasLoader = !!loadFile;
  const useLoader = !!(
    hasLoader &&
    file &&
    !file.file &&
    !isInlineResourceUrl(file.url) &&
    getFileType(file) !== 'unsupported'
  );
  // 仅在需要取数时才使用 state；其他场景下返回值由 file.url 派生，避免 state 跨文件切换时残留
  const [blobUrl, setBlobUrl] = useState<string>('');
  const createdRef = useRef<string | null>(null);
  // 函数 prop 通常以内联箭头形式传入，引用每次渲染都会变；
  // 用 ref 取最新实现，避免仅因引用变化就重新取数。
  const loadFileRef = useRef(loadFile);
  useEffect(() => {
    loadFileRef.current = loadFile;
  }, [loadFile]);

  useEffect(() => {
    const revokeCreated = () => {
      if (createdRef.current) {
        URL.revokeObjectURL(createdRef.current);
        createdRef.current = null;
      }
    };

    if (!file || (!useLoader && !needBlob)) {
      // 离开取数模式：清掉上次缓存的 blob URL
      revokeCreated();
      setBlobUrl('');
      return;
    }

    let cancelled = false;
    const controller = useLoader ? new AbortController() : null;
    setBlobUrl('');

    const loader = loadFileRef.current;
    const task: Promise<{ url: string; revoke: (() => void) | null }> =
      useLoader && loader
        ? loader(file, { signal: controller!.signal }).then(resolveConsumableUrl)
        : fetchAsBlobUrl(file.url, fetcher).then((url) => ({
            url,
            revoke: () => URL.revokeObjectURL(url),
          }));

    task
      .then(({ url, revoke }) => {
        if (cancelled) {
          revoke?.();
          return;
        }
        revokeCreated();
        if (revoke) {
          createdRef.current = url;
        }
        setBlobUrl(url);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[file-preview] resolve file source failed:', err);
        onError?.(err);
        setBlobUrl(file.url);
      });

    return () => {
      cancelled = true;
      controller?.abort();
    };
    // 刻意不依赖 loadFile 引用：引用变化不应触发重复取数
  }, [file?.id, file?.url, needBlob, useLoader, fetcher, onError]);

  // 卸载时 revoke 最后一次创建的 blob URL
  useEffect(() => {
    return () => {
      if (createdRef.current) {
        URL.revokeObjectURL(createdRef.current);
        createdRef.current = null;
      }
    };
  }, []);

  if (!file) return '';
  if (!useLoader && !needBlob) return file.url;
  return blobUrl;
}
