import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  configurePdfWorker,
  getPdfDocumentOptions,
  installUint8ArrayHexBase64Polyfill,
} from '../../fp-core';
// @ts-ignore - pdfjs-dist 类型路径
// Electron 环境使用 legacy 构建版本以避免 Web Streams API 兼容性问题
// 参考: https://github.com/mozilla/pdf.js/issues/16214
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Menu, RefreshCw } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RendererError } from '../RendererError';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

installUint8ArrayHexBase64Polyfill();

/**
 * 准备 PDF worker。
 * - 浏览器：使用 CDN 上的 legacy worker（独立 worker 线程，性能好）。
 * - Electron：worker 独立作用域缺 Uint8Array hex/base64 polyfill，会抛 `toHex is not a function`。
 *   将 worker 模块挂到 `globalThis.pdfjsWorker`，强制 pdfjs 主线程执行 worker 逻辑，
 *   复用主线程已装的 polyfill，并绕开 CDN / worker 作用域问题。
 */
let pdfWorkerPrepared: Promise<void> | null = null;
function preparePdfWorker(): Promise<void> {
  if (pdfWorkerPrepared) return pdfWorkerPrepared;
  pdfWorkerPrepared = (async () => {
    const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);
    if (isElectron) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = globalThis as any;
      if (typeof globalThis !== 'undefined' && !g.pdfjsWorker) {
        // @ts-ignore - pdfjs worker 无类型声明
        const workerModule = await import(/* webpackChunkName: "pdf.worker" */ /* @vite-ignore */ 'pdfjs-dist/legacy/build/pdf.worker.mjs');
        g.pdfjsWorker = workerModule;
      }
    }

    const configuredOptions = getPdfDocumentOptions();
    configurePdfWorker(pdfjsLib, {
      ...configuredOptions,
      workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc || undefined,
    });
  })();
  return pdfWorkerPrepared;
}

interface PdfOutlineItem {
  title: string;
  dest: unknown;
  items?: PdfOutlineItem[];
}

interface PdfPageProxy {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): {
    promise: Promise<void>;
    cancel(): void;
  };
}

interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  getOutline(): Promise<PdfOutlineItem[] | null>;
  destroy(): void;
}

interface PageState {
  element: HTMLDivElement;
  rendered: boolean;
  rendering: boolean;
  renderTask: { cancel(): void } | null;
}

@Component({
  selector: 'afp-pdf-renderer',
  standalone: true,
  imports: [RendererError, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div #containerRef class="afp-relative afp-w-full afp-h-full">
      @if (outline().length > 0) {
        <div
          class="afp-absolute afp-inset-0 afp-z-20 afp-flex afp-transition-opacity afp-duration-300"
          [style.opacity]="showOutline() ? 1 : 0"
          [style.pointer-events]="showOutline() ? 'auto' : 'none'"
        >
          <div
            class="afp-w-72 afp-max-w-[80%] afp-h-full afp-bg-surface-overlay afp-backdrop-blur-xl afp-border-r afp-border-line-weak afp-flex afp-flex-col afp-shadow-2xl afp-transition-transform afp-duration-300"
            [style.transform]="showOutline() ? 'translateX(0)' : 'translateX(-100%)'"
          >
            <div class="afp-flex afp-items-center afp-justify-between afp-px-4 afp-py-3 afp-border-b afp-border-line-weak afp-flex-shrink-0">
              <span class="afp-text-fg-primary afp-font-medium afp-text-sm">{{ t('toolbar.outline') }}</span>
              <button
                type="button"
                class="afp-text-fg-tertiary hover:afp-text-fg-primary afp-transition-colors"
                (click)="showOutline.set(false)"
              >
                <i-lucide [img]="xIcon" class="afp-w-4 afp-h-4" />
              </button>
            </div>
            <div
              class="afp-flex-1 afp-overflow-y-auto afp-py-4 afp-px-1 outline-items"
              [innerHTML]="trust(outlineHtml())"
              (click)="onOutlineClick($event)"
            ></div>
          </div>
          <div
            class="afp-flex-1 afp-transition-opacity afp-duration-300"
            [style.background]="showOutline() ? 'rgba(0,0,0,0.3)' : 'transparent'"
            (click)="showOutline.set(false)"
          ></div>
        </div>
      }

      <div #scrollContainerRef class="afp-pdf-container afp-w-full afp-h-full afp-overflow-auto">
        @if (error()) {
          <afp-renderer-error [message]="error()!" />
        }

        @if (!error() && loading()) {
          <div class="afp-flex afp-items-center afp-justify-center afp-min-h-screen">
            <div
              class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"
            ></div>
          </div>
        }

        @if (!error()) {
          <div class="afp-flex afp-flex-col afp-items-center afp-w-full">
            <div class="pdf-pages afp-flex afp-flex-col afp-gap-4 afp-w-full afp-items-center"></div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PdfRenderer implements RendererHandle {
  url = input.required<string>();

  private readonly emitter = new ToolbarEventEmitter();
  private readonly locale = inject(LocaleService, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();

  protected readonly xIcon = X;

  readonly zoom = signal(1);
  readonly currentPage = signal(1);
  readonly showOutline = signal(false);
  readonly numPages = signal(0);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);
  readonly outline = signal<PdfOutlineItem[]>([]);
  readonly activeOutlineItem = signal<string | null>(null);

  private readonly scrollContainerRef = viewChild<ElementRef<HTMLDivElement>>('scrollContainerRef');

  private readonly outlinePageMap = new Map<string, number>();
  private pdfDoc: PdfDocumentProxy | null = null;
  private readonly pageStates = new Map<number, PageState>();
  private observer: IntersectionObserver | null = null;
  private zoomWatchReady = false;
  readonly outlineHtml = computed(() => {
    const items = this.outline();
    this.activeOutlineItem();
    if (items.length === 0) return '';
    return `<ul>${this.renderOutlineItemsHtml(items)}</ul>`;
  });

  constructor() {
    afterNextRender(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const pageNumber = Number(entry.target.getAttribute('data-page-number'));
            if (!pageNumber) return;

            if (entry.isIntersecting) {
              void this.renderPage(pageNumber, this.zoom());
            } else {
              const state = this.pageStates.get(pageNumber);
              if (state && state.rendered) {
                this.clearPageCanvas(pageNumber);
              }
            }
          });
        },
        {
          root: this.scrollContainerRef()?.nativeElement ?? null,
          rootMargin: '500px 0px',
          threshold: 0,
        },
      );

      const container = this.scrollContainerRef()?.nativeElement;
      if (container) {
        container.addEventListener('scroll', this.handleScroll);
      }

      if (this.numPages() > 0) {
        this.initPagePlaceholders();
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }

      const container = this.scrollContainerRef()?.nativeElement;
      if (container) {
        container.removeEventListener('scroll', this.handleScroll);
      }

      this.pageStates.forEach((state) => {
        if (state.renderTask) {
          state.renderTask.cancel();
        }
      });
      this.pageStates.clear();

      if (this.pdfDoc) {
        try {
          this.pdfDoc.destroy();
        } catch {
          // ignore
        }
        this.pdfDoc = null;
      }
    });

    effect(() => {
      this.zoom();
      this.currentPage();
      this.numPages();
      this.showOutline();
      this.outline().length;
      this.emitter.notify();
    });

    effect(() => {
      const url = this.url();
      if (url) {
        untracked(() => {
          void this.loadPdf();
        });
      }
    });

    effect(() => {
      const val = this.numPages();
      if (val > 0) {
        untracked(() => {
          queueMicrotask(() => this.initPagePlaceholders());
        });
      }
    });

    effect(() => {
      this.zoom();
      if (!this.zoomWatchReady) {
        this.zoomWatchReady = true;
        return;
      }
      untracked(() => {
        this.pageStates.forEach((state, pageNumber) => {
          if (state.rendered) {
            this.clearPageCanvas(pageNumber);
          }
        });

        window.setTimeout(() => {
          if (this.observer && this.scrollContainerRef()?.nativeElement) {
            this.pageStates.forEach((state) => {
              this.observer?.unobserve(state.element);
              this.observer?.observe(state.element);
            });
          }
        }, 150);
      });
    });

  }

  getToolbarGroups = (): ToolbarGroup[] => {
    const groups: ToolbarGroup[] = [];

    if (this.numPages() === 0) return groups;

    if (this.outline().length > 0) {
      groups.push({
        items: [
          {
            type: 'button',
            icon: Menu,
            tooltip: this.t('toolbar.outline'),
            action: this.handleToggleOutline,
            active: this.showOutline(),
          },
        ],
      });
    }

    groups.push({
      items: [
        {
          type: 'button',
          icon: ChevronLeft,
          tooltip: this.t('toolbar.prev_page'),
          action: this.handlePrevPage,
          disabled: this.currentPage() <= 1,
        },
        {
          type: 'text',
          content: `${this.currentPage()} / ${this.numPages()}`,
          minWidth: '4rem',
        },
        {
          type: 'button',
          icon: ChevronRight,
          tooltip: this.t('toolbar.next_page'),
          action: this.handleNextPage,
          disabled: this.currentPage() >= this.numPages(),
        },
      ],
    });

    groups.push({
      items: [
        {
          type: 'button',
          icon: ZoomOut,
          tooltip: this.t('toolbar.zoom_out'),
          action: this.handleZoomOut,
          disabled: this.zoom() <= 0.5,
        },
        {
          type: 'text',
          content: `${Math.round(this.zoom() * 100)}%`,
          minWidth: '3rem',
        },
        {
          type: 'button',
          icon: ZoomIn,
          tooltip: this.t('toolbar.zoom_in'),
          action: this.handleZoomIn,
          disabled: this.zoom() >= 3,
        },
      ],
    });

    groups.push({
      items: [
        {
          type: 'button',
          icon: RefreshCw,
          tooltip: this.t('toolbar.reset'),
          action: this.handleReset,
        },
      ],
    });

    return groups;
  };

  onToolbarChange = (listener: () => void) => this.emitter.subscribe(listener);

  protected trust(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  protected onOutlineClick(e: Event): void {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-outline-key]');
    if (!button) return;

    const itemKey = button.getAttribute('data-outline-key');
    const destStr = button.getAttribute('data-outline-dest');
    if (!itemKey || !destStr) return;

    try {
      const dest = JSON.parse(destStr);
      void this.handleOutlineClick(dest, itemKey);
    } catch (err) {
      console.error('解析大纲目标失败:', err);
    }
  }

  private handleZoomIn = () => {
    this.zoom.update((v) => Math.min(3, v + 0.1));
  };
  private handleZoomOut = () => {
    this.zoom.update((v) => Math.max(0.5, v - 0.1));
  };
  private handleReset = () => {
    this.zoom.set(1);
  };
  private handlePrevPage = () => {
    const container = this.scrollContainerRef()?.nativeElement;
    if (!container) return;
    const pages = container.querySelectorAll('[data-page-number]');
    const targetPage = pages[Math.max(0, this.currentPage() - 2)];
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  private handleNextPage = () => {
    const container = this.scrollContainerRef()?.nativeElement;
    if (!container) return;
    const pages = container.querySelectorAll('[data-page-number]');
    const targetPage = pages[Math.min(pages.length - 1, this.currentPage())];
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  private handleToggleOutline = () => {
    this.showOutline.update((v) => !v);
  };

  private async buildOutlinePageMap(items: PdfOutlineItem[], pdfDocument: PdfDocumentProxy, depth = 0): Promise<void> {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemKey = `${item.title}-${i}-${depth}`;

      try {
        let pageNumber: number | null = null;
        const dest = item.dest;

        if (typeof dest === 'string') {
          const namedDest = await (pdfDocument as unknown as { getDestination?: (d: string) => Promise<unknown> }).getDestination?.(dest);
          if (Array.isArray(namedDest) && namedDest[0] && typeof namedDest[0] === 'object') {
            const idx = await (pdfDocument as unknown as { getPageIndex?: (ref: unknown) => Promise<number> }).getPageIndex?.(namedDest[0]);
            if (idx != null) pageNumber = idx + 1;
          }
        } else if (Array.isArray(dest) && dest[0] && typeof dest[0] === 'object') {
          const idx = await (pdfDocument as unknown as { getPageIndex?: (ref: unknown) => Promise<number> }).getPageIndex?.(dest[0]);
          if (idx != null) pageNumber = idx + 1;
        }

        if (pageNumber !== null && pageNumber > 0) {
          this.outlinePageMap.set(itemKey, pageNumber);
        }

        if (item.items && item.items.length > 0) {
          await this.buildOutlinePageMap(item.items, pdfDocument, depth + 1);
        }
      } catch {
        // 静默失败
      }
    }
  }

  private updateActiveOutlineByPage(page: number): void {
    let closestItem: string | null = null;
    let closestDistance = Infinity;

    this.outlinePageMap.forEach((itemPage, itemKey) => {
      if (itemPage <= page) {
        const distance = page - itemPage;
        if (distance < closestDistance) {
          closestDistance = distance;
          closestItem = itemKey;
        }
      }
    });

    if (closestItem !== this.activeOutlineItem()) {
      this.activeOutlineItem.set(closestItem);
    }
  }

  private async handleOutlineClick(dest: unknown, itemKey: string): Promise<void> {
    if (!this.pdfDoc || !this.scrollContainerRef()?.nativeElement) return;

    try {
      let pageNumber: number;

      if (typeof dest === 'string') {
        const namedDest = await (this.pdfDoc as unknown as { getDestination?: (d: string) => Promise<unknown> }).getDestination?.(dest);
        if (Array.isArray(namedDest) && namedDest[0]) {
          const idx = await (this.pdfDoc as unknown as { getPageIndex?: (ref: unknown) => Promise<number> }).getPageIndex?.(namedDest[0]);
          if (idx == null) return;
          pageNumber = idx + 1;
        } else {
          return;
        }
      } else if (Array.isArray(dest) && dest[0]) {
        const idx = await (this.pdfDoc as unknown as { getPageIndex?: (ref: unknown) => Promise<number> }).getPageIndex?.(dest[0]);
        if (idx == null) return;
        pageNumber = idx + 1;
      } else {
        return;
      }

      this.activeOutlineItem.set(itemKey);

      const pages = this.scrollContainerRef()!.nativeElement.querySelectorAll('[data-page-number]');
      const targetPage = pages[pageNumber - 1];
      if (targetPage) {
        targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      window.setTimeout(() => {
        this.showOutline.set(false);
      }, 300);
    } catch (err) {
      console.error('大纲跳转失败:', err);
    }
  }

  private renderOutlineItemsHtml(items: PdfOutlineItem[], depth = 0): string {
    return items.map((item, i) => {
      const itemKey = `${item.title}-${i}-${depth}`;
      const isActive = this.activeOutlineItem() === itemKey;
      const activeClass = isActive
        ? 'afp-bg-surface-2 afp-text-fg-primary afp-font-medium'
        : 'afp-text-fg-secondary hover:afp-text-fg-primary hover:afp-bg-surface-2';

      let html = `<li style="margin-left: ${depth > 0 ? 16 : 0}px;">
      <button
        data-outline-key="${itemKey}"
        data-outline-dest="${JSON.stringify(item.dest).replace(/"/g, '&quot;')}"
        class="afp-w-full afp-text-left afp-py-2 afp-px-3 afp-text-sm afp-rounded afp-transition-all afp-truncate ${activeClass}"
        title="${item.title}"
      >
        ${item.title}
      </button>`;

      if (item.items && item.items.length > 0) {
        html += `<ul>${this.renderOutlineItemsHtml(item.items, depth + 1)}</ul>`;
      }

      html += '</li>';
      return html;
    }).join('');
  }

  private async renderPage(pageNumber: number, scale: number): Promise<void> {
    if (!this.pdfDoc) return;
    const state = this.pageStates.get(pageNumber);
    if (!state || state.rendering) return;

    state.rendering = true;

    try {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = '100%';
      canvas.style.maxWidth = '100%';
      canvas.style.height = 'auto';
      canvas.style.borderRadius = '0';
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderTask = page.render({ canvasContext: ctx, viewport });
      state.renderTask = renderTask;
      await renderTask.promise;

      state.element.innerHTML = '';
      state.element.appendChild(canvas);

      state.rendered = true;
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
        console.error(`渲染页面 ${pageNumber} 失败:`, err);
      }
    } finally {
      state.rendering = false;
      state.renderTask = null;
    }
  }

  private clearPageCanvas(pageNumber: number): void {
    const state = this.pageStates.get(pageNumber);
    if (!state) return;

    if (state.renderTask) {
      state.renderTask.cancel();
      state.renderTask = null;
    }

    const canvas = state.element.querySelector('canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    state.element.innerHTML = '';
    state.rendered = false;
    state.rendering = false;
  }

  private initPagePlaceholders(): void {
    if (!this.pdfDoc || !this.scrollContainerRef()?.nativeElement) return;

    const wrapper = this.scrollContainerRef()!.nativeElement.querySelector('.pdf-pages') as HTMLDivElement | null;
    if (!wrapper) return;

    wrapper.innerHTML = '';
    this.pageStates.clear();

    for (let i = 1; i <= this.numPages(); i++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'afp-pdf-page-placeholder afp-relative afp-flex afp-justify-center';
      pageDiv.setAttribute('data-page-number', String(i));
      wrapper.appendChild(pageDiv);

      this.pageStates.set(i, {
        element: pageDiv,
        rendered: false,
        rendering: false,
        renderTask: null,
      });

      if (this.observer) {
        this.observer.observe(pageDiv);
      }
    }
  }

  private async loadPdf(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);
    this.numPages.set(0);

    if (this.pdfDoc) {
      try {
        this.pdfDoc.destroy();
      } catch {
        // ignore
      }
      this.pdfDoc = null;
    }

    try {
      await preparePdfWorker();

      const loadingTask = pdfjsLib.getDocument({
        url: this.url(),
        ...getPdfDocumentOptions(),
      });
      this.pdfDoc = await loadingTask.promise as unknown as PdfDocumentProxy;
      const total = this.pdfDoc.numPages;

      this.numPages.set(total);
      this.currentPage.set(1);

      try {
        const outlineData = await this.pdfDoc.getOutline();
        if (outlineData) {
          this.outline.set(outlineData);
          this.outlinePageMap.clear();
          await this.buildOutlinePageMap(outlineData, this.pdfDoc);
          this.updateActiveOutlineByPage(this.currentPage());
        }
      } catch (err) {
        console.warn('PDF 大纲提取失败:', err);
      }

      this.loading.set(false);
    } catch (err) {
      console.error('PDF 加载错误:', err);
      this.error.set(this.t('pdf.load_failed'));
      this.loading.set(false);
    }
  }

  private handleScroll = (): void => {
    if (!this.scrollContainerRef()?.nativeElement || this.pageStates.size === 0) return;

    const container = this.scrollContainerRef()!.nativeElement;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollCenter = scrollTop + containerHeight / 2;

    let currentVisiblePage = 1;
    let minDistance = Infinity;

    this.pageStates.forEach((state, pageNumber) => {
      const rect = state.element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const pageCenter = rect.top - containerRect.top + rect.height / 2 + scrollTop;

      const distance = Math.abs(scrollCenter - pageCenter);
      if (distance < minDistance) {
        minDistance = distance;
        currentVisiblePage = pageNumber;
      }
    });

    if (currentVisiblePage !== this.currentPage()) {
      this.currentPage.set(currentVisiblePage);
      if (this.outlinePageMap.size > 0) {
        this.updateActiveOutlineByPage(currentVisiblePage);
      }
    }
  };
}
