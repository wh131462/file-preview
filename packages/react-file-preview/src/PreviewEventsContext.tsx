import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import {
  PreviewRequestError,
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

/** 一次加载的去重键：同一 index + 同一原始 URL 视为同一次加载。 */
function fileKey(ctx: PreviewEventsHostContext): string {
  return `${ctx.index}:${ctx.file?.url ?? ''}`;
}

/** 对外保留原始异常，PreviewRequestError 只作为阶段标记。 */
function originalError(error: unknown): unknown {
  return error instanceof PreviewRequestError && error.cause !== undefined
    ? error.cause
    : error;
}

/**
 * 创建顶层事件通道（供 FilePreviewContent 自己持有，再通过 PreviewEventsProvider 下发给渲染器）。
 * 去重与代次校验在这里统一完成，宿主只会收到干净的 payload。
 */
export function usePreviewEventsChannel(
  getContext: () => PreviewEventsHostContext,
  onError?: (payload: PreviewErrorPayload) => void,
): PreviewEventsValue {
  const reportedKeys = useRef<Set<string>>(new Set());
  /** 当前渲染器声明的加载代次；reset 不清空，用于丢弃旧文件的迟到回调 */
  const begun = useRef<{ url: string; index: number } | null>(null);
  const getContextRef = useRef(getContext);
  getContextRef.current = getContext;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const emit = useCallback(
    (error: unknown, stage?: PreviewErrorStage, cause?: unknown, url?: string) => {
      const ctx = getContextRef.current();
      if (!ctx.file) return;

      // 代次校验：URL 不属于当前文件（blob 已换代 / 旧文件迟到回调）直接丢弃
      if (url && ctx.urls.length > 0 && !ctx.urls.includes(url)) return;

      // 同一次加载只派发一次
      const key = fileKey(ctx);
      if (reportedKeys.current.has(key)) return;
      reportedKeys.current.add(key);

      const payload: PreviewErrorPayload = {
        file: ctx.file,
        index: ctx.index,
        error: originalError(error),
        stage: resolveErrorStage(error, stage),
      };
      if (cause !== undefined) payload.cause = cause;

      onErrorRef.current?.(payload);
    },
    [],
  );

  const report = useCallback(
    (error: unknown, stage?: PreviewErrorStage, cause?: unknown) => {
      emit(error, stage, cause);
    },
    [emit],
  );

  const reset = useCallback(() => {
    // 只清其它文件的去重状态：保留当前键，避免渲染期先上报、effect 后清理导致重复派发
    // begun 不清空，用于丢弃旧渲染器的迟到回调
    const currentKey = fileKey(getContextRef.current());
    for (const key of reportedKeys.current) {
      if (key !== currentKey) reportedKeys.current.delete(key);
    }
  }, []);

  return useMemo<PreviewEventsValue>(() => ({
    reporter: {
      begin(url) {
        begun.current = { url, index: getContextRef.current().index };
      },
      error(error, stage) {
        const ctx = getContextRef.current();
        const current = begun.current;
        // 渲染器实例所属代次已切换：迟到的错误不能算在当前文件头上
        if (current && current.index !== ctx.index) return;
        emit(error, stage, undefined, current?.url || ctx.file?.url);
      },
    },
    report,
    reset,
  }), [emit, report, reset]);
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
