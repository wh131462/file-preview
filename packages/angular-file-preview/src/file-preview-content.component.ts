import {
  afterEveryRender,
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
import { NgComponentOutlet } from '@angular/common';
import { LucideAngularModule, X, Download } from 'lucide-angular';
import {
  downloadFileWithFetcher,
  fetchAsBlobUrl,
  getFileType,
  normalizeFiles,
  resolveShowClose,
  type CustomRendererEventPayload,
  type Locale,
  type Messages,
  type PreviewFile,
  type PreviewFileInput,
  type RequestHandler,
  type RequestInitFactory,
  type ShouldFetchAsBlob,
  type Theme,
} from '@eternalheart/file-preview-core';
import type { CustomRenderer, CustomRendererContext } from './types';
import { AFP_LOCALE, AFP_REQUEST, AFP_THEME } from './inject/tokens';
import { AfpLocaleStore, AfpRequestStore, AfpThemeStore } from './inject/stores';
import type { ToolbarButtonItem, ToolbarGroup, ToolbarTextItem } from './renderers/toolbar.types';
import type { RendererHandle } from './renderers/base.types';
import { BUILTIN_RENDERERS } from './renderers/registry';
import { UnsupportedRendererComponent } from './renderers/unsupported/unsupported-renderer.component';
import { RendererLoadingComponent } from './renderers/renderer-loading.component';
import { NavArrowsComponent } from './components/nav-arrows.component';

const MAX_ZIP_NESTING_DEPTH = 3;

@Component({
  selector: 'afp-file-preview-content',
  standalone: true,
  imports: [
    NgComponentOutlet,
    LucideAngularModule,
    UnsupportedRendererComponent,
    RendererLoadingComponent,
    NavArrowsComponent,
  ],
  providers: [
    AfpLocaleStore,
    AfpThemeStore,
    AfpRequestStore,
    {
      provide: AFP_LOCALE,
      useFactory: (s: AfpLocaleStore) => ({ locale: s.locale.asReadonly(), t: s.t }),
      deps: [AfpLocaleStore],
    },
    { provide: AFP_THEME, useFactory: (s: AfpThemeStore) => s.theme.asReadonly(), deps: [AfpThemeStore] },
    { provide: AFP_REQUEST, useFactory: (s: AfpRequestStore) => s.value, deps: [AfpRequestStore] },
  ],
  template: `
    <div
      #rootRef
      [attr.tabindex]="mode() === 'embed' ? 0 : -1"
      [attr.data-theme]="resolvedTheme()"
      class="afp-relative afp-w-full afp-h-full afp-flex afp-flex-col afp-overflow-hidden afp-outline-none"
    >
      @if (!headless()) {
        <div
          class="afp-flex-shrink-0 afp-z-10 afp-backdrop-blur-md afp-border-b afp-bg-surface-toolbar afp-border-line"
          style="padding-top: env(safe-area-inset-top, 0px)"
        >
          <div class="afp-flex afp-items-center afp-justify-between afp-px-3 md:afp-px-5 afp-py-1.5 md:afp-py-2.5">
            <div class="afp-flex afp-items-center afp-flex-1 afp-min-w-0 afp-mr-2 md:afp-mr-3">
              <h2 class="afp-font-medium afp-text-xs md:afp-text-sm afp-truncate afp-text-fg-primary">
                {{ currentFile()?.name }}
              </h2>
              <span class="afp-text-xs afp-ml-2 afp-flex-shrink-0 afp-text-fg-muted">
                {{ currentIndex() + 1 }}/{{ normalizedFiles().length }}
              </span>
            </div>

            <div class="afp-flex afp-items-center afp-gap-1 md:afp-hidden afp-flex-shrink-0">
              @for (group of actionGroups(); track $index; let gi = $index) {
                @for (item of group.items; track $index; let ii = $index) {
                  @if (isButton(item)) {
                    <button
                      type="button"
                      class="toolbar-btn"
                      [class.active]="item.active"
                      [attr.data-tooltip]="item.tooltip"
                      [disabled]="item.disabled"
                      [attr.aria-pressed]="item.active"
                      (click)="item.action()"
                    >
                      <lucide-icon [img]="$any(item.icon)" class="afp-w-4 afp-h-4" />
                    </button>
                  }
                }
              }
            </div>

            <div class="afp-hidden md:afp-flex afp-items-center afp-gap-1 afp-flex-shrink-0">
              @for (group of toolGroups(); track $index; let gi = $index) {
                @for (item of group.items; track $index) {
                  @if (isButton(item)) {
                    <button
                      type="button"
                      class="toolbar-btn"
                      [class.active]="item.active"
                      [attr.data-tooltip]="item.tooltip"
                      [disabled]="item.disabled"
                      [attr.aria-pressed]="item.active"
                      (click)="item.action()"
                    >
                      <lucide-icon [img]="$any(item.icon)" class="afp-w-4 afp-h-4" />
                    </button>
                  } @else if (isText(item)) {
                    <span
                      class="afp-text-xs afp-text-center afp-font-medium afp-tabular-nums afp-text-fg-tertiary"
                      [style.minWidth]="item.minWidth || 'auto'"
                    >
                      {{ item.content }}
                    </span>
                  }
                }
                @if (gi < toolGroups().length - 1 || actionGroups().length > 0) {
                  <div class="afp-w-px afp-h-4 afp-mx-1 afp-bg-divide"></div>
                }
              }
              @for (group of actionGroups(); track $index) {
                @for (item of group.items; track $index) {
                  @if (isButton(item)) {
                    <button
                      type="button"
                      class="toolbar-btn"
                      [class.active]="item.active"
                      [attr.data-tooltip]="item.tooltip"
                      [disabled]="item.disabled"
                      [attr.aria-pressed]="item.active"
                      (click)="item.action()"
                    >
                      <lucide-icon [img]="$any(item.icon)" class="afp-w-4 afp-h-4" />
                    </button>
                  }
                }
              }
            </div>
          </div>

          @if (hasToolGroups()) {
            <div class="afp-flex afp-items-center afp-gap-1 afp-px-3 afp-pb-1.5 afp-overflow-x-auto scrollbar-hide md:afp-hidden">
              @for (group of toolGroups(); track $index; let gi = $index) {
                @if (gi > 0) {
                  <div class="afp-w-px afp-h-4 afp-mx-0.5 afp-bg-divide"></div>
                }
                @for (item of group.items; track $index) {
                  @if (isButton(item)) {
                    <button
                      type="button"
                      class="toolbar-btn"
                      [class.active]="item.active"
                      [attr.data-tooltip]="item.tooltip"
                      [disabled]="item.disabled"
                      [attr.aria-pressed]="item.active"
                      (click)="item.action()"
                    >
                      <lucide-icon [img]="$any(item.icon)" class="afp-w-4 afp-h-4" />
                    </button>
                  } @else if (isText(item)) {
                    <span
                      class="afp-text-xs afp-text-center afp-font-medium afp-tabular-nums afp-text-fg-tertiary"
                      [style.minWidth]="item.minWidth || 'auto'"
                    >
                      {{ item.content }}
                    </span>
                  }
                }
              }
            </div>
          }
        </div>
      }

      <div
        #contentRef
        class="afp-flex-1 afp-flex afp-items-center afp-justify-center afp-overflow-auto"
      >
        @if (currentFile(); as file) {
          @if (customRendererCmp(); as cmp) {
            <ng-container *ngComponentOutlet="cmp; inputs: customInputs()" />
          } @else if (fileType() === 'zip' && zipNestingDepth() >= maxZipDepth) {
            <afp-unsupported-renderer
              [fileName]="file.name"
              [fileType]="file.type"
              (download)="handleDownload()"
            />
          } @else if (loadedRenderer(); as cmp) {
            <ng-container *ngComponentOutlet="cmp; inputs: builtinInputs()" />
          } @else if (loadingRenderer()) {
            <afp-renderer-loading />
          } @else {
            <afp-unsupported-renderer
              [fileName]="file.name"
              [fileType]="file.type"
              (download)="handleDownload()"
            />
          }
        }
      </div>

      @if (!headless() && normalizedFiles().length > 1) {
        <afp-nav-arrows
          [containerEl]="contentEl()"
          [hasPrev]="currentIndex() > 0"
          [hasNext]="currentIndex() < normalizedFiles().length - 1"
          [resetKey]="currentIndex()"
          (prev)="navigate.emit(currentIndex() - 1)"
          (next)="navigate.emit(currentIndex() + 1)"
        />
      }
    </div>
  `,
  styles: [`
    .toolbar-btn {
      position: relative;
      padding: 0.5rem;
      border-radius: 0.375rem;
      transition: all 0.15s;
      user-select: none;
      color: var(--fp-fg-primary);
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    @media (min-width: 768px) {
      .toolbar-btn { padding: 0.375rem; }
    }
    .toolbar-btn:hover { background: var(--fp-surface-2); }
    .toolbar-btn:active { background: var(--fp-surface-3); }
    .toolbar-btn.active,
    .toolbar-btn.active:hover,
    .toolbar-btn.active:active { background: var(--fp-surface-3); }
    .toolbar-btn:disabled {
      color: var(--fp-fg-disabled);
      cursor: not-allowed;
    }
    .toolbar-btn[data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      margin-top: 6px;
      padding: 4px 8px;
      background: var(--fp-fg-primary);
      color: var(--fp-fg-inverse);
      font-size: 12px;
      line-height: 1.5;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      z-index: 50;
    }
    .toolbar-btn[data-tooltip]::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      margin-top: 2px;
      border: 4px solid transparent;
      border-bottom-color: var(--fp-fg-primary);
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      z-index: 50;
    }
    .toolbar-btn[data-tooltip]:hover::after,
    .toolbar-btn[data-tooltip]:hover::before {
      opacity: 1;
      visibility: visible;
    }
    @media (max-width: 1023px) {
      .toolbar-btn[data-tooltip]::after,
      .toolbar-btn[data-tooltip]::before {
        display: none !important;
      }
    }
  `],
})
export class FilePreviewContentComponent {
  readonly files = input.required<PreviewFileInput[]>();
  readonly currentIndex = input.required<number>();
  readonly customRenderers = input<CustomRenderer[]>([]);
  readonly mode = input<'modal' | 'embed'>('modal');
  readonly zipNestingDepth = input(0);
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
  readonly close = output<void>();
  readonly customEvent = output<CustomRendererEventPayload>();

  readonly maxZipDepth = MAX_ZIP_NESTING_DEPTH;
  readonly downloadIcon = Download;
  readonly closeIcon = X;

  private readonly localeStore = inject(AfpLocaleStore);
  private readonly themeStore = inject(AfpThemeStore);
  private readonly requestStore = inject(AfpRequestStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly rootRef = viewChild<ElementRef<HTMLDivElement>>('rootRef');
  readonly contentRef = viewChild<ElementRef<HTMLDivElement>>('contentRef');
  readonly outlet = viewChild(NgComponentOutlet);

  readonly systemDark = signal(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  );

  readonly resolvedTheme = computed(() =>
    this.theme() === 'auto' ? (this.systemDark() ? 'dark' : 'light') : this.theme(),
  );

  readonly normalizedFiles = computed(() => normalizeFiles(this.files()));
  readonly currentFile = computed(() => this.normalizedFiles()[this.currentIndex()]);
  readonly fileType = computed(() => {
    const file = this.currentFile();
    return file ? getFileType(file) : 'unsupported';
  });

  readonly blobUrl = signal('');
  readonly resolvedUrl = computed(() => {
    const file = this.currentFile();
    if (!file) return '';
    const need = !!this.requestStore.value().shouldFetchAsBlob?.(file);
    if (!need) return file.url;
    return this.blobUrl();
  });

  readonly customRenderer = computed(() => {
    const file = this.currentFile();
    if (!file) return null;
    return this.customRenderers().find((r) => r.test(file)) || null;
  });

  readonly customCtx = computed<CustomRendererContext>(() => ({
    emit: (name, payload) => this.emitCustom(name, payload),
    t: this.localeStore.t(),
    theme: this.resolvedTheme(),
    locale: (this.locale() ?? 'zh-CN') as Locale,
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

  readonly builtinRenderer = computed(() =>
    BUILTIN_RENDERERS.find((r) => r.fileType === this.fileType()) ?? null,
  );

  readonly loadedRenderer = signal<ReturnType<typeof Object> | null>(null);
  readonly loadingRenderer = signal(false);
  readonly builtinInputs = signal<Record<string, unknown>>({});

  readonly rendererToolbarGroups = signal<ToolbarGroup[]>([]);

  readonly toolGroups = computed(() => {
    const custom = this.customRenderer();
    const file = this.currentFile();
    if (custom && file) {
      return custom.getToolbarGroups?.(file, this.customCtx()) ?? [];
    }
    return this.rendererToolbarGroups();
  });

  readonly showCloseButton = computed(() => resolveShowClose(this.mode(), this.showClose()));

  readonly actionGroups = computed<ToolbarGroup[]>(() => {
    const groups: ToolbarGroup[] = [];
    if (this.showDownload()) {
      groups.push({
        items: [
          { type: 'button', icon: Download, tooltip: this.localeStore.t()('common.download'), action: () => void this.handleDownload() },
        ],
      });
    }
    if (this.showCloseButton()) {
      groups.push({
        items: [
          { type: 'button', icon: X, tooltip: this.localeStore.t()('common.close'), action: () => this.emitClose() },
        ],
      });
    }
    return groups;
  });

  readonly hasToolGroups = computed(() => this.toolGroups().length > 0);
  readonly contentEl = computed(() => this.contentRef()?.nativeElement ?? null);

  private unsubscribeToolbar: (() => void) | null = null;
  private lastRendererInstance: RendererHandle | null = null;
  private createdBlobUrl: string | null = null;
  private blobGen = 0;

  constructor() {
    effect(() => {
      this.localeStore.locale.set(this.locale() ?? 'zh-CN');
      this.localeStore.messages.set(this.messages());
    });

    effect(() => {
      this.themeStore.theme.set(this.resolvedTheme());
    });

    effect(() => {
      this.requestStore.requestInit.set(this.requestInit());
      this.requestStore.requestHandler.set(this.requestHandler());
      this.requestStore.shouldFetchAsBlob.set(this.shouldFetchAsBlob());
    });

    effect(() => {
      const theme = this.theme();
      if (typeof window === 'undefined') return;
      if (theme !== 'auto') return;
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => this.systemDark.set(e.matches);
      mql.addEventListener('change', handler);
      this.systemDark.set(mql.matches);
      return () => mql.removeEventListener('change', handler);
    });

    effect(() => {
      const file = this.currentFile();
      const ctx = this.requestStore.value();
      const need = !!(file && ctx.shouldFetchAsBlob?.(file));
      const gen = ++this.blobGen;
      if (this.createdBlobUrl) {
        URL.revokeObjectURL(this.createdBlobUrl);
        this.createdBlobUrl = null;
      }
      this.blobUrl.set('');
      if (!file || !need) return;
      void fetchAsBlobUrl(file.url, ctx.fetcher).then((url) => {
        if (gen !== this.blobGen) {
          URL.revokeObjectURL(url);
          return;
        }
        this.createdBlobUrl = url;
        this.blobUrl.set(url);
      }).catch((err) => {
        if (gen === this.blobGen) {
          console.error('[file-preview] resolve blob url failed:', err);
          this.blobUrl.set(file.url);
        }
      });
    });

    effect(() => {
      const builtin = this.builtinRenderer();
      const file = this.currentFile();
      const url = this.resolvedUrl();
      if (!builtin || !file) {
        this.loadedRenderer.set(null);
        this.loadingRenderer.set(false);
        this.builtinInputs.set({});
        return;
      }
      this.builtinInputs.set(builtin.getProps({
        resolvedUrl: url,
        zipNestingDepth: this.zipNestingDepth(),
        currentFile: file,
      }));
      this.loadingRenderer.set(true);
      this.loadedRenderer.set(null);
      void builtin.load().then((cmp) => {
        if (this.builtinRenderer() === builtin) {
          this.loadedRenderer.set(cmp);
          this.loadingRenderer.set(false);
        }
      }).catch((err) => {
        console.error('[file-preview] load renderer failed:', err);
        if (this.builtinRenderer() === builtin) {
          this.loadedRenderer.set(null);
          this.loadingRenderer.set(false);
        }
      });
    });

    afterEveryRender(() => {
      const instance = this.outlet()?.componentInstance as RendererHandle | undefined;
      if (instance !== this.lastRendererInstance) {
        this.attachRenderer(instance ?? null);
      }
    });

    const onKey = (e: KeyboardEvent) => this.handleKeyDown(e);
    const mode = this.mode();
    if (typeof window !== 'undefined' && mode === 'modal') {
      window.addEventListener('keydown', onKey);
      this.destroyRef.onDestroy(() => window.removeEventListener('keydown', onKey));
    } else {
      const el = this.host.nativeElement;
      el.addEventListener('keydown', onKey);
      this.destroyRef.onDestroy(() => el.removeEventListener('keydown', onKey));
    }

    this.destroyRef.onDestroy(() => {
      this.cleanupSubscription();
      if (this.createdBlobUrl) URL.revokeObjectURL(this.createdBlobUrl);
    });
  }

  isButton(item: ToolbarGroup['items'][number]): item is ToolbarButtonItem {
    return item.type === 'button';
  }

  isText(item: ToolbarGroup['items'][number]): item is ToolbarTextItem {
    return item.type === 'text';
  }

  async handleDownload() {
    const file = this.currentFile();
    if (!file) return;
    const custom = this.onDownload();
    if (custom) {
      await custom(file);
      return;
    }
    try {
      await downloadFileWithFetcher(file.url, file.name, this.requestStore.value().fetcher);
    } catch (err) {
      console.error('[file-preview] download failed:', err);
    }
  }

  emitClose() {
    this.onClose()?.();
    this.close.emit();
  }

  private emitCustom(name: string, payload?: unknown) {
    const file = this.currentFile();
    if (!file) return;
    this.customEvent.emit({ name, payload, file });
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.mode() === 'modal') {
      this.emitClose();
    } else if (e.key === 'ArrowLeft' && this.currentIndex() > 0) {
      this.navigate.emit(this.currentIndex() - 1);
    } else if (e.key === 'ArrowRight' && this.currentIndex() < this.normalizedFiles().length - 1) {
      this.navigate.emit(this.currentIndex() + 1);
    }
  }

  private cleanupSubscription() {
    if (this.unsubscribeToolbar) {
      this.unsubscribeToolbar();
      this.unsubscribeToolbar = null;
    }
  }

  private attachRenderer(instance: RendererHandle | null) {
    this.cleanupSubscription();
    this.lastRendererInstance = instance;
    this.rendererToolbarGroups.set([]);
    if (!instance) return;
    if (instance.onToolbarChange) {
      this.unsubscribeToolbar = instance.onToolbarChange(() => {
        this.rendererToolbarGroups.set(instance.getToolbarGroups?.() ?? []);
      });
    }
    this.rendererToolbarGroups.set(instance.getToolbarGroups?.() ?? []);
  }
}
