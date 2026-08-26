import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { init } from 'pptx-preview';
import { readPptxSlideSize } from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-pptx-renderer',
  standalone: true,
  imports: [RendererError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div class="afp-relative afp-flex afp-flex-col afp-items-center afp-w-full afp-h-full">
      @if (loading()) {
        <div
          class="afp-absolute afp-inset-0 afp-flex afp-items-center afp-justify-center afp-bg-surface-toolbar afp-backdrop-blur-sm afp-z-10"
        >
          <div class="afp-text-center">
            <div
              class="afp-w-10 afp-h-10 md:afp-w-12 md:afp-h-12 afp-mx-auto afp-mb-3 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"
            ></div>
            <p class="afp-text-xs md:afp-text-sm afp-text-fg-secondary afp-font-medium">{{ t('pptx.loading') }}</p>
          </div>
        </div>
      }

      @if (error() && !loading()) {
        <afp-renderer-error
          [message]="t('pptx.load_failed')"
          [detail]="error()!"
          class="afp-absolute afp-inset-0 afp-bg-surface-toolbar afp-backdrop-blur-sm afp-z-10"
        />
      }

      @if (!error()) {
        <div
          #containerRef
          class="pptx-wrapper afp-w-full afp-max-w-full md:afp-max-w-6xl"
          [style.opacity]="loading() ? 0 : 1"
        ></div>
      }
    </div>
  `,
})
export class PptxRenderer implements RendererHandle {
  url = input.required<string>();
  tiled = input(true);

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly slideCount = signal(0);

  private readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('containerRef');
  private previewer: ReturnType<typeof init> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private arrayBufferRef: ArrayBuffer | null = null;
  private resizeTimeout: number | null = null;
  private lastDimensions = { width: 0, height: 0 };
  private slideRatio = 9 / 16;
  private urlWatchReady = false;

  constructor() {
    afterNextRender(() => {
      const el = this.containerRef()?.nativeElement;
      if (!el) return;

      let isInitialRender = true;

      this.resizeObserver = new ResizeObserver(() => {
        if (isInitialRender) {
          isInitialRender = false;
          this.lastDimensions = this.calculateDimensions();
          return;
        }

        const newDimensions = this.calculateDimensions();
        const widthDiff = Math.abs(this.lastDimensions.width - newDimensions.width);
        const heightDiff = Math.abs(this.lastDimensions.height - newDimensions.height);

        if (widthDiff < 10 && heightDiff < 10) return;

        this.lastDimensions = newDimensions;

        if (this.resizeTimeout !== null) clearTimeout(this.resizeTimeout);

        this.resizeTimeout = window.setTimeout(() => {
          if (this.previewer && this.arrayBufferRef) void this.reinitializePreviewer();
        }, 800);
      });

      this.resizeObserver.observe(el);
      this.urlWatchReady = true;

      window.setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => void this.loadPptx()));
      }, 150);
    });

    this.destroyRef.onDestroy(() => {
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.resizeTimeout !== null) clearTimeout(this.resizeTimeout);
      this.arrayBufferRef = null;
      this.slideCount.set(0);
      if (this.previewer) {
        try {
          this.previewer.destroy();
        } catch {
          // ignore
        }
      }
      this.previewer = null;
    });

    effect(() => {
      const newUrl = this.url();
      if (!this.urlWatchReady) return;
      if (newUrl) {
        untracked(() => {
          void this.loadPptx();
        });
      }
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  private calculateDimensions(): { width: number; height: number } {
    const el = this.containerRef()?.nativeElement;
    if (!el) return { width: 960, height: 540 };
    const rawWidth = el.clientWidth;
    const parentWidth = el.parentElement?.clientWidth || 0;
    const containerWidth = rawWidth > 100 ? rawWidth : parentWidth > 100 ? parentWidth : 300;
    const height = Math.floor(containerWidth * this.slideRatio);
    return { width: containerWidth, height };
  }

  private async reinitializePreviewer(): Promise<void> {
    const el = this.containerRef()?.nativeElement;
    if (!el || !this.arrayBufferRef || this.slideCount() === 0) return;

    try {
      if (this.previewer) {
        try {
          this.previewer.destroy();
        } catch {
          // ignore
        }
      }

      el.innerHTML = '';

      const currentDimensions = this.calculateDimensions();
      this.previewer = init(el, {
        width: currentDimensions.width,
        height: this.tiled() ? currentDimensions.height * this.slideCount() : currentDimensions.height,
        mode: this.tiled() ? 'list' : 'slide',
      });

      await this.previewer.preview(this.arrayBufferRef);
    } catch {
      // 静默处理
    }
  }

  private async loadPptx(): Promise<void> {
    if (!this.containerRef()?.nativeElement) return;

    this.loading.set(true);
    this.error.set(null);

    let timeoutId: number | null = window.setTimeout(() => {
      this.error.set(this.t('pptx.timeout'));
      this.loading.set(false);
    }, 30000);

    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const response = await fetcher(this.url(), {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error(this.t('pptx.not_found'));
        if (response.status === 403) throw new Error('无权限访问此文件');
        if (response.status >= 500) throw new Error('服务器错误，请稍后重试');
        throw new Error(`文件加载失败 (${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) throw new Error('文件为空');

      this.arrayBufferRef = arrayBuffer;
      this.slideRatio = (await readPptxSlideSize(arrayBuffer)).ratio;

      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden';
      document.body.appendChild(hiddenContainer);

      try {
        const tempPreviewer = init(hiddenContainer, {
          width: 100,
          height: 100,
          mode: 'slide',
        });

        try {
          await tempPreviewer.preview(arrayBuffer);
        } catch {
          throw new Error(this.t('pptx.invalid_format'));
        }

        const count = tempPreviewer.slideCount;
        if (!count || count === 0) throw new Error(this.t('pptx.no_pages'));

        tempPreviewer.destroy();

        this.slideCount.set(count);

        const el = this.containerRef()?.nativeElement;
        if (el) {
          el.innerHTML = '';
        }

        const currentDimensions = this.calculateDimensions();
        this.previewer = init(el!, {
          width: currentDimensions.width,
          height: this.tiled() ? currentDimensions.height * count : currentDimensions.height,
          mode: this.tiled() ? 'list' : 'slide',
        });

        await this.previewer.preview(arrayBuffer);

        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        this.loading.set(false);
      } finally {
        if (document.body.contains(hiddenContainer)) {
          document.body.removeChild(hiddenContainer);
        }
      }
    } catch (err) {
      if (timeoutId !== null) clearTimeout(timeoutId);
      let errorMsg = this.t('pptx.parse_failed');
      if (err instanceof Error) errorMsg = err.message;
      else if (typeof err === 'string') errorMsg = err;
      this.error.set(errorMsg);
      this.loading.set(false);
    }
  }
}
