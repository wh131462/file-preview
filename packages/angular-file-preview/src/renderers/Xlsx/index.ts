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
import ExcelJS from 'exceljs';
import Spreadsheet from 'x-data-spreadsheet';
import {
  convertLegacyXlsToSpreadsheetData,
  convertWorkbookToSpreadsheetData,
  isLegacyXls,
  parseLegacyXls,
} from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-xlsx-renderer',
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
            <p class="afp-text-xs md:afp-text-sm afp-text-fg-secondary afp-font-medium">{{ t('xlsx.loading') }}</p>
          </div>
        </div>
      }

      @if (error() && !loading()) {
        <afp-renderer-error
          [message]="t('xlsx.load_failed')"
          [detail]="error()!"
          class="afp-absolute afp-inset-0 afp-bg-surface-toolbar afp-backdrop-blur-sm afp-z-10"
        />
      }

      @if (!error()) {
        <div
          #containerRef
          class="xlsx-spreadsheet-container afp-w-full afp-h-full"
          [style.opacity]="loading() ? 0 : 1"
        ></div>
      }
    </div>
  `,
})
export class XlsxRenderer implements RendererHandle {
  url = input.required<string>();

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('containerRef');
  private sheetData: Record<string, unknown>[] | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimeout: number | null = null;
  private lastDimensions = { width: 0, height: 0 };
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
          if (this.sheetData) this.mountSpreadsheet();
        }, 500);
      });

      this.resizeObserver.observe(el);
      this.urlWatchReady = true;

      window.setTimeout(() => {
        requestAnimationFrame(() => void this.loadExcel());
      }, 100);
    });

    this.destroyRef.onDestroy(() => {
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.resizeTimeout !== null) clearTimeout(this.resizeTimeout);
      this.sheetData = null;
      const el = this.containerRef()?.nativeElement;
      if (el) el.innerHTML = '';
    });

    effect(() => {
      const newUrl = this.url();
      if (!this.urlWatchReady) return;
      if (newUrl) {
        untracked(() => {
          void this.loadExcel();
        });
      }
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  private calculateDimensions(): { width: number; height: number } {
    const el = this.containerRef()?.nativeElement;
    if (!el) return { width: 800, height: 600 };
    const rawWidth = el.clientWidth;
    const rawHeight = el.clientHeight;
    const width = rawWidth > 100 ? rawWidth : 800;
    const height = rawHeight > 100 ? rawHeight : 600;
    return { width, height };
  }

  private mountSpreadsheet(): void {
    const el = this.containerRef()?.nativeElement;
    if (!el || !this.sheetData) return;

    el.innerHTML = '';

    const { width, height } = this.calculateDimensions();
    const isMobile = width < 640;

    const s = new Spreadsheet(el, {
      mode: 'read',
      showToolbar: false,
      showContextmenu: false,
      showGrid: true,
      row: {
        len: 100,
        height: 25,
      },
      col: {
        len: 26,
        width: isMobile ? 80 : 100,
        indexWidth: isMobile ? 40 : 60,
        minWidth: isMobile ? 40 : 60,
      },
      view: {
        height: () => height,
        width: () => width,
      },
    });

    s.loadData(this.sheetData as unknown as Record<string, unknown>);
  }

  private async loadExcel(): Promise<void> {
    if (!this.containerRef()?.nativeElement) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const response = await fetcher(this.url(), {
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error(this.t('xlsx.not_found'));
        if (response.status === 403) throw new Error('无权限访问此文件');
        throw new Error(`文件加载失败 (${response.status})`);
      }

      const arrayBuffer = await response.arrayBuffer();

      if (arrayBuffer.byteLength === 0) {
        throw new Error('文件为空');
      }

      const data = isLegacyXls(arrayBuffer)
        ? convertLegacyXlsToSpreadsheetData(parseLegacyXls(arrayBuffer))
        : convertWorkbookToSpreadsheetData(await new ExcelJS.Workbook().xlsx.load(arrayBuffer));

      this.sheetData = data as unknown as Record<string, unknown>[];
      this.mountSpreadsheet();
      this.loading.set(false);
    } catch (err) {
      console.error('Excel 解析错误:', err);
      let errorMsg = this.t('xlsx.parse_failed');
      if (err instanceof Error) errorMsg = err.message;
      this.error.set(errorMsg);
      this.loading.set(false);
    }
  }
}
