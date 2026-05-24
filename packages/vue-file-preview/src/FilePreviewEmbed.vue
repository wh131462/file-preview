<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { PreviewFile, PreviewFileInput, Locale, Messages, Theme, CustomRendererEventPayload, RequestHandler, RequestInitFactory, ShouldFetchAsBlob } from '@eternalheart/file-preview-core';
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
  /** 自定义 RequestInit（或工厂函数）：注入 Authorization 等鉴权头 */
  requestInit?: RequestInitFactory;
  /** 自定义请求处理器：完全接管库内 fetch */
  requestHandler?: RequestHandler;
  /** 返回 true 时，对应文件先 fetcher→blob URL 后喂给 image/video/audio/pdf 等 renderer */
  shouldFetchAsBlob?: ShouldFetchAsBlob;
  /** 自定义下载回调；不传时库内默认通过 fetcher 拉 Blob 触发下载 */
  onDownload?: (file: PreviewFile) => void | Promise<void>;
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
  requestInit: undefined,
  requestHandler: undefined,
  shouldFetchAsBlob: undefined,
  onDownload: undefined,
});

const emit = defineEmits<{
  (e: 'navigate', index: number): void;
  (e: 'custom-event', payload: CustomRendererEventPayload): void;
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

const wrapperStyle: CSSProperties = {
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
};
</script>

<template>
  <div class="vfp-root" :style="wrapperStyle" :data-theme="resolvedTheme">
    <div class="vfp-relative vfp-w-full vfp-h-full vfp-overflow-hidden vfp-bg-surface-overlay">
      <FilePreviewContent
        mode="embed"
        :files="files"
        :current-index="currentIndex"
        :custom-renderers="customRenderers"
        :locale="locale"
        :messages="messages"
        :headless="headless"
        :theme="theme"
        :request-init="requestInit"
        :request-handler="requestHandler"
        :should-fetch-as-blob="shouldFetchAsBlob"
        :on-download="onDownload"
        @navigate="(i) => emit('navigate', i)"
        @custom-event="(p) => emit('custom-event', p)"
      />
    </div>
  </div>
</template>
