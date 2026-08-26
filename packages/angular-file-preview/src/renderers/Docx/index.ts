import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import mammoth from 'mammoth';
import { DOCX_MAMMOTH_STYLE_MAP, docxThemeToCssVars, readDocxTheme, type DocxTheme } from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

const PAGE_HEIGHT = 1123;
const PAGE_PADDING_Y = 60;
const PAGE_PADDING_X = 50;
const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_Y * 2;
const PAGE_GAP = 24;

function themeToContentStyle(theme: DocxTheme): Record<string, string> {
  return docxThemeToCssVars(theme);
}

@Component({
  selector: 'afp-docx-renderer',
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
      <div class="afp-docx-container afp-w-full afp-h-full afp-overflow-auto" style="background: rgba(0, 0, 0, 0.15)">
        <div #measureRef [style]="measureStyle()" [innerHTML]="trust(html())"></div>

        <div class="afp-flex afp-flex-col afp-items-center" [style.gap.px]="pageGap">
          @for (pageHtml of displayPages(); track $index) {
            <div [style]="pageBoxStyle">
              <div [style]="contentStyle()" [innerHTML]="trust(pageHtml)"></div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class DocxRenderer implements RendererHandle {
  url = input.required<string>();

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);
  private readonly t = this.locale?.t() ?? getFallbackTranslator();

  readonly html = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pages = signal<string[]>([]);
  readonly theme = signal<DocxTheme>({});

  private readonly measureRef = viewChild<ElementRef<HTMLDivElement>>('measureRef');

  protected readonly pageGap = PAGE_GAP;
  protected readonly contentStyle = computed(() => themeToContentStyle(this.theme()));
  protected readonly measureStyle = computed(() => ({
    ...themeToContentStyle(this.theme()),
    position: 'absolute',
    visibility: 'hidden',
    width: `${794 - PAGE_PADDING_X * 2}px`,
    pointerEvents: 'none',
  }));
  protected readonly pageBoxStyle = {
    width: '100%',
    maxWidth: '794px',
    minHeight: `${PAGE_HEIGHT}px`,
    background: 'white',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.10)',
    flexShrink: 0,
    padding: `${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px`,
  };

  constructor() {
    effect(() => {
      const newUrl = this.url();
      if (newUrl) {
        untracked(() => {
          void this.loadDocx();
        });
      }
    });

    effect(() => {
      const content = this.html();
      const el = this.measureRef();
      if (!content || !el) return;
      untracked(() => {
        requestAnimationFrame(() => this.paginate());
      });
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  protected trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  readonly displayPages = computed(() => {
    const pages = this.pages();
    return pages.length > 0 ? pages : [''];
  });

  private async loadDocx(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.html.set('');
    this.pages.set([]);
    this.theme.set({});

    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const response = await fetcher(this.url());
      if (!response.ok) throw new Error('文件加载失败');
      const arrayBuffer = await response.arrayBuffer();
      const [converted, theme] = await Promise.all([
        mammoth.convertToHtml({ arrayBuffer }, { styleMap: DOCX_MAMMOTH_STYLE_MAP }),
        readDocxTheme(arrayBuffer).catch(() => ({} as DocxTheme)),
      ]);
      this.theme.set(theme);
      this.html.set(converted.value);
    } catch (err) {
      console.error('Docx 解析错误:', err);
      this.error.set(this.t('docx.parse_failed'));
    } finally {
      this.loading.set(false);
    }
  }

  private paginate(): void {
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
