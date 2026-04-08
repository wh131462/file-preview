<script setup lang="ts">
import type { CSSProperties } from 'vue';
import type { PreviewFileInput } from '@eternalheart/file-preview-core';
import type { CustomRenderer } from './types';
import FilePreviewContent from './FilePreviewContent.vue';

interface Props {
  files: PreviewFileInput[];
  currentIndex?: number;
  customRenderers?: CustomRenderer[];
  /** 宽度,默认 100% 填充父容器 */
  width?: number | string;
  /** 高度,默认 100% 填充父容器 */
  height?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  currentIndex: 0,
  customRenderers: () => [],
  width: '100%',
  height: '100%',
});

const emit = defineEmits<{
  (e: 'navigate', index: number): void;
}>();

const wrapperStyle: CSSProperties = {
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
};
</script>

<template>
  <div class="vfp-root" :style="wrapperStyle">
    <div class="vfp-relative vfp-w-full vfp-h-full vfp-overflow-hidden vfp-bg-black/80">
      <FilePreviewContent
        mode="embed"
        :files="files"
        :current-index="currentIndex"
        :custom-renderers="customRenderers"
        @navigate="(i) => emit('navigate', i)"
      />
    </div>
  </div>
</template>
