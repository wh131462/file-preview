import { Injectable, computed, inject, signal } from '@angular/core';
import {
  createTranslator,
  type Locale,
  type Messages,
  type Translator,
} from '../fp-core';

let fallbackTranslator: Translator | null = null;

export function getFallbackTranslator(): Translator {
  if (!fallbackTranslator) {
    fallbackTranslator = createTranslator({ locale: 'en-US' });
  }
  return fallbackTranslator;
}

@Injectable()
export class LocaleService {
  private readonly parent = inject(LocaleService, { optional: true, skipSelf: true });
  private readonly localeSig = signal<Locale>('en-US');
  private readonly messagesSig = signal<Partial<Record<Locale, Partial<Messages>>> | undefined>(undefined);

  readonly locale = this.localeSig.asReadonly();
  readonly t = computed<Translator>((): Translator =>
    this.messagesSig() === undefined && this.parent?.locale() === this.localeSig()
      ? this.parent.t()
      : createTranslator({ locale: this.localeSig(), messages: this.messagesSig() }),
  );

  readonly translate: Translator = (key, params) => this.t()(key, params);

  configure(
    locale: Locale | undefined,
    messages: Partial<Record<Locale, Partial<Messages>>> | undefined,
  ): void {
    this.localeSig.set(locale ?? this.parent?.locale() ?? 'en-US');
    this.messagesSig.set(messages);
  }
}
