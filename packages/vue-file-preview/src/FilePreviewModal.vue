<script setup lang="ts">
import { watch } from 'vue';
import type { PreviewFileInput } from '@eternalheart/file-preview-core';
import type { CustomRenderer } from './types';
import FilePreviewContent from './FilePreviewContent.vue';
import { useScrollLock } from './composables/useScrollLock';

interface Props {
  files: PreviewFileInput[];
  currentIndex: number;
  isOpen: boolean;
  customRenderers?: CustomRenderer[];
}

const props = withDefaults(defineProps<Props>(), {
  customRenderers: () => [],
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'navigate', index: number): void;
}>();

const { lock, unlock } = useScrollLock(() => props.isOpen);

watch(
  () => props.isOpen,
  (open) => {
    if (open) lock();
    else unlock();
  }
);

const handleBackdropClick = () => emit('close');
const handleContentClick = (e: MouseEvent) => e.stopPropagation();
const handleWheel = (e: WheelEvent) => e.stopPropagation();
</script>

<template>
  <Teleport to="body">
    <Transition name="vfp-fade">
      <div v-if="isOpen" class="vfp-root">
        <div
          class="vfp-fixed vfp-inset-0 vfp-z-[9999] vfp-flex vfp-items-center vfp-justify-center vfp-bg-black/80 vfp-backdrop-blur-md vfp-overflow-hidden"
          @click="handleBackdropClick"
          @wheel="handleWheel"
        >
          <div class="vfp-relative vfp-w-full vfp-h-full" @click="handleContentClick">
            <FilePreviewContent
              mode="modal"
              :files="files"
              :current-index="currentIndex"
              :custom-renderers="customRenderers"
              @close="emit('close')"
              @navigate="(i) => emit('navigate', i)"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
