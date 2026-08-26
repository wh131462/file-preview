import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { WrapText, Code, Eye } from 'lucide-angular';
import { getLanguageFromFileName, fetchTextUtf8 } from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';
import { createShikiHighlight } from '../../utils/shiki-highlight';

@Component({
  selector: 'afp-text-renderer',
  standalone: true,
  imports: [RendererError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
      </div>
    } @else if (error()) {
      <afp-renderer-error [message]="error()!" />
    } @else if (htmlPreview() && language() === 'html') {
      <div class="afp-w-full afp-h-full afp-bg-surface-toolbar">
        <iframe
          [srcdoc]="content()"
          sandbox="allow-same-origin"
          class="afp-w-full afp-h-full afp-border-0"
          [title]="fileName()"
        ></iframe>
      </div>
    } @else if (language() === 'text' || lineHtmls().length === 0) {
      <div class="afp-w-full afp-h-full afp-overflow-auto" style="background: var(--fp-code-bg);">
        <pre
          class="afp-py-6 afp-px-4 afp-text-fg-primary afp-font-mono afp-text-sm"
          [class.afp-whitespace-pre-wrap]="wordWrap()"
          [class.afp-break-words]="wordWrap()"
          [class.afp-whitespace-pre]="!wordWrap()"
        >{{ content() }}</pre>
      </div>
    } @else {
      <div class="afp-w-full afp-h-full afp-overflow-auto" style="background: var(--fp-code-bg);">
        <div
          class="afp-code-block with-line-numbers afp-w-full"
          [class.no-wrap]="!wordWrap()"
          [style.gridTemplateRows]="'repeat(' + lines().length + ', auto) minmax(1.5rem, 1fr)'"
        >
          @for (line of lines(); track $index) {
            <span class="afp-code-gutter">{{ $index + 1 }}</span>
            <span class="afp-code-line" [innerHTML]="trust(lineHtmls()[$index] ?? '')"></span>
          }
          <span class="afp-code-gutter-filler"></span>
          <span class="afp-code-line-filler"></span>
        </div>
      </div>
    }
  `,
})
export class TextRenderer implements RendererHandle {
  url = input.required<string>();
  fileName = input.required<string>();

  private readonly emitter = new ToolbarEventEmitter();
  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);
  private readonly t = this.locale?.t() ?? getFallbackTranslator();

  readonly wordWrap = signal(true);
  readonly htmlPreview = signal(false);
  readonly content = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly language = computed(() => getLanguageFromFileName(this.fileName()));
  readonly isHtml = computed(() => this.language() === 'html');
  readonly lines = computed(() => this.content().split('\n'));

  private readonly shiki = createShikiHighlight(
    () => (this.language() !== 'text' ? this.content() : ''),
    () => this.language(),
  );
  readonly lineHtmls = this.shiki.lineHtmls;

  constructor() {
    effect(() => {
      this.url();
      void this.loadText();
    });
    effect(() => {
      this.content();
      this.language();
      void this.shiki.highlight();
    });
    effect(() => {
      this.wordWrap();
      this.htmlPreview();
      this.loading();
      this.isHtml();
      this.emitter.notify();
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => {
    const groups: ToolbarGroup[] = [
      {
        items: [
          {
            type: 'button',
            icon: WrapText,
            tooltip: this.wordWrap() ? this.t('toolbar.wrap_off') : this.t('toolbar.wrap_on'),
            action: () => this.wordWrap.update((v) => !v),
            active: this.wordWrap(),
          },
        ],
      },
    ];
    if (this.isHtml()) {
      groups.push({
        items: [
          {
            type: 'button',
            icon: this.htmlPreview() ? Code : Eye,
            tooltip: this.htmlPreview() ? this.t('toolbar.source') : this.t('toolbar.preview'),
            action: () => this.htmlPreview.update((v) => !v),
            active: this.htmlPreview(),
          },
        ],
      });
    }
    return groups;
  };

  onToolbarChange = (listener: () => void) => this.emitter.subscribe(listener);

  protected trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private async loadText(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const text = await fetchTextUtf8(this.url(), { fetcher });
      this.content.set(text);
    } catch (err) {
      console.error(err);
      this.error.set(this.t('text.load_failed'));
    } finally {
      this.loading.set(false);
    }
  }
}
