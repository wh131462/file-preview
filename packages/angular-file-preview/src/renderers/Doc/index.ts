import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { renderLegacyDocHtml } from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-doc-renderer',
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
    } @else {
      <div class="afp-docx-container afp-w-full afp-h-full afp-overflow-auto afp-py-6 afp-px-4">
        <div class="afp-flex afp-flex-col afp-items-center">
          <div class="afp-legacy-doc-paper">
            <div [innerHTML]="trust(html())"></div>
          </div>
        </div>
      </div>
    }
  `,
})
export class DocRenderer implements RendererHandle {
  url = input.required<string>();

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);
  private readonly t = this.locale?.t() ?? getFallbackTranslator();

  readonly html = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const newUrl = this.url();
      if (newUrl) {
        untracked(() => {
          void this.loadDoc();
        });
      }
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  protected trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private async loadDoc(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.html.set('');

    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const response = await fetcher(this.url());
      if (!response.ok) throw new Error('load failed');
      const buffer = await response.arrayBuffer();
      this.html.set(await renderLegacyDocHtml(buffer));
    } catch (err) {
      console.error('Doc 解析错误:', err);
      this.error.set(this.t('doc.parse_failed'));
    } finally {
      this.loading.set(false);
    }
  }
}
