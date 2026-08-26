import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  untracked,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { LucideAngularModule, Loader2, ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan, RefreshCw, Maximize2 } from 'lucide-angular';
import {
  decodeInWorker,
  detectImageFormat,
  formatFileSize,
  getLoaderForMimeType,
  shouldUseWorker,
} from '../../fp-core';
import type { ImageDecoder, PreviewFile } from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-image-renderer',
  standalone: true,
  imports: [LucideAngularModule, RendererError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div
      #containerRef
      class="afp-relative afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full afp-overflow-hidden"
      [style.cursor]="isDragging() ? 'grabbing' : 'grab'"
      [style.touch-action]="'none'"
      (mousedown)="handleMouseDown($event)"
      (mousemove)="handleMouseMove($event)"
      (mouseup)="handleMouseUp()"
      (mouseleave)="handleMouseUp()"
    >
      @if (decoding()) {
        <div class="afp-absolute afp-inset-0 afp-flex afp-flex-col afp-items-center afp-justify-center afp-bg-surface-1/80 afp-z-10">
          <i-lucide [img]="loader2Icon" class="afp-w-12 afp-h-12 afp-text-fg-primary afp-animate-spin" />
          <p class="afp-mt-4 afp-text-fg-secondary">
            {{ t('common.loading') }}
            @if (decodeProgress() > 0) {
              <span>{{ Math.round(decodeProgress()) }}%</span>
            }
          </p>
        </div>
      }

      @if (decodeError(); as detail) {
        <afp-renderer-error [message]="t('image.decode_failed')" [detail]="detail" />
      }

      @if (!loaded() && !error() && !decoding() && !decodeError()) {
        <div class="afp-flex afp-items-center afp-justify-center">
          <div class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
        </div>
      }

      @if (error(); as err) {
        <afp-renderer-error [message]="err" />
      }

      @if (imageSrc()) {
        <img
          #imgRef
          [src]="imageSrc()"
          alt=""
          class="afp-max-w-none afp-select-none"
          [class.afp-hidden]="!loaded() || !!error() || !!decodeError()"
          [style.transform]="transformCss()"
          [style.transform-origin]="'center'"
          [style.transition]="isDragging() ? 'none' : 'transform 0.3s ease-out'"
          [style.opacity]="loaded() && !error() && !decodeError() ? 1 : 0"
          [draggable]="false"
          (load)="handleLoad($event)"
          (error)="handleError()"
          (dblclick)="handleDoubleClick()"
        />
      }

      @if (loaded() && !error() && naturalSize().width > 0) {
        <div class="afp-absolute afp-bottom-2 afp-right-3 afp-text-[10px] afp-text-fg-disabled hover:afp-text-fg-secondary afp-transition-colors afp-pointer-events-auto afp-select-none afp-cursor-default">
          {{ naturalSize().width }} × {{ naturalSize().height }}{{ sizeText() }}
        </div>
      }

      @if (totalPages() > 1) {
        <div class="afp-absolute afp-bottom-2 afp-left-1/2 -afp-translate-x-1/2 afp-flex afp-items-center afp-gap-2 afp-px-3 afp-py-1.5 afp-bg-surface-toolbar afp-border afp-border-line afp-rounded-lg afp-text-sm afp-text-fg-primary afp-shadow-md">
          <button
            type="button"
            [disabled]="currentPage() <= 1 || decoding()"
            class="afp-px-2 afp-py-0.5 afp-rounded hover:afp-bg-surface-nav-hover disabled:afp-opacity-40 disabled:afp-cursor-not-allowed"
            (click)="handlePageChange(currentPage() - 1)"
          >
            {{ t('toolbar.prev_page') }}
          </button>
          <span class="afp-text-fg-secondary afp-tabular-nums">
            {{ currentPage() }} / {{ totalPages() }}
          </span>
          <button
            type="button"
            [disabled]="currentPage() >= totalPages() || decoding()"
            class="afp-px-2 afp-py-0.5 afp-rounded hover:afp-bg-surface-nav-hover disabled:afp-opacity-40 disabled:afp-cursor-not-allowed"
            (click)="handlePageChange(currentPage() + 1)"
          >
            {{ t('toolbar.next_page') }}
          </button>
        </div>
      }
    </div>
  `,
})
export class ImageRenderer implements RendererHandle {
  url = input.required<string>();
  fileSize = input<number | undefined>(undefined);
  file = input<PreviewFile | File | undefined>(undefined);

  private readonly emitter = new ToolbarEventEmitter();
  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();
  protected readonly loader2Icon = Loader2;
  protected readonly Math = Math;

  readonly zoom = signal(1);
  readonly rotation = signal(0);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly decoding = signal(false);
  readonly decodeProgress = signal(0);
  readonly decodeError = signal<string | null>(null);
  readonly imageSrc = signal('');
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly position = signal({ x: 0, y: 0 });
  readonly isDragging = signal(false);
  readonly naturalSize = signal({ width: 0, height: 0 });

  private dragStart = { x: 0, y: 0 };
  private blobUrl: string | null = null;
  private fileBlobCache: Blob | null = null;
  private loaderCache: ImageDecoder | null = null;
  private readonly pageCache = new Map<number, string>();
  private isTouchDevice = false;
  private touchStartDistance = 0;
  private touchStartZoom = 1;
  private touchStartPos = { x: 0, y: 0 };
  private lastTapTime = 0;
  private listenersEl: HTMLDivElement | null = null;

  protected readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('containerRef');

  protected readonly sizeText = computed(() => {
    const size = this.fileSize();
    if (size == null) return '';
    return ` · ${formatFileSize(size)}`;
  });

  protected readonly transformCss = computed(
    () =>
      `translate(${this.position().x}px, ${this.position().y}px) scale(${this.zoom()}) rotate(${this.rotation()}deg)`,
  );

  constructor() {
    effect(() => {
      this.url();
      this.file();
      untracked(() => {
        void this.load();
      });
    });
    effect(() => {
      this.zoom();
      this.rotation();
      this.emitter.notify();
    });
    afterNextRender(() => this.attachListeners());
    this.destroyRef.onDestroy(() => this.cleanup());
  }

  getToolbarGroups = (): ToolbarGroup[] => [
    {
      items: [
        {
          type: 'button',
          icon: ZoomOut,
          tooltip: this.t('toolbar.zoom_out'),
          action: () => this.handleZoomOut(),
          disabled: this.zoom() <= 0.01,
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
          action: () => this.handleZoomIn(),
          disabled: this.zoom() >= 10,
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: Scan,
          tooltip: this.t('toolbar.fit_to_window'),
          action: () => this.handleFitToWidth(),
        },
        {
          type: 'button',
          icon: Maximize2,
          tooltip: this.t('toolbar.original_size'),
          action: () => this.handleOriginalSize(),
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: RotateCcw,
          tooltip: this.t('toolbar.rotate_left'),
          action: () => this.handleRotateLeft(),
        },
        {
          type: 'button',
          icon: RotateCw,
          tooltip: this.t('toolbar.rotate_right'),
          action: () => this.handleRotateRight(),
        },
      ],
    },
    {
      items: [
        {
          type: 'button',
          icon: RefreshCw,
          tooltip: this.t('toolbar.reset'),
          action: () => this.handleReset(),
        },
      ],
    },
  ];

  onToolbarChange = (listener: () => void) => this.emitter.subscribe(listener);

  private handleZoomIn(): void {
    this.zoom.set(Math.min(this.zoom() + 0.1, 10));
  }

  private handleZoomOut(): void {
    this.zoom.set(Math.max(this.zoom() - 0.1, 0.01));
  }

  private handleRotateRight(): void {
    this.rotation.set((this.rotation() + 90) % 360);
  }

  private handleRotateLeft(): void {
    this.rotation.set((this.rotation() - 90 + 360) % 360);
  }

  private handleOriginalSize(): void {
    this.zoom.set(1);
    this.rotation.set(0);
    this.position.set({ x: 0, y: 0 });
  }

  private handleReset(): void {
    this.handleFitToWidth();
  }

  private handleFitToWidth(): void {
    const container = this.containerRef()?.nativeElement;
    const size = this.naturalSize();
    if (container && size.width > 0 && size.height > 0) {
      const scaleX = container.clientWidth / size.width;
      const scaleY = container.clientHeight / size.height;
      this.zoom.set(Math.max(0.01, Math.min(10, Math.min(scaleX, scaleY))));
      this.position.set({ x: 0, y: 0 });
    }
  }

  private revokeBlobs(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    this.pageCache.forEach((url) => URL.revokeObjectURL(url));
    this.pageCache.clear();
    this.fileBlobCache = null;
    this.loaderCache = null;
  }

  private async load(): Promise<void> {
    this.imageSrc.set('');
    this.loaded.set(false);
    this.error.set(null);
    this.decoding.set(false);
    this.decodeError.set(null);
    this.decodeProgress.set(0);
    this.position.set({ x: 0, y: 0 });
    this.zoom.set(1);
    this.currentPage.set(1);
    this.totalPages.set(1);

    this.revokeBlobs();

    const file = this.file();
    if (!file) {
      this.imageSrc.set(this.url());
      return;
    }

    try {
      const mimeType = await detectImageFormat(file);
      const loader = await getLoaderForMimeType(mimeType);

      if (!loader || !(await loader.needsDecode(mimeType))) {
        this.imageSrc.set(this.url());
        return;
      }

      this.decoding.set(true);

      let fileBlob: Blob;
      if (file instanceof Blob) {
        fileBlob = file;
      } else {
        const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
        const response = await fetcher(this.url());
        if (!response.ok) throw new Error('Failed to fetch file');
        fileBlob = await response.blob();
      }

      this.fileBlobCache = fileBlob;
      this.loaderCache = loader;

      if (loader.getMetadata) {
        try {
          const metadata = await loader.getMetadata(fileBlob);
          if (metadata.pageCount && metadata.pageCount > 1) {
            this.totalPages.set(metadata.pageCount);
          }
        } catch {
          // 忽略元数据获取失败
        }
      }

      const decodeOptions = {
        page: 1,
        fullQuality: false,
        onProgress: (percent: number) => {
          this.decodeProgress.set(percent);
        },
      };

      let decodedBlob: Blob | string;
      if (shouldUseWorker(mimeType)) {
        try {
          decodedBlob = await decodeInWorker(
            mimeType,
            await fileBlob.arrayBuffer(),
            { page: 1, fullQuality: false },
          );
        } catch {
          decodedBlob = await loader.decode(fileBlob, decodeOptions);
        }
      } else {
        decodedBlob = await loader.decode(fileBlob, decodeOptions);
      }

      const url = typeof decodedBlob === 'string'
        ? decodedBlob
        : URL.createObjectURL(decodedBlob);

      this.blobUrl = url;
      this.pageCache.set(1, url);
      this.imageSrc.set(url);
      this.decoding.set(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : this.t('image.decode_failed');
      this.decodeError.set(message || this.t('image.decode_failed'));
      this.decoding.set(false);
    }
  }

  protected async handlePageChange(page: number): Promise<void> {
    if (!this.fileBlobCache || !this.loaderCache) return;
    if (page < 1 || page > this.totalPages()) return;

    const cached = this.pageCache.get(page);
    if (cached) {
      this.currentPage.set(page);
      this.imageSrc.set(cached);
      return;
    }

    this.decoding.set(true);
    try {
      const decodedBlob = await this.loaderCache.decode(this.fileBlobCache, { page });
      const url = typeof decodedBlob === 'string'
        ? decodedBlob
        : URL.createObjectURL(decodedBlob);

      if (this.pageCache.size >= 10) {
        const firstKey = this.pageCache.keys().next().value;
        if (firstKey !== undefined) {
          const oldUrl = this.pageCache.get(firstKey);
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          this.pageCache.delete(firstKey);
        }
      }

      this.pageCache.set(page, url);
      this.currentPage.set(page);
      this.imageSrc.set(url);
      this.decoding.set(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : this.t('image.decode_failed');
      this.decodeError.set(message || this.t('image.decode_failed'));
      this.decoding.set(false);
    }
  }

  private clampPosition(pos: { x: number; y: number }, currentZoom: number): { x: number; y: number } {
    const container = this.containerRef()?.nativeElement;
    const size = this.naturalSize();
    if (!container || size.width === 0) return pos;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const imgW = size.width * currentZoom;
    const imgH = size.height * currentZoom;

    const margin = Math.min(80, containerW * 0.15, containerH * 0.15);
    const rangeX = (containerW + imgW) / 2 - margin;
    const rangeY = (containerH + imgH) / 2 - margin;

    return {
      x: rangeX > 0 ? Math.max(-rangeX, Math.min(rangeX, pos.x)) : 0,
      y: rangeY > 0 ? Math.max(-rangeY, Math.min(rangeY, pos.y)) : 0,
    };
  }

  protected handleLoad(e: Event): void {
    this.loaded.set(true);
    const img = e.currentTarget as HTMLImageElement;
    this.naturalSize.set({ width: img.naturalWidth, height: img.naturalHeight });

    const container = this.containerRef()?.nativeElement;
    const size = this.naturalSize();
    if (container && size.width > 0 && size.height > 0) {
      const scaleX = container.clientWidth / size.width;
      const scaleY = container.clientHeight / size.height;
      const newZoom = Math.min(scaleX, scaleY);
      this.zoom.set(Math.max(0.01, Math.min(10, newZoom)));
      this.position.set({ x: 0, y: 0 });
    }
  }

  protected handleError(): void {
    this.error.set(this.t('image.load_failed'));
    this.loaded.set(true);
  }

  protected handleDoubleClick(): void {
    this.position.set({ x: 0, y: 0 });
    this.zoom.set(1);
  }

  private readonly handleWheelNative = (e: WheelEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    const container = this.containerRef()?.nativeElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const prev = this.zoom();
    const newZoom = Math.max(0.01, Math.min(10, prev + delta));
    const scale = newZoom / prev;
    const pos = this.position();

    this.position.set(
      this.clampPosition(
        {
          x: mouseX - scale * (mouseX - pos.x),
          y: mouseY - scale * (mouseY - pos.y),
        },
        newZoom,
      ),
    );
    this.zoom.set(newZoom);
  };

  protected handleMouseDown(e: MouseEvent): void {
    if (this.isTouchDevice) return;
    if (e.button !== 0) return;
    this.isDragging.set(true);
    const pos = this.position();
    this.dragStart = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  }

  protected handleMouseMove(e: MouseEvent): void {
    if (this.isTouchDevice) return;
    if (!this.isDragging()) return;
    this.position.set(
      this.clampPosition(
        {
          x: e.clientX - this.dragStart.x,
          y: e.clientY - this.dragStart.y,
        },
        this.zoom(),
      ),
    );
  }

  protected handleMouseUp(): void {
    if (this.isTouchDevice) return;
    this.isDragging.set(false);
  }

  private readonly handleTouchStart = (e: TouchEvent): void => {
    this.isTouchDevice = true;
    e.preventDefault();

    const touches = e.touches;
    if (touches.length === 1) {
      this.isDragging.set(true);
      const pos = this.position();
      this.dragStart = {
        x: touches[0].clientX - pos.x,
        y: touches[0].clientY - pos.y,
      };

      const now = Date.now();
      if (now - this.lastTapTime < 300) {
        this.position.set({ x: 0, y: 0 });
        this.zoom.set(1);
      }
      this.lastTapTime = now;
    } else if (touches.length === 2) {
      this.isDragging.set(false);
      const distance = Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY,
      );
      this.touchStartDistance = distance;
      this.touchStartZoom = this.zoom();
      this.touchStartPos = { ...this.position() };
    }
  };

  private readonly handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    const touches = e.touches;
    if (touches.length === 1 && this.isDragging()) {
      this.position.set(
        this.clampPosition(
          {
            x: touches[0].clientX - this.dragStart.x,
            y: touches[0].clientY - this.dragStart.y,
          },
          this.zoom(),
        ),
      );
    } else if (touches.length === 2) {
      const container = this.containerRef()?.nativeElement;
      if (!container) return;

      const distance = Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY,
      );

      if (Math.abs(distance - this.touchStartDistance) < 5) return;

      const scale = distance / this.touchStartDistance;
      const newZoom = Math.max(0.01, Math.min(10, this.touchStartZoom * scale));

      const rect = container.getBoundingClientRect();
      const centerX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left - rect.width / 2;
      const centerY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top - rect.height / 2;

      const zoomScale = newZoom / this.zoom();
      this.position.set(
        this.clampPosition(
          {
            x: centerX - zoomScale * (centerX - this.touchStartPos.x),
            y: centerY - zoomScale * (centerY - this.touchStartPos.y),
          },
          newZoom,
        ),
      );
      this.zoom.set(newZoom);
    }
  };

  private readonly handleTouchEnd = (): void => {
    this.isDragging.set(false);
    this.touchStartDistance = 0;
  };

  private attachListeners(): void {
    const container = this.containerRef()?.nativeElement;
    if (!container) return;
    this.listenersEl = container;
    container.addEventListener('wheel', this.handleWheelNative, { passive: false });
    container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    container.addEventListener('touchend', this.handleTouchEnd);
    container.addEventListener('touchcancel', this.handleTouchEnd);
  }

  private detachListeners(): void {
    const container = this.listenersEl;
    if (!container) return;
    container.removeEventListener('wheel', this.handleWheelNative);
    container.removeEventListener('touchstart', this.handleTouchStart);
    container.removeEventListener('touchmove', this.handleTouchMove);
    container.removeEventListener('touchend', this.handleTouchEnd);
    container.removeEventListener('touchcancel', this.handleTouchEnd);
    this.listenersEl = null;
  }

  private cleanup(): void {
    this.revokeBlobs();
    this.detachListeners();
  }
}
