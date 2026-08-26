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
  signal,
  viewChild,
} from '@angular/core';
import {
  downloadFileWithFetcher,
  getFileType,
  normalizeFiles,
  resolveShowClose,
  type Locale,
  type Messages,
  type PreviewFile,
  type PreviewFileInput,
  type RequestHandler,
  type RequestInitFactory,
  type ShouldFetchAsBlob,
  type Theme,
  type CustomRendererEventPayload,
} from './fp-core';
import type { CustomRenderer, CustomRendererContext } from './types';
import type { RendererHandle } from './renderers/base.types';
import type { ToolbarGroup } from './renderers/toolbar.types';
import { LocaleService } from './di/locale.service';
import { ThemeService } from './di/theme.service';
import { RequestService, needsBlobUrl } from './di/request.service';
import { createSystemDarkSignal, resolveTheme } from './di/theme-mode';
import { BUILTIN_RENDERERS } from './renderers/registry';
import type { RendererLoader } from './renderers/lazy';
import { FilePreviewToolbar } from './components/preview/file-preview-toolbar';
import { NavArrows } from './components/preview/nav-arrows';
import { RendererOutlet } from './components/preview/renderer-outlet';
import { UnsupportedRenderer } from './renderers/Unsupported/index';

const MAX_ZIP_NESTING_DEPTH = 3;

@Component({
  selector: 'FilePreviewContent, afp-file-preview-content',
  standalone: true,
  imports: [FilePreviewToolbar, NavArrows, RendererOutlet, UnsupportedRenderer],
  providers: [LocaleService, ThemeService, RequestService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    @if (currentFile(); as file) {
      <div
        #rootRef
        [attr.tabindex]="mode() === 'embed' ? 0 : -1"
        [attr.data-theme]="resolvedTheme()"
        class="afp-relative afp-w-full afp-h-full afp-flex afp-flex-col afp-overflow-hidden afp-outline-none"
      >
        @if (!headless()) {
          <afp-file-preview-toolbar
            [fileName]="file.name"
            [currentIndex]="currentIndex()"
            [totalFiles]="normalizedFiles().length"
            [toolGroups]="toolGroups()"
            [t]="t()"
            [showClose]="showCloseButton()"
            [showDownload]="showDownload()"
            (download)="handleDownload()"
            (close)="close.emit()"
          />
        }

        <div
          #contentRef
          class="afp-flex-1 afp-flex afp-items-center afp-justify-center afp-overflow-auto"
        >
          @if (customRendererCmp()) {
            <afp-renderer-outlet
              [componentType]="customRendererCmp()"
              [inputs]="customInputs()"
              (handleChange)="onRendererHandle($event)"
            />
          } @else if (fileType() === 'zip' && zipNestingDepth() >= maxZipDepth) {
            <afp-unsupported-renderer
              [fileName]="file.name"
              [fileType]="file.type"
              (download)="handleDownload()"
            />
          } @else if (builtinLoader()) {
            <afp-renderer-outlet
              [loader]="builtinLoader()"
              [inputs]="builtinInputs()"
              (handleChange)="onRendererHandle($event)"
            />
          } @else {
            <afp-unsupported-renderer
              [fileName]="file.name"
              [fileType]="file.type"
              (download)="handleDownload()"
            />
          }
        </div>

        @if (!headless() && normalizedFiles().length > 1) {
          <afp-nav-arrows
            [container]="contentEl()"
            [hasPrev]="currentIndex() > 0"
            [hasNext]="currentIndex() < normalizedFiles().length - 1"
            [resetKey]="currentIndex()"
            [t]="t()"
            (prev)="navigate.emit(currentIndex() - 1)"
            (next)="navigate.emit(currentIndex() + 1)"
          />
        }
      </div>
    }
  `,
})
export class FilePreviewContent {
  files = input.required<PreviewFileInput[]>();
  currentIndex = input(0);
  customRenderers = input<CustomRenderer[]>([]);
  mode = input<'modal' | 'embed'>('modal');
  zipNestingDepth = input(0);
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

  navigate = output<number>();
  close = output<void>();
  customEvent = output<CustomRendererEventPayload>();

  protected readonly maxZipDepth = MAX_ZIP_NESTING_DEPTH;

  private readonly localeService = inject(LocaleService);
  private readonly themeService = inject(ThemeService);
  private readonly requestService = inject(RequestService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly root = viewChild<ElementRef<HTMLDivElement>>('rootRef');
  private readonly content = viewChild<ElementRef<HTMLDivElement>>('contentRef');

  private readonly system = createSystemDarkSignal();
  readonly resolvedUrl = signal('');
  private createdBlobUrl: string | null = null;
  private unsubscribeToolbar: (() => void) | null = null;
  readonly rendererToolbarGroups = signal<ToolbarGroup[]>([]);

  readonly normalizedFiles = computed(() => normalizeFiles(this.files()));
  readonly currentFile = computed(() => this.normalizedFiles()[this.currentIndex()] as PreviewFile | undefined);
  readonly fileType = computed(() => {
    const file = this.currentFile();
    return file ? getFileType(file) : 'unsupported';
  });
  readonly t = computed(() => this.localeService.t());
  readonly resolvedTheme = computed(() => resolveTheme(this.theme(), this.system.systemDark()));
  readonly showCloseButton = computed(() => resolveShowClose(this.mode(), this.showClose()));
  readonly contentEl = computed(() => this.content()?.nativeElement ?? null);

  readonly customRenderer = computed(() => {
    const file = this.currentFile();
    if (!file) return null;
    return this.customRenderers().find((r) => r.test(file)) ?? null;
  });

  readonly customCtx = computed<CustomRendererContext>(() => ({
    emit: (name, payload) => {
      const file = this.currentFile();
      if (!file) return;
      this.customEvent.emit({ name, payload, file });
    },
    t: this.t(),
    theme: this.resolvedTheme(),
    locale: this.locale() ?? 'zh-CN',
  }));

  readonly customRendererCmp = computed(() => {
    const renderer = this.customRenderer();
    const file = this.currentFile();
    if (!renderer || !file) return null;
    return renderer.render(file, this.customCtx());
  });

  readonly customInputs = computed(() => ({
    file: this.currentFile(),
    ctx: this.customCtx(),
  }));

  readonly builtinConfig = computed(() => {
    const type = this.fileType();
    return (
      BUILTIN_RENDERERS.find((r) => r.fileType === type) ??
      (type === 'xls' ? BUILTIN_RENDERERS.find((r) => r.fileType === 'xlsx') : null) ??
      null
    );
  });

  readonly builtinLoader = computed<RendererLoader | null>(() => this.builtinConfig()?.loader ?? null);

  readonly builtinInputs = computed(() => {
    const config = this.builtinConfig();
    const file = this.currentFile();
    if (!config || !file) return {};
    return config.getProps({
      resolvedUrl: this.resolvedUrl(),
      zipNestingDepth: this.zipNestingDepth(),
      currentFile: file,
    });
  });

  readonly toolGroups = computed(() => {
    const custom = this.customRenderer();
    const file = this.currentFile();
    if (custom && file) {
      return custom.getToolbarGroups?.(file, this.customCtx()) ?? [];
    }
    return this.rendererToolbarGroups();
  });

  constructor() {
    effect(() => {
      this.localeService.configure(this.locale(), this.messages());
    });
    effect(() => {
      this.themeService.setTheme(this.resolvedTheme());
    });
    effect(() => {
      this.system.bind(this.theme());
    });
    effect(() => {
      this.requestService.configure({
        requestInit: this.requestInit(),
        requestHandler: this.requestHandler(),
        shouldFetchAsBlob: this.shouldFetchAsBlob(),
      });
    });
    effect(() => {
      const file = this.currentFile();
      const need = needsBlobUrl(file, this.requestService.shouldFetchAsBlob());
      void this.refreshResolvedUrl(file, need);
    });

    this.destroyRef.onDestroy(() => {
      this.cleanupSubscription();
      this.revokeBlob();
    });

    effect((onCleanup) => {
      const mode = this.mode();
      const rootEl = this.root()?.nativeElement;
      const handler = this.handleKeyDown;
      if (mode === 'modal') {
        window.addEventListener('keydown', handler);
        onCleanup(() => window.removeEventListener('keydown', handler));
      } else if (rootEl) {
        rootEl.addEventListener('keydown', handler);
        onCleanup(() => rootEl.removeEventListener('keydown', handler));
      }
    });
  }

  onRendererHandle(handle: RendererHandle | null): void {
    this.cleanupSubscription();
    if (!handle) {
      this.rendererToolbarGroups.set([]);
      return;
    }
    this.rendererToolbarGroups.set(handle.getToolbarGroups?.() ?? []);
    if (handle.onToolbarChange) {
      this.unsubscribeToolbar = handle.onToolbarChange(() => {
        this.rendererToolbarGroups.set(handle.getToolbarGroups?.() ?? []);
      });
    }
  }

  async handleDownload(): Promise<void> {
    const file = this.currentFile();
    if (!file) return;
    const custom = this.onDownload();
    if (custom) {
      await custom(file);
      return;
    }
    try {
      await downloadFileWithFetcher(file.url, file.name, this.requestService.fetcher());
    } catch (err) {
      console.error('[file-preview] download failed:', err);
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.mode() === 'modal') {
      this.close.emit();
    } else if (e.key === 'ArrowLeft' && this.currentIndex() > 0) {
      this.navigate.emit(this.currentIndex() - 1);
    } else if (e.key === 'ArrowRight' && this.currentIndex() < this.normalizedFiles().length - 1) {
      this.navigate.emit(this.currentIndex() + 1);
    }
  };

  private cleanupSubscription(): void {
    this.unsubscribeToolbar?.();
    this.unsubscribeToolbar = null;
  }

  private revokeBlob(): void {
    if (this.createdBlobUrl) {
      URL.revokeObjectURL(this.createdBlobUrl);
      this.createdBlobUrl = null;
    }
  }

  private async refreshResolvedUrl(file: PreviewFile | undefined, need: boolean): Promise<void> {
    if (!file) {
      this.revokeBlob();
      this.resolvedUrl.set('');
      return;
    }
    if (!need) {
      this.revokeBlob();
      this.resolvedUrl.set(file.url);
      return;
    }
    this.resolvedUrl.set('');
    try {
      const blobUrl = await this.requestService.resolveBlobUrl(file.url);
      this.revokeBlob();
      this.createdBlobUrl = blobUrl;
      this.resolvedUrl.set(blobUrl);
    } catch (err) {
      console.error('[file-preview] resolve blob url failed:', err);
      this.resolvedUrl.set(file.url);
    }
  }
}
