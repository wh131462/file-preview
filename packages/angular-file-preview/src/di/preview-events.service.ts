import { Injectable } from '@angular/core';
import {
  PreviewRequestError,
  getFileType,
  noopReporter,
  resolveErrorStage,
  type PreviewErrorPayload,
  type PreviewErrorStage,
  type PreviewFile,
  type PreviewRenderedPayload,
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
      this.begun = { url, index: this.context.index, startedAt: Date.now() };
    },
    error: (error: unknown, stage?: PreviewErrorStage) => {
      const current = this.begun;
      // 渲染器实例所属代次已切换：迟到的错误不能算在当前文件头上
      if (current && current.index !== this.context.index) return;
      this.emit(error, stage, undefined, current?.url || this.context.file?.url);
    },
    ready: () => {
      this.emitRendered();
    },
  };

  /** 未接入时的安全默认值，便于渲染器 optional inject */
  static readonly noop = noopReporter;

  private listener: ((payload: PreviewErrorPayload) => void) | null = null;
  private renderedListener: ((payload: PreviewRenderedPayload) => void) | null = null;
  private readonly reportedKeys = new Set<string>();
  private readonly renderedKeys = new Set<string>();
  /** 当前渲染器声明的加载代次；reset 不清空，用于丢弃旧文件的迟到回调 */
  private begun: { url: string; index: number; startedAt: number } | null = null;
  private context: PreviewEventsContext = { index: 0, urls: [] };

  setListener(listener: ((payload: PreviewErrorPayload) => void) | null): void {
    this.listener = listener;
  }

  setRenderedListener(listener: ((payload: PreviewRenderedPayload) => void) | null): void {
    this.renderedListener = listener;
  }

  configure(context: PreviewEventsContext): void {
    this.context = context;
  }

  /** 切换文件或换 URL 时清空其它文件的去重状态（保留 begun 供旧回调校验代次） */
  reset(): void {
    const currentKey = `${this.context.index}:${this.context.file?.url ?? ''}`;
    for (const key of this.reportedKeys) {
      if (key !== currentKey) this.reportedKeys.delete(key);
    }
    for (const key of this.renderedKeys) {
      if (key !== currentKey) this.renderedKeys.delete(key);
    }
  }

  /** 请求阶段失败：只有当前文件原始 URL 的失败才上报（blob 预取时 fetcher 收到的是原 URL） */
  reportRequestError(url: string, error: unknown): void {
    const file = this.context.file;
    if (!file || file.url !== url) return;
    this.report(error, 'request');
  }

  /** 顶层上报：始终归属当前文件，不依赖 begun 代次 */
  report(error: unknown, stage?: PreviewErrorStage, cause?: unknown): void {
    this.emit(error, stage, cause);
  }

  private emit(
    error: unknown,
    stage?: PreviewErrorStage,
    cause?: unknown,
    url?: string,
  ): void {
    const ctx = this.context;
    if (!ctx.file) return;

    // 代次校验：URL 不属于当前文件（blob 已换代 / 旧文件迟到回调）直接丢弃
    if (url && ctx.urls.length > 0 && !ctx.urls.includes(url)) return;

    // 同一次加载只派发一次（按稳定字段而非对象身份）
    const key = `${ctx.index}:${ctx.file.url}`;
    if (this.reportedKeys.has(key)) return;
    this.reportedKeys.add(key);

    const payload: PreviewErrorPayload = {
      file: ctx.file,
      index: ctx.index,
      // 对外保留原始异常，PreviewRequestError 只作为阶段标记
      error: error instanceof PreviewRequestError && error.cause !== undefined
        ? error.cause
        : error,
      stage: resolveErrorStage(error, stage),
    };
    if (cause !== undefined) payload.cause = cause;

    this.listener?.(payload);
  }

  private emitRendered(): void {
    const ctx = this.context;
    if (!ctx.file) return;

    const current = this.begun;
    if (current && current.index !== ctx.index) return;
    const url = current?.url || ctx.file.url;
    if (url && ctx.urls.length > 0 && !ctx.urls.includes(url)) return;

    const key = `${ctx.index}:${ctx.file.url}`;
    if (this.renderedKeys.has(key)) return;
    this.renderedKeys.add(key);

    const payload: PreviewRenderedPayload = {
      file: ctx.file,
      index: ctx.index,
      fileType: getFileType(ctx.file),
    };
    if (current && current.index === ctx.index) {
      payload.durationMs = Date.now() - current.startedAt;
    }
    this.renderedListener?.(payload);
  }
}
