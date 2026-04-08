<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import {
  FilePreviewModal,
  FilePreviewEmbed,
  VERSION,
  type PreviewFile,
  type PreviewFileInput,
  type CustomRenderer,
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
} from 'lucide-vue-next';
import iconSvg from './assets/icon.svg';
import JsonViewer from './components/JsonViewer.vue';

// 环境检测
const isDev = import.meta.env.DEV;
const DOCS_URL = isDev
  ? 'http://localhost:4801/react-file-preview/docs/'
  : 'https://wh131462.github.io/react-file-preview/docs/';
const REACT_EXAMPLE_URL = isDev
  ? 'http://localhost:4800/'
  : 'https://wh131462.github.io/react-file-preview/';

const isPreviewOpen = ref(false);
const currentFileIndex = ref(0);
const embedIndex = ref(0);
const uploadedFiles = ref<PreviewFile[]>([]);
const allFiles = ref<PreviewFileInput[]>([]);
const isDragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

// 自定义渲染器：用 markRaw 避免 Vue 把组件做响应式包装
const customRenderers = computed<CustomRenderer[]>(() => [
  {
    test: (file: PreviewFile) => file.name.endsWith('.json'),
    render: (_file: PreviewFile) => JsonViewer,
  },
]);

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
  isDragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.currentTarget === e.target) {
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
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 sm:gap-3 min-w-0">
            <img :src="iconSvg" alt="logo" class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0" />
            <div class="flex flex-col items-start min-w-0">
              <h1 class="text-base sm:text-xl font-bold text-white truncate">Vue File Preview</h1>
              <p class="text-[10px] sm:text-xs text-gray-400 truncate max-w-[160px] sm:max-w-none">
                @eternalheart/vue-file-preview@{{ VERSION }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
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
              href="https://github.com/wh131462/react-file-preview"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
            >
              <Code class="w-4 h-4 sm:w-5 sm:h-5" />
              <span class="hidden sm:inline">GitHub</span>
            </a>
            <a
              href="https://www.npmjs.com/package/@eternalheart/vue-file-preview"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
            >
              <Package class="w-4 h-4 sm:w-5 sm:h-5" />
              <span class="hidden sm:inline">npm</span>
            </a>
            <a
              :href="DOCS_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all hover:scale-105 hover:shadow-lg active:scale-95"
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
        <p class="text-gray-400 text-sm sm:text-lg px-4">支持 20+ 种文件格式的现代化预览组件 · Vue 3 版本</p>
      </div>

      <!-- 文件上传区域 -->
      <div class="max-w-6xl mx-auto mb-8 sm:mb-12">
        <div
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="handleDrop"
          :class="[
            'bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-8 border-2 border-dashed transition-all',
            isDragging ? 'border-emerald-500 bg-emerald-500/10 scale-105' : 'border-white/20 hover:border-white/40',
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
            @navigate="(i: number) => (embedIndex = i)"
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
            href="https://github.com/wh131462/react-file-preview/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            class="text-gray-500 hover:text-gray-400 transition-colors"
          >
            MIT License
          </a>
          <span> · </span>
          <a
            href="https://github.com/wh131462/react-file-preview"
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
        </p>
      </div>
    </footer>

    <FilePreviewModal
      :files="allFiles"
      :current-index="currentFileIndex"
      :is-open="isPreviewOpen"
      :custom-renderers="customRenderers"
      @close="isPreviewOpen = false"
      @navigate="(i: number) => (currentFileIndex = i)"
    />
  </div>
</template>
