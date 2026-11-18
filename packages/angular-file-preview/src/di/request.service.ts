import { Injectable, computed, inject, signal } from '@angular/core';
import {
  createFetcher,
  fetchAsBlobUrl,
  type Fetcher,
  type PreviewFile,
  type RequestHandler,
  type RequestInitFactory,
  type ShouldFetchAsBlob,
} from '../fp-core';
import { PreviewEventsService } from './preview-events.service';

export interface RequestContextOptions {
  requestInit?: RequestInitFactory;
  requestHandler?: RequestHandler;
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

  readonly shouldFetchAsBlob = computed(() => this.optionsSig().shouldFetchAsBlob);

  configure(options: RequestContextOptions): void {
    this.optionsSig.set(options);
  }

  /**
   * 解析可消费 URL。调用方需自行在变更时 revoke；此方法返回 Promise。
   */
  async resolveBlobUrl(url: string): Promise<string> {
    return fetchAsBlobUrl(url, this.fetcher());
  }
}

export function needsBlobUrl(file: PreviewFile | undefined, shouldFetchAsBlob?: ShouldFetchAsBlob): boolean {
  return !!(file && shouldFetchAsBlob?.(file));
}
