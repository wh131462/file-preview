import { Injectable, computed, signal } from '@angular/core';
import {
  createFetcher,
  fetchAsBlobUrl,
  type Fetcher,
  type PreviewFile,
  type RequestHandler,
  type RequestInitFactory,
  type ShouldFetchAsBlob,
} from '../fp-core';

export interface RequestContextOptions {
  requestInit?: RequestInitFactory;
  requestHandler?: RequestHandler;
  shouldFetchAsBlob?: ShouldFetchAsBlob;
}

@Injectable()
export class RequestService {
  private readonly optionsSig = signal<RequestContextOptions>({});

  readonly fetcher = computed<Fetcher>(() => {
    const opts = this.optionsSig();
    return createFetcher({
      requestInit: opts.requestInit,
      requestHandler: opts.requestHandler,
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
