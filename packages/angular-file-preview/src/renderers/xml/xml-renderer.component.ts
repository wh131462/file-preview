import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { injectTranslator } from '../../inject/translator';
import { injectFetcher } from '../../inject/request';
import { injectShikiHighlight } from '../../inject/shiki';
import { RendererErrorComponent } from '../renderer-error.component';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-xml-renderer',
  standalone: true,
  imports: [RendererErrorComponent],
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
      </div>
    } @else if (error(); as err) {
      <afp-renderer-error [message]="err" />
    } @else if (lineHtmls().length === 0) {
      <div class="afp-w-full afp-h-full afp-overflow-auto" style="background: var(--fp-code-bg);">
        <pre class="afp-py-6 afp-px-4 afp-text-fg-primary afp-font-mono afp-text-sm afp-whitespace-pre-wrap afp-break-words">{{ content() }}</pre>
      </div>
    } @else {
      <div class="afp-w-full afp-h-full afp-overflow-auto" style="background: var(--fp-code-bg);">
        <div
          class="afp-code-block with-line-numbers afp-w-full"
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
export class XmlRendererComponent implements RendererHandle {
  readonly url = input.required<string>();
  readonly fileName = input.required<string>();

  private readonly translator = injectTranslator();
  private readonly fetcher = injectFetcher();
  private readonly sanitizer = inject(DomSanitizer);

  readonly content = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly xmlLang = signal('xml');

  private readonly shiki = injectShikiHighlight(this.content, this.xmlLang);
  readonly lineHtmls = this.shiki.lineHtmls;
  readonly lines = computed(() => this.content().split('\n'));

  constructor() {
    effect(() => {
      const url = this.url();
      void this.load(url);
    });
  }

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }

  trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private async load(url: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const raw = await fetchTextUtf8(url, { fetcher: this.fetcher() });
      this.content.set(prettyPrintXml(raw));
    } catch (err) {
      console.error(err);
      this.error.set(this.translator.t()('xml.load_failed'));
    } finally {
      this.loading.set(false);
    }
  }
}

function indentXml(xml: string): string {
  const PADDING = '  ';
  const formatted = xml.replace(/(>)(<)(\/*)/g, '$1\n$2$3');
  let pad = 0;
  return formatted
    .split('\n')
    .map((line) => {
      let indent = 0;
      if (/^<\/\w/.test(line)) {
        pad = Math.max(pad - 1, 0);
      } else if (/^<\w[^>]*[^/]>.*$/.test(line) && !/<.+<\/.+>$/.test(line)) {
        indent = 1;
      }
      const padded = PADDING.repeat(pad) + line;
      pad += indent;
      return padded;
    })
    .join('\n');
}

function prettyPrintXml(xml: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return xml;
    return indentXml(new XMLSerializer().serializeToString(doc));
  } catch {
    return xml;
  }
}
