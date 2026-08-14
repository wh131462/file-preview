import { computed, Injectable, signal } from '@angular/core';
import {
  createFetcher,
  createTranslator,
  type Locale,
  type Messages,
  type RequestHandler,
  type RequestInitFactory,
  type ShouldFetchAsBlob,
  type Translator,
} from '@eternalheart/file-preview-core';
import type { ResolvedTheme, RequestContextValue } from './tokens';

@Injectable()
export class AfpLocaleStore {
  readonly locale = signal<Locale>('zh-CN');
  readonly messages = signal<Partial<Record<Locale, Partial<Messages>>> | undefined>(undefined);
  readonly t = computed<Translator>(() =>
    createTranslator({ locale: this.locale(), messages: this.messages() }),
  );
}

@Injectable()
export class AfpThemeStore {
  readonly theme = signal<ResolvedTheme>('dark');
}

@Injectable()
export class AfpRequestStore {
  readonly requestInit = signal<RequestInitFactory | undefined>(undefined);
  readonly requestHandler = signal<RequestHandler | undefined>(undefined);
  readonly shouldFetchAsBlob = signal<ShouldFetchAsBlob | undefined>(undefined);

  readonly value = computed<RequestContextValue>(() => ({
    fetcher: createFetcher({
      requestInit: this.requestInit(),
      requestHandler: this.requestHandler(),
    }),
    shouldFetchAsBlob: this.shouldFetchAsBlob(),
  }));
}
