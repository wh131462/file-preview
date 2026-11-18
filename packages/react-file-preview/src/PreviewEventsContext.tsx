import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import {
  noopReporter,
  resolveErrorStage,
  type PreviewErrorPayload,
  type PreviewErrorStage,
  type PreviewFile,
  type PreviewReporter,
} from '@eternalheart/file-preview-core';

/** 顶层聚合时补齐的上下文。 */
export interface PreviewEventsHostContext {
  file?: PreviewFile;
  index: number;
  /** 本代次可接受的 URL 集合（原始 URL 与 resolved URL） */
  urls: string[];
}

export interface PreviewEventsValue {
  /** 供内置渲染器上报的通道 */
  reporter: PreviewReporter;
  /** 顶层自用：补上下文 + 代次校验 + 去重后派发 */
  report: (error: unknown, stage?: PreviewErrorStage, cause?: unknown) => void;
  /** 切换文件时重置代次与去重状态 */
  reset: () => void;
}

const PreviewEventsContext = createContext<PreviewEventsValue | null>(null);

const fallbackValue: PreviewEventsValue = {
  reporter: noopReporter,
  report: () => {
    // no-op
  },
  reset: () => {
    // no-op
  },
};

/**
 * 创建顶层事件通道（供 FilePreviewContent 自己持有，再通过 PreviewEventsProvider 下发给渲染器）。
 * 去重与代次校验在这里统一完成，宿主只会收到干净的 payload。
 */
export function usePreviewEventsChannel(
  getContext: () => PreviewEventsHostContext,
  onError?: (payload: PreviewErrorPayload) => void,
): PreviewEventsValue {
  const reportedUrls = useRef<Set<string>>(new Set());
  const begunUrl = useRef('');
  const getContextRef = useRef(getContext);
  getContextRef.current = getContext;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const reset = useCallback(() => {
    begunUrl.current = '';
    reportedUrls.current.clear();
  }, []);

  const report = useCallback((error: unknown, stage?: PreviewErrorStage, cause?: unknown) => {
    const ctx = getContextRef.current();
    if (!ctx.file) return;

    const url = begunUrl.current || ctx.file.url;
    // 代次校验：切换文件/换 URL 后，旧实例的迟到回调直接丢弃
    if (ctx.urls.length > 0 && !ctx.urls.includes(url)) return;
    // 同代次同 URL 只派发一次
    if (reportedUrls.current.has(url)) return;
    reportedUrls.current.add(url);

    const payload: PreviewErrorPayload = {
      file: ctx.file,
      index: ctx.index,
      error,
      stage: resolveErrorStage(error, stage),
    };
    if (cause !== undefined) payload.cause = cause;

    onErrorRef.current?.(payload);
  }, []);

  return useMemo<PreviewEventsValue>(() => ({
    reporter: {
      begin(url) {
        begunUrl.current = url;
      },
      error(error, stage) {
        report(error, stage);
      },
    },
    report,
    reset,
  }), [report, reset]);
}

/** 把事件通道下发给渲染器子树。 */
export const PreviewEventsProvider: React.FC<{
  value: PreviewEventsValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <PreviewEventsContext.Provider value={value}>{children}</PreviewEventsContext.Provider>
);

/** 渲染器侧使用；未接入事件通道时返回 noop。 */
export function usePreviewEvents(): PreviewReporter {
  return useContext(PreviewEventsContext)?.reporter ?? noopReporter;
}

/** 顶层内部使用：拿完整通道能力。 */
export function usePreviewEventsValue(): PreviewEventsValue {
  return useContext(PreviewEventsContext) ?? fallbackValue;
}
