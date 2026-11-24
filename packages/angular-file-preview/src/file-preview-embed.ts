import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import type {
  CustomRendererEventPayload,
  EmptyHintMode,
  FileLoader,
  Locale,
  Messages,
  PreviewErrorPayload,
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
          [loadFile]="loadFile()"
          [requestInit]="requestInit()"
          [requestHandler]="requestHandler()"
          [shouldFetchAsBlob]="shouldFetchAsBlob()"
          [onDownload]="onDownload()"
          [showClose]="showClose()"
          [showDownload]="showDownload()"
          [showNavigation]="showNavigation()"
          [loopNavigation]="loopNavigation()"
          [emptyHint]="emptyHint()"
          (close)="close.emit()"
          (navigate)="navigate.emit($event)"
          (customEvent)="customEvent.emit($event)"
          (error)="error.emit($event)"
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
  /** 统一取数入口：鉴权 / 签名场景下由宿主决定文件怎么取 */
  loadFile = input<FileLoader | undefined>(undefined);
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestInit = input<RequestInitFactory | undefined>(undefined);
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  requestHandler = input<RequestHandler | undefined>(undefined);
  /** @deprecated 将在 1.8.0 移除；请改用 `loadFile` */
  shouldFetchAsBlob = input<ShouldFetchAsBlob | undefined>(undefined);
  onDownload = input<((file: PreviewFile) => void | Promise<void>) | undefined>(undefined);
  showClose = input<boolean | undefined>(undefined);
  showDownload = input(true);
  showNavigation = input(true);
  loopNavigation = input(false);
  /** 空内容提示策略，默认 'auto'（文本类空白、结构化类型提示） */
  emptyHint = input<EmptyHintMode>('auto');

  navigate = output<number>();
  customEvent = output<CustomRendererEventPayload>();
  close = output<void>();
  /** 加载/渲染失败事件：每次加载最多触发一次，payload 已补全 file/index/stage */
  error = output<PreviewErrorPayload>();

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
