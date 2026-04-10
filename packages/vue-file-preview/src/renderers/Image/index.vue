<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { formatFileSize } from '@eternalheart/file-preview-core';

const props = defineProps<{
  url: string;
  zoom: number;
  rotation: number;
  resetKey?: number;
  fileSize?: number;
}>();

const emit = defineEmits<{
  (e: 'zoomChange', zoom: number): void;
  (e: 'naturalWidthChange', width: number): void;
  (e: 'naturalHeightChange', height: number): void;
}>();

const loaded = ref(false);
const error = ref<string | null>(null);
const position = ref({ x: 0, y: 0 });
const isDragging = ref(false);
let dragStart = { x: 0, y: 0 };
const internalZoom = ref(1);
const naturalSize = ref({ width: 0, height: 0 });

const imgRef = ref<HTMLImageElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

watch(
  () => props.url,
  () => {
    loaded.value = false;
    error.value = null;
    position.value = { x: 0, y: 0 };
    internalZoom.value = 1;
  }
);

watch(
  () => props.zoom,
  (z) => {
    internalZoom.value = z;
  }
);

watch(
  () => props.resetKey,
  () => {
    position.value = { x: 0, y: 0 };
  }
);

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
  emit('naturalWidthChange', img.naturalWidth);
  emit('naturalHeightChange', img.naturalHeight);
};

const handleError = () => {
  error.value = '图片加载失败';
  loaded.value = true;
};

const handleDoubleClick = () => {
  position.value = { x: 0, y: 0 };
  internalZoom.value = 1;
  emit('zoomChange', 1);
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
  emit('zoomChange', newZoom);
};

onMounted(() => {
  const container = containerRef.value;
  if (container) {
    container.addEventListener('wheel', handleWheelNative, { passive: false });
  }
});

onBeforeUnmount(() => {
  const container = containerRef.value;
  if (container) {
    container.removeEventListener('wheel', handleWheelNative);
  }
});

const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return;
  isDragging.value = true;
  dragStart = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y,
  };
};

const handleMouseMove = (e: MouseEvent) => {
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
  isDragging.value = false;
};

const transformStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${internalZoom.value}) rotate(${props.rotation}deg)`,
  transformOrigin: 'center',
  transition: isDragging.value ? 'none' : 'transform 0.3s ease-out',
  opacity: loaded.value ? 1 : 0,
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
    :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <div v-if="!loaded && !error" class="vfp-flex vfp-items-center vfp-justify-center">
      <div
        class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-white/20 vfp-border-t-white vfp-rounded-full vfp-animate-spin"
      />
    </div>

    <div v-if="error" class="vfp-text-white/70 vfp-text-center">
      <p class="vfp-text-lg">{{ error }}</p>
    </div>

    <img
      ref="imgRef"
      :src="url"
      alt="Preview"
      :class="['vfp-max-w-none vfp-select-none', !loaded && 'vfp-hidden']"
      :style="transformStyle"
      :draggable="false"
      @load="handleLoad"
      @error="handleError"
      @dblclick="handleDoubleClick"
    />

    <div
      v-if="loaded && !error && naturalSize.width > 0"
      class="vfp-absolute vfp-bottom-2 vfp-right-3 vfp-text-[10px] vfp-text-white/30 hover:vfp-text-white/80 vfp-transition-colors vfp-pointer-events-auto vfp-select-none vfp-cursor-default"
    >
      {{ naturalSize.width }} × {{ naturalSize.height }}{{ sizeText }}
    </div>
  </div>
</template>
