<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { PreviewFileInput, Locale, Messages, Theme } from '@eternalheart/file-preview-core';
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
  /** 语言 */
  locale?: Locale;
  /** 自定义翻译字典 */
  messages?: Partial<Record<Locale, Partial<Messages>>>;
  /** 无头模式：隐藏工具栏和导航箭头 */
  headless?: boolean;
  /** 主题模式，默认 'dark' */
  theme?: Theme;
}

const props = withDefaults(defineProps<Props>(), {
  currentIndex: 0,
  customRenderers: () => [],
  width: '100%',
  height: '100%',
  locale: undefined,
  messages: undefined,
  headless: false,
  theme: 'dark',
});

const emit = defineEmits<{
  (e: 'navigate', index: number): void;
}>();

const systemDark = ref(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true,
);

let mediaQueryCleanup: (() => void) | null = null;

watch(
  () => props.theme,
  (theme) => {
    if (mediaQueryCleanup) {
      mediaQueryCleanup();
      mediaQueryCleanup = null;
    }
    if (theme === 'auto') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => { systemDark.value = e.matches; };
      mql.addEventListener('change', handler);
      mediaQueryCleanup = () => mql.removeEventListener('change', handler);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (mediaQueryCleanup) mediaQueryCleanup();
});

const resolvedTheme = computed(() =>
  props.theme === 'auto' ? (systemDark.value ? 'dark' : 'light') : props.theme,
);
const isLight = computed(() => resolvedTheme.value === 'light');

const wrapperStyle: CSSProperties = {
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
};
</script>

<template>
  <div class="vfp-root" :style="wrapperStyle" :data-theme="resolvedTheme">
    <div :class="['vfp-relative vfp-w-full vfp-h-full vfp-overflow-hidden', isLight ? 'vfp-bg-gray-100' : 'vfp-bg-black/80']">
      <FilePreviewContent
        mode="embed"
        :files="files"
        :current-index="currentIndex"
        :custom-renderers="customRenderers"
        :locale="locale"
        :messages="messages"
        :headless="headless"
        :theme="theme"
        @navigate="(i) => emit('navigate', i)"
      />
    </div>
  </div>
</template>
