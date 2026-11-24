import { inject, provide } from 'vue';
import {
  PreviewRequestError,
  noopReporter,
  resolveErrorStage,
  type PreviewErrorPayload,
  type PreviewErrorStage,
  type PreviewFile,
  type PreviewReporter,
} from '@eternalheart/file-preview-core';

const PREVIEW_EVENTS_KEY = Symbol('file-preview:events');

/** 顶层聚合时补齐的上下文。 */
export interface PreviewEventsHostContext {
  /** 当前文件 */
  file?: PreviewFile;
  /** 当前索引 */
  index: number;
  /** 本代次可接受的 URL 集合（原始 URL 与 resolved URL） */
  urls: string[];
}

export interface PreviewEventsHost {
  /** 供内置渲染器上报的通道 */
  reporter: PreviewReporter;
  /** 顶层自用：补上下文 + 代次校验 + 去重后派发 */
  report: (error: unknown, stage?: PreviewErrorStage, cause?: unknown) => void;
  /** 切换文件时重置去重状态 */
  reset: () => void;
}

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
 * 提供预览事件通道。
 * - 渲染器通过 usePreviewEvents() 取 reporter 上报；
 * - 顶层通过返回值里的 report 直接上报（请求层、错误边界等）；
 * - 去重与代次校验在这里统一完成，宿主只会收到干净的 payload。
 */
export function providePreviewEvents(
  getContext: () => PreviewEventsHostContext,
  dispatch: (payload: PreviewErrorPayload) => void,
): PreviewEventsHost {
  const reportedKeys = new Set<string>();
  /** 当前渲染器声明的加载代次；reset 不清空，用于丢弃旧文件的迟到回调 */
  let begun: { url: string; index: number } | null = null;

  const emit = (
    error: unknown,
    stage?: PreviewErrorStage,
    cause?: unknown,
    url?: string,
  ) => {
    const ctx = getContext();
    if (!ctx.file) return;

    // 代次校验：URL 不属于当前文件（blob 已换代 / 旧文件迟到回调）直接丢弃
    if (url && ctx.urls.length > 0 && !ctx.urls.includes(url)) return;

    // 同一次加载只派发一次
    const key = fileKey(ctx);
    if (reportedKeys.has(key)) return;
    reportedKeys.add(key);

    const payload: PreviewErrorPayload = {
      file: ctx.file,
      index: ctx.index,
      error: originalError(error),
      stage: resolveErrorStage(error, stage),
    };
    if (cause !== undefined) payload.cause = cause;

    dispatch(payload);
  };

  const report: PreviewEventsHost['report'] = (error, stage, cause) => {
    emit(error, stage, cause);
  };

  const reporter: PreviewReporter = {
    begin(url) {
      begun = { url, index: getContext().index };
    },
    error(error, stage) {
      const ctx = getContext();
      const current = begun;
      // 渲染器实例所属代次已切换：迟到的错误不能算在当前文件头上
      if (current && current.index !== ctx.index) return;
      emit(error, stage, undefined, current?.url || ctx.file?.url);
    },
  };

  provide(PREVIEW_EVENTS_KEY, reporter);

  return {
    reporter,
    report,
    reset() {
      // 只清其它文件的去重状态：保留当前键，避免重复派发；begun 保留用于代次校验
      const currentKey = fileKey(getContext());
      for (const key of reportedKeys) {
        if (key !== currentKey) reportedKeys.delete(key);
      }
    },
  };
}

/** 渲染器侧使用；未接入事件通道时返回 noop。 */
export function usePreviewEvents(): PreviewReporter {
  return inject<PreviewReporter>(PREVIEW_EVENTS_KEY, noopReporter);
}
