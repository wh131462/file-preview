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
  children: React.ReactNode;
}

export const RequestProvider: React.FC<RequestProviderProps> = ({
  requestInit,
  requestHandler,
  shouldFetchAsBlob,
  children,
}) => {
  const value = useMemo<RequestContextValue>(
    () => ({
      fetcher: createFetcher({ requestInit, requestHandler }),
      shouldFetchAsBlob,
    }),
    [requestInit, requestHandler, shouldFetchAsBlob],
  );
  return (
    <RequestContext.Provider value={value}>{children}</RequestContext.Provider>
  );
};

export function useRequest(): RequestContextValue {
  return useContext(RequestContext);
}

export function useFetcher(): Fetcher {
  return useContext(RequestContext).fetcher;
}

/**
 * 解析 file 的可消费 URL：
 * - 未配置 shouldFetchAsBlob 或返回 false：直接返回 file.url
 * - 返回 true：用 fetcher 拉成 blob: URL，组件卸载或 file 变化时 revoke
 *
 * 期间返回空字符串（表示 "还没准备好"），调用方应避免空 URL 时挂载到 <img src> 等。
 */
export function useResolvedUrl(file: PreviewFile | undefined): string {
  const { fetcher, shouldFetchAsBlob } = useContext(RequestContext);
  const needBlob = !!(file && shouldFetchAsBlob?.(file));
  const [resolved, setResolved] = useState<string>(() =>
    !file ? '' : needBlob ? '' : file.url,
  );
  const createdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file) {
      setResolved('');
      return;
    }
    if (!needBlob) {
      setResolved(file.url);
      return;
    }
    let cancelled = false;
    setResolved('');
    fetchAsBlobUrl(file.url, fetcher)
      .then((blobUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        if (createdRef.current) {
          URL.revokeObjectURL(createdRef.current);
        }
        createdRef.current = blobUrl;
        setResolved(blobUrl);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[file-preview] resolve blob url failed:', err);
          setResolved(file.url);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file?.id, file?.url, needBlob, fetcher]);

  // 卸载时 revoke 最后一次创建的 blob URL
  useEffect(() => {
    return () => {
      if (createdRef.current) {
        URL.revokeObjectURL(createdRef.current);
        createdRef.current = null;
      }
    };
  }, []);

  return resolved;
}
