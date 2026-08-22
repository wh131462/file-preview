import { Injectable, computed, signal } from '@angular/core';
import {
  createTranslator,
  type Locale,
  type Messages,
  type Translator,
} from '../fp-core';

let fallbackTranslator: Translator | null = null;

export function getFallbackTranslator(): Translator {
  if (!fallbackTranslator) {
    fallbackTranslator = createTranslator({ locale: 'zh-CN' });
  }
  return fallbackTranslator;
}

@Injectable()
export class LocaleService {
  private readonly localeSig = signal<Locale>('zh-CN');
  private readonly messagesSig = signal<Partial<Record<Locale, Partial<Messages>>> | undefined>(undefined);

  readonly locale = this.localeSig.asReadonly();
  readonly t = computed<Translator>(() =>
    createTranslator({ locale: this.localeSig(), messages: this.messagesSig() }),
  );

  configure(
    locale: Locale | undefined,
    messages: Partial<Record<Locale, Partial<Messages>>> | undefined,
  ): void {
    this.localeSig.set(locale ?? 'zh-CN');
    this.messagesSig.set(messages);
  }
}
