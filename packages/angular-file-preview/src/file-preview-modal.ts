import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
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
} from './fp-core';
import type { CustomRenderer } from './types';
import { FilePreviewContent } from './file-preview-content';
import { createSystemDarkSignal, resolveTheme } from './di/theme-mode';

@Component({
  selector: 'FilePreviewModal, afp-file-preview-modal',
  standalone: true,
  imports: [FilePreviewContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="afp-root" [attr.data-theme]="resolvedTheme()">
        <div
          class="afp-fixed afp-inset-0 afp-z-[9999] afp-flex afp-items-center afp-justify-center afp-backdrop-blur-md afp-overflow-hidden afp-bg-surface-overlay afp-fade-in"
          (click)="close.emit()"
          (wheel)="$event.stopPropagation()"
        >
          <div class="afp-relative afp-w-full afp-h-full" (click)="$event.stopPropagation()">
            <FilePreviewContent
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
              [showNavigation]="showNavigation()"
              [loopNavigation]="loopNavigation()"
              (close)="close.emit()"
              (navigate)="navigate.emit($event)"
              (customEvent)="customEvent.emit($event)"
            />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }
    .afp-fade-in { animation: afp-modal-fade 0.2s ease; }
    @keyframes afp-modal-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
})
export class FilePreviewModal {
  files = input.required<PreviewFileInput[]>();
  currentIndex = input.required<number>();
  isOpen = input(false);
  customRenderers = input<CustomRenderer[]>([]);
  locale = input<Locale | undefined>(undefined);
  messages = input<Partial<Record<Locale, Partial<Messages>>> | undefined>(undefined);
  headless = input(false);
  theme = input<Theme>('dark');
  requestInit = input<RequestInitFactory | undefined>(undefined);
  requestHandler = input<RequestHandler | undefined>(undefined);
  shouldFetchAsBlob = input<ShouldFetchAsBlob | undefined>(undefined);
  onDownload = input<((file: PreviewFile) => void | Promise<void>) | undefined>(undefined);
  showClose = input<boolean | undefined>(undefined);
  showDownload = input(true);
  showNavigation = input(true);
  loopNavigation = input(false);

  close = output<void>();
  navigate = output<number>();
  customEvent = output<CustomRendererEventPayload>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly system = createSystemDarkSignal();
  private originalOverflow = '';
  private originalPaddingRight = '';
  private locked = false;

  readonly resolvedTheme = computed(() => resolveTheme(this.theme(), this.system.systemDark()));

  constructor() {
    effect(() => this.system.bind(this.theme()));
    effect(() => {
      if (this.isOpen()) this.lock();
      else this.unlock();
    });
    effect(() => {
      if (!this.isOpen()) return;
      const el = this.host.nativeElement;
      if (el.parentElement !== document.body) {
        document.body.appendChild(el);
      }
    });
    this.destroyRef.onDestroy(() => {
      this.unlock();
      const el = this.host.nativeElement;
      el.parentElement?.removeChild(el);
    });
  }

  private lock(): void {
    if (this.locked || typeof document === 'undefined') return;
    this.originalOverflow = document.body.style.overflow;
    this.originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    this.locked = true;
  }

  private unlock(): void {
    if (!this.locked || typeof document === 'undefined') return;
    document.body.style.overflow = this.originalOverflow;
    document.body.style.paddingRight = this.originalPaddingRight;
    this.locked = false;
  }
}
