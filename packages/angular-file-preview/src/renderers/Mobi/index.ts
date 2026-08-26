import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { X, ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import 'foliate-js/view.js';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

interface TocItem {
  label: string;
  href?: string;
  subitems?: TocItem[];
}

interface FoliateView extends HTMLElement {
  book: {
    sections: unknown[];
    toc?: TocItem[];
    destroy?: () => void;
  } | null;
  renderer: HTMLElement & {
    setStyles?: (css: string) => void;
    next?: () => Promise<void>;
    page?: number;
    pages?: number;
  };
  open(target: string | Blob | File | ArrayBuffer): Promise<void>;
  goTo(target: number | string): Promise<void>;
  prev(distance?: number): Promise<void>;
  next(distance?: number): Promise<void>;
}

const READER_CSS = `
  @namespace epub "http://www.idpf.org/2007/ops";
  html { color-scheme: light; }
  body {
    background: #ffffff !important;
    color: #1a1a1a !important;
    font-family: "Noto Serif SC", "Source Han Serif SC", Georgia, "Times New Roman", serif !important;
    font-size: 16px !important;
    line-height: 2 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }
  p, li, blockquote, dd { line-height: 2; text-align: justify; }
  p { text-indent: 2em; margin: 0.8em 0; }
  h1 { text-align: center; margin: 1.5em 0 1em; }
  h2 { margin: 1.2em 0 0.8em; }
  h3 { margin: 1em 0 0.6em; }
  img { max-width: 100% !important; height: auto !important; }
  a { color: #2563eb; text-decoration: none; }
  pre { white-space: pre-wrap !important; }
`;

const A4_WIDTH = 794;
const INITIAL_RENDER_TIMEOUT_MS = 10_000;

async function renderInitialPage(renderer: { next?: () => Promise<void> }): Promise<void> {
  const nextPromise = renderer.next?.();
  if (!nextPromise) return;

  let timer: number | undefined;
  try {
    await Promise.race([
      nextPromise,
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(
          () => reject(new Error('MOBI initial render timed out')),
          INITIAL_RENDER_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
}

@Component({
  selector: 'afp-mobi-toc-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul [style.listStyle]="'none'" [style.padding]="'0'" [style.margin]="depth() > 0 ? '0 0 0 16px' : '0'">
      @for (item of items(); track (item.href ?? item.label) + '-' + $index) {
        <li>
          @if (item.href) {
            <button
              type="button"
              class="afp-w-full afp-text-left afp-py-2 afp-px-3 afp-text-sm afp-rounded afp-transition-all afp-truncate"
              [class.afp-text-fg-primary]="activeHref() === item.href"
              [class.afp-bg-surface-3]="activeHref() === item.href"
              [class.afp-font-medium]="activeHref() === item.href"
              [class.afp-text-fg-secondary]="activeHref() !== item.href"
              [class.hover:afp-text-fg-primary]="activeHref() !== item.href"
              [class.hover:afp-bg-surface-2]="activeHref() !== item.href"
              [title]="item.label"
              style="background: none; border: none; cursor: pointer"
              (click)="select.emit(item.href)"
            >
              {{ item.label?.trim() }}
            </button>
          } @else {
            <div class="afp-w-full afp-py-2 afp-px-3 afp-text-sm afp-text-fg-tertiary afp-truncate">
              {{ item.label?.trim() }}
            </div>
          }
          @if (item.subitems?.length) {
            <afp-mobi-toc-list
              [items]="item.subitems!"
              [activeHref]="activeHref()"
              [depth]="depth() + 1"
              (select)="select.emit($event)"
            />
          }
        </li>
      }
    </ul>
  `,
})
export class MobiTocList {
  items = input.required<TocItem[]>();
  activeHref = input('');
  depth = input(0);
  select = output<string>();
}

@Component({
  selector: 'afp-mobi-renderer',
  standalone: true,
  imports: [RendererError, LucideAngularModule, MobiTocList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div class="afp-relative afp-w-full afp-h-full afp-flex afp-justify-center afp-bg-surface-1 afp-overflow-hidden">
      @if (error()) {
        <afp-renderer-error [message]="error()!" class="afp-absolute afp-inset-0" />
      }

      @if (loading() && !error()) {
        <div class="afp-absolute afp-inset-0 afp-flex afp-items-center afp-justify-center afp-z-10">
          <div class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
        </div>
      }

      @if (toc().length > 0) {
        <div
          class="afp-absolute afp-inset-0 afp-z-20 afp-flex afp-transition-opacity afp-duration-300"
          [style.opacity]="showToc() ? 1 : 0"
          [style.pointerEvents]="showToc() ? 'auto' : 'none'"
        >
          <div
            class="afp-w-72 afp-max-w-[80%] afp-h-full afp-bg-surface-overlay afp-backdrop-blur-xl afp-border-r afp-border-line-weak afp-flex afp-flex-col afp-shadow-2xl afp-transition-transform afp-duration-300"
            [style.transform]="showToc() ? 'translateX(0)' : 'translateX(-100%)'"
          >
            <div class="afp-flex afp-items-center afp-justify-between afp-px-4 afp-py-3 afp-border-b afp-border-line-weak afp-flex-shrink-0">
              <span class="afp-text-fg-primary afp-font-medium afp-text-sm">{{ t('toolbar.toc') }}</span>
              <button type="button" class="toc-close-btn" (click)="showToc.set(false)">
                <i-lucide [img]="xIcon" class="afp-w-4 afp-h-4" />
              </button>
            </div>
            <div class="afp-flex-1 afp-overflow-y-auto afp-py-4 afp-px-1">
              <afp-mobi-toc-list [items]="toc()" [activeHref]="activeTocHref()" (select)="handleTocClick($event)" />
            </div>
          </div>
          <div
            class="afp-flex-1 afp-transition-opacity afp-duration-300"
            [style.background]="showToc() ? 'rgba(0,0,0,0.3)' : 'transparent'"
            (click)="showToc.set(false)"
          ></div>
        </div>
      }

      @if (!error()) {
        <div
          #hostRef
          class="afp-h-full afp-bg-surface-toolbar afp-shadow-lg"
          [style.width]="isFullWidth() ? '100%' : a4Width + 'px'"
          [style.maxWidth]="'100%'"
          [style.transition]="'width 0.3s ease'"
        ></div>
      }
    </div>
  `,
  styles: [`
    .toc-close-btn {
      color: var(--fp-fg-tertiary);
      background: none;
      border: none;
      cursor: pointer;
      transition: color 0.15s;
    }
    .toc-close-btn:hover { color: var(--fp-fg-primary); }
  `],
})
export class MobiRenderer implements RendererHandle {
  url = input.required<string>();

  private readonly emitter = new ToolbarEventEmitter();
  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();
  private readonly host = viewChild<ElementRef<HTMLDivElement>>('hostRef');

  protected readonly xIcon = X;
  protected readonly a4Width = A4_WIDTH;

  readonly currentChapter = signal(1);
  readonly totalChapters = signal(1);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly toc = signal<TocItem[]>([]);
  readonly showToc = signal(false);
  readonly activeTocHref = signal('');
  readonly isFullWidth = signal(false);

  private readonly mounted = signal(false);
  private viewInstance: FoliateView | null = null;
  private totalLocations = 1;

  constructor() {
    afterNextRender(() => this.mounted.set(true));

    effect(() => {
      const url = this.url();
      const mounted = this.mounted();
      if (!mounted || !url) return;
      untracked(() => { void this.load(); });
    });

    effect(() => {
      this.currentChapter();
      this.totalChapters();
      this.isFullWidth();
      this.showToc();
      this.loading();
      this.toc().length;
      this.emitter.notify();
    });

    const paginatorErrorHandler = (e: ErrorEvent) => {
      if (e.filename?.includes('paginator')) {
        e.preventDefault();
      }
    };
    window.addEventListener('error', paginatorErrorHandler);

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('error', paginatorErrorHandler);
      try { (this.viewInstance as unknown as { close?: () => void })?.close?.(); } catch { /* ignore */ }
      try { this.viewInstance?.book?.destroy?.(); } catch { /* ignore */ }
      this.viewInstance = null;
      this.host()?.nativeElement?.replaceChildren();
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [
    {
      items: [
        {
          type: 'button',
          icon: List,
          tooltip: this.t('toolbar.toc'),
          action: () => this.toggleToc(),
          disabled: this.toc().length === 0,
          active: this.showToc(),
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: ChevronLeft,
          tooltip: this.t('toolbar.prev_page'),
          action: () => this.prevPage(),
          disabled: this.currentChapter() <= 1,
        },
        {
          type: 'text',
          content: `${this.currentChapter()} / ${this.totalChapters()}`,
          minWidth: '4rem',
        },
        {
          type: 'button',
          icon: ChevronRight,
          tooltip: this.t('toolbar.next_page'),
          action: () => this.nextPage(),
          disabled: this.currentChapter() >= this.totalChapters(),
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: this.isFullWidth() ? Minimize2 : Maximize2,
          tooltip: this.isFullWidth() ? this.t('toolbar.normal_width') : this.t('toolbar.full_width'),
          action: () => this.toggleFullWidth(),
          active: this.isFullWidth(),
        },
      ],
    },
  ];

  onToolbarChange = (listener: () => void) => this.emitter.subscribe(listener);

  protected handleTocClick(href: string): void {
    this.activeTocHref.set(href);
    this.showToc.set(false);
    this.viewInstance?.goTo(href).catch(() => {});
  }

  private prevPage(): void {
    this.viewInstance?.prev().catch(() => {});
  }

  private nextPage(): void {
    this.viewInstance?.next().catch(() => {});
  }

  private toggleToc(): void {
    this.showToc.update((v) => !v);
  }

  private toggleFullWidth(): void {
    this.isFullWidth.update((v) => !v);
    if (this.viewInstance?.renderer) {
      this.viewInstance.renderer.setAttribute('max-inline-size', this.isFullWidth() ? '9999' : '720');
    }
  }

  private reportProgress(current: number, total: number): void {
    if (Number.isFinite(total) && total > 0) this.totalLocations = total;
    const safeCurrent = Number.isFinite(current) ? current : 0;
    this.currentChapter.set(Math.max(1, safeCurrent + 1));
    this.totalChapters.set(this.totalLocations);
  }

  private async load(): Promise<void> {
    const host = this.host()?.nativeElement;
    if (!host) return;
    this.loading.set(true);
    this.error.set(null);
    this.toc.set([]);
    this.showToc.set(false);
    this.activeTocHref.set('');
    this.totalLocations = 1;
    this.currentChapter.set(1);
    this.totalChapters.set(1);
    host.replaceChildren();
    this.viewInstance = null;
    let progressReported = false;
    const sectionPagesMap = new Map<number, number>();

    try {
      const view = document.createElement('foliate-view') as FoliateView;
      host.appendChild(view);
      this.viewInstance = view;

      view.addEventListener('relocate', (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (!detail) return;

        const sectionCount = this.viewInstance?.book?.sections.length ?? 0;
        const renderer = this.viewInstance?.renderer as
          | {
              page?: number;
              pages?: number;
              getContents?: () => Array<{ index: number }>;
            }
          | undefined;

        const sectionIdx = renderer?.getContents?.()[0]?.index ?? -1;
        if (
          renderer
          && typeof renderer.page === 'number'
          && Number.isFinite(renderer.page)
          && typeof renderer.pages === 'number'
          && Number.isFinite(renderer.pages)
          && renderer.pages > 2
          && sectionIdx >= 0
        ) {
          progressReported = true;
          const curSectionPages = renderer.pages - 2;
          sectionPagesMap.set(sectionIdx, curSectionPages);

          let pagesBefore = 0;
          for (let i = 0; i < sectionIdx; i++) {
            pagesBefore += sectionPagesMap.get(i) ?? 0;
          }
          const currentPage = pagesBefore + Math.min(curSectionPages, Math.max(1, renderer.page));

          const atEnd = (detail.fraction ?? 0) >= 0.999;
          let total: number;
          if (sectionCount === 1) {
            total = curSectionPages;
          } else if (atEnd) {
            total = currentPage;
          } else {
            const sections = this.viewInstance?.book?.sections ?? [];
            const curSize = (sections[sectionIdx] as { size?: number } | undefined)?.size ?? 0;
            const ratio = curSize > 0 ? curSectionPages / curSize : 0;
            let est = 0;
            for (let i = 0; i < sectionCount; i++) {
              if (sectionPagesMap.has(i)) {
                est += sectionPagesMap.get(i)!;
              } else {
                const s = (sections[i] as { size?: number } | undefined)?.size ?? 0;
                est += Math.max(1, Math.round(s * ratio));
              }
            }
            total = Math.max(currentPage, est);
          }

          this.reportProgress(currentPage - 1, total);
          const tocItem = detail.tocItem as { href?: string } | undefined;
          if (tocItem?.href) this.activeTocHref.set(tocItem.href);
          return;
        }

        const loc = detail.location as { current?: number; total?: number } | undefined;
        if (
          loc
          && typeof loc.current === 'number'
          && Number.isFinite(loc.current)
          && typeof loc.total === 'number'
          && Number.isFinite(loc.total)
        ) {
          progressReported = true;
          const atEnd = (detail.fraction ?? 0) >= 0.999;
          const actualTotal = atEnd ? loc.current + 1 : loc.total;
          this.reportProgress(loc.current, actualTotal);
        } else {
          const sections = this.viewInstance?.book?.sections ?? [];
          const idx = detail.index ?? 0;
          const frac = detail.fraction ?? 0;
          const total = Math.max(sections.length, 1);
          this.reportProgress(Math.round((idx + frac) / total * total), total);
        }
        const tocItem = detail.tocItem as { href?: string } | undefined;
        if (tocItem?.href) this.activeTocHref.set(tocItem.href);
      });

      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const res = await fetcher(this.url());
      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
      const blob = await res.blob();
      let name = 'book.mobi';
      try {
        const u = new URL(this.url(), window.location.href);
        const base = u.pathname.split('/').pop();
        if (base) name = decodeURIComponent(base);
      } catch { /* blob: URL */ }

      await view.open(new File([blob], name));

      const renderer = view.renderer;
      if (renderer) {
        renderer.setAttribute('animated', '');
        renderer.setAttribute('max-inline-size', '720');
        renderer.setAttribute('margin', '48');
        renderer.setAttribute('gap', '5%');
        await renderInitialPage(renderer);
        renderer.setStyles?.(READER_CSS);
      }

      this.toc.set((view.book?.toc ?? []) as TocItem[]);
      this.loading.set(false);
      if (!progressReported) {
        this.reportProgress(0, view.book?.sections.length ?? 1);
      }
    } catch (err) {
      console.error('MOBI/AZW3 加载错误:', err);
      this.error.set(this.t('mobi.load_failed'));
      this.loading.set(false);
    }
  }
}
