import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
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
  selector: 'FilePreviewEmbed, afp-file-preview-embed',
  standalone: true,
  imports: [FilePreviewContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div
      class="afp-root"
      [attr.data-theme]="resolvedTheme()"
      [style.width]="widthCss()"
      [style.height]="heightCss()"
    >
      <div class="afp-relative afp-w-full afp-h-full afp-overflow-hidden afp-bg-surface-overlay">
        <FilePreviewContent
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
  `,
})
export class FilePreviewEmbed {
  files = input.required<PreviewFileInput[]>();
  currentIndex = input(0);
  customRenderers = input<CustomRenderer[]>([]);
  width = input<number | string>('100%');
  height = input<number | string>('100%');
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

  navigate = output<number>();
  customEvent = output<CustomRendererEventPayload>();
  close = output<void>();

  private readonly system = createSystemDarkSignal();
  readonly resolvedTheme = computed(() => resolveTheme(this.theme(), this.system.systemDark()));
  readonly widthCss = computed(() => {
    const w = this.width();
    return typeof w === 'number' ? `${w}px` : w;
  });
  readonly heightCss = computed(() => {
    const h = this.height();
    return typeof h === 'number' ? `${h}px` : h;
  });

  constructor() {
    effect(() => this.system.bind(this.theme()));
  }
}
