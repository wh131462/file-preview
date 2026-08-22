import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import ePub from '@likecoin/epub-ts';
import { X, ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
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

@Component({
  selector: 'afp-epub-renderer',
  standalone: true,
  imports: [RendererError, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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
          class="afp-absolute afp-inset-0 afp-z-20 afp-flex"
          [style.opacity]="showToc() ? 1 : 0"
          [style.pointerEvents]="showToc() ? 'auto' : 'none'"
          [style.transition]="'opacity 0.3s'"
        >
          <div
            class="afp-w-72 afp-h-full afp-flex afp-flex-col"
            [style.maxWidth]="'80%'"
            [style.background]="'rgba(0,0,0,0.9)'"
            [style.backdropFilter]="'blur(12px)'"
            [style.borderRight]="'1px solid rgba(255,255,255,0.1)'"
            [style.boxShadow]="'0 25px 50px -12px rgba(0,0,0,0.25)'"
            [style.transform]="showToc() ? 'translateX(0)' : 'translateX(-100%)'"
            [style.transition]="'transform 0.3s ease'"
          >
            <div
              class="afp-flex afp-items-center afp-justify-between afp-flex-shrink-0"
              style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1)"
            >
              <span style="color: white; font-weight: 500; font-size: 14px">{{ t('toolbar.toc') }}</span>
              <button
                type="button"
                style="color: rgba(255,255,255,0.6); background: none; border: none; cursor: pointer; padding: 4px"
                (click)="showToc.set(false)"
              >
                <i-lucide [img]="xIcon" style="width: 16px; height: 16px" />
              </button>
            </div>
            <div class="afp-flex-1 afp-overflow-y-auto" style="padding: 8px 4px">
              @for (item of toc(); track item.href + '-' + $index) {
                <button
                  type="button"
                  [style]="tocButtonStyle(item.href, false)"
                  [title]="item.label"
                  (click)="handleTocClick(item.href)"
                  (mouseenter)="onTocEnter($event, item.href)"
                  (mouseleave)="onTocLeave($event, item.href)"
                >
                  {{ item.label.trim() }}
                </button>
                @if (item.subitems && item.subitems.length > 0) {
                  @for (sub of item.subitems; track sub.href + '-' + $index) {
                    <button
                      type="button"
                      [style]="tocButtonStyle(sub.href, true)"
                      [title]="sub.label"
                      (click)="handleTocClick(sub.href)"
                      (mouseenter)="onTocEnter($event, sub.href)"
                      (mouseleave)="onTocLeave($event, sub.href)"
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
            [style.background]="showToc() ? 'rgba(0,0,0,0.3)' : 'transparent'"
            [style.transition]="'background 0.3s'"
            (click)="showToc.set(false)"
          ></div>
        </div>
      }

      @if (!error()) {
        <div
          #viewerRef
          class="afp-h-full afp-bg-surface-toolbar"
          [style.width]="isFullWidth() ? '100%' : a4Width + 'px'"
          [style.maxWidth]="'100%'"
          [style.transition]="'width 0.3s ease'"
          [style.boxShadow]="'0 1px 3px rgba(0,0,0,0.12)'"
          [style.overflow]="'hidden'"
        ></div>
      }
    </div>
  `,
  styles: [`
    .epub-container { overflow-y: auto !important; scrollbar-width: thin; }
    .epub-container::-webkit-scrollbar { width: 8px; }
    .epub-container::-webkit-scrollbar-track { background: transparent; }
    .epub-container::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
    .epub-container::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }
    .epub-view > iframe { background: white; }
  `],
})
export class EpubRenderer implements RendererHandle {
  url = input.required<string>();

  private readonly emitter = new ToolbarEventEmitter();
  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();
  private readonly viewer = viewChild<ElementRef<HTMLDivElement>>('viewerRef');

  protected readonly xIcon = X;
  protected readonly a4Width = A4_WIDTH;

  readonly currentChapter = signal(1);
  readonly totalChapters = signal(1);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly isFullWidth = signal(false);
  readonly toc = signal<TocItem[]>([]);
  readonly showToc = signal(false);
  readonly activeTocHref = signal('');

  private readonly mounted = signal(false);
  private book: BookLike | null = null;
  private rendition: RenditionLike | null = null;
  private totalLocations = 0;
  private lastCfi: string | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimeout: number | null = null;
  private lastDimensions = { width: 0, height: 0 };
  private isInitialResize = true;
  private scrollContainer: Element | null = null;

  constructor() {
    afterNextRender(() => this.mounted.set(true));

    effect(() => {
      const url = this.url();
      const mounted = this.mounted();
      if (!mounted || !url) return;
      untracked(() => {
        void this.loadEpub();
        this.setupResizeObserver();
        this.reattachScrollListener();
      });
    });

    effect(() => {
      this.currentChapter();
      this.totalChapters();
      this.isFullWidth();
      this.showToc();
      this.toc().length;
      this.emitter.notify();
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.resizeTimeout !== null) clearTimeout(this.resizeTimeout);
      this.scrollContainer?.removeEventListener('scroll', this.onContainerScroll);
      this.cleanup();
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

  protected isActive(href: string): boolean {
    return href === this.activeTocHref();
  }

  protected tocButtonStyle(href: string, sub: boolean): Record<string, string> {
    const active = this.isActive(href);
    return {
      width: '100%',
      textAlign: 'left',
      padding: sub ? '8px 12px 8px 28px' : '8px 12px',
      fontSize: sub ? '13px' : '14px',
      color: active ? 'white' : (sub ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.7)'),
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

  protected onTocEnter(ev: Event, href: string): void {
    if (!this.isActive(href)) {
      (ev.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
    }
  }

  protected onTocLeave(ev: Event, href: string): void {
    if (!this.isActive(href)) {
      (ev.target as HTMLElement).style.background = 'none';
    }
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

  private toggleFullWidth(): void {
    this.isFullWidth.update((v) => !v);
    setTimeout(() => {
      const el = this.viewer()?.nativeElement;
      if (el && this.rendition) {
        this.rendition.resize(el.offsetWidth, el.offsetHeight);
        if (this.lastCfi) {
          this.rendition.display(this.lastCfi);
        }
        this.reattachScrollListener();
      }
    }, 350);
  }

  private toggleToc(): void {
    this.showToc.update((v) => !v);
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
    const el = this.viewer()?.nativeElement;
    if (!el) return;

    this.loading.set(true);
    this.error.set(null);
    this.toc.set([]);
    this.showToc.set(false);
    el.innerHTML = '';
    this.cleanup();

    try {
      const url = this.url();
      let bookInput: string | ArrayBuffer = url;
      if (url.startsWith('blob:')) {
        const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
        const resp = await fetcher(url);
        bookInput = await resp.arrayBuffer();
      }

      this.book = ePub(bookInput) as unknown as BookLike;

      this.rendition = this.book.renderTo(el, {
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
    const el = this.viewer()?.nativeElement;
    if (!el || !this.rendition) return;
    this.rendition.resize(el.offsetWidth, el.offsetHeight);
    if (this.lastCfi) {
      try { this.rendition.display(this.lastCfi); } catch { /* ignore */ }
    }
    this.reattachScrollListener();
  }

  private setupResizeObserver(): void {
    const el = this.viewer()?.nativeElement;
    if (!el) return;
    this.resizeObserver?.disconnect();
    this.isInitialResize = true;
    this.resizeObserver = new ResizeObserver(() => {
      const viewer = this.viewer()?.nativeElement;
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

  private readonly onContainerScroll = (): void => {
    if (!this.scrollContainer) return;
    const node = this.scrollContainer as HTMLElement;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 200) {
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
      this.scrollContainer = this.viewer()?.nativeElement?.querySelector('.epub-container') ?? null;
      if (this.scrollContainer) {
        this.scrollContainer.addEventListener('scroll', this.onContainerScroll, { passive: true });
      } else {
        requestAnimationFrame(tryAttach);
      }
    };
    requestAnimationFrame(tryAttach);
  }
}
