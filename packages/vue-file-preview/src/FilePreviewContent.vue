<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Scan,
  RefreshCw,
} from 'lucide-vue-next';
import {
  normalizeFiles,
  getFileType,
  type PreviewFileInput,
} from '@eternalheart/file-preview-core';
import type { CustomRenderer } from './types';
import ImageRenderer from './renderers/ImageRenderer.vue';
import PdfRenderer from './renderers/PdfRenderer.vue';
import DocxRenderer from './renderers/DocxRenderer.vue';
import XlsxRenderer from './renderers/XlsxRenderer.vue';
import PptxRenderer from './renderers/PptxRenderer.vue';
import MsgRenderer from './renderers/MsgRenderer.vue';
import VideoRenderer from './renderers/VideoRenderer.vue';
import AudioRenderer from './renderers/AudioRenderer.vue';
import MarkdownRenderer from './renderers/MarkdownRenderer.vue';
import TextRenderer from './renderers/TextRenderer.vue';
import UnsupportedRenderer from './renderers/UnsupportedRenderer.vue';

interface Props {
  files: PreviewFileInput[];
  currentIndex: number;
  customRenderers?: CustomRenderer[];
  /** 运行模式: modal(弹窗) 或 embed(嵌入) */
  mode?: 'modal' | 'embed';
}

const props = withDefaults(defineProps<Props>(), {
  customRenderers: () => [],
  mode: 'modal',
});

const emit = defineEmits<{
  (e: 'navigate', index: number): void;
  (e: 'close'): void;
}>();

const zoom = ref(1);
const rotation = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const contentNaturalWidth = ref(0);
const contentNaturalHeight = ref(0);
const imageResetKey = ref(0);

const contentRef = ref<HTMLDivElement | null>(null);
const rootRef = ref<HTMLDivElement | null>(null);

// 导航箭头自动隐藏
const navVisible = ref(true);
let navHideTimer: number | null = null;
const NAV_HIDE_DELAY = 2000;

const resetNavTimer = () => {
  navVisible.value = true;
  if (navHideTimer !== null) {
    clearTimeout(navHideTimer);
  }
  navHideTimer = window.setTimeout(() => {
    navVisible.value = false;
  }, NAV_HIDE_DELAY);
};

const handleMouseMove = () => resetNavTimer();

// 标准化文件输入
const normalizedFiles = computed(() => normalizeFiles(props.files));

const currentFile = computed(() => normalizedFiles.value[props.currentIndex]);

// 自定义渲染器匹配
const customRenderer = computed(() => {
  if (!currentFile.value) return null;
  return props.customRenderers.find((r) => r.test(currentFile.value!)) || null;
});

const customRendererComponent = computed(() => {
  if (!customRenderer.value || !currentFile.value) return null;
  return customRenderer.value.render(currentFile.value);
});

const fileType = computed(() => (currentFile.value ? getFileType(currentFile.value) : 'unsupported'));

// 重置状态当文件改变时
watch(
  () => props.currentIndex,
  () => {
    zoom.value = 1;
    rotation.value = 0;
    currentPage.value = 1;
    totalPages.value = 1;
    contentNaturalWidth.value = 0;
    contentNaturalHeight.value = 0;
    navVisible.value = true;
    if (navHideTimer !== null) {
      clearTimeout(navHideTimer);
    }
  }
);

// 图片加载后默认适应窗口
watch(
  [fileType, contentNaturalWidth, contentNaturalHeight],
  () => {
    if (
      fileType.value === 'image' &&
      contentNaturalWidth.value > 0 &&
      contentNaturalHeight.value > 0 &&
      contentRef.value
    ) {
      const containerWidth = contentRef.value.clientWidth;
      const containerHeight = contentRef.value.clientHeight;
      const scaleX = containerWidth / contentNaturalWidth.value;
      const scaleY = containerHeight / contentNaturalHeight.value;
      const newZoom = Math.min(scaleX, scaleY);
      zoom.value = Math.max(0.01, Math.min(10, newZoom));
    }
  }
);

// 导航箭头自动隐藏计时器
watch(
  () => normalizedFiles.value.length,
  (len) => {
    if (len > 1) resetNavTimer();
  },
  { immediate: true }
);

// 键盘导航
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.mode === 'modal') {
    emit('close');
  } else if (e.key === 'ArrowLeft' && props.currentIndex > 0) {
    emit('navigate', props.currentIndex - 1);
  } else if (e.key === 'ArrowRight' && props.currentIndex < normalizedFiles.value.length - 1) {
    emit('navigate', props.currentIndex + 1);
  }
};

onMounted(() => {
  if (props.mode === 'modal') {
    window.addEventListener('keydown', handleKeyDown);
  } else if (rootRef.value) {
    rootRef.value.addEventListener('keydown', handleKeyDown as EventListener);
  }
});

onBeforeUnmount(() => {
  if (navHideTimer !== null) clearTimeout(navHideTimer);
  if (props.mode === 'modal') {
    window.removeEventListener('keydown', handleKeyDown);
  } else if (rootRef.value) {
    rootRef.value.removeEventListener('keydown', handleKeyDown as EventListener);
  }
});

const handleZoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.1, 10);
};
const handleZoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.1, 0.01);
};
const handleRotate = () => {
  rotation.value = rotation.value + 90;
};
const handleRotateLeft = () => {
  rotation.value = rotation.value - 90;
};

const handleFitToWidth = () => {
  if (contentRef.value && contentNaturalWidth.value > 0 && contentNaturalHeight.value > 0) {
    const containerWidth = contentRef.value.clientWidth;
    const containerHeight = contentRef.value.clientHeight;
    const scaleX = containerWidth / contentNaturalWidth.value;
    const scaleY = containerHeight / contentNaturalHeight.value;
    const newZoom = Math.min(scaleX, scaleY);
    zoom.value = Math.max(0.01, Math.min(10, newZoom));
  } else {
    zoom.value = 1;
  }
  rotation.value = 0;
  imageResetKey.value++;
};

const handleOriginalSize = () => {
  zoom.value = 1;
  rotation.value = 0;
  imageResetKey.value++;
};

const handleZoomChange = (newZoom: number) => {
  zoom.value = newZoom;
};

const handleReset = () => {
  zoom.value = 1;
  rotation.value = 0;
  imageResetKey.value++;
};

const handleDownload = () => {
  if (!currentFile.value) return;
  const link = document.createElement('a');
  link.href = currentFile.value.url;
  link.download = currentFile.value.name;
  link.click();
};

const showZoomControls = computed(() => fileType.value === 'image' || fileType.value === 'pdf');
const showRotateControl = computed(() => fileType.value === 'image');
const showCloseButton = computed(() => props.mode === 'modal');
</script>

<template>
  <div
    ref="rootRef"
    :tabindex="mode === 'embed' ? 0 : -1"
    class="vfp-relative vfp-w-full vfp-h-full vfp-flex vfp-flex-col vfp-overflow-hidden vfp-outline-none"
  >
    <!-- 顶部工具栏 -->
    <div
      class="vfp-flex-shrink-0 vfp-z-10 vfp-bg-black/50 vfp-backdrop-blur-md vfp-border-b vfp-border-white/10"
      style="padding-top: env(safe-area-inset-top, 0px)"
    >
      <!-- 第一行: 文件名 + 桌面端工具按钮 -->
      <div class="vfp-flex vfp-items-center vfp-justify-between vfp-px-3 md:vfp-px-5 vfp-py-1.5 md:vfp-py-2.5">
        <!-- 左侧: 文件名 + 分页 -->
        <div class="vfp-flex vfp-items-center vfp-flex-1 vfp-min-w-0 vfp-mr-2 md:vfp-mr-3">
          <h2 class="vfp-text-white/90 vfp-font-medium vfp-text-xs md:vfp-text-sm vfp-truncate">
            {{ currentFile?.name }}
          </h2>
          <span class="vfp-text-white/40 vfp-text-xs vfp-ml-2 vfp-flex-shrink-0">
            {{ currentIndex + 1 }}/{{ normalizedFiles.length }}
          </span>
        </div>

        <!-- 移动端: 仅下载 + 关闭 -->
        <div class="vfp-flex vfp-items-center vfp-gap-1 md:vfp-hidden vfp-flex-shrink-0">
          <button class="toolbar-btn" title="下载" @click="handleDownload">
            <Download class="vfp-w-4 vfp-h-4" />
          </button>
          <button v-if="showCloseButton" class="toolbar-btn" title="关闭" @click="emit('close')">
            <X class="vfp-w-4 vfp-h-4" />
          </button>
        </div>

        <!-- 桌面端: 完整工具按钮 -->
        <div class="vfp-hidden md:vfp-flex vfp-items-center vfp-gap-1 vfp-flex-shrink-0">
          <template v-if="showZoomControls">
            <button class="toolbar-btn" :disabled="zoom <= 0.01" title="缩小" @click="handleZoomOut">
              <ZoomOut class="vfp-w-4 vfp-h-4" />
            </button>
            <span
              class="vfp-text-white/60 vfp-text-xs vfp-min-w-[3rem] vfp-text-center vfp-font-medium vfp-tabular-nums"
            >
              {{ Math.round(zoom * 100) }}%
            </span>
            <button class="toolbar-btn" :disabled="zoom >= 10" title="放大" @click="handleZoomIn">
              <ZoomIn class="vfp-w-4 vfp-h-4" />
            </button>
            <div class="vfp-w-px vfp-h-4 vfp-bg-white/10 vfp-mx-1" />

            <template v-if="fileType === 'image'">
              <button class="toolbar-btn" title="适应窗口" @click="handleFitToWidth">
                <Scan class="vfp-w-4 vfp-h-4" />
              </button>
              <button class="toolbar-btn" title="原始尺寸" @click="handleOriginalSize">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="vfp-w-4 vfp-h-4"
                >
                  <text
                    x="12"
                    y="17.5"
                    text-anchor="middle"
                    font-size="20"
                    font-weight="bold"
                    fill="currentColor"
                    stroke="none"
                  >
                    1:1
                  </text>
                </svg>
              </button>
              <div class="vfp-w-px vfp-h-4 vfp-bg-white/10 vfp-mx-1" />
            </template>
          </template>

          <template v-if="showRotateControl">
            <button class="toolbar-btn" title="向左旋转" @click="handleRotateLeft">
              <RotateCcw class="vfp-w-4 vfp-h-4" />
            </button>
            <button class="toolbar-btn" title="向右旋转" @click="handleRotate">
              <RotateCw class="vfp-w-4 vfp-h-4" />
            </button>
            <div class="vfp-w-px vfp-h-4 vfp-bg-white/10 vfp-mx-1" />
          </template>

          <template v-if="showZoomControls || showRotateControl">
            <button class="toolbar-btn" title="复原" @click="handleReset">
              <RefreshCw class="vfp-w-4 vfp-h-4" />
            </button>
            <div class="vfp-w-px vfp-h-4 vfp-bg-white/10 vfp-mx-1" />
          </template>

          <button class="toolbar-btn" title="下载" @click="handleDownload">
            <Download class="vfp-w-4 vfp-h-4" />
          </button>
          <button v-if="showCloseButton" class="toolbar-btn" title="关闭" @click="emit('close')">
            <X class="vfp-w-4 vfp-h-4" />
          </button>
        </div>
      </div>

      <!-- 移动端第二行工具按钮 -->
      <div
        v-if="showZoomControls || showRotateControl"
        class="vfp-flex vfp-items-center vfp-gap-1 vfp-px-3 vfp-pb-1.5 vfp-overflow-x-auto scrollbar-hide md:vfp-hidden"
      >
        <template v-if="showZoomControls">
          <button class="toolbar-btn" :disabled="zoom <= 0.01" title="缩小" @click="handleZoomOut">
            <ZoomOut class="vfp-w-4 vfp-h-4" />
          </button>
          <span
            class="vfp-text-white/60 vfp-text-xs vfp-min-w-[3rem] vfp-text-center vfp-font-medium vfp-tabular-nums"
          >
            {{ Math.round(zoom * 100) }}%
          </span>
          <button class="toolbar-btn" :disabled="zoom >= 10" title="放大" @click="handleZoomIn">
            <ZoomIn class="vfp-w-4 vfp-h-4" />
          </button>
          <div class="vfp-w-px vfp-h-4 vfp-bg-white/10 vfp-mx-0.5" />
          <template v-if="fileType === 'image'">
            <button class="toolbar-btn" title="适应窗口" @click="handleFitToWidth">
              <Scan class="vfp-w-4 vfp-h-4" />
            </button>
            <button class="toolbar-btn" title="原始尺寸" @click="handleOriginalSize">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="vfp-w-4 vfp-h-4"
              >
                <text
                  x="12"
                  y="17.5"
                  text-anchor="middle"
                  font-size="20"
                  font-weight="bold"
                  fill="currentColor"
                  stroke="none"
                >
                  1:1
                </text>
              </svg>
            </button>
            <div class="vfp-w-px vfp-h-4 vfp-bg-white/10 vfp-mx-0.5" />
          </template>
        </template>

        <template v-if="showRotateControl">
          <button class="toolbar-btn" title="向左旋转" @click="handleRotateLeft">
            <RotateCcw class="vfp-w-4 vfp-h-4" />
          </button>
          <button class="toolbar-btn" title="向右旋转" @click="handleRotate">
            <RotateCw class="vfp-w-4 vfp-h-4" />
          </button>
          <div class="vfp-w-px vfp-h-4 vfp-bg-white/10 vfp-mx-0.5" />
        </template>

        <button class="toolbar-btn" title="复原" @click="handleReset">
          <RefreshCw class="vfp-w-4 vfp-h-4" />
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div
      ref="contentRef"
      class="vfp-flex-1 vfp-flex vfp-items-center vfp-justify-center vfp-overflow-auto"
      @mousemove="handleMouseMove"
    >
      <template v-if="currentFile">
        <component :is="customRendererComponent" v-if="customRendererComponent" :file="currentFile" />
        <template v-else>
          <ImageRenderer
            v-if="fileType === 'image'"
            :url="currentFile.url"
            :zoom="zoom"
            :rotation="rotation"
            :reset-key="imageResetKey"
            :file-size="currentFile.size"
            @zoom-change="handleZoomChange"
            @natural-width-change="(w: number) => (contentNaturalWidth = w)"
            @natural-height-change="(h: number) => (contentNaturalHeight = h)"
          />
          <PdfRenderer
            v-else-if="fileType === 'pdf'"
            :url="currentFile.url"
            :zoom="zoom"
            :current-page="currentPage"
            @page-change="(p: number) => (currentPage = p)"
            @total-pages-change="(t: number) => (totalPages = t)"
            @page-width-change="(w: number) => (contentNaturalWidth = w)"
          />
          <DocxRenderer v-else-if="fileType === 'docx'" :url="currentFile.url" />
          <XlsxRenderer v-else-if="fileType === 'xlsx'" :url="currentFile.url" />
          <PptxRenderer v-else-if="fileType === 'pptx'" :url="currentFile.url" />
          <MsgRenderer v-else-if="fileType === 'msg'" :url="currentFile.url" />
          <VideoRenderer v-else-if="fileType === 'video'" :url="currentFile.url" />
          <AudioRenderer
            v-else-if="fileType === 'audio'"
            :url="currentFile.url"
            :file-name="currentFile.name"
          />
          <MarkdownRenderer v-else-if="fileType === 'markdown'" :url="currentFile.url" />
          <TextRenderer
            v-else-if="fileType === 'text'"
            :url="currentFile.url"
            :file-name="currentFile.name"
          />
          <UnsupportedRenderer
            v-else
            :file-name="currentFile.name"
            :file-type="currentFile.type"
            @download="handleDownload"
          />
        </template>
      </template>
    </div>

    <!-- 左右导航箭头 -->
    <template v-if="normalizedFiles.length > 1">
      <button
        v-if="currentIndex > 0"
        :style="{
          opacity: navVisible ? 1 : 0,
          transform: navVisible ? 'translateY(-50%)' : 'translateY(-50%) translateX(-20px)',
          pointerEvents: navVisible ? 'auto' : 'none',
          transition: 'opacity 0.2s, transform 0.2s',
        }"
        class="vfp-absolute vfp-z-20 vfp-left-2 md:vfp-left-4 vfp-top-1/2 vfp-w-10 vfp-h-10 md:vfp-w-12 md:vfp-h-12 vfp-rounded-full vfp-bg-black/40 vfp-backdrop-blur-xl vfp-border vfp-border-white/10 vfp-flex vfp-items-center vfp-justify-center vfp-text-white hover:vfp-bg-black/60 vfp-transition-colors vfp-shadow-2xl"
        @click="emit('navigate', currentIndex - 1)"
        @mouseenter="navVisible = true"
      >
        <ChevronLeft class="vfp-w-5 vfp-h-5 md:vfp-w-6 md:vfp-h-6" />
      </button>

      <button
        v-if="currentIndex < normalizedFiles.length - 1"
        :style="{
          opacity: navVisible ? 1 : 0,
          transform: navVisible ? 'translateY(-50%)' : 'translateY(-50%) translateX(20px)',
          pointerEvents: navVisible ? 'auto' : 'none',
          transition: 'opacity 0.2s, transform 0.2s',
        }"
        class="vfp-absolute vfp-z-20 vfp-right-2 md:vfp-right-4 vfp-top-1/2 vfp-w-10 vfp-h-10 md:vfp-w-12 md:vfp-h-12 vfp-rounded-full vfp-bg-black/40 vfp-backdrop-blur-xl vfp-border vfp-border-white/10 vfp-flex vfp-items-center vfp-justify-center vfp-text-white hover:vfp-bg-black/60 vfp-transition-colors vfp-shadow-2xl"
        @click="emit('navigate', currentIndex + 1)"
        @mouseenter="navVisible = true"
      >
        <ChevronRight class="vfp-w-5 vfp-h-5 md:vfp-w-6 md:vfp-h-6" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.toolbar-btn {
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.15s;
  user-select: none;
  color: white;
  background: transparent;
  border: 0;
  cursor: pointer;
}
@media (min-width: 768px) {
  .toolbar-btn {
    padding: 0.375rem;
  }
}
.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.toolbar-btn:active {
  background: rgba(255, 255, 255, 0.2);
}
.toolbar-btn:disabled {
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}
</style>
