import { Component, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import mammoth from 'mammoth';
import { injectTranslator } from '../../inject/translator';
import { injectFetcher } from '../../inject/request';
import { RendererErrorComponent } from '../renderer-error.component';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

const PAGE_HEIGHT = 1123;
const PAGE_PADDING_Y = 60;
const PAGE_PADDING_X = 50;
const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_Y * 2;
const PAGE_GAP = 24;

@Component({
  selector: 'afp-docx-renderer',
  standalone: true,
  imports: [RendererErrorComponent],
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div
          class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"
        ></div>
      </div>
    } @else if (error(); as err) {
      <afp-renderer-error [message]="err" />
    } @else {
      <div class="afp-docx-container afp-w-full afp-h-full afp-overflow-auto" style="background: var(--fp-surface-1)">
        <div #measureRef [style]="measureStyle" [innerHTML]="trust(html())"></div>
        <div class="afp-flex afp-flex-col afp-items-center" [style.gap.px]="PAGE_GAP">
          @for (pageHtml of displayPages(); track $index) {
            <div [style]="pageStyle">
              <div [style]="contentStyle" [innerHTML]="trust(pageHtml)"></div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class DocxRendererComponent implements RendererHandle {
  readonly url = input.required<string>();

  readonly PAGE_GAP = PAGE_GAP;

  private readonly translator = injectTranslator();
  private readonly fetcher = injectFetcher();
  private readonly sanitizer = inject(DomSanitizer);
  private readonly measureRef = viewChild<ElementRef<HTMLDivElement>>('measureRef');

  readonly html = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pages = signal<string[]>([]);

  readonly contentStyle = {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: '1.8',
    color: 'var(--fp-fg-primary)',
  };

  readonly measureStyle = {
    ...this.contentStyle,
    position: 'absolute',
    visibility: 'hidden',
    width: `${794 - PAGE_PADDING_X * 2}px`,
    pointerEvents: 'none',
  };

  readonly pageStyle = {
    width: '100%',
    maxWidth: '794px',
    minHeight: `${PAGE_HEIGHT}px`,
    background: 'var(--fp-surface-toolbar)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.10)',
    flexShrink: 0,
    padding: `${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px`,
  };

  constructor() {
    effect(() => {
      const url = this.url();
      if (url) void this.loadDocx();
    });

    effect(() => {
      const html = this.html();
      const loading = this.loading();
      if (!html || loading) return;
      requestAnimationFrame(() => this.paginate());
    });
  }

  displayPages(): string[] {
    const p = this.pages();
    return p.length > 0 ? p : [''];
  }

  trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }

  private async loadDocx() {
    this.loading.set(true);
    this.error.set(null);
    this.html.set('');
    this.pages.set([]);

    try {
      const response = await this.fetcher()(this.url());
      if (!response.ok) throw new Error('文件加载失败');
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      this.html.set(result.value);
    } catch (err) {
      console.error('Docx 解析错误:', err);
      this.error.set(this.translator.t()('docx.parse_failed'));
    } finally {
      this.loading.set(false);
    }
  }

  private paginate() {
    const container = this.measureRef()?.nativeElement;
    if (!container || !this.html()) return;

    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) {
      this.pages.set([this.html()]);
      return;
    }

    const result: string[][] = [[]];
    let currentPageUsed = 0;

    for (const child of children) {
      const h = child.offsetHeight;

      if (currentPageUsed > 0 && currentPageUsed + h > PAGE_CONTENT_HEIGHT) {
        result.push([]);
        currentPageUsed = 0;
      }

      result[result.length - 1].push(child.outerHTML);
      currentPageUsed += h;
    }

    if (result.length === 0) result.push([]);

    this.pages.set(result.map((blocks) => blocks.join('')));
  }
}
