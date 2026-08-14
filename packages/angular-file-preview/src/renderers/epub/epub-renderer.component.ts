import {
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import ePub from '@likecoin/epub-ts';
import { LucideAngularModule, X, ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-angular';
import { injectTranslator } from '../../inject/translator';
import { injectFetcher } from '../../inject/request';
import { RendererErrorComponent } from '../renderer-error.component';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

interface RenditionLike {
  display: (target?: string) => Promise<unknown>;
  next: () => Promise<unknown>;
  prev: () => Promise<unknown>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  resize: (width: number, height: number) => void;
  currentLocation: () => unknown;
  destroy?: () => void;
  themes: {
    register: (name: string, styles: Record<string, unknown>) => void;
    select: (name: string) => void;
  };
}

interface BookLike {
  ready: Promise<unknown>;
  loaded: { navigation: Promise<unknown> };
  locations: {
    generate: (chars: number) => Promise<string[]>;
    length: () => number;
    locationFromCfi: (cfi: string) => number;
  };
  renderTo: (el: HTMLElement, opts: Record<string, unknown>) => RenditionLike;
  destroy: () => void;
}

const A4_WIDTH = 794;

function ensureEpubStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('afp-epub-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'afp-epub-styles';
  styleEl.textContent = `
    .epub-container { overflow-y: auto !important; scrollbar-width: thin; }
    .epub-container::-webkit-scrollbar { width: 8px; }
    .epub-container::-webkit-scrollbar-track { background: transparent; }
    .epub-container::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
    .epub-container::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }
    .epub-view > iframe { background: white; }
  `;
  document.head.appendChild(styleEl);
}

@Component({
  selector: 'afp-epub-renderer',
  standalone: true,
  imports: [NgStyle, LucideAngularModule, RendererErrorComponent],
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
          class="afp-absolute afp-inset-0 afp-z-20 afp-flex"
          [ngStyle]="{
            opacity: showToc() ? 1 : 0,
            pointerEvents: showToc() ? 'auto' : 'none',
            transition: 'opacity 0.3s'
          }"
        >
          <div
            class="afp-w-72 afp-h-full afp-flex afp-flex-col"
            [ngStyle]="{
              maxWidth: '80%',
              background: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(12px)',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              transform: showToc() ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease'
            }"
          >
            <div
              class="afp-flex afp-items-center afp-justify-between afp-flex-shrink-0"
              style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1)"
            >
              <span style="color: white; font-weight: 500; font-size: 14px">{{ t('toolbar.toc') }}</span>
              <button
                style="color: rgba(255,255,255,0.6); background: none; border: none; cursor: pointer; padding: 4px"
                (click)="showToc.set(false)"
              >
                <lucide-icon [img]="X" style="width: 16px; height: 16px" />
              </button>
            </div>
            <div class="afp-flex-1 afp-overflow-y-auto" style="padding: 8px 4px">
              @for (item of toc(); track item.href + '-' + $index) {
                <button
                  [ngStyle]="tocBtnStyle(item.href, 0)"
                  [title]="item.label"
                  (click)="handleTocClick(item.href)"
                  (mouseenter)="onTocHover($event, item.href, true)"
                  (mouseleave)="onTocHover($event, item.href, false)"
                >
                  {{ item.label.trim() }}
                </button>
                @if (item.subitems && item.subitems.length > 0) {
                  @for (sub of item.subitems; track sub.href + '-' + $index) {
                    <button
                      [ngStyle]="tocBtnStyle(sub.href, 1)"
                      [title]="sub.label"
                      (click)="handleTocClick(sub.href)"
                      (mouseenter)="onTocHover($event, sub.href, true)"
                      (mouseleave)="onTocHover($event, sub.href, false)"
                    >
                      {{ sub.label.trim() }}
                    </button>
                  }
                }
              }
            </div>
          </div>
          <div
            class="afp-flex-1"
            [ngStyle]="{ background: showToc() ? 'rgba(0,0,0,0.3)' : 'transparent', transition: 'background 0.3s' }"
            (click)="showToc.set(false)"
          ></div>
        </div>
      }

      @if (!error()) {
        <div
          #viewer
          class="afp-h-full afp-bg-surface-toolbar"
          [ngStyle]="{
            width: isFullWidth() ? '100%' : A4_WIDTH + 'px',
            maxWidth: '100%',
            transition: 'width 0.3s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            overflow: 'hidden'
          }"
        ></div>
      }
    </div>
  `,
})
export class EpubRendererComponent implements RendererHandle, OnDestroy {
  readonly url = input.required<string>();

  private readonly translator = injectTranslator();
  private readonly fetcher = injectFetcher();
  private readonly emitter = new ToolbarEventEmitter();

  protected readonly viewerRef = viewChild<ElementRef<HTMLDivElement>>('viewer');
  protected readonly A4_WIDTH = A4_WIDTH;
  protected readonly X = X;

  protected readonly currentChapter = signal(1);
  protected readonly totalChapters = signal(1);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly isFullWidth = signal(false);
  protected readonly toc = signal<TocItem[]>([]);
  protected readonly showToc = signal(false);
  protected readonly activeTocHref = signal('');

  private book: BookLike | null = null;
  private rendition: RenditionLike | null = null;
  private totalLocations = 0;
  private lastCfi: string | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimeout: number | null = null;
  private lastDimensions = { width: 0, height: 0 };
  private isInitialResize = true;
  private scrollContainer: Element | null = null;
  private resizeObserverStarted = false;

  constructor() {
    ensureEpubStyles();
    effect(() => {
      this.currentChapter();
      this.totalChapters();
      this.isFullWidth();
      this.showToc();
      this.toc().length;
      untracked(() => this.emitter.notify());
    });
    effect(() => {
      const url = this.url();
      const viewer = this.viewerRef();
      if (url && viewer) {
        untracked(() => {
          void this.loadEpub();
          if (!this.resizeObserverStarted) {
            this.setupResizeObserver();
            this.reattachScrollListener();
            this.resizeObserverStarted = true;
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.resizeTimeout !== null) clearTimeout(this.resizeTimeout);
    this.scrollContainer?.removeEventListener('scroll', this.onContainerScroll);
    this.cleanup();
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

  protected isActive(href: string): boolean {
    return href === this.activeTocHref();
  }

  protected tocBtnStyle(href: string, depth: 0 | 1): Record<string, string> {
    const active = this.isActive(href);
    return {
      width: '100%',
      textAlign: 'left',
      padding: depth === 0 ? '8px 12px' : '8px 12px 8px 28px',
      fontSize: depth === 0 ? '14px' : '13px',
      color: active ? 'white' : depth === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.6)',
      fontWeight: active ? '500' : '400',
      background: active ? 'rgba(255,255,255,0.15)' : 'none',
      border: 'none',
      cursor: 'pointer',
      borderRadius: '4px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      display: 'block',
      transition: 'all 0.15s',
    };
  }

  protected onTocHover(event: MouseEvent, href: string, enter: boolean): void {
    if (this.isActive(href)) return;
    (event.target as HTMLElement).style.background = enter ? 'rgba(255,255,255,0.1)' : 'none';
  }

  protected handleTocClick(href: string): void {
    this.activeTocHref.set(href);
    this.rendition?.display(href);
    this.showToc.set(false);
  }

  private prevPage(): void {
    this.rendition?.prev();
  }

  private nextPage(): void {
    this.rendition?.next();
  }

  private toggleToc(): void {
    this.showToc.update((v) => !v);
  }

  private toggleFullWidth(): void {
    this.isFullWidth.update((v) => !v);
    setTimeout(() => {
      const el = this.viewerRef()?.nativeElement;
      if (el && this.rendition) {
        this.rendition.resize(el.offsetWidth, el.offsetHeight);
        if (this.lastCfi) {
          this.rendition.display(this.lastCfi);
        }
        this.reattachScrollListener();
      }
    }, 350);
  }

  private cleanup(): void {
    try { this.rendition?.destroy?.(); } catch { /* ignore */ }
    try { this.book?.destroy(); } catch { /* ignore */ }
    this.rendition = null;
    this.book = null;
    this.totalLocations = 0;
    this.lastCfi = null;
  }

  private async loadEpub(): Promise<void> {
    const viewer = this.viewerRef()?.nativeElement;
    if (!viewer) return;

    this.loading.set(true);
    this.error.set(null);
    this.toc.set([]);
    this.showToc.set(false);
    viewer.innerHTML = '';
    this.cleanup();

    try {
      let bookInput: string | ArrayBuffer = this.url();
      if (this.url().startsWith('blob:')) {
        const resp = await this.fetcher()(this.url());
        bookInput = await resp.arrayBuffer();
      }

      this.book = ePub(bookInput) as unknown as BookLike;

      this.rendition = this.book.renderTo(viewer, {
        manager: 'continuous',
        flow: 'scrolled',
        width: '100%',
        height: '100%',
      });

      this.rendition.themes.register('default', {
        body: {
          background: '#ffffff !important',
          color: '#1a1a1a !important',
          'font-family': '"Noto Serif SC", "Source Han Serif SC", Georgia, "Times New Roman", serif !important',
          'font-size': '16px !important',
          'line-height': '2 !important',
          padding: '40px 60px !important',
          'max-width': '100% !important',
          'box-sizing': 'border-box !important',
          'word-break': 'break-word !important',
          'overflow-wrap': 'break-word !important',
        },
        p: { 'text-indent': '2em !important', margin: '0.8em 0 !important' },
        h1: { 'text-align': 'center !important', margin: '1.5em 0 1em !important' },
        h2: { margin: '1.2em 0 0.8em !important' },
        h3: { margin: '1em 0 0.6em !important' },
        img: { 'max-width': '100% !important', height: 'auto !important' },
        a: { color: '#2563eb !important', 'text-decoration': 'none !important' },
      });
      this.rendition.themes.select('default');

      await this.book.ready;

      this.book.locations.generate(1024).then(() => {
        if (!this.book) return;
        this.totalLocations = this.book.locations.length();
        const loc = this.rendition?.currentLocation() as { start?: { location?: number } } | undefined;
        const cur = loc?.start?.location ?? 0;
        this.currentChapter.set(cur + 1);
        this.totalChapters.set(this.totalLocations);
      }).catch(() => { /* ignore */ });

      const nav = await this.book.loaded.navigation as { toc?: TocItem[] };
      if (Array.isArray(nav?.toc)) {
        this.toc.set(nav.toc);
      }

      await this.rendition.display();

      this.loading.set(false);
      this.currentChapter.set(1);
      this.totalChapters.set(this.totalLocations || 1);

      this.rendition.on('relocated', (location: unknown) => {
        const loc = location as { start?: { cfi?: string; location?: number; href?: string } };
        if (loc?.start?.cfi) {
          this.lastCfi = loc.start.cfi;
        }
        if (loc?.start?.href) {
          const spineHref = loc.start.href;
          const matches: string[] = [];
          const collect = (items: TocItem[]) => {
            for (const item of items) {
              const base = item.href.split('#')[0];
              if (base && (spineHref === base || spineHref.endsWith('/' + base) || spineHref.endsWith(base))) {
                matches.push(item.href);
              }
              if (item.subitems) collect(item.subitems);
            }
          };
          collect(this.toc());
          if (matches.length === 1) {
            this.activeTocHref.set(matches[0]);
          }
        }
        const cur = loc?.start?.location;
        if (typeof cur === 'number' && this.totalLocations > 0) {
          this.currentChapter.set(cur + 1);
          this.totalChapters.set(this.totalLocations);
        }
      });
    } catch (err) {
      console.error('EPUB 加载错误:', err);
      this.error.set(this.t('epub.load_failed'));
      this.loading.set(false);
    }
  }

  private doResize(): void {
    const el = this.viewerRef()?.nativeElement;
    if (!el || !this.rendition) return;
    this.rendition.resize(el.offsetWidth, el.offsetHeight);
    if (this.lastCfi) {
      try { this.rendition.display(this.lastCfi); } catch { /* ignore */ }
    }
    this.reattachScrollListener();
  }

  private setupResizeObserver(): void {
    const el = this.viewerRef()?.nativeElement;
    if (!el) return;
    this.resizeObserver = new ResizeObserver(() => {
      const viewer = this.viewerRef()?.nativeElement;
      if (!viewer) return;

      if (this.isInitialResize) {
        this.isInitialResize = false;
        this.lastDimensions = { width: viewer.offsetWidth, height: viewer.offsetHeight };
        return;
      }

      const newDimensions = { width: viewer.offsetWidth, height: viewer.offsetHeight };
      const widthDiff = Math.abs(this.lastDimensions.width - newDimensions.width);
      const heightDiff = Math.abs(this.lastDimensions.height - newDimensions.height);

      if (widthDiff < 10 && heightDiff < 10) return;

      this.lastDimensions = newDimensions;

      if (this.resizeTimeout !== null) clearTimeout(this.resizeTimeout);
      this.resizeTimeout = window.setTimeout(() => this.doResize(), 350);
    });
    this.resizeObserver.observe(el);
  }

  private onContainerScroll = (): void => {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      try {
        const mgr = (this.rendition as unknown as { manager?: { check?: (t?: number, e?: number) => Promise<unknown> } })?.manager;
        mgr?.check?.(500, 500);
      } catch { /* ignore */ }
    }
  };

  private reattachScrollListener(): void {
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.onContainerScroll);
      this.scrollContainer = null;
    }
    const tryAttach = () => {
      this.scrollContainer = this.viewerRef()?.nativeElement?.querySelector('.epub-container') ?? null;
      if (this.scrollContainer) {
        this.scrollContainer.addEventListener('scroll', this.onContainerScroll, { passive: true });
      } else {
        requestAnimationFrame(tryAttach);
      }
    };
    requestAnimationFrame(tryAttach);
  }
}
