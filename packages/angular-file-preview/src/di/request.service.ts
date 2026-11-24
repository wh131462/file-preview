import { Injectable, computed, inject, signal } from '@angular/core';
import {
  createFetcher,
  fetchAsBlobUrl,
  resolveConsumableUrl,
  type Fetcher,
  type FileLoader,
  type PreviewFile,
  type RequestHandler,
  type RequestInitFactory,
  type ShouldFetchAsBlob,
} from '../fp-core';
import { PreviewEventsService } from './preview-events.service';

export interface RequestContextOptions {
  loadFile?: FileLoader;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestInit?: RequestInitFactory;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestHandler?: RequestHandler;
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  shouldFetchAsBlob?: ShouldFetchAsBlob;
}

@Injectable()
export class RequestService {
  private readonly optionsSig = signal<RequestContextOptions>({});
  /** 事件通道可选：单独使用 RequestService 时不影响既有行为 */
  private readonly events = inject(PreviewEventsService, { optional: true });

  readonly fetcher = computed<Fetcher>(() => {
    const opts = this.optionsSig();
    return createFetcher({
      requestInit: opts.requestInit,
      requestHandler: opts.requestHandler,
      onRequestError: (url, error) => this.events?.reportRequestError(url, error),
    });
  });

  /** 下载专用 fetcher：不绑定错误上报，下载失败不应触发预览 onError */
  readonly downloadFetcher = computed<Fetcher>(() => {
    const opts = this.optionsSig();
    return createFetcher({
      requestInit: opts.requestInit,
      requestHandler: opts.requestHandler,
    });
  });

  readonly shouldFetchAsBlob = computed(() => this.optionsSig().shouldFetchAsBlob);

  readonly loadFile = computed(() => this.optionsSig().loadFile);

  configure(options: RequestContextOptions): void {
    this.optionsSig.set(options);
  }

  /**
   * 解析可消费 URL。调用方需自行在变更时 revoke；此方法返回 Promise。
   */
  async resolveBlobUrl(url: string): Promise<string> {
    return fetchAsBlobUrl(url, this.fetcher());
  }

  /**
   * 通过 loadFile 取数并转成可消费 URL。调用方需在不再使用时调用 revoke。
   * 未配置 loadFile 时抛出，调用方应先判断 `loadFile()`。
   */
  async resolveWithLoader(
    file: PreviewFile,
    signal: AbortSignal,
  ): Promise<{ url: string; revoke: (() => void) | null }> {
    const loader = this.optionsSig().loadFile;
    if (!loader) throw new Error('[file-preview] loadFile is not configured');
    return resolveConsumableUrl(await loader(file, { signal }));
  }
}

export function needsBlobUrl(file: PreviewFile | undefined, shouldFetchAsBlob?: ShouldFetchAsBlob): boolean {
  return !!(file && shouldFetchAsBlob?.(file));
}
