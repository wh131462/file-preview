import { Component, signal } from '@angular/core';
import {
  FilePreviewModal,
  FilePreviewEmbed,
  VERSION,
  SUPPORTED_FILE_TYPES,
  type Locale,
  type PreviewFile,
  type Theme,
} from '@eternalheart/angular-file-preview';
import '@eternalheart/angular-file-preview/style.css';
import './styles.css';

@Component({
  selector: 'afp-example-root',
  standalone: true,
  imports: [FilePreviewModal, FilePreviewEmbed],
  template: `
    <div class="min-h-screen px-6 py-10 text-left">
      <header class="mx-auto mb-10 max-w-4xl">
        <p class="mb-2 text-xs uppercase tracking-[0.2em] text-indigo-300/80">Angular · v{{ version }}</p>
        <h1 class="text-3xl font-semibold text-white md:text-4xl">File Preview Modal</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-white/60">
          Angular 版全屏弹窗预览。支持 {{ types.length }} 种文件类型，API 与 React / Vue 对齐。
        </p>
        <div class="mt-5 flex flex-wrap gap-2">
          <button type="button" class="chip" [class.on]="theme() === 'dark'" (click)="theme.set('dark')">Dark</button>
          <button type="button" class="chip" [class.on]="theme() === 'light'" (click)="theme.set('light')">Light</button>
          <button type="button" class="chip" [class.on]="theme() === 'auto'" (click)="theme.set('auto')">Auto</button>
          <button type="button" class="chip" [class.on]="locale() === 'zh-CN'" (click)="locale.set('zh-CN')">中文</button>
          <button type="button" class="chip" [class.on]="locale() === 'en-US'" (click)="locale.set('en-US')">EN</button>
          <button type="button" class="chip" [class.on]="showEmbed()" (click)="showEmbed.set(!showEmbed())">Embed</button>
        </div>
      </header>

      <main class="mx-auto grid max-w-4xl gap-6">
        <label
          class="drop"
          [class.active]="dragging()"
          (dragenter)="onDrag($event, true)"
          (dragover)="onDrag($event, true)"
          (dragleave)="onDrag($event, false)"
          (drop)="onDrop($event)"
        >
          <input type="file" multiple class="hidden" (change)="onSelect($event)" />
          <span class="text-base font-medium text-white">拖入文件或点击选择</span>
          <span class="mt-1 block text-xs text-white/45">图片 / PDF / Office / 视频 / 音频 / 代码 / ZIP</span>
        </label>

        @if (files().length) {
          <ul class="grid gap-2">
            @for (file of files(); track file.id; let i = $index) {
              <li class="file-row">
                <button type="button" class="min-w-0 flex-1 text-left" (click)="open(i)">
                  <div class="truncate text-sm text-white">{{ file.name }}</div>
                  <div class="text-xs text-white/40">{{ file.type }}</div>
                </button>
                <button type="button" class="remove" (click)="remove(i)">移除</button>
              </li>
            }
          </ul>
        }
      </main>

      <afp-file-preview-modal
        [files]="files()"
        [currentIndex]="currentIndex()"
        [isOpen]="isOpen()"
        [theme]="theme()"
        [locale]="locale()"
        (close)="isOpen.set(false)"
        (navigate)="currentIndex.set($event)"
      />

      @if (showEmbed() && files().length) {
        <section class="mx-auto mt-8 h-[480px] max-w-4xl overflow-hidden rounded-2xl border border-white/10">
          <afp-file-preview-embed
            [files]="files()"
            [currentIndex]="embedIndex()"
            [theme]="theme()"
            [locale]="locale()"
            (navigate)="embedIndex.set($event)"
          />
        </section>
      }
    </div>
  `,
  styles: [`
    .chip {
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.7);
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      font-size: 12px;
      cursor: pointer;
    }
    .chip.on { background: rgba(99,102,241,0.35); color: #fff; border-color: rgba(129,140,248,0.6); }
    .drop {
      display: block;
      cursor: pointer;
      border: 1px dashed rgba(255,255,255,0.18);
      border-radius: 1.25rem;
      padding: 2.5rem 1.5rem;
      text-align: center;
      background: rgba(255,255,255,0.03);
    }
    .drop.active { border-color: rgb(129,140,248); background: rgba(99,102,241,0.12); }
    .hidden { display: none; }
    .file-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .remove {
      font-size: 12px;
      color: rgba(255,255,255,0.45);
      background: transparent;
      border: 0;
      cursor: pointer;
    }
  `],
})
export class AppComponent {
  readonly version = VERSION;
  readonly types = SUPPORTED_FILE_TYPES;

  readonly files = signal<PreviewFile[]>([]);
  readonly currentIndex = signal(0);
  readonly embedIndex = signal(0);
  readonly isOpen = signal(false);
  readonly showEmbed = signal(false);
  readonly dragging = signal(false);
  readonly theme = signal<Theme>('dark');
  readonly locale = signal<Locale>('zh-CN');

  onSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = '';
  }

  onDrag(e: DragEvent, inside: boolean) {
    e.preventDefault();
    this.dragging.set(inside);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    this.addFiles(e.dataTransfer?.files ?? null);
  }

  open(index: number) {
    this.currentIndex.set(index);
    this.isOpen.set(true);
  }

  remove(index: number) {
    this.files.update((list) => list.filter((_, i) => i !== index));
  }

  private addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: PreviewFile[] = Array.from(list).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type || 'application/octet-stream',
      size: file.size,
      file,
    }));
    this.files.update((cur) => [...cur, ...next]);
  }
}
