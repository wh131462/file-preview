import { inject, provide } from 'vue';
import {
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
  /** 切换文件时重置代次与去重状态 */
  reset: () => void;
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
  const reportedUrls = new Set<string>();
  let begunUrl = '';

  const report: PreviewEventsHost['report'] = (error, stage, cause) => {
    const ctx = getContext();
    if (!ctx.file) return;

    const url = begunUrl || ctx.file.url;
    // 代次校验：切换文件/换 URL 后，旧实例的迟到回调直接丢弃
    if (ctx.urls.length > 0 && !ctx.urls.includes(url)) return;
    // 同代次同 URL 只派发一次
    if (reportedUrls.has(url)) return;
    reportedUrls.add(url);

    const payload: PreviewErrorPayload = {
      file: ctx.file,
      index: ctx.index,
      error,
      stage: resolveErrorStage(error, stage),
    };
    if (cause !== undefined) payload.cause = cause;

    dispatch(payload);
  };

  const reporter: PreviewReporter = {
    begin(url) {
      begunUrl = url;
    },
    error(error, stage) {
      report(error, stage);
    },
  };

  provide(PREVIEW_EVENTS_KEY, reporter);

  return {
    reporter,
    report,
    reset() {
      begunUrl = '';
      reportedUrls.clear();
    },
  };
}

/** 渲染器侧使用；未接入事件通道时返回 noop。 */
export function usePreviewEvents(): PreviewReporter {
  return inject<PreviewReporter>(PREVIEW_EVENTS_KEY, noopReporter);
}
