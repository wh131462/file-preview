import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import {
  FilePreviewModal,
  FilePreviewEmbed,
  VERSION,
  SUPPORTED_FILE_TYPES,
  type PreviewFile,
  type PreviewFileInput,
  type Theme,
  type Locale,
  type CustomRenderer,
  type CustomRendererContext,
  type CustomRendererEventPayload,
} from '@eternalheart/angular-file-preview';
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Video,
  Music,
  Upload,
  X,
  Package,
  BookOpen,
  Code,
  Settings,
  Sparkles,
  Link as LinkIcon,
  LucideAngularModule,
  type LucideIconData,
} from 'lucide-angular';
import iconSvg from './assets/icon.svg';

const isDev = import.meta.env.DEV;
const DOCS_URL = isDev
  ? 'http://localhost:4801/file-preview/docs/'
  : 'https://wh131462.github.io/file-preview/docs/';
const REACT_EXAMPLE_URL = isDev
  ? 'http://localhost:4800/'
  : 'https://wh131462.github.io/file-preview/';
const VUE_EXAMPLE_URL = isDev
  ? 'http://localhost:4802/'
  : 'https://wh131462.github.io/file-preview/vue/';

@Component({
  selector: 'app-demo-renderer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [style.padding]="'24px'" [style.color]="ctx()?.theme === 'light' ? '#111' : '#fff'">
      <h3 style="font-weight: 600; margin-bottom: 8px">Custom Renderer Demo</h3>
      <div style="font-size: 13px; opacity: 0.7">file: {{ file().name }}</div>
      <div style="font-size: 13px; opacity: 0.7">
        locale: {{ ctx()?.locale }} · theme: {{ ctx()?.theme }}
      </div>
      <button
        type="button"
        style="margin-top: 16px; padding: 6px 12px; border-radius: 6px; background: #2563eb; color: #fff"
        (click)="sayHello()"
      >
        emit('hello', { ok: true })
      </button>
    </div>
  `,
})
export class DemoRenderer {
  file = input.required<PreviewFile>();
  ctx = input<CustomRendererContext | undefined>(undefined);

  sayHello(): void {
    this.ctx()?.emit('hello', { ok: true });
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilePreviewModal, FilePreviewEmbed, LucideAngularModule, NgClass, NgStyle],
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin: 0 auto;
      text-align: center;
    }
  `],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <!-- 导航栏 -->
      <nav class="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div class="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div class="flex items-center justify-between gap-2 sm:gap-4">
            <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
              <img [src]="iconSvg" alt="logo" class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0" />
              <div class="flex flex-col items-start min-w-0 overflow-hidden">
                <h1 class="text-base sm:text-xl font-bold text-white truncate w-full text-left">Angular File Preview</h1>
                <p class="text-[10px] sm:text-xs text-gray-400 truncate w-full text-left">
                  {{ '@eternalheart/angular-file-preview@' + VERSION }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 ml-auto">
              <!-- 框架切换器 -->
              <div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
                <a
                  [href]="REACT_EXAMPLE_URL"
                  class="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="切换到 React 版本"
                >
                  React
                </a>
                <a
                  [href]="VUE_EXAMPLE_URL"
                  class="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="切换到 Vue 版本"
                >
                  Vue
                </a>
                <span
                  class="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium ag-gradient text-white shadow-md"
                >
                  Angular
                </span>
              </div>

              <a
                href="https://github.com/wh131462/file-preview"
                target="_blank"
                rel="noopener noreferrer"
                class="hidden sm:flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
              >
                <i-lucide [img]="codeIcon" class="w-4 h-4 sm:w-5 sm:h-5" />
                <span class="hidden sm:inline">GitHub</span>
              </a>
              <a
                href="https://www.npmjs.com/package/@eternalheart/angular-file-preview"
                target="_blank"
                rel="noopener noreferrer"
                class="hidden sm:flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
              >
                <i-lucide [img]="packageIcon" class="w-4 h-4 sm:w-5 sm:h-5" />
                <span class="hidden sm:inline">npm</span>
              </a>
              <a
                [href]="DOCS_URL"
                target="_blank"
                rel="noopener noreferrer"
                class="hidden sm:flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <i-lucide [img]="bookOpenIcon" class="w-4 h-4 sm:w-5 sm:h-5" />
                <span class="hidden sm:inline">API Docs</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div class="container mx-auto px-3 sm:px-4 py-8 sm:py-16">
        <div class="max-w-6xl mx-auto mb-8 sm:mb-12">
          <h2 class="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-4">文件预览演示</h2>
          <p class="text-gray-400 text-sm sm:text-lg">
            支持
            <a
              [href]="DOCS_URL + 'guide/supported-types'"
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent hover:from-pink-300 hover:to-red-300 inline-block hover:scale-105 transition-all duration-200"
            >
              {{ SUPPORTED_FILE_TYPES.length }}+ 种文件格式
            </a>
            的现代化预览组件
          </p>
        </div>

        <!-- 文件上传区域 -->
        <div class="max-w-6xl mx-auto mb-8 sm:mb-12">
          <div class="relative">
            <div
              class="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-8 border-2 border-dashed transition-colors duration-200"
              [ngClass]="isDragging() ? 'border-[#EA0560] bg-[#EA0560]/10' : 'border-white/20 hover:border-white/40'"
              (dragenter)="handleDragEnter($event)"
              (dragleave)="handleDragLeave($event)"
              (dragover)="handleDragOver($event)"
              (drop)="handleDrop($event)"
            >
              <input
                type="file"
                multiple
                class="hidden"
                id="file-upload"
                accept="*/*"
                (change)="handleFileUpload($event)"
              />
              <label for="file-upload" class="flex flex-col items-center justify-center cursor-pointer">
                <div
                  class="w-14 h-14 sm:w-20 sm:h-20 rounded-full ag-gradient-br flex items-center justify-center mb-3 sm:mb-4 transition-transform"
                  [class.scale-110]="isDragging()"
                >
                  <i-lucide [img]="uploadIcon" class="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                </div>
                <h3 class="text-white text-base sm:text-xl font-medium mb-1.5 sm:mb-2">
                  {{ isDragging() ? '松开以上传文件' : '上传本地文件预览' }}
                </h3>
                <p class="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 px-2">
                  {{ isDragging() ? '将文件拖放到此处' : '支持图片、PDF、Word、Excel、视频、音频等格式' }}
                </p>
                @if (!isDragging()) {
                  <div
                    class="px-5 py-2.5 sm:px-6 sm:py-3 ag-gradient rounded-lg text-white text-sm sm:text-base font-medium hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    选择文件或拖拽到此处
                  </div>
                } @else {
                  <div
                    class="px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg border border-[#EA0560]/40 bg-[#EA0560]/10 text-[#FFB0D0] text-sm sm:text-base font-medium"
                  >
                    释放鼠标即可上传
                  </div>
                }
              </label>
            </div>

            <!-- 添加 URL 按钮 -->
            <button
              type="button"
              class="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              [ngClass]="showUrlInput()
                ? 'bg-[#F10712] text-white shadow-lg'
                : 'bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white'"
              [title]="showUrlInput() ? '关闭 URL 输入' : '添加网络 URL'"
              (click)="showUrlInput.set(!showUrlInput())"
            >
              <i-lucide [img]="linkIcon" class="w-5 h-5" />
            </button>
          </div>

          <!-- URL 输入区域 -->
          @if (showUrlInput()) {
            <div class="mt-4 flex gap-2 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <input
                type="text"
                [value]="urlInput()"
                (input)="onUrlInput($event)"
                (keyup.enter)="addUrlFile()"
                placeholder="输入文件 URL（如：https://example.com/file.pdf）"
                class="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#EA0560]"
              />
              <button
                type="button"
                class="px-4 py-2 ag-gradient rounded-lg text-white font-medium hover:shadow-lg hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                (click)="addUrlFile()"
              >
                添加
              </button>
            </div>
          }
        </div>

        <!-- 已上传文件列表 -->
        @if (uploadedFiles().length > 0) {
          <div class="max-w-6xl mx-auto mb-8 sm:mb-12">
            <h2 class="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">已添加的文件</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              @for (file of uploadedFiles(); track file.id; let index = $index) {
                <div
                  class="group relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-[#EA0560]/50 transition-all duration-300 overflow-hidden"
                >
                  <!-- 删除按钮（右上角） -->
                  <button
                    type="button"
                    class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除"
                    (click)="handleRemoveFile(file.id)"
                  >
                    <i-lucide [img]="xIcon" class="w-4 h-4" />
                  </button>

                  <!-- 文件信息区域 -->
                  <div class="p-4">
                    <div class="flex items-center gap-3 mb-3">
                      <!-- 图标 -->
                      <div class="p-3 rounded-lg ag-gradient-br text-white flex-shrink-0">
                        <i-lucide [img]="getFileIcon(file.type)" class="w-6 h-6" />
                      </div>

                      <div class="flex-1 min-w-0 text-left">
                        <div class="flex items-center gap-2">
                          <h3 class="text-white font-medium text-sm truncate text-left flex-1 min-w-0" [title]="file.name">
                            {{ file.name }}
                          </h3>
                          <!-- 模式标签 -->
                          <span
                            class="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium"
                            [ngClass]="file.file && filePreviewModes().get(file.id)
                              ? 'bg-[#EA0560]/20 text-[#FF8AB8]'
                              : 'bg-blue-500/20 text-blue-300'"
                          >
                            {{ file.file && filePreviewModes().get(file.id) ? 'File' : 'URL' }}
                          </span>
                        </div>
                        <p class="text-gray-400 text-xs mt-0.5 text-left">
                          {{ getFileTypeDisplay(file) }}
                          @if (file.size) {
                            <span class="text-gray-500"> {{ formatFileSize(file.size) }}</span>
                          }
                        </p>
                      </div>
                    </div>

                    <!-- 操作按钮区域 -->
                    <div class="flex gap-2">
                      <button
                        type="button"
                        class="flex-1 px-3 py-2 bg-[#EA0560]/10 hover:bg-[#EA0560]/20 border border-[#EA0560]/30 rounded-lg text-[#FF8AB8] text-xs font-medium transition-all"
                        (click)="handleFileClick(index)"
                      >
                        预览
                      </button>
                      @if (file.file) {
                        <button
                          type="button"
                          class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white text-xs transition-all"
                          title="切换预览模式"
                          (click)="togglePreviewMode(file.id)"
                        >
                          切换
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- 嵌入式预览演示 -->
        @if (allFiles().length > 0 && showEmbed()) {
          <div class="max-w-6xl mx-auto mb-8 sm:mb-12">
            <h2 class="text-xl sm:text-2xl font-bold text-white mb-2">嵌入式预览 (FilePreviewEmbed)</h2>
            <p class="text-gray-400 text-sm mb-4 sm:mb-6">
              将预览组件直接嵌入到页面的 div 容器中,无需弹窗。下方容器高度固定为 520px。通过右下角悬浮球控制显示/隐藏。
            </p>

            <div
              class="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden"
              style="height: 520px"
            >
              <FilePreviewEmbed
                [files]="allFiles()"
                [currentIndex]="embedIndex()"
                [theme]="theme()"
                [headless]="headless()"
                [locale]="locale()"
                [showDownload]="showDownload()"
                [customRenderers]="demoCustomRenderers"
                (navigate)="embedIndex.set($event)"
                (customEvent)="handleCustomEvent($event)"
              />
            </div>
          </div>
        }
      </div>

      <!-- 页脚 -->
      <footer class="max-w-6xl mx-auto mt-8 sm:mt-12 mb-6 sm:mb-8 px-3 sm:px-4 text-center pb-[env(safe-area-inset-bottom)]">
        <div class="text-gray-400 text-xs sm:text-sm">
          <p class="mb-2">
            Made with ❤️ by
            <a
              href="https://github.com/wh131462"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#FF5A9C] hover:text-[#FF8AB8] transition-colors"
            >
              EternalHeart
            </a>
          </p>
          <p class="flex flex-wrap items-center justify-center gap-1">
            <a
              href="https://github.com/wh131462/file-preview/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-500 hover:text-gray-400 transition-colors"
            >
              MIT License
            </a>
            <span> </span>
            <a
              href="https://github.com/wh131462/file-preview"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-500 hover:text-gray-400 transition-colors"
            >
              GitHub
            </a>
            <span> </span>
            <a
              href="https://www.npmjs.com/package/@eternalheart/angular-file-preview"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-500 hover:text-gray-400 transition-colors"
            >
              npm
            </a>
            <span> </span>
            <a
              [href]="DOCS_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gray-500 hover:text-gray-400 transition-colors"
            >
              API Docs
            </a>
          </p>
        </div>
      </footer>

      <!-- 悬浮精灵球 + 控制面板 -->
      <div
        class="fixed z-50 select-none"
        [style.left.px]="ballPos().x"
        [style.top.px]="ballPos().y"
      >
        <button
          type="button"
          class="w-12 h-12 rounded-full ag-gradient-br shadow-lg shadow-[#8822FF]/30 flex items-center justify-center text-white cursor-grab active:cursor-grabbing transition-transform hover:scale-110"
          [ngClass]="panelOpen() ? 'ring-2 ring-white/30' : ''"
          (pointerdown)="handleBallPointerDown($event)"
          (pointermove)="handleBallPointerMove($event)"
          (pointerup)="handleBallPointerUp()"
        >
          <i-lucide
            [img]="settingsIcon"
            class="w-5 h-5 transition-transform duration-300"
            [class.rotate-90]="panelOpen()"
          />
        </button>

        @if (panelOpen()) {
          <div
            class="absolute w-64 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-4 space-y-3"
            [ngStyle]="getPanelStyle()"
          >
            <h3 class="text-white text-sm font-medium">预览设置</h3>
            <div class="flex items-center gap-3">
              <span class="text-gray-400 text-xs w-10 flex-shrink-0">主题</span>
              <div class="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
                @for (t of themes; track t) {
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                    [ngClass]="theme() === t
                      ? 'ag-gradient text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'"
                    (click)="theme.set(t)"
                  >
                    {{ t === 'auto' ? 'Auto' : t === 'dark' ? 'Dark' : 'Light' }}
                  </button>
                }
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-gray-400 text-xs w-10 flex-shrink-0">无头</span>
              <button
                type="button"
                class="relative w-10 h-5 rounded-full transition-colors"
                [ngClass]="headless() ? 'bg-[#F10712]' : 'bg-white/20'"
                (click)="headless.set(!headless())"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  [class.translate-x-5]="headless()"
                ></span>
              </button>
              <span class="text-gray-500 text-xs">{{ headless() ? '开启' : '关闭' }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-gray-400 text-xs w-10 flex-shrink-0">语言</span>
              <div class="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
                @for (item of localeOptions; track item[0]) {
                  <button
                    type="button"
                    class="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                    [ngClass]="locale() === item[0]
                      ? 'ag-gradient text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'"
                    (click)="locale.set(item[0])"
                  >
                    {{ item[1] }}
                  </button>
                }
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-gray-400 text-xs w-10 flex-shrink-0">下载</span>
              <button
                type="button"
                class="relative w-10 h-5 rounded-full transition-colors"
                [ngClass]="showDownload() ? 'bg-[#F10712]' : 'bg-white/20'"
                (click)="showDownload.set(!showDownload())"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  [class.translate-x-5]="showDownload()"
                ></span>
              </button>
              <span class="text-gray-500 text-xs">{{ showDownload() ? '显示' : '隐藏' }}</span>
            </div>
            @if (allFiles().length > 0) {
              <div class="border-t border-white/10 my-2"></div>
              <div class="flex items-center gap-3">
                <span class="text-gray-400 text-xs w-10 flex-shrink-0">嵌入</span>
                <button
                  type="button"
                  class="relative w-10 h-5 rounded-full transition-colors"
                  [ngClass]="showEmbed() ? 'bg-[#F10712]' : 'bg-white/20'"
                  (click)="showEmbed.set(!showEmbed())"
                >
                  <span
                    class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    [class.translate-x-5]="showEmbed()"
                  ></span>
                </button>
                <span class="text-gray-500 text-xs">{{ showEmbed() ? '显示' : '隐藏' }}</span>
              </div>
            }
          </div>
        }
      </div>

      <FilePreviewModal
        [files]="allFiles()"
        [currentIndex]="currentFileIndex()"
        [isOpen]="isPreviewOpen()"
        [theme]="theme()"
        [headless]="headless()"
        [locale]="locale()"
        [showDownload]="showDownload()"
        [customRenderers]="demoCustomRenderers"
        (close)="isPreviewOpen.set(false)"
        (navigate)="currentFileIndex.set($event)"
        (customEvent)="handleCustomEvent($event)"
      />
    </div>
  `,
})
export class AppComponent {
  readonly VERSION = VERSION;
  readonly SUPPORTED_FILE_TYPES = SUPPORTED_FILE_TYPES;
  readonly iconSvg = iconSvg;
  readonly DOCS_URL = DOCS_URL;
  readonly REACT_EXAMPLE_URL = REACT_EXAMPLE_URL;
  readonly VUE_EXAMPLE_URL = VUE_EXAMPLE_URL;

  readonly uploadIcon = Upload;
  readonly linkIcon = LinkIcon;
  readonly xIcon = X;
  readonly codeIcon = Code;
  readonly packageIcon = Package;
  readonly bookOpenIcon = BookOpen;
  readonly settingsIcon = Settings;

  readonly themes: Theme[] = ['auto', 'dark', 'light'];
  readonly localeOptions: [Locale, string][] = [
    ['zh-CN', '中文'],
    ['en-US', 'EN'],
  ];

  readonly isPreviewOpen = signal(false);
  readonly currentFileIndex = signal(0);
  readonly embedIndex = signal(0);
  readonly showEmbed = signal(false);
  readonly uploadedFiles = signal<PreviewFile[]>([]);
  readonly allFiles = signal<PreviewFileInput[]>([]);
  readonly isDragging = signal(false);
  readonly urlInput = signal('');
  readonly showUrlInput = signal(false);
  readonly filePreviewModes = signal(new Map<string, boolean>());
  readonly theme = signal<Theme>('dark');
  readonly headless = signal(false);
  readonly locale = signal<Locale>('zh-CN');
  readonly showDownload = signal(true);
  readonly panelOpen = signal(false);
  readonly ballPos = signal({ x: 20, y: 200 });

  readonly demoCustomRenderers: CustomRenderer[] = [
    {
      test: (file: PreviewFile) => file.name.toLowerCase().endsWith('.demo'),
      render: () => DemoRenderer,
      getToolbarGroups: (_file: PreviewFile, ctx: CustomRendererContext) => [
        {
          items: [
            {
              type: 'button',
              icon: Sparkles,
              tooltip: 'Say Hello',
              action: () => ctx.emit('hello', { ok: true }),
            },
          ],
        },
      ],
      events: ['hello'] as const,
    },
  ];

  private dragCounter = 0;
  private dragging = false;
  private dragStart = { x: 0, y: 0, bx: 0, by: 0 };
  private hasMoved = false;
  private readonly BALL_SIZE = 48;
  private readonly PANEL_W = 256;
  private readonly PANEL_H = 160;
  private readonly PANEL_GAP = 8;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.uploadedFiles().forEach((f: PreviewFile) => {
        if (f.file) URL.revokeObjectURL(f.url);
      });
    });
  }

  handleCustomEvent(e: CustomRendererEventPayload): void {
    // eslint-disable-next-line no-console
    console.log('[FilePreview custom-event]', e);
  }

  getPanelStyle(): Record<string, string> {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bx = this.ballPos().x;
    const by = this.ballPos().y;
    const spaceRight = vw - (bx + this.BALL_SIZE);
    const spaceLeft = bx;
    const spaceBottom = vh - (by + this.BALL_SIZE);

    const style: Record<string, string> = {};

    if (spaceRight >= this.PANEL_W + this.PANEL_GAP) {
      style.left = `${this.BALL_SIZE + this.PANEL_GAP}px`;
      style.top = `${Math.min(0, vh - by - this.PANEL_H)}px`;
    } else if (spaceLeft >= this.PANEL_W + this.PANEL_GAP) {
      style.right = `${this.BALL_SIZE + this.PANEL_GAP}px`;
      style.top = `${Math.min(0, vh - by - this.PANEL_H)}px`;
    } else if (spaceBottom >= this.PANEL_H + this.PANEL_GAP) {
      style.top = `${this.BALL_SIZE + this.PANEL_GAP}px`;
      style.left = `${Math.min(0, vw - bx - this.PANEL_W)}px`;
    } else {
      style.bottom = `${this.BALL_SIZE + this.PANEL_GAP}px`;
      style.left = `${Math.min(0, vw - bx - this.PANEL_W)}px`;
    }

    return style;
  }

  handleBallPointerDown(e: PointerEvent): void {
    this.dragging = true;
    this.hasMoved = false;
    this.dragStart = { x: e.clientX, y: e.clientY, bx: this.ballPos().x, by: this.ballPos().y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  handleBallPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.hasMoved = true;
    this.ballPos.set({
      x: Math.max(0, Math.min(window.innerWidth - this.BALL_SIZE, this.dragStart.bx + dx)),
      y: Math.max(0, Math.min(window.innerHeight - this.BALL_SIZE, this.dragStart.by + dy)),
    });
  }

  handleBallPointerUp(): void {
    this.dragging = false;
    if (!this.hasMoved) this.panelOpen.update((open) => !open);
  }

  getFileIcon(type: string): LucideIconData {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.includes('pdf')) return FileText;
    if (type.includes('spreadsheet')) return FileSpreadsheet;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    return FileText;
  }

  handleFileClick(index: number): void {
    this.allFiles.set(this.uploadedFiles().map((f: PreviewFile) => this.getPreviewFile(f)));
    this.currentFileIndex.set(index);
    this.isPreviewOpen.set(true);
  }

  onUrlInput(event: Event): void {
    this.urlInput.set((event.target as HTMLInputElement).value);
  }

  addUrlFile(): void {
    const url = this.urlInput().trim();
    if (!url) return;

    const newFile: PreviewFile = {
      id: `url-${Date.now()}`,
      name: url.split('/').pop() || 'file',
      url,
      type: 'application/octet-stream',
    };

    this.filePreviewModes.update((m) => {
      const next = new Map(m);
      next.set(newFile.id, false);
      return next;
    });

    this.uploadedFiles.update((prev) => [...prev, newFile]);
    this.allFiles.update((prev) => [...prev, newFile]);
    this.urlInput.set('');
    this.showUrlInput.set(false);
  }

  togglePreviewMode(fileId: string): void {
    const file = this.uploadedFiles().find((f: PreviewFile) => f.id === fileId);
    if (!file || !file.file) return;

    this.filePreviewModes.update((m) => {
      const next = new Map(m);
      const currentMode = next.get(fileId) ?? true;
      next.set(fileId, !currentMode);
      return next;
    });
  }

  handleFileUpload(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    this.processFiles(inputEl.files);
    inputEl.value = '';
  }

  handleDragEnter(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter += 1;
    if (e.dataTransfer?.types?.includes('Files')) {
      this.isDragging.set(true);
    }
  }

  handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter -= 1;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isDragging.set(false);
    }
  }

  handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter = 0;
    this.isDragging.set(false);
    const files = e.dataTransfer?.files || null;
    this.processFiles(files);
  }

  handleRemoveFile(fileId: string): void {
    const fileToRemove = this.uploadedFiles().find((f: PreviewFile) => f.id === fileId);
    if (fileToRemove && fileToRemove.file) {
      URL.revokeObjectURL(fileToRemove.url);
    }

    this.uploadedFiles.update((prev) => prev.filter((f: PreviewFile) => f.id !== fileId));
    this.allFiles.update((prev) =>
      prev.filter((f: PreviewFileInput) => {
        if (typeof f === 'string') return true;
        if (f instanceof File) return true;
        return (f as PreviewFile).id !== fileId;
      }),
    );
    this.filePreviewModes.update((m) => {
      const next = new Map(m);
      next.delete(fileId);
      return next;
    });
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getFileTypeDisplay(file: PreviewFile): string {
    const typePart = file.type.split('/')[1]?.toUpperCase();
    if (typePart && typePart !== 'OCTET-STREAM') {
      return typePart;
    }
    const ext = file.name.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  }

  private processFiles(files: FileList | null): void {
    if (!files || files.length === 0) return;

    const newFiles: PreviewFile[] = Array.from(files).map((file, index) => ({
      id: `uploaded-${Date.now()}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type || 'application/octet-stream',
      size: file.size,
      file: file,
    }));

    this.filePreviewModes.update((m) => {
      const next = new Map(m);
      newFiles.forEach((f: PreviewFile) => next.set(f.id, true));
      return next;
    });

    this.uploadedFiles.update((prev) => [...prev, ...newFiles]);
    this.allFiles.update((prev) => [...prev, ...newFiles]);
  }

  private getPreviewFile(file: PreviewFile): PreviewFileInput {
    const useFileObject = this.filePreviewModes().get(file.id) ?? true;
    if (useFileObject && file.file) {
      return file.file;
    }
    return file;
  }
}
