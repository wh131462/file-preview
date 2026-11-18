import { Injectable } from '@angular/core';
import {
  noopReporter,
  resolveErrorStage,
  type PreviewErrorPayload,
  type PreviewErrorStage,
  type PreviewFile,
  type PreviewReporter,
} from '../fp-core';

/** 顶层聚合时补齐的上下文。 */
export interface PreviewEventsContext {
  /** 当前文件 */
  file?: PreviewFile;
  /** 当前索引 */
  index: number;
  /** 本代次可接受的 URL 集合（原始 URL 与 resolved URL） */
  urls: string[];
}

/**
 * 预览事件通道（element-level provider）。
 * 渲染器通过 inject(PreviewEventsService) 取 reporter 上报；
 * 顶层通过 report 直接上报（请求层、懒加载失败等）。
 * 去重与代次校验在这里统一完成。
 */
@Injectable()
export class PreviewEventsService {
  /** 供渲染器上报的最小通道 */
  readonly reporter: PreviewReporter = {
    begin: (url: string) => {
      this.begunUrl = url;
    },
    error: (error: unknown, stage?: PreviewErrorStage) => {
      this.report(error, stage);
    },
  };

  /** 未接入时的安全默认值，便于渲染器 optional inject */
  static readonly noop = noopReporter;

  private listener: ((payload: PreviewErrorPayload) => void) | null = null;
  private readonly reportedUrls = new Set<string>();
  private begunUrl = '';
  private context: PreviewEventsContext = { index: 0, urls: [] };

  setListener(listener: ((payload: PreviewErrorPayload) => void) | null): void {
    this.listener = listener;
  }

  configure(context: PreviewEventsContext): void {
    this.context = context;
  }

  /** 切换文件或换 URL 时重置代次与去重状态 */
  reset(): void {
    this.begunUrl = '';
    this.reportedUrls.clear();
  }

  /** 请求阶段失败：只有当前文件原始 URL 的失败才上报（blob 预取时 fetcher 收到的是原 URL） */
  reportRequestError(url: string, error: unknown): void {
    const file = this.context.file;
    if (!file || file.url !== url) return;
    this.report(error, 'request');
  }

  report(error: unknown, stage?: PreviewErrorStage, cause?: unknown): void {
    const ctx = this.context;
    if (!ctx.file) return;

    const url = this.begunUrl || ctx.file.url;
    // 代次校验：切换文件/换 URL 后，旧实例的迟到回调直接丢弃
    if (ctx.urls.length > 0 && !ctx.urls.includes(url)) return;
    // 同代次同 URL 只派发一次
    if (this.reportedUrls.has(url)) return;
    this.reportedUrls.add(url);

    const payload: PreviewErrorPayload = {
      file: ctx.file,
      index: ctx.index,
      error,
      stage: resolveErrorStage(error, stage),
    };
    if (cause !== undefined) payload.cause = cause;

    this.listener?.(payload);
  }
}
