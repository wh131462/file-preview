<script setup lang="ts">
import { ref, onUnmounted, h, defineComponent } from 'vue';
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
} from '@eternalheart/vue-file-preview';
import '@eternalheart/vue-file-preview/style.css';
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
} from 'lucide-vue-next';
import iconSvg from './assets/icon.svg';

// 环境检测
const isDev = import.meta.env.DEV;
const DOCS_URL = isDev
  ? 'http://localhost:4801/file-preview/docs/'
  : 'https://wh131462.github.io/file-preview/docs/';
const REACT_EXAMPLE_URL = isDev
  ? 'http://localhost:4800/'
  : 'https://wh131462.github.io/file-preview/';

const isPreviewOpen = ref(false);
const currentFileIndex = ref(0);
const embedIndex = ref(0);

// 演示用自定义渲染器：命中文件名以 .demo 结尾的文件
const DemoRenderer = defineComponent({
  name: 'DemoRenderer',
  props: {
    file: { type: Object as () => PreviewFile, required: true },
    ctx: { type: Object as () => CustomRendererContext | undefined, default: undefined },
  },
  setup(props) {
    return () =>
      h(
        'div',
        { style: { padding: '24px', color: props.ctx?.theme === 'light' ? '#111' : '#fff' } },
        [
          h('h3', { style: { fontWeight: 600, marginBottom: '8px' } }, 'Custom Renderer Demo'),
          h('div', { style: { fontSize: '13px', opacity: 0.7 } }, `file: ${props.file.name}`),
          h('div', { style: { fontSize: '13px', opacity: 0.7 } }, `locale: ${props.ctx?.locale} · theme: ${props.ctx?.theme}`),
          h(
            'button',
            {
              style: { marginTop: '16px', padding: '6px 12px', borderRadius: '6px', background: '#2563eb', color: '#fff' },
              onClick: () => props.ctx?.emit('hello', { ok: true }),
            },
            "emit('hello', { ok: true })",
          ),
        ],
      );
  },
});

const demoCustomRenderers: CustomRenderer[] = [
  {
    test: (file) => file.name.toLowerCase().endsWith('.demo'),
    render: () => DemoRenderer,
    getToolbarGroups: (_file, ctx) => [
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

const handleCustomEvent = (e: CustomRendererEventPayload) => {
  // eslint-disable-next-line no-console
  console.log('[FilePreview custom-event]', e);
};
const uploadedFiles = ref<PreviewFile[]>([]);
const allFiles = ref<PreviewFileInput[]>([]);
const isDragging = ref(false);
let dragCounter = 0;
const fileInputRef = ref<HTMLInputElement | null>(null);
const theme = ref<Theme>('dark');
const headless = ref(false);
const locale = ref<Locale>('zh-CN');
const panelOpen = ref(false);
const ballPos = ref({ x: 20, y: 200 });
let dragging = false;
let dragStart = { x: 0, y: 0, bx: 0, by: 0 };
let hasMoved = false;
const BALL_SIZE = 48;
const PANEL_W = 256;
const PANEL_H = 160;
const PANEL_GAP = 8;

const getPanelStyle = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const bx = ballPos.value.x;
  const by = ballPos.value.y;
  const spaceRight = vw - (bx + BALL_SIZE);
  const spaceLeft = bx;
  const spaceBottom = vh - (by + BALL_SIZE);

  const style: Record<string, string> = {};

  if (spaceRight >= PANEL_W + PANEL_GAP) {
    style.left = `${BALL_SIZE + PANEL_GAP}px`;
    style.top = `${Math.min(0, vh - by - PANEL_H)}px`;
  } else if (spaceLeft >= PANEL_W + PANEL_GAP) {
    style.right = `${BALL_SIZE + PANEL_GAP}px`;
    style.top = `${Math.min(0, vh - by - PANEL_H)}px`;
  } else if (spaceBottom >= PANEL_H + PANEL_GAP) {
    style.top = `${BALL_SIZE + PANEL_GAP}px`;
    style.left = `${Math.min(0, vw - bx - PANEL_W)}px`;
  } else {
    style.bottom = `${BALL_SIZE + PANEL_GAP}px`;
    style.left = `${Math.min(0, vw - bx - PANEL_W)}px`;
  }

  return style;
};

const handleBallPointerDown = (e: PointerEvent) => {
  dragging = true;
  hasMoved = false;
  dragStart = { x: e.clientX, y: e.clientY, bx: ballPos.value.x, by: ballPos.value.y };
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
};

const handleBallPointerMove = (e: PointerEvent) => {
  if (!dragging) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
  ballPos.value = {
    x: Math.max(0, Math.min(window.innerWidth - BALL_SIZE, dragStart.bx + dx)),
    y: Math.max(0, Math.min(window.innerHeight - BALL_SIZE, dragStart.by + dy)),
  };
};

const handleBallPointerUp = () => {
  dragging = false;
  if (!hasMoved) panelOpen.value = !panelOpen.value;
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageIcon;
  if (type.includes('pdf')) return FileText;
  if (type.includes('spreadsheet')) return FileSpreadsheet;
  if (type.startsWith('video/')) return Video;
  if (type.startsWith('audio/')) return Music;
  return FileText;
};

const handleFileClick = (index: number) => {
  currentFileIndex.value = index;
  isPreviewOpen.value = true;
};

const processFiles = (files: FileList | null) => {
  if (!files || files.length === 0) return;

  const newFiles: PreviewFile[] = Array.from(files).map((file, index) => ({
    id: `uploaded-${Date.now()}-${index}`,
    name: file.name,
    url: URL.createObjectURL(file),
    type: file.type || 'application/octet-stream',
    size: file.size,
  }));

  uploadedFiles.value = [...uploadedFiles.value, ...newFiles];
  allFiles.value = [...allFiles.value, ...newFiles];
};

const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  processFiles(input.files);
  if (fileInputRef.value) fileInputRef.value.value = '';
};

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter += 1;
  if (e.dataTransfer?.types?.includes('Files')) {
    isDragging.value = true;
  }
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter -= 1;
  if (dragCounter <= 0) {
    dragCounter = 0;
    isDragging.value = false;
  }
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounter = 0;
  isDragging.value = false;
  const files = e.dataTransfer?.files || null;
  processFiles(files);
};

const handleRemoveFile = (fileId: string) => {
  const fileToRemove = uploadedFiles.value.find((f) => f.id === fileId);
  if (fileToRemove) URL.revokeObjectURL(fileToRemove.url);

  uploadedFiles.value = uploadedFiles.value.filter((f) => f.id !== fileId);
  allFiles.value = allFiles.value.filter((f) => {
    if (typeof f === 'string') return true;
    if (f instanceof File) return true;
    return (f as PreviewFile).id !== fileId;
  });
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

onUnmounted(() => {
  // 释放所有 blob URL
  uploadedFiles.value.forEach((f) => URL.revokeObjectURL(f.url));
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <!-- 导航栏 -->
    <nav class="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
      <div class="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
        <div class="flex items-center justify-between gap-2 sm:gap-4">
          <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            <img :src="iconSvg" alt="logo" class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0" />
            <div class="flex flex-col items-start min-w-0 overflow-hidden">
              <h1 class="text-base sm:text-xl font-bold text-white truncate w-full">Vue File Preview</h1>
              <p class="text-[10px] sm:text-xs text-gray-400 truncate w-full">
                @eternalheart/vue-file-preview@{{ VERSION }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 ml-auto">
            <!-- 框架切换器 -->
            <div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
              <a
                :href="REACT_EXAMPLE_URL"
                class="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                title="切换到 React 版本"
              >
                React
              </a>
              <span
                class="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
              >
                Vue
              </span>
            </div>

            <a
              href="https://github.com/wh131462/file-preview"
              target="_blank"
              rel="noopener noreferrer"
              class="hidden sm:flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
            >
              <Code class="w-4 h-4 sm:w-5 sm:h-5" />
              <span class="hidden sm:inline">GitHub</span>
            </a>
            <a
              href="https://www.npmjs.com/package/@eternalheart/vue-file-preview"
              target="_blank"
              rel="noopener noreferrer"
              class="hidden sm:flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
            >
              <Package class="w-4 h-4 sm:w-5 sm:h-5" />
              <span class="hidden sm:inline">npm</span>
            </a>
            <a
              :href="DOCS_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="hidden sm:flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all hover:scale-105 hover:shadow-lg active:scale-95"
            >
              <BookOpen class="w-4 h-4 sm:w-5 sm:h-5" />
              <span class="hidden sm:inline">API Docs</span>
            </a>
          </div>
        </div>
      </div>
    </nav>

    <div class="container mx-auto px-3 sm:px-4 py-8 sm:py-16">
      <div class="text-center mb-8 sm:mb-12">
        <h2 class="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-4">文件预览演示</h2>
        <p class="text-gray-400 text-sm sm:text-lg px-4">
          支持
          <a
            :href="`${DOCS_URL}guide/supported-types`"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent hover:from-emerald-300 hover:to-teal-300 inline-block hover:scale-105 transition-all duration-200"
          >
            {{ SUPPORTED_FILE_TYPES.length }}+ 种文件格式
          </a>
          的现代化预览组件 · Vue 3 版本
        </p>
      </div>

      <!-- 文件上传区域 -->
      <div class="max-w-6xl mx-auto mb-8 sm:mb-12">
        <div
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
          :class="[
            'bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-8 border-2 border-dashed transition-colors duration-200',
            isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/20 hover:border-white/40',
          ]"
        >
          <input
            ref="fileInputRef"
            type="file"
            multiple
            class="hidden"
            id="file-upload"
            accept="*/*"
            @change="handleFileUpload"
          />
          <label for="file-upload" class="flex flex-col items-center justify-center cursor-pointer">
            <div
              :class="[
                'w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 sm:mb-4 transition-transform',
                isDragging && 'scale-110',
              ]"
            >
              <Upload class="w-7 h-7 sm:w-10 sm:h-10 text-white" />
            </div>
            <h3 class="text-white text-base sm:text-xl font-medium mb-1.5 sm:mb-2">
              {{ isDragging ? '松开以上传文件' : '上传本地文件预览' }}
            </h3>
            <p class="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 px-2">
              {{ isDragging ? '将文件拖放到此处' : '支持图片、PDF、Word、Excel、视频、音频等格式' }}
            </p>
            <div
              v-if="!isDragging"
              class="px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg text-white text-sm sm:text-base font-medium hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              选择文件或拖拽到此处
            </div>
            <div
              v-else
              class="px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 text-sm sm:text-base font-medium"
            >
              释放鼠标即可上传
            </div>
          </label>
        </div>
      </div>

      <!-- 已上传文件列表 -->
      <div v-if="uploadedFiles.length > 0" class="max-w-6xl mx-auto mb-8 sm:mb-12">
        <h2 class="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">已上传的文件</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <div
            v-for="(file, index) in uploadedFiles"
            :key="file.id"
            class="group relative bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-white/30 active:bg-white/10 transition-all duration-300"
          >
            <button class="w-full text-left" @click="handleFileClick(index)">
              <div class="flex items-start gap-3 sm:gap-4">
                <div
                  class="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white group-hover:scale-110 transition-transform flex-shrink-0"
                >
                  <component :is="getFileIcon(file.type)" class="w-8 h-8" />
                </div>
                <div class="flex-1 min-w-0 pr-6 sm:pr-0">
                  <h3 class="text-white font-medium text-base sm:text-lg mb-1 sm:mb-2 truncate">
                    {{ file.name }}
                  </h3>
                  <p class="text-gray-400 text-xs sm:text-sm truncate">
                    {{ file.type.split('/')[1]?.toUpperCase() || 'FILE' }}
                  </p>
                  <p v-if="file.size" class="text-gray-500 text-xs mt-1">
                    {{ formatFileSize(file.size) }}
                  </p>
                </div>
              </div>
              <div class="mt-3 sm:mt-4 text-emerald-400 text-xs sm:text-sm font-medium group-hover:text-emerald-300">
                点击预览 →
              </div>
            </button>

            <button
              class="absolute top-3 right-3 sm:top-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
              title="删除文件"
              @click.stop="handleRemoveFile(file.id)"
            >
              <X class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- 嵌入式预览演示 -->
      <div v-if="allFiles.length > 0" class="max-w-6xl mx-auto mb-8 sm:mb-12">
        <h2 class="text-xl sm:text-2xl font-bold text-white mb-2">嵌入式预览 (FilePreviewEmbed)</h2>
        <p class="text-gray-400 text-sm mb-4 sm:mb-6">
          将预览组件直接嵌入到页面的 div 容器中,无需弹窗。下方容器高度固定为 520px。
        </p>

        <div
          class="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden"
          :style="{ height: '520px' }"
        >
          <FilePreviewEmbed
            :files="allFiles"
            :current-index="embedIndex"
            :theme="theme"
            :headless="headless"
            :locale="locale"
            :custom-renderers="demoCustomRenderers"
            @navigate="(i: number) => (embedIndex = i)"
            @custom-event="handleCustomEvent"
          />
        </div>
      </div>
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
            class="text-emerald-400 hover:text-emerald-300 transition-colors"
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
          <span> · </span>
          <a
            href="https://github.com/wh131462/file-preview"
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-500 hover:text-gray-400 transition-colors"
          >
            GitHub
          </a>
          <span> · </span>
          <a
            href="https://www.npmjs.com/package/@eternalheart/vue-file-preview"
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-500 hover:text-gray-400 transition-colors"
          >
            npm
          </a>
          <span> · </span>
          <a
            :href="DOCS_URL"
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
      :style="{ left: ballPos.x + 'px', top: ballPos.y + 'px' }"
    >
      <button
        :class="['w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white cursor-grab active:cursor-grabbing transition-transform hover:scale-110', panelOpen ? 'ring-2 ring-white/30' : '']"
        @pointerdown="handleBallPointerDown"
        @pointermove="handleBallPointerMove"
        @pointerup="handleBallPointerUp"
      >
        <Settings :class="['w-5 h-5 transition-transform duration-300', panelOpen ? 'rotate-90' : '']" />
      </button>

      <div
        v-if="panelOpen"
        class="absolute w-64 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-4 space-y-3"
        :style="getPanelStyle()"
      >
        <h3 class="text-white text-sm font-medium">预览设置</h3>
        <div class="flex items-center gap-3">
          <span class="text-gray-400 text-xs w-10 flex-shrink-0">主题</span>
          <div class="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              v-for="t in (['auto', 'dark', 'light'] as Theme[])"
              :key="t"
              :class="['px-2.5 py-1 rounded-md text-xs font-medium transition-all', theme === t ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5']"
              @click="theme = t"
            >
              {{ t === 'auto' ? 'Auto' : t === 'dark' ? 'Dark' : 'Light' }}
            </button>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-gray-400 text-xs w-10 flex-shrink-0">无头</span>
          <button
            :class="['relative w-10 h-5 rounded-full transition-colors', headless ? 'bg-emerald-500' : 'bg-white/20']"
            @click="headless = !headless"
          >
            <span :class="['absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', headless ? 'translate-x-5' : '']" />
          </button>
          <span class="text-gray-500 text-xs">{{ headless ? '开启' : '关闭' }}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-gray-400 text-xs w-10 flex-shrink-0">语言</span>
          <div class="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              v-for="[l, label] in ([['zh-CN', '中文'], ['en-US', 'EN']] as [Locale, string][])"
              :key="l"
              :class="['px-2.5 py-1 rounded-md text-xs font-medium transition-all', locale === l ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5']"
              @click="locale = l"
            >
              {{ label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <FilePreviewModal
      :files="allFiles"
      :current-index="currentFileIndex"
      :is-open="isPreviewOpen"
      :theme="theme"
      :headless="headless"
      :locale="locale"
      :custom-renderers="demoCustomRenderers"
      @close="isPreviewOpen = false"
      @navigate="(i: number) => (currentFileIndex = i)"
      @custom-event="handleCustomEvent"
    />
  </div>
</template>
