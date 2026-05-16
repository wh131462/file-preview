<script setup lang="ts">
import { watch, ref, onBeforeUnmount, computed } from 'vue';
import type { PreviewFileInput, Locale, Messages, Theme, CustomRendererEventPayload } from '@eternalheart/file-preview-core';
import type { CustomRenderer } from './types';
import FilePreviewContent from './FilePreviewContent.vue';
import { useScrollLock } from './composables/useScrollLock';

interface Props {
  files: PreviewFileInput[];
  currentIndex: number;
  isOpen: boolean;
  customRenderers?: CustomRenderer[];
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
  customRenderers: () => [],
  locale: undefined,
  messages: undefined,
  headless: false,
  theme: 'dark',
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'navigate', index: number): void;
  (e: 'custom-event', payload: CustomRendererEventPayload): void;
}>();

const { lock, unlock } = useScrollLock(() => props.isOpen);

watch(
  () => props.isOpen,
  (open) => {
    if (open) lock();
    else unlock();
  }
);

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

const handleBackdropClick = () => emit('close');
const handleContentClick = (e: MouseEvent) => e.stopPropagation();
const handleWheel = (e: WheelEvent) => e.stopPropagation();
</script>

<template>
  <Teleport to="body">
    <Transition name="vfp-fade">
      <div v-if="isOpen" class="vfp-root" :data-theme="resolvedTheme">
        <div
          class="vfp-fixed vfp-inset-0 vfp-z-[9999] vfp-flex vfp-items-center vfp-justify-center vfp-backdrop-blur-md vfp-overflow-hidden vfp-bg-surface-overlay"
          @click="handleBackdropClick"
          @wheel="handleWheel"
        >
          <div class="vfp-relative vfp-w-full vfp-h-full" @click="handleContentClick">
            <FilePreviewContent
              mode="modal"
              :files="files"
              :current-index="currentIndex"
              :custom-renderers="customRenderers"
              :locale="locale"
              :messages="messages"
              :headless="headless"
              :theme="theme"
              @close="emit('close')"
              @navigate="(i) => emit('navigate', i)"
              @custom-event="(p) => emit('custom-event', p)"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
