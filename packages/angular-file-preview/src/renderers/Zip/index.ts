import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type JSZip from 'jszip';
import {
  loadZip,
  listZipEntries,
  buildZipTree,
  readZipEntryBlob,
  inferMimeType,
  type ZipTreeNode,
  type PreviewFileInput,
} from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { FilePreviewContent } from '../../file-preview-content';
import { ResizableSplit } from '../../components/resizable-split';
import { RendererError } from '../RendererError';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';
import { ZipTreeItem } from './tree-item';

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

const ZIP_TIP_STYLE_ID = 'afp-zip-tip-styles';

function ensureZipTipStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ZIP_TIP_STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = ZIP_TIP_STYLE_ID;
  el.textContent = `
    .afp-zip-tip {
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      transform: translateY(-50%);
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.85);
      color: var(--fp-fg-inverse, #fff);
      font-size: 12px;
      line-height: 1.5;
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
  `;
  document.head.appendChild(el);
}

@Component({
  selector: 'afp-zip-renderer',
  standalone: true,
  imports: [RendererError, ResizableSplit, ZipTreeItem, FilePreviewContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
      </div>
    } @else if (error() || !tree()) {
      <afp-renderer-error [message]="error() || t('zip.parse_failed')" />
    } @else {
      <afp-resizable-split
        [initialLeftWidth]="280"
        [minLeftWidth]="180"
        [maxLeftWidth]="560"
        storageKey="afp-zip-split-left"
        [mobileTabMode]="true"
        leftTabLabel="文件树"
        rightTabLabel="预览"
      >
        <div splitLeft class="afp-w-full afp-h-full afp-overflow-auto">
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
        <div splitRight class="afp-w-full afp-h-full afp-flex afp-flex-col">
          @if (!selected()) {
            <div class="afp-flex-1 afp-flex afp-items-center afp-justify-center afp-text-fg-muted afp-text-sm afp-p-6">
              从左侧选择一个文件以预览
            </div>
          } @else if (previewLoading()) {
            <div class="afp-flex-1 afp-flex afp-items-center afp-justify-center">
              <div class="afp-w-8 afp-h-8 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
            </div>
          } @else if (previewError()) {
            <div class="afp-flex-1 afp-flex afp-items-center afp-justify-center afp-text-fg-secondary">{{ previewError() }}</div>
          } @else {
            <div class="afp-flex-1 afp-min-h-0 afp-overflow-hidden afp-flex afp-relative afp-z-0">
              <FilePreviewContent
                mode="embed"
                [files]="previewFiles()"
                [currentIndex]="0"
                [zipNestingDepth]="nestingDepth() + 1"
              />
            </div>
          }
        </div>
      </afp-resizable-split>
    }
  `,
})
export class ZipRenderer implements RendererHandle {
  url = input.required<string>();
  nestingDepth = input(0);

  private readonly emitter = new ToolbarEventEmitter();
  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();
  private readonly splitRef = viewChild(ResizableSplit);

  readonly zip = signal<JSZip | null>(null);
  readonly tree = signal<ZipTreeNode | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly expanded = signal<Set<string>>(new Set(['']));
  readonly selected = signal<SelectedPreview | null>(null);
  readonly previewLoading = signal(false);
  readonly previewError = signal<string | null>(null);
  readonly hoverTip = signal<HoverTipState | null>(null);

  readonly totalStats = computed<ZipToolbarStats | null>(() => {
    const root = this.tree();
    if (!root) return null;
    let files = 0, dirs = 0, size = 0;
    const walk = (n: ZipTreeNode) => {
      if (n.isDir) { if (n.path) dirs++; n.children?.forEach(walk); }
      else { files++; size += n.size; }
    };
    walk(root);
    return { files, dirs, size };
  });

  readonly previewFiles = computed<PreviewFileInput[]>(() => {
    const sel = this.selected();
    if (!sel) return [];
    return [{ name: sel.name, url: sel.blobUrl, type: inferMimeType(sel.name) }];
  });

  private tipEl: HTMLDivElement | null = null;

  constructor() {
    ensureZipTipStyles();

    effect(() => {
      const url = this.url();
      if (!url) return;
      untracked(() => { void this.load(); });
    });

    effect(() => {
      this.totalStats();
      this.emitter.notify();
    });

    effect(() => {
      const tip = this.hoverTip();
      untracked(() => this.syncTip(tip));
    });

    inject(DestroyRef).onDestroy(() => {
      this.revokeCurrent();
      this.syncTip(null);
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  onToolbarChange = (listener: () => void) => this.emitter.subscribe(listener);

  handleToggle(path: string): void {
    const next = new Set(this.expanded());
    if (next.has(path)) next.delete(path);
    else next.add(path);
    this.expanded.set(next);
  }

  handleHover(payload: { text: string; rect: DOMRect }): void {
    this.hoverTip.set({ text: payload.text, x: payload.rect.right + 8, y: payload.rect.top + payload.rect.height / 2 });
  }

  handleLeave(): void {
    this.hoverTip.set(null);
  }

  async handleSelect(node: ZipTreeNode): Promise<void> {
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
      this.previewError.set('条目读取失败');
    } finally {
      this.previewLoading.set(false);
    }
  }

  private revokeCurrent(): void {
    const sel = this.selected();
    if (sel?.blobUrl) URL.revokeObjectURL(sel.blobUrl);
  }

  private syncTip(tip: HoverTipState | null): void {
    if (!tip) {
      this.tipEl?.remove();
      this.tipEl = null;
      return;
    }
    if (!this.tipEl) {
      this.tipEl = document.createElement('div');
      this.tipEl.className = 'afp-zip-tip';
      document.body.appendChild(this.tipEl);
    }
    this.tipEl.textContent = tip.text;
    this.tipEl.style.left = `${tip.x}px`;
    this.tipEl.style.top = `${tip.y}px`;
  }

  private async load(): Promise<void> {
    this.revokeCurrent();
    this.selected.set(null);
    this.loading.set(true);
    this.error.set(null);
    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const res = await fetcher(this.url());
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
}
