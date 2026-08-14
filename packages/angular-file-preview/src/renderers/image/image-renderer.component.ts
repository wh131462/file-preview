import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideAngularModule,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Scan,
  RefreshCw,
  Maximize2,
} from 'lucide-angular';
import {
  decodeInWorker,
  detectImageFormat,
  formatFileSize,
  getLoaderForMimeType,
  shouldUseWorker,
} from '@eternalheart/file-preview-core';
import type { ImageDecoder, PreviewFile } from '@eternalheart/file-preview-core';
import { injectTranslator } from '../../inject/translator';
import { RendererErrorComponent } from '../renderer-error.component';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-image-renderer',
  standalone: true,
  imports: [LucideAngularModule, RendererErrorComponent],
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
        <div
          class="afp-absolute afp-inset-0 afp-flex afp-flex-col afp-items-center afp-justify-center afp-bg-surface-1/80 afp-z-10"
        >
          <lucide-icon [img]="loaderIcon" class="afp-w-12 afp-h-12 afp-text-fg-primary afp-animate-spin" />
          <p class="afp-mt-4 afp-text-fg-secondary">
            {{ translator.t()('common.loading') }}
            @if (decodeProgress() > 0) {
              <span>{{ Math.round(decodeProgress()) }}%</span>
            }
          </p>
        </div>
      }

      @if (decodeError(); as err) {
        <afp-renderer-error [message]="translator.t()('image.decode_failed')" [detail]="err" />
      }

      @if (!loaded() && !error() && !decoding() && !decodeError()) {
        <div class="afp-flex afp-items-center afp-justify-center">
          <div
            class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"
          ></div>
        </div>
      }

      @if (error(); as err) {
        <afp-renderer-error [message]="err" />
      }

      @if (imageSrc()) {
        <img
          [src]="imageSrc()"
          [alt]="translator.t()('toolbar.preview')"
          class="afp-max-w-none afp-select-none"
          [class.afp-hidden]="!loaded() || !!error() || !!decodeError()"
          [style]="transformStyle()"
          [draggable]="false"
          (load)="handleLoad($event)"
          (error)="handleError()"
          (dblclick)="handleDoubleClick()"
        />
      }

      @if (loaded() && !error() && naturalSize().width > 0) {
        <div
          class="afp-absolute afp-bottom-2 afp-right-3 afp-text-[10px] afp-text-fg-disabled hover:afp-text-fg-secondary afp-transition-colors afp-pointer-events-auto afp-select-none afp-cursor-default"
        >
          {{ naturalSize().width }} × {{ naturalSize().height }}{{ sizeText() }}
        </div>
      }

      @if (totalPages() > 1) {
        <div
          class="afp-absolute afp-bottom-2 afp-left-1/2 -afp-translate-x-1/2 afp-flex afp-items-center afp-gap-2 afp-px-3 afp-py-1.5 afp-bg-surface-toolbar afp-border afp-border-line afp-rounded-lg afp-text-sm afp-text-fg-primary afp-shadow-md"
        >
          <button
            type="button"
            [disabled]="currentPage() <= 1 || decoding()"
            class="afp-px-2 afp-py-0.5 afp-rounded hover:afp-bg-surface-nav-hover disabled:afp-opacity-40 disabled:afp-cursor-not-allowed"
            (click)="handlePageChange(currentPage() - 1)"
          >
            {{ translator.t()('toolbar.prev_page') }}
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
            {{ translator.t()('toolbar.next_page') }}
          </button>
        </div>
      }
    </div>
  `,
})
export class ImageRendererComponent implements RendererHandle {
  readonly url = input.required<string>();
  readonly fileSize = input<number>();
  readonly file = input<PreviewFile | File>();

  readonly translator = injectTranslator();
  readonly loaderIcon = Loader2;
  readonly Math = Math;

  private readonly emitter = new ToolbarEventEmitter();
  private readonly destroyRef = inject(DestroyRef);
  readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('containerRef');

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
  readonly isRawThumbnail = signal(false);
  readonly position = signal({ x: 0, y: 0 });
  readonly isDragging = signal(false);
  readonly naturalSize = signal({ width: 0, height: 0 });

  private dragStart = { x: 0, y: 0 };
  private blobUrl: string | null = null;
  private fileBlobCache: Blob | null = null;
  private loaderCache: ImageDecoder | null = null;
  private readonly pageCache = new Map<number, string>();
  private loadGen = 0;

  private isTouchDevice = false;
  private touchStartDistance = 0;
  private touchStartZoom = 1;
  private touchStartPos = { x: 0, y: 0 };
  private lastTapTime = 0;

  readonly transformStyle = computed(() => ({
    transform: `translate(${this.position().x}px, ${this.position().y}px) scale(${this.zoom()}) rotate(${this.rotation()}deg)`,
    transformOrigin: 'center',
    transition: this.isDragging() ? 'none' : 'transform 0.3s ease-out',
    opacity: this.loaded() && !this.error() && !this.decodeError() ? 1 : 0,
  }));

  readonly sizeText = computed(() => {
    const size = this.fileSize();
    if (size == null) return '';
    return ` · ${formatFileSize(size)}`;
  });

  constructor() {
    effect(() => {
      void this.zoom();
      void this.rotation();
      this.emitter.notify();
    });

    effect(() => {
      const url = this.url();
      const file = this.file();
      void this.loadImage(url, file);
    });

    afterNextRender(() => this.bindContainerEvents());
    this.destroyRef.onDestroy(() => {
      this.unbindContainerEvents();
      this.revokeAllUrls();
    });
  }

  getToolbarGroups(): ToolbarGroup[] {
    const t = this.translator.t;
    return [
      {
        items: [
          {
            type: 'button',
            icon: ZoomOut,
            tooltip: t()('toolbar.zoom_out'),
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
            tooltip: t()('toolbar.zoom_in'),
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
            tooltip: t()('toolbar.fit_to_window'),
            action: () => this.handleFitToWidth(),
          },
          {
            type: 'button',
            icon: Maximize2,
            tooltip: t()('toolbar.original_size'),
            action: () => this.handleOriginalSize(),
          },
        ],
      },
      {
        items: [
          {
            type: 'button',
            icon: RotateCcw,
            tooltip: t()('toolbar.rotate_left'),
            action: () => this.handleRotateLeft(),
          },
          {
            type: 'button',
            icon: RotateCw,
            tooltip: t()('toolbar.rotate_right'),
            action: () => this.handleRotateRight(),
          },
        ],
      },
      {
        items: [
          {
            type: 'button',
            icon: RefreshCw,
            tooltip: t()('toolbar.reset'),
            action: () => this.handleReset(),
          },
        ],
      },
    ];
  }

  onToolbarChange(listener: () => void): () => void {
    return this.emitter.subscribe(listener);
  }

  handleZoomIn() {
    this.zoom.set(Math.min(this.zoom() + 0.1, 10));
  }

  handleZoomOut() {
    this.zoom.set(Math.max(this.zoom() - 0.1, 0.01));
  }

  handleRotateRight() {
    this.rotation.set((this.rotation() + 90) % 360);
  }

  handleRotateLeft() {
    this.rotation.set((this.rotation() - 90 + 360) % 360);
  }

  handleOriginalSize() {
    this.zoom.set(1);
    this.rotation.set(0);
    this.position.set({ x: 0, y: 0 });
  }

  handleReset() {
    this.handleFitToWidth();
  }

  handleFitToWidth() {
    const container = this.containerRef()?.nativeElement;
    const size = this.naturalSize();
    if (container && size.width > 0 && size.height > 0) {
      const scaleX = container.clientWidth / size.width;
      const scaleY = container.clientHeight / size.height;
      this.zoom.set(Math.max(0.01, Math.min(10, Math.min(scaleX, scaleY))));
      this.position.set({ x: 0, y: 0 });
    }
  }

  handleLoad(e: Event) {
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

  handleError() {
    this.error.set(this.translator.t()('image.load_failed'));
    this.loaded.set(true);
  }

  handleDoubleClick() {
    this.position.set({ x: 0, y: 0 });
    this.zoom.set(1);
  }

  handleMouseDown(e: MouseEvent) {
    if (this.isTouchDevice) return;
    if (e.button !== 0) return;
    this.isDragging.set(true);
    this.dragStart = {
      x: e.clientX - this.position().x,
      y: e.clientY - this.position().y,
    };
  }

  handleMouseMove(e: MouseEvent) {
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

  handleMouseUp() {
    if (this.isTouchDevice) return;
    this.isDragging.set(false);
  }

  async handlePageChange(page: number) {
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
      const url = typeof decodedBlob === 'string' ? decodedBlob : URL.createObjectURL(decodedBlob);

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
      const message = err instanceof Error ? err.message : this.translator.t()('image.decode_failed');
      this.decodeError.set(message);
      this.decoding.set(false);
    }
  }

  private async loadImage(url: string, file: PreviewFile | File | undefined) {
    const gen = ++this.loadGen;
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
    this.isRawThumbnail.set(false);
    this.revokeAllUrls();
    this.fileBlobCache = null;
    this.loaderCache = null;

    if (!file) {
      if (gen === this.loadGen) this.imageSrc.set(url);
      return;
    }

    try {
      const mimeType = await detectImageFormat(file);
      if (gen !== this.loadGen) return;
      const loader = await getLoaderForMimeType(mimeType);
      if (gen !== this.loadGen) return;

      if (!loader || !(await loader.needsDecode(mimeType))) {
        if (gen === this.loadGen) this.imageSrc.set(url);
        return;
      }

      this.decoding.set(true);

      let fileBlob: Blob;
      if (file instanceof Blob) {
        fileBlob = file;
      } else {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        fileBlob = await response.blob();
      }
      if (gen !== this.loadGen) return;

      this.fileBlobCache = fileBlob;
      this.loaderCache = loader;

      if (mimeType.startsWith('image/x-')) {
        this.isRawThumbnail.set(true);
      }

      if (loader.getMetadata) {
        try {
          const metadata = await loader.getMetadata(fileBlob);
          if (gen !== this.loadGen) return;
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
          if (gen === this.loadGen) this.decodeProgress.set(percent);
        },
      };

      let decodedBlob: Blob | string;
      if (shouldUseWorker(mimeType)) {
        try {
          decodedBlob = await decodeInWorker(mimeType, await fileBlob.arrayBuffer(), {
            page: 1,
            fullQuality: false,
          });
        } catch {
          decodedBlob = await loader.decode(fileBlob, decodeOptions);
        }
      } else {
        decodedBlob = await loader.decode(fileBlob, decodeOptions);
      }
      if (gen !== this.loadGen) return;

      const blobSrc = typeof decodedBlob === 'string' ? decodedBlob : URL.createObjectURL(decodedBlob);
      this.blobUrl = blobSrc;
      this.pageCache.set(1, blobSrc);
      this.imageSrc.set(blobSrc);
      this.decoding.set(false);
    } catch (err: unknown) {
      if (gen !== this.loadGen) return;
      const message = err instanceof Error ? err.message : this.translator.t()('image.decode_failed');
      this.decodeError.set(message);
      this.decoding.set(false);
    }
  }

  private clampPosition(pos: { x: number; y: number }, currentZoom: number) {
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

  private handleWheelNative = (e: WheelEvent) => {
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

    this.position.set(
      this.clampPosition(
        {
          x: mouseX - scale * (mouseX - this.position().x),
          y: mouseY - scale * (mouseY - this.position().y),
        },
        newZoom,
      ),
    );
    this.zoom.set(newZoom);
  };

  private handleTouchStart = (e: TouchEvent) => {
    this.isTouchDevice = true;
    e.preventDefault();

    const touches = e.touches;
    if (touches.length === 1) {
      this.isDragging.set(true);
      this.dragStart = {
        x: touches[0].clientX - this.position().x,
        y: touches[0].clientY - this.position().y,
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

  private handleTouchMove = (e: TouchEvent) => {
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

  private handleTouchEnd = () => {
    this.isDragging.set(false);
    this.touchStartDistance = 0;
  };

  private bindContainerEvents() {
    const container = this.containerRef()?.nativeElement;
    if (!container) return;
    container.addEventListener('wheel', this.handleWheelNative, { passive: false });
    container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    container.addEventListener('touchend', this.handleTouchEnd);
    container.addEventListener('touchcancel', this.handleTouchEnd);
  }

  private unbindContainerEvents() {
    const container = this.containerRef()?.nativeElement;
    if (!container) return;
    container.removeEventListener('wheel', this.handleWheelNative);
    container.removeEventListener('touchstart', this.handleTouchStart);
    container.removeEventListener('touchmove', this.handleTouchMove);
    container.removeEventListener('touchend', this.handleTouchEnd);
    container.removeEventListener('touchcancel', this.handleTouchEnd);
  }

  private revokeAllUrls() {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
    this.pageCache.forEach((cached) => URL.revokeObjectURL(cached));
    this.pageCache.clear();
  }
}
