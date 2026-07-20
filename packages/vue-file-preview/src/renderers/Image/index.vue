<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { Loader2, ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan, RefreshCw, Maximize2 } from 'lucide-vue-next';
import {
  decodeInWorker,
  detectImageFormat,
  formatFileSize,
  getLoaderForMimeType,
  shouldUseWorker,
} from '@eternalheart/file-preview-core';
import type { PreviewFile } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import RendererError from '../RendererError.vue';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

const props = defineProps<{
  url: string;
  fileSize?: number;
  file?: PreviewFile | File;
}>();

const emitter = new ToolbarEventEmitter();

const { t } = useTranslator();

// 内部状态管理
const zoom = ref(1);
const rotation = ref(0);
const loaded = ref(false);
const error = ref<string | null>(null);
const decoding = ref(false);
const decodeProgress = ref(0);
const decodeError = ref<string | null>(null);
const imageSrc = ref<string>('');
const currentPage = ref(1);
const totalPages = ref(1);
const isRawThumbnail = ref(false);
const position = ref({ x: 0, y: 0 });
const isDragging = ref(false);
let dragStart = { x: 0, y: 0 };
const internalZoom = ref(1);
const naturalSize = ref({ width: 0, height: 0 });

// 通知工具栏变化
watch([zoom, rotation], () => {
  emitter.notify();
});

// 工具栏配置（对齐 React 的 4 个按钮组）
const getToolbarGroups = (): ToolbarGroup[] => [
  {
    items: [
      {
        type: 'button',
        icon: ZoomOut,
        tooltip: t.value('toolbar.zoom_out'),
        action: handleZoomOut,
        disabled: zoom.value <= 0.01,
      },
      {
        type: 'text',
        content: `${Math.round(zoom.value * 100)}%`,
        minWidth: '3rem',
      },
      {
        type: 'button',
        icon: ZoomIn,
        tooltip: t.value('toolbar.zoom_in'),
        action: handleZoomIn,
        disabled: zoom.value >= 10,
      },
    ],
  },
  {
    items: [
      {
        type: 'button',
        icon: Scan,
        tooltip: t.value('toolbar.fit_to_window'),
        action: handleFitToWidth,
      },
      {
        type: 'button',
        icon: Maximize2,
        tooltip: t.value('toolbar.original_size'),
        action: handleOriginalSize,
      },
    ],
  },
  {
    items: [
      {
        type: 'button',
        icon: RotateCcw,
        tooltip: t.value('toolbar.rotate_left'),
        action: handleRotateLeft,
      },
      {
        type: 'button',
        icon: RotateCw,
        tooltip: t.value('toolbar.rotate_right'),
        action: handleRotateRight,
      },
    ],
  },
  {
    items: [
      {
        type: 'button',
        icon: RefreshCw,
        tooltip: t.value('toolbar.reset'),
        action: handleReset,
      },
    ],
  },
];

// 暴露接口
defineExpose<RendererHandle>({
  getToolbarGroups,
  onToolbarChange: (listener) => emitter.subscribe(listener),
});

// 工具栏操作
const handleZoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.1, 10);
};

const handleZoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.1, 0.01);
};

const handleRotateRight = () => {
  rotation.value = (rotation.value + 90) % 360;
};

const handleRotateLeft = () => {
  rotation.value = (rotation.value - 90 + 360) % 360;
};

const handleOriginalSize = () => {
  zoom.value = 1;
  rotation.value = 0;
  position.value = { x: 0, y: 0 };
};

const handleReset = () => {
  handleFitToWidth();
};

const handleFitToWidth = () => {
  if (containerRef.value && naturalSize.value.width > 0 && naturalSize.value.height > 0) {
    const containerWidth = containerRef.value.clientWidth;
    const containerHeight = containerRef.value.clientHeight;
    const scaleX = containerWidth / naturalSize.value.width;
    const scaleY = containerHeight / naturalSize.value.height;
    zoom.value = Math.max(0.01, Math.min(10, Math.min(scaleX, scaleY)));
    position.value = { x: 0, y: 0 };
  }
};

const imgRef = ref<HTMLImageElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let blobUrl: string | null = null;
let fileBlobCache: Blob | null = null;
let loaderCache: any = null;
const pageCache = new Map<number, string>();

let isTouchDevice = false;
let touchStartDistance = 0;
let touchStartZoom = 1;
let touchStartPos = { x: 0, y: 0 };
let lastTapTime = 0;

// 解码逻辑
watch(
  () => [props.url, props.file] as const,
  async () => {
    // 重置状态：清空 src 以避免上一张图片的 onLoad/onError 误触发到新文件
    imageSrc.value = '';
    loaded.value = false;
    error.value = null;
    decoding.value = false;
    decodeError.value = null;
    decodeProgress.value = 0;
    position.value = { x: 0, y: 0 };
    internalZoom.value = 1;
    zoom.value = 1;
    currentPage.value = 1;
    totalPages.value = 1;
    isRawThumbnail.value = false;

    // 清理旧的 blob URL 与缓存
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }
    pageCache.forEach((url) => URL.revokeObjectURL(url));
    pageCache.clear();
    fileBlobCache = null;
    loaderCache = null;

    // 如果没有 file 对象，直接使用 url
    if (!props.file) {
      imageSrc.value = props.url;
      return;
    }

    try {
      // 检测图片格式
      const mimeType = await detectImageFormat(props.file);
      const loader = await getLoaderForMimeType(mimeType);

      // 如果不需要解码，直接使用原 URL
      if (!loader || !(await loader.needsDecode(mimeType))) {
        imageSrc.value = props.url;
        return;
      }

      // 需要解码
      decoding.value = true;

      // 获取文件 Blob
      let fileBlob: Blob;
      if (props.file instanceof Blob) {
        fileBlob = props.file;
      } else {
        const response = await fetch(props.url);
        if (!response.ok) throw new Error('Failed to fetch file');
        fileBlob = await response.blob();
      }

      // 缓存 Blob 与 loader
      fileBlobCache = fileBlob;
      loaderCache = loader;

      // 标记 RAW 缩略图模式
      const isRaw = mimeType.startsWith('image/x-');
      if (isRaw) {
        isRawThumbnail.value = true;
      }

      // 获取元数据（用于检测多页 TIFF）
      if (loader.getMetadata) {
        try {
          const metadata = await loader.getMetadata(fileBlob);
          if (metadata.pageCount && metadata.pageCount > 1) {
            totalPages.value = metadata.pageCount;
          }
        } catch {
          // 忽略元数据获取失败
        }
      }

      const decodeOptions = {
        page: 1,
        fullQuality: false,
        onProgress: (percent: number) => {
          decodeProgress.value = percent;
        },
      };

      // 耗时格式优先使用共享 Worker；Worker/CSP/第三方库不兼容时回退主线程。
      // onProgress 是函数，不能通过 Worker 的结构化克隆传递。
      let decodedBlob;
      if (shouldUseWorker(mimeType)) {
        try {
          decodedBlob = await decodeInWorker(
            mimeType,
            await fileBlob.arrayBuffer(),
            { page: 1, fullQuality: false },
          );
        } catch {
          decodedBlob = await loader.decode(fileBlob, decodeOptions);
        }
      } else {
        decodedBlob = await loader.decode(fileBlob, decodeOptions);
      }

      // 生成 blob URL
      const url = typeof decodedBlob === 'string'
        ? decodedBlob
        : URL.createObjectURL(decodedBlob);

      blobUrl = url;
      pageCache.set(1, url);
      imageSrc.value = url;
      decoding.value = false;
    } catch (err: any) {
      decodeError.value = err?.message || '解码失败';
      decoding.value = false;
    }
  },
  { immediate: true }
);

// 多页 TIFF 翻页
const handlePageChange = async (page: number) => {
  if (!fileBlobCache || !loaderCache) return;
  if (page < 1 || page > totalPages.value) return;

  // 命中缓存：直接切换
  const cached = pageCache.get(page);
  if (cached) {
    currentPage.value = page;
    imageSrc.value = cached;
    return;
  }

  // 解码新页面
  decoding.value = true;
  try {
    const decodedBlob = await loaderCache.decode(fileBlobCache, { page });
    const url = typeof decodedBlob === 'string'
      ? decodedBlob
      : URL.createObjectURL(decodedBlob);

    // LRU：缓存超过 10 页时删除最早的
    if (pageCache.size >= 10) {
      const firstKey = pageCache.keys().next().value;
      if (firstKey !== undefined) {
        const oldUrl = pageCache.get(firstKey);
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        pageCache.delete(firstKey);
      }
    }

    pageCache.set(page, url);
    currentPage.value = page;
    imageSrc.value = url;
    decoding.value = false;
  } catch (err: any) {
    decodeError.value = err?.message || '翻页解码失败';
    decoding.value = false;
  }
};

// Cleanup on unmount
onBeforeUnmount(() => {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
  }
  pageCache.forEach((url) => URL.revokeObjectURL(url));
  pageCache.clear();
  const container = containerRef.value;
  if (container) {
    container.removeEventListener('wheel', handleWheelNative);
  }
});

// 同步 zoom 和 internalZoom
watch(zoom, (z) => {
  internalZoom.value = z;
});

watch(internalZoom, (z) => {
  zoom.value = z;
});

const clampPosition = (pos: { x: number; y: number }, currentZoom: number) => {
  const container = containerRef.value;
  if (!container || naturalSize.value.width === 0) return pos;

  const containerW = container.clientWidth;
  const containerH = container.clientHeight;
  const imgW = naturalSize.value.width * currentZoom;
  const imgH = naturalSize.value.height * currentZoom;

  const margin = Math.min(80, containerW * 0.15, containerH * 0.15);
  const rangeX = (containerW + imgW) / 2 - margin;
  const rangeY = (containerH + imgH) / 2 - margin;

  return {
    x: rangeX > 0 ? Math.max(-rangeX, Math.min(rangeX, pos.x)) : 0,
    y: rangeY > 0 ? Math.max(-rangeY, Math.min(rangeY, pos.y)) : 0,
  };
};

const handleLoad = (e: Event) => {
  loaded.value = true;
  const img = e.currentTarget as HTMLImageElement;
  naturalSize.value = { width: img.naturalWidth, height: img.naturalHeight };

  // 自动适应窗口
  if (containerRef.value && naturalSize.value.width > 0 && naturalSize.value.height > 0) {
    const containerWidth = containerRef.value.clientWidth;
    const containerHeight = containerRef.value.clientHeight;
    const scaleX = containerWidth / naturalSize.value.width;
    const scaleY = containerHeight / naturalSize.value.height;
    const newZoom = Math.min(scaleX, scaleY);
    zoom.value = Math.max(0.01, Math.min(10, newZoom));
    position.value = { x: 0, y: 0 };
  }
};

const handleError = () => {
  error.value = t.value('image.load_failed');
  loaded.value = true;
};

const handleDoubleClick = () => {
  position.value = { x: 0, y: 0 };
  zoom.value = 1;
};

// 鼠标滚轮缩放
const handleWheelNative = (e: WheelEvent) => {
  e.preventDefault();
  e.stopPropagation();

  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left - rect.width / 2;
  const mouseY = e.clientY - rect.top - rect.height / 2;

  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  const prev = internalZoom.value;
  const newZoom = Math.max(0.01, Math.min(10, prev + delta));
  const scale = newZoom / prev;

  position.value = clampPosition(
    {
      x: mouseX - scale * (mouseX - position.value.x),
      y: mouseY - scale * (mouseY - position.value.y),
    },
    newZoom
  );

  internalZoom.value = newZoom;
};

onMounted(() => {
  const container = containerRef.value;
  if (container) {
    container.addEventListener('wheel', handleWheelNative, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);
  }
});

onBeforeUnmount(() => {
  const container = containerRef.value;
  if (container) {
    container.removeEventListener('wheel', handleWheelNative);
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
    container.removeEventListener('touchcancel', handleTouchEnd);
  }
});

const handleMouseDown = (e: MouseEvent) => {
  if (isTouchDevice) return;
  if (e.button !== 0) return;
  isDragging.value = true;
  dragStart = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y,
  };
};

const handleMouseMove = (e: MouseEvent) => {
  if (isTouchDevice) return;
  if (!isDragging.value) return;
  position.value = clampPosition(
    {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    },
    internalZoom.value
  );
};

const handleMouseUp = () => {
  if (isTouchDevice) return;
  isDragging.value = false;
};

// 触屏事件处理
const handleTouchStart = (e: TouchEvent) => {
  isTouchDevice = true;
  e.preventDefault();

  const touches = e.touches;
  if (touches.length === 1) {
    // 单指拖拽
    isDragging.value = true;
    dragStart = {
      x: touches[0].clientX - position.value.x,
      y: touches[0].clientY - position.value.y,
    };

    // 双击检测
    const now = Date.now();
    if (now - lastTapTime < 300) {
      // 双击复原：居中 + 缩放100%
      position.value = { x: 0, y: 0 };
      zoom.value = 1;
    }
    lastTapTime = now;
  } else if (touches.length === 2) {
    // 双指缩放初始化
    isDragging.value = false;
    const distance = Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY
    );
    touchStartDistance = distance;
    touchStartZoom = internalZoom.value;
    touchStartPos = { ...position.value };
  }
};

const handleTouchMove = (e: TouchEvent) => {
  e.preventDefault();

  const touches = e.touches;
  if (touches.length === 1 && isDragging.value) {
    // 单指拖拽
    position.value = clampPosition(
      {
        x: touches[0].clientX - dragStart.x,
        y: touches[0].clientY - dragStart.y,
      },
      internalZoom.value
    );
  } else if (touches.length === 2) {
    // 双指缩放
    const container = containerRef.value;
    if (!container) return;

    const distance = Math.hypot(
      touches[1].clientX - touches[0].clientX,
      touches[1].clientY - touches[0].clientY
    );

    // 最小距离变化阈值，防止抖动
    if (Math.abs(distance - touchStartDistance) < 5) return;

    const scale = distance / touchStartDistance;
    const newZoom = Math.max(0.01, Math.min(10, touchStartZoom * scale));

    // 双指中心点作为缩放原点
    const rect = container.getBoundingClientRect();
    const centerX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left - rect.width / 2;
    const centerY = (touches[0].clientY + touches[1].clientY) / 2 - rect.top - rect.height / 2;

    const zoomScale = newZoom / internalZoom.value;
    position.value = clampPosition(
      {
        x: centerX - zoomScale * (centerX - touchStartPos.x),
        y: centerY - zoomScale * (centerY - touchStartPos.y),
      },
      newZoom
    );

    internalZoom.value = newZoom;
  }
};

const handleTouchEnd = () => {
  isDragging.value = false;
  touchStartDistance = 0;
};

const transformStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${internalZoom.value}) rotate(${rotation.value}deg)`,
  transformOrigin: 'center',
  transition: isDragging.value ? 'none' : 'transform 0.3s ease-out',
  opacity: loaded.value && !error.value && !decodeError.value ? 1 : 0,
}));

const sizeText = computed(() => {
  if (props.fileSize == null) return '';
  return ` · ${formatFileSize(props.fileSize)}`;
});
</script>

<template>
  <div
    ref="containerRef"
    class="vfp-relative vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full vfp-overflow-hidden"
    :style="{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- 解码中 -->
    <div
      v-if="decoding"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-flex-col vfp-items-center vfp-justify-center vfp-bg-surface-1/80 vfp-z-10"
    >
      <Loader2 class="vfp-w-12 vfp-h-12 vfp-text-fg-primary vfp-animate-spin" />
      <p class="vfp-mt-4 vfp-text-fg-secondary">
        正在解码... <span v-if="decodeProgress > 0">{{ Math.round(decodeProgress) }}%</span>
      </p>
    </div>

    <!-- 解码错误 -->
    <RendererError v-if="decodeError" :message="t('image.decode_failed')" :detail="decodeError" />

    <div v-if="!loaded && !error && !decoding && !decodeError" class="vfp-flex vfp-items-center vfp-justify-center">
      <div
        class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
      />
    </div>

    <RendererError v-if="error" :message="error" />

    <img
      v-if="imageSrc"
      ref="imgRef"
      :src="imageSrc"
      alt="Preview"
      :class="['vfp-max-w-none vfp-select-none', (!loaded || error || decodeError) && 'vfp-hidden']"
      :style="transformStyle"
      :draggable="false"
      @load="handleLoad"
      @error="handleError"
      @dblclick="handleDoubleClick"
    />

    <div
      v-if="loaded && !error && naturalSize.width > 0"
      class="vfp-absolute vfp-bottom-2 vfp-right-3 vfp-text-[10px] vfp-text-fg-disabled hover:vfp-text-fg-secondary vfp-transition-colors vfp-pointer-events-auto vfp-select-none vfp-cursor-default"
    >
      {{ naturalSize.width }} × {{ naturalSize.height }}{{ sizeText }}
    </div>

    <!-- 多页 TIFF 翻页器 -->
    <div
      v-if="totalPages > 1"
      class="vfp-absolute vfp-bottom-2 vfp-left-1/2 -vfp-translate-x-1/2 vfp-flex vfp-items-center vfp-gap-2 vfp-px-3 vfp-py-1.5 vfp-bg-surface-toolbar vfp-border vfp-border-line vfp-rounded-lg vfp-text-sm vfp-text-fg-primary vfp-shadow-md"
    >
      <button
        type="button"
        :disabled="currentPage <= 1 || decoding"
        class="vfp-px-2 vfp-py-0.5 vfp-rounded hover:vfp-bg-surface-nav-hover disabled:vfp-opacity-40 disabled:vfp-cursor-not-allowed"
        @click="handlePageChange(currentPage - 1)"
      >
        上一页
      </button>
      <span class="vfp-text-fg-secondary vfp-tabular-nums">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <button
        type="button"
        :disabled="currentPage >= totalPages || decoding"
        class="vfp-px-2 vfp-py-0.5 vfp-rounded hover:vfp-bg-surface-nav-hover disabled:vfp-opacity-40 disabled:vfp-cursor-not-allowed"
        @click="handlePageChange(currentPage + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>
