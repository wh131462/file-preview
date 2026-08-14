import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { init } from 'pptx-preview';
import { injectTranslator } from '../../inject/translator';
import { injectFetcher } from '../../inject/request';
import { RendererErrorComponent } from '../renderer-error.component';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-pptx-renderer',
  standalone: true,
  imports: [RendererErrorComponent],
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
            <p class="afp-text-xs md:afp-text-sm afp-text-fg-secondary afp-font-medium">{{ translator.t()('pptx.loading') }}</p>
          </div>
        </div>
      }

      @if (error() && !loading()) {
        <afp-renderer-error
          [message]="translator.t()('pptx.load_failed')"
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
export class PptxRendererComponent implements RendererHandle {
  readonly url = input.required<string>();
  readonly tiled = input(true);

  readonly translator = injectTranslator();
  private readonly fetcher = injectFetcher();
  private readonly destroyRef = inject(DestroyRef);
  private readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('containerRef');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly slideCount = signal(0);

  private previewer: ReturnType<typeof init> | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private arrayBufferRef: ArrayBuffer | null = null;
  private resizeTimeout: number | null = null;
  private lastDimensions = { width: 0, height: 0 };
  private viewReady = false;

  constructor() {
    afterNextRender(() => {
      const el = this.containerEl();
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

      setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => void this.loadPptx()));
      }, 150);

      this.viewReady = true;
    });

    effect(() => {
      const url = this.url();
      if (!this.viewReady) return;
      if (url) void this.loadPptx();
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
  }

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }

  private containerEl(): HTMLDivElement | null {
    return this.containerRef()?.nativeElement ?? null;
  }

  private calculateDimensions() {
    const el = this.containerEl();
    if (!el) return { width: 960, height: 540 };
    const rawWidth = el.clientWidth;
    const parentWidth = el.parentElement?.clientWidth || 0;
    const containerWidth = rawWidth > 100 ? rawWidth : parentWidth > 100 ? parentWidth : 300;
    const height = Math.floor((containerWidth * 9) / 16);
    return { width: containerWidth, height };
  }

  private async reinitializePreviewer() {
    const el = this.containerEl();
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

  private async loadPptx() {
    const el = this.containerEl();
    if (!el) return;

    this.loading.set(true);
    this.error.set(null);

    let timeoutId: number | null = window.setTimeout(() => {
      this.error.set(this.translator.t()('pptx.timeout'));
      this.loading.set(false);
    }, 30000);

    try {
      const response = await this.fetcher()(this.url(), {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error(this.translator.t()('pptx.not_found'));
        if (response.status === 403) throw new Error('无权限访问此文件');
        if (response.status >= 500) throw new Error('服务器错误，请稍后重试');
        throw new Error(`文件加载失败 (${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength === 0) throw new Error('文件为空');

      this.arrayBufferRef = arrayBuffer;

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
          throw new Error(this.translator.t()('pptx.invalid_format'));
        }

        const count = tempPreviewer.slideCount;
        if (!count || count === 0) throw new Error(this.translator.t()('pptx.no_pages'));

        tempPreviewer.destroy();

        this.slideCount.set(count);

        const currentEl = this.containerEl();
        if (currentEl) {
          currentEl.innerHTML = '';
        }

        const currentDimensions = this.calculateDimensions();
        this.previewer = init(currentEl ?? el, {
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
      let errorMsg = this.translator.t()('pptx.parse_failed');
      if (err instanceof Error) errorMsg = err.message;
      else if (typeof err === 'string') errorMsg = err;
      this.error.set(errorMsg);
      this.loading.set(false);
    }
  }
}
