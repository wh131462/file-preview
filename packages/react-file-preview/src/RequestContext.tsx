import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

const defaultValue: RequestContextValue = {
  fetcher: (url, init) => fetch(url, init),
};

const RequestContext = createContext<RequestContextValue>(defaultValue);

export interface RequestProviderProps {
  requestInit?: RequestInitFactory;
  requestHandler?: RequestHandler;
  shouldFetchAsBlob?: ShouldFetchAsBlob;
  /** 请求阶段失败回调：handler / requestInit 抛出时触发，用于上报宿主 */
  onRequestError?: (url: string, error: unknown) => void;
  children: React.ReactNode;
}

export const RequestProvider: React.FC<RequestProviderProps> = ({
  requestInit,
  requestHandler,
  shouldFetchAsBlob,
  onRequestError,
  children,
}) => {
  const value = useMemo<RequestContextValue>(
    () => ({
      fetcher: createFetcher({ requestInit, requestHandler, onRequestError }),
      shouldFetchAsBlob,
    }),
    [requestInit, requestHandler, shouldFetchAsBlob, onRequestError],
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
 * - 未配置 shouldFetchAsBlob 或返回 false：同步返回 file.url（不入 state，避免切换文件时残留旧值）
 * - 返回 true：用 fetcher 拉成 blob: URL，组件卸载或 file 变化时 revoke
 *
 * 期间返回空字符串（表示 "还没准备好"），调用方应避免空 URL 时挂载到 <img src> 等。
 * onError 用于把 blob 预取失败上报给宿主（默认仍回退原 URL 继续尝试）。
 */
export function useResolvedUrl(
  file: PreviewFile | undefined,
  onError?: (error: unknown) => void,
): string {
  const { fetcher, shouldFetchAsBlob } = useContext(RequestContext);
  const needBlob = !!(file && shouldFetchAsBlob?.(file));
  // 仅在需要预取 blob 时才使用 state；其他场景下方法返回值由 file.url 派生，避免 state 跨文件切换时残留
  const [blobUrl, setBlobUrl] = useState<string>('');
  const createdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file || !needBlob) {
      // 离开 blob 模式：清掉上次缓存的 blob URL
      if (createdRef.current) {
        URL.revokeObjectURL(createdRef.current);
        createdRef.current = null;
      }
      setBlobUrl('');
      return;
    }
    let cancelled = false;
    setBlobUrl('');
    fetchAsBlobUrl(file.url, fetcher)
      .then((next) => {
        if (cancelled) {
          URL.revokeObjectURL(next);
          return;
        }
        if (createdRef.current) {
          URL.revokeObjectURL(createdRef.current);
        }
        createdRef.current = next;
        setBlobUrl(next);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[file-preview] resolve blob url failed:', err);
          onError?.(err);
          setBlobUrl(file.url);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file?.id, file?.url, needBlob, fetcher, onError]);

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
  if (!needBlob) return file.url;
  return blobUrl;
}
