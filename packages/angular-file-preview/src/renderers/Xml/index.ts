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
import { fetchTextUtf8 } from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';
import { createShikiHighlight } from '../../utils/shiki-highlight';

@Component({
  selector: 'afp-xml-renderer',
  standalone: true,
  imports: [RendererError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div
          class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"
        ></div>
      </div>
    } @else if (error()) {
      <afp-renderer-error [message]="error()!" />
    } @else if (lineHtmls().length === 0) {
      <div class="afp-w-full afp-h-full afp-overflow-auto" style="background: var(--fp-code-bg);">
        <pre
          class="afp-py-6 afp-px-4 afp-text-fg-primary afp-font-mono afp-text-sm afp-whitespace-pre-wrap afp-break-words"
        >{{ content() }}</pre>
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
export class XmlRenderer implements RendererHandle {
  url = input.required<string>();
  fileName = input.required<string>();

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);
  private readonly t = this.locale?.t() ?? getFallbackTranslator();

  readonly content = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly xmlLang = signal('xml');

  private readonly shiki = createShikiHighlight(
    () => this.content(),
    () => this.xmlLang(),
  );
  readonly lineHtmls = this.shiki.lineHtmls;
  readonly lines = computed(() => this.content().split('\n'));

  constructor() {
    effect(() => {
      this.url();
      void this.load();
    });
    effect(() => {
      this.content();
      this.xmlLang();
      void this.shiki.highlight();
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  protected trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private indentXml(xml: string): string {
    const PADDING = '  ';
    const reg = /(>)(<)(\/*)/g;
    const formatted = xml.replace(reg, '$1\n$2$3');
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

  private prettyPrintXml(xml: string): string {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      if (doc.querySelector('parsererror')) return xml;
      const serializer = new XMLSerializer();
      const serialized = serializer.serializeToString(doc);
      return this.indentXml(serialized);
    } catch {
      return xml;
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const raw = await fetchTextUtf8(this.url(), { fetcher });
      this.content.set(this.prettyPrintXml(raw));
    } catch (err) {
      console.error(err);
      this.error.set(this.t('xml.load_failed'));
    } finally {
      this.loading.set(false);
    }
  }
}
