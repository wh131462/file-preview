import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type {
  CustomRendererEventPayload,
  Locale,
  Messages,
  PreviewFile,
  PreviewFileInput,
  RequestHandler,
  RequestInitFactory,
  ShouldFetchAsBlob,
  Theme,
} from '@eternalheart/file-preview-core';
import type { CustomRenderer } from './types';
import { FilePreviewContentComponent } from './file-preview-content.component';

@Component({
  selector: 'afp-file-preview-embed',
  standalone: true,
  imports: [FilePreviewContentComponent],
  template: `
    <div class="afp-root" [style]="wrapperStyle()" [attr.data-theme]="resolvedTheme()">
      <div class="afp-relative afp-w-full afp-h-full afp-overflow-hidden afp-bg-surface-overlay">
        <afp-file-preview-content
          mode="embed"
          [files]="files()"
          [currentIndex]="currentIndex()"
          [customRenderers]="customRenderers()"
          [locale]="locale()"
          [messages]="messages()"
          [headless]="headless()"
          [theme]="theme()"
          [requestInit]="requestInit()"
          [requestHandler]="requestHandler()"
          [shouldFetchAsBlob]="shouldFetchAsBlob()"
          [onDownload]="onDownload()"
          [onClose]="onClose()"
          [showClose]="showClose()"
          [showDownload]="showDownload()"
          (navigate)="navigate.emit($event)"
          (customEvent)="customEvent.emit($event)"
          (close)="close.emit()"
        />
      </div>
    </div>
  `,
})
export class FilePreviewEmbedComponent {
  readonly files = input.required<PreviewFileInput[]>();
  readonly currentIndex = input(0);
  readonly customRenderers = input<CustomRenderer[]>([]);
  readonly width = input<number | string>('100%');
  readonly height = input<number | string>('100%');
  readonly locale = input<Locale>();
  readonly messages = input<Partial<Record<Locale, Partial<Messages>>>>();
  readonly headless = input(false);
  readonly theme = input<Theme>('dark');
  readonly requestInit = input<RequestInitFactory>();
  readonly requestHandler = input<RequestHandler>();
  readonly shouldFetchAsBlob = input<ShouldFetchAsBlob>();
  readonly onDownload = input<(file: PreviewFile) => void | Promise<void>>();
  readonly onClose = input<() => void>();
  readonly showClose = input<boolean>();
  readonly showDownload = input(true);

  readonly navigate = output<number>();
  readonly customEvent = output<CustomRendererEventPayload>();
  readonly close = output<void>();

  readonly systemDark = signal(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  );

  readonly resolvedTheme = computed(() =>
    this.theme() === 'auto' ? (this.systemDark() ? 'dark' : 'light') : this.theme(),
  );

  readonly wrapperStyle = computed(() => {
    const w = this.width();
    const h = this.height();
    return {
      width: typeof w === 'number' ? `${w}px` : w,
      height: typeof h === 'number' ? `${h}px` : h,
    };
  });

  constructor() {
    effect(() => {
      const theme = this.theme();
      if (typeof window === 'undefined' || theme !== 'auto') return;
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => this.systemDark.set(e.matches);
      mql.addEventListener('change', handler);
      this.systemDark.set(mql.matches);
      return () => mql.removeEventListener('change', handler);
    });
    inject(DestroyRef);
  }
}
