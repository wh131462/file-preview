import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
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
import { createScrollLock } from './inject/scroll-lock';

@Component({
  selector: 'afp-file-preview-modal',
  standalone: true,
  imports: [FilePreviewContentComponent],
  host: {
    style: 'display: contents',
  },
  template: `
    @if (isOpen()) {
      <div class="afp-root" [attr.data-theme]="resolvedTheme()">
        <div
          class="afp-fixed afp-inset-0 afp-z-[9999] afp-flex afp-items-center afp-justify-center afp-backdrop-blur-md afp-overflow-hidden afp-bg-surface-overlay afp-fade-enter-active"
          (click)="close.emit()"
          (wheel)="$event.stopPropagation()"
        >
          <div class="afp-relative afp-w-full afp-h-full" (click)="$event.stopPropagation()">
            <afp-file-preview-content
              mode="modal"
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
              [showClose]="showClose()"
              [showDownload]="showDownload()"
              (close)="close.emit()"
              (navigate)="navigate.emit($event)"
              (customEvent)="customEvent.emit($event)"
            />
          </div>
        </div>
      </div>
    }
  `,
})
export class FilePreviewModalComponent {
  readonly files = input.required<PreviewFileInput[]>();
  readonly currentIndex = input.required<number>();
  readonly isOpen = input.required<boolean>();
  readonly customRenderers = input<CustomRenderer[]>([]);
  readonly locale = input<Locale>();
  readonly messages = input<Partial<Record<Locale, Partial<Messages>>>>();
  readonly headless = input(false);
  readonly theme = input<Theme>('dark');
  readonly requestInit = input<RequestInitFactory>();
  readonly requestHandler = input<RequestHandler>();
  readonly shouldFetchAsBlob = input<ShouldFetchAsBlob>();
  readonly onDownload = input<(file: PreviewFile) => void | Promise<void>>();
  readonly showClose = input<boolean>();
  readonly showDownload = input(true);

  readonly close = output<void>();
  readonly navigate = output<number>();
  readonly customEvent = output<CustomRendererEventPayload>();

  readonly systemDark = signal(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  );

  readonly resolvedTheme = computed(() =>
    this.theme() === 'auto' ? (this.systemDark() ? 'dark' : 'light') : this.theme(),
  );

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly scroll = createScrollLock();

  constructor() {
    const destroyRef = inject(DestroyRef);
    if (typeof document !== 'undefined') {
      document.body.appendChild(this.host.nativeElement);
      destroyRef.onDestroy(() => {
        this.scroll.unlock();
        this.host.nativeElement.remove();
      });
    }

    effect(() => {
      const theme = this.theme();
      if (typeof window === 'undefined' || theme !== 'auto') return;
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => this.systemDark.set(e.matches);
      mql.addEventListener('change', handler);
      this.systemDark.set(mql.matches);
      return () => mql.removeEventListener('change', handler);
    });

    effect(() => {
      if (this.isOpen()) this.scroll.lock();
      else this.scroll.unlock();
    });
  }
}
