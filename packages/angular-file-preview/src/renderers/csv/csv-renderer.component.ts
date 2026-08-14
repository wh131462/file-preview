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
import Spreadsheet from 'x-data-spreadsheet';
import {
  parseCsv,
  guessCsvDelimiter,
  fetchTextUtf8,
  convertCsvToSpreadsheetData,
} from '@eternalheart/file-preview-core';
import { injectTranslator } from '../../inject/translator';
import { injectFetcher } from '../../inject/request';
import { RendererErrorComponent } from '../renderer-error.component';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-csv-renderer',
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
            <p class="afp-text-xs md:afp-text-sm afp-text-fg-secondary afp-font-medium">{{ t('csv.loading') }}</p>
          </div>
        </div>
      }

      @if (error() && !loading()) {
        <div class="afp-absolute afp-inset-0 afp-bg-surface-toolbar afp-backdrop-blur-sm afp-z-10">
          <afp-renderer-error [message]="error()!" />
        </div>
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
export class CsvRendererComponent implements RendererHandle {
  readonly url = input.required<string>();
  readonly fileName = input.required<string>();

  private readonly translator = injectTranslator();
  private readonly fetcher = injectFetcher();
  private readonly destroyRef = inject(DestroyRef);
  private readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('containerRef');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private sheetData: Record<string, unknown>[] | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimeout: number | null = null;
  private lastDimensions = { width: 0, height: 0 };
  private skipFirstUrl = true;

  constructor() {
    afterNextRender(() => {
      const el = this.containerEl;
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

      setTimeout(() => {
        requestAnimationFrame(() => void this.loadCsv());
      }, 100);
    });

    effect(() => {
      const url = this.url();
      void url;
      if (this.skipFirstUrl) {
        this.skipFirstUrl = false;
        return;
      }
      void this.loadCsv();
    });

    this.destroyRef.onDestroy(() => {
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.resizeTimeout !== null) clearTimeout(this.resizeTimeout);
      this.sheetData = null;
      const el = this.containerEl;
      if (el) el.innerHTML = '';
    });
  }

  t(key: 'csv.loading' | 'csv.load_failed'): string {
    return this.translator.t()(key);
  }

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }

  private get containerEl(): HTMLDivElement | null {
    return this.containerRef()?.nativeElement ?? null;
  }

  private calculateDimensions() {
    const el = this.containerEl;
    if (!el) return { width: 800, height: 600 };
    const rawWidth = el.clientWidth;
    const rawHeight = el.clientHeight;
    const width = rawWidth > 100 ? rawWidth : 800;
    const height = rawHeight > 100 ? rawHeight : 600;
    return { width, height };
  }

  private mountSpreadsheet() {
    const el = this.containerEl;
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

  private async loadCsv() {
    if (!this.containerEl) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const text = await fetchTextUtf8(this.url(), { fetcher: this.fetcher() });
      const parsed = parseCsv(text, { delimiter: guessCsvDelimiter(this.fileName()) });
      const data = convertCsvToSpreadsheetData(parsed.header, parsed.rows, this.fileName());

      this.sheetData = data as unknown as Record<string, unknown>[];
      this.mountSpreadsheet();
      this.loading.set(false);
    } catch (err) {
      console.error('CSV 解析错误:', err);
      this.error.set(this.translator.t()('csv.load_failed'));
      this.loading.set(false);
    }
  }
}
