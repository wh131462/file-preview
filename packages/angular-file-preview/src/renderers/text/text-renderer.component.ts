import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { WrapText, Code, Eye } from 'lucide-angular';
import { fetchTextUtf8, getLanguageFromFileName } from '@eternalheart/file-preview-core';
import { injectTranslator } from '../../inject/translator';
import { injectFetcher } from '../../inject/request';
import { injectShikiHighlight } from '../../inject/shiki';
import { RendererErrorComponent } from '../renderer-error.component';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-text-renderer',
  standalone: true,
  imports: [RendererErrorComponent],
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
      </div>
    } @else if (error(); as err) {
      <afp-renderer-error [message]="err" />
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
export class TextRendererComponent implements RendererHandle {
  readonly url = input.required<string>();
  readonly fileName = input.required<string>();

  private readonly emitter = new ToolbarEventEmitter();
  private readonly translator = injectTranslator();
  private readonly fetcher = injectFetcher();
  private readonly sanitizer = inject(DomSanitizer);

  readonly wordWrap = signal(true);
  readonly htmlPreview = signal(false);
  readonly content = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly language = computed(() => getLanguageFromFileName(this.fileName()));
  readonly codeForShiki = computed(() => (this.language() !== 'text' ? this.content() : ''));
  private readonly shiki = injectShikiHighlight(this.codeForShiki, this.language);
  readonly lineHtmls = this.shiki.lineHtmls;
  readonly lines = computed(() => this.content().split('\n'));
  readonly isHtml = computed(() => this.language() === 'html');

  constructor() {
    effect(() => {
      void this.wordWrap();
      void this.htmlPreview();
      void this.loading();
      void this.isHtml();
      this.emitter.notify();
    });

    effect(() => {
      const url = this.url();
      void this.loadText(url);
    });
  }

  trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  getToolbarGroups(): ToolbarGroup[] {
    const t = this.translator.t;
    const groups: ToolbarGroup[] = [
      {
        items: [
          {
            type: 'button',
            icon: WrapText,
            tooltip: this.wordWrap() ? t()('toolbar.wrap_off') : t()('toolbar.wrap_on'),
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
            tooltip: this.htmlPreview() ? t()('toolbar.source') : t()('toolbar.preview'),
            action: () => this.htmlPreview.update((v) => !v),
            active: this.htmlPreview(),
          },
        ],
      });
    }
    return groups;
  }

  onToolbarChange(listener: () => void): () => void {
    return this.emitter.subscribe(listener);
  }

  private async loadText(url: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.content.set(await fetchTextUtf8(url, { fetcher: this.fetcher() }));
    } catch (err) {
      console.error(err);
      this.error.set(this.translator.t()('text.load_failed'));
    } finally {
      this.loading.set(false);
    }
  }
}
