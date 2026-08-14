import {
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { LucideAngularModule, X, ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-angular';
import 'foliate-js/view.js';
import { injectTranslator } from '../../inject/translator';
import { injectFetcher } from '../../inject/request';
import { RendererErrorComponent } from '../renderer-error.component';
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

@Component({
  selector: 'afp-mobi-toc-list',
  standalone: true,
  imports: [MobiTocListComponent],
  template: `
    <ul [style.list-style]="'none'" [style.padding]="'0'" [style.margin]="depth() > 0 ? '0 0 0 16px' : '0'">
      @for (item of items(); track (item.href ?? item.label) + '-' + $index) {
        <li>
          @if (item.href) {
            <button
              type="button"
              [class]="tocItemClass(item.href)"
              [title]="item.label"
              style="background: none; border: none; cursor: pointer"
              (click)="select.emit(item.href!)"
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
export class MobiTocListComponent {
  readonly items = input.required<TocItem[]>();
  readonly activeHref = input('');
  readonly depth = input(0);
  readonly select = output<string>();

  protected tocItemClass(href: string | undefined): string {
    return this.activeHref() === href
      ? 'afp-w-full afp-text-left afp-py-2 afp-px-3 afp-text-sm afp-rounded afp-transition-all afp-truncate afp-text-fg-primary afp-bg-surface-3 afp-font-medium'
      : 'afp-w-full afp-text-left afp-py-2 afp-px-3 afp-text-sm afp-rounded afp-transition-all afp-truncate afp-text-fg-secondary hover:afp-text-fg-primary hover:afp-bg-surface-2';
  }
}

@Component({
  selector: 'afp-mobi-renderer',
  standalone: true,
  imports: [NgStyle, LucideAngularModule, RendererErrorComponent, MobiTocListComponent],
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
          [ngStyle]="{ opacity: showToc() ? 1 : 0, pointerEvents: showToc() ? 'auto' : 'none' }"
        >
          <div
            class="afp-w-72 afp-max-w-[80%] afp-h-full afp-bg-surface-overlay afp-backdrop-blur-xl afp-border-r afp-border-line-weak afp-flex afp-flex-col afp-shadow-2xl afp-transition-transform afp-duration-300"
            [style.transform]="showToc() ? 'translateX(0)' : 'translateX(-100%)'"
          >
            <div class="afp-flex afp-items-center afp-justify-between afp-px-4 afp-py-3 afp-border-b afp-border-line-weak afp-flex-shrink-0">
              <span class="afp-text-fg-primary afp-font-medium afp-text-sm">{{ t('toolbar.toc') }}</span>
              <button class="toc-close-btn" type="button" (click)="showToc.set(false)">
                <lucide-icon [img]="X" class="afp-w-4 afp-h-4" />
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
          #host
          class="afp-h-full afp-bg-surface-toolbar afp-shadow-lg"
          [ngStyle]="{
            width: isFullWidth() ? '100%' : A4_WIDTH + 'px',
            maxWidth: '100%',
            transition: 'width 0.3s ease'
          }"
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
    .toc-close-btn:hover { color: #fff; }
  `],
})
export class MobiRendererComponent implements RendererHandle, OnDestroy {
  readonly url = input.required<string>();

  private readonly translator = injectTranslator();
  private readonly fetcher = injectFetcher();
  private readonly emitter = new ToolbarEventEmitter();

  protected readonly hostRef = viewChild<ElementRef<HTMLDivElement>>('host');
  protected readonly A4_WIDTH = A4_WIDTH;
  protected readonly X = X;

  protected readonly currentChapter = signal(1);
  protected readonly totalChapters = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly toc = signal<TocItem[]>([]);
  protected readonly showToc = signal(false);
  protected readonly activeTocHref = signal('');
  protected readonly isFullWidth = signal(false);

  private viewInstance: FoliateView | null = null;
  private totalLocations = 1;

  constructor() {
    effect(() => {
      this.currentChapter();
      this.totalChapters();
      this.isFullWidth();
      this.showToc();
      this.loading();
      this.toc().length;
      untracked(() => this.emitter.notify());
    });
    effect(() => {
      const url = this.url();
      const host = this.hostRef();
      if (url && host) {
        untracked(() => void this.load());
      }
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.paginatorErrorHandler);
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('error', this.paginatorErrorHandler);
    try { (this.viewInstance as unknown as { close?: () => void })?.close?.(); } catch { /* ignore */ }
    try { this.viewInstance?.book?.destroy?.(); } catch { /* ignore */ }
    this.viewInstance = null;
    this.hostRef()?.nativeElement.replaceChildren();
  }

  getToolbarGroups(): ToolbarGroup[] {
    return [
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
  }

  onToolbarChange(listener: () => void): () => void {
    return this.emitter.subscribe(listener);
  }

  protected t(key: string): string {
    return this.translator.t()(key);
  }

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

  private paginatorErrorHandler = (e: ErrorEvent): void => {
    if (e.filename?.includes('paginator')) {
      e.preventDefault();
    }
  };

  private reportProgress(current: number, total: number): void {
    if (total > 0) this.totalLocations = total;
    this.currentChapter.set(Math.max(1, current + 1));
    this.totalChapters.set(this.totalLocations);
  }

  private async load(): Promise<void> {
    const host = this.hostRef()?.nativeElement;
    if (!host) return;
    this.loading.set(true);
    this.error.set(null);
    this.toc.set([]);
    this.showToc.set(false);
    this.activeTocHref.set('');
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
          && typeof renderer.pages === 'number'
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
        if (loc && typeof loc.current === 'number' && typeof loc.total === 'number') {
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

      const res = await this.fetcher()(this.url());
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
        await renderer.next?.();
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
