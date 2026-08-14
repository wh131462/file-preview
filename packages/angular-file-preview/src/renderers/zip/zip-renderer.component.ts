import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type JSZip from 'jszip';
import {
  loadZip,
  listZipEntries,
  buildZipTree,
  readZipEntryBlob,
  inferMimeType,
  type ZipTreeNode,
  type PreviewFileInput,
} from '@eternalheart/file-preview-core';
import { ResizableSplitComponent } from '../../components/resizable-split.component';
import { FilePreviewContentComponent } from '../../file-preview-content.component';
import { TreeItemComponent } from './tree-item.component';
import { injectTranslator } from '../../inject/translator';
import { injectFetcher } from '../../inject/request';
import { injectResolvedTheme } from '../../inject/theme';
import { AfpLocaleStore, AfpRequestStore } from '../../inject/stores';
import { RendererErrorComponent } from '../renderer-error.component';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

export interface ZipToolbarStats {
  files: number;
  dirs: number;
  size: number;
}

interface SelectedPreview {
  path: string;
  name: string;
  size: number;
  blobUrl: string;
}

interface HoverTipState {
  text: string;
  x: number;
  y: number;
}

function ensureZipTipStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('afp-zip-tip-styles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'afp-zip-tip-styles';
  styleEl.textContent = `
    .afp-zip-tip {
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      transform: translateY(-50%);
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-size: 12px;
      line-height: 1.5;
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
  `;
  document.head.appendChild(styleEl);
}

@Component({
  selector: 'afp-zip-renderer',
  standalone: true,
  imports: [
    ResizableSplitComponent,
    FilePreviewContentComponent,
    TreeItemComponent,
    RendererErrorComponent,
  ],
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
      </div>
    } @else if (error() || !tree()) {
      <afp-renderer-error [message]="error() || t('zip.parse_failed')" />
    } @else {
      <afp-resizable-split
        #split
        [initialLeftWidth]="280"
        [minLeftWidth]="180"
        [maxLeftWidth]="560"
        storageKey="afp-zip-split-left"
        [mobileTabMode]="true"
        [leftTabLabel]="leftTabLabel"
        [rightTabLabel]="rightTabLabel"
      >
        <ng-template #left>
          <div class="afp-w-full afp-h-full afp-overflow-auto">
            @for (child of tree()!.children || []; track child.path) {
              <afp-zip-tree-item
                [node]="child"
                [depth]="0"
                [selectedPath]="selected()?.path ?? null"
                [expanded]="expanded()"
                (toggle)="handleToggle($event)"
                (select)="handleSelect($event)"
                (hover)="handleHover($event)"
                (leave)="handleLeave()"
              />
            }
          </div>
        </ng-template>
        <ng-template #right>
          <div class="afp-w-full afp-h-full afp-flex afp-flex-col">
            @if (!selected()) {
              <div class="afp-flex-1 afp-flex afp-items-center afp-justify-center afp-text-fg-muted afp-text-sm afp-p-6">
                {{ emptyPreviewHint }}
              </div>
            } @else if (previewLoading()) {
              <div class="afp-flex-1 afp-flex afp-items-center afp-justify-center">
                <div class="afp-w-8 afp-h-8 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
              </div>
            } @else if (previewError()) {
              <div class="afp-flex-1 afp-flex afp-items-center afp-justify-center afp-text-fg-secondary">{{ previewError() }}</div>
            } @else {
              <div class="afp-flex-1 afp-min-h-0 afp-overflow-hidden afp-flex afp-relative afp-z-0">
                <afp-file-preview-content
                  mode="embed"
                  [files]="previewFiles()"
                  [currentIndex]="0"
                  [zipNestingDepth]="nestingDepth() + 1"
                  [locale]="translator.locale()"
                  [theme]="resolvedTheme()"
                  [messages]="localeStore?.messages()"
                  [requestInit]="requestStore?.requestInit()"
                  [requestHandler]="requestStore?.requestHandler()"
                  [shouldFetchAsBlob]="requestStore?.shouldFetchAsBlob()"
                />
              </div>
            }
          </div>
        </ng-template>
      </afp-resizable-split>
    }
  `,
})
export class ZipRendererComponent implements RendererHandle, OnDestroy {
  readonly url = input.required<string>();
  readonly nestingDepth = input(0);

  protected readonly translator = injectTranslator();
  private readonly fetcher = injectFetcher();
  protected readonly resolvedTheme = injectResolvedTheme();
  protected readonly localeStore = inject(AfpLocaleStore, { optional: true });
  protected readonly requestStore = inject(AfpRequestStore, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly emitter = new ToolbarEventEmitter();

  protected readonly splitRef = viewChild<ResizableSplitComponent>('split');

  protected readonly leftTabLabel = '文件树';
  protected readonly emptyPreviewHint = '从左侧选择一个文件以预览';
  protected readonly entryReadFailed = '条目读取失败';
  protected get rightTabLabel(): string {
    return this.t('toolbar.preview');
  }

  private readonly zip = signal<JSZip | null>(null);
  protected readonly tree = signal<ZipTreeNode | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly expanded = signal<Set<string>>(new Set(['']));
  protected readonly selected = signal<SelectedPreview | null>(null);
  protected readonly previewLoading = signal(false);
  protected readonly previewError = signal<string | null>(null);
  private readonly hoverTip = signal<HoverTipState | null>(null);

  private tipEl: HTMLDivElement | null = null;

  protected readonly previewFiles = computed<PreviewFileInput[]>(() => {
    const sel = this.selected();
    if (!sel) return [];
    return [{ name: sel.name, url: sel.blobUrl, type: inferMimeType(sel.name) }];
  });

  private readonly totalStats = computed<ZipToolbarStats | null>(() => {
    const root = this.tree();
    if (!root) return null;
    let files = 0;
    let dirs = 0;
    let size = 0;
    const walk = (n: ZipTreeNode) => {
      if (n.isDir) {
        if (n.path) dirs++;
        n.children?.forEach(walk);
      } else {
        files++;
        size += n.size;
      }
    };
    walk(root);
    return { files, dirs, size };
  });

  constructor() {
    ensureZipTipStyles();
    effect(() => {
      const url = this.url();
      if (url) {
        untracked(() => void this.load());
      }
    });
    effect(() => {
      this.totalStats();
      untracked(() => this.emitter.notify());
    });
    effect(() => {
      const tip = this.hoverTip();
      untracked(() => this.syncTip(tip));
    });
  }

  ngOnDestroy(): void {
    this.revokeCurrent();
    this.tipEl?.remove();
    this.tipEl = null;
  }

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }

  onToolbarChange(listener: () => void): () => void {
    return this.emitter.subscribe(listener);
  }

  protected t(key: string): string {
    return this.translator.t()(key);
  }

  protected handleToggle(path: string): void {
    const next = new Set(this.expanded());
    if (next.has(path)) next.delete(path);
    else next.add(path);
    this.expanded.set(next);
  }

  protected handleHover(payload: { text: string; rect: DOMRect }): void {
    this.hoverTip.set({
      text: payload.text,
      x: payload.rect.right + 8,
      y: payload.rect.top + payload.rect.height / 2,
    });
  }

  protected handleLeave(): void {
    this.hoverTip.set(null);
  }

  protected async handleSelect(node: ZipTreeNode): Promise<void> {
    const z = this.zip();
    if (!z || node.isDir) return;
    this.revokeCurrent();
    this.previewLoading.set(true);
    this.previewError.set(null);

    try {
      const mime = inferMimeType(node.name);
      const blob = await readZipEntryBlob(z, node.path, mime !== 'application/octet-stream' ? mime : undefined);
      const blobUrl = URL.createObjectURL(blob);
      this.selected.set({ path: node.path, name: node.name, size: node.size, blobUrl });
      this.splitRef()?.switchTab('right');
    } catch (err) {
      console.error(err);
      this.previewError.set(this.entryReadFailed);
    } finally {
      this.previewLoading.set(false);
    }
  }

  private revokeCurrent(): void {
    const sel = this.selected();
    if (sel?.blobUrl) URL.revokeObjectURL(sel.blobUrl);
  }

  private async load(): Promise<void> {
    this.revokeCurrent();
    this.selected.set(null);
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.fetcher()(this.url());
      if (!res.ok) throw new Error('加载失败');
      const buf = await res.arrayBuffer();
      const z = await loadZip(buf);
      const entries = listZipEntries(z);
      const root = buildZipTree(entries);
      this.zip.set(z);
      this.tree.set(root);
      const init = new Set<string>(['']);
      if (root.children) for (const c of root.children) if (c.isDir) init.add(c.path);
      this.expanded.set(init);
    } catch (err) {
      console.error(err);
      this.error.set(this.t('zip.load_failed'));
    } finally {
      this.loading.set(false);
    }
  }

  private syncTip(tip: HoverTipState | null): void {
    if (!tip) {
      this.tipEl?.remove();
      this.tipEl = null;
      return;
    }
    if (!this.tipEl) {
      this.tipEl = this.document.createElement('div');
      this.tipEl.className = 'afp-zip-tip';
      this.document.body.appendChild(this.tipEl);
    }
    this.tipEl.textContent = tip.text;
    this.tipEl.style.left = `${tip.x}px`;
    this.tipEl.style.top = `${tip.y}px`;
  }
}
