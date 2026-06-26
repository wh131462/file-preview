<script setup lang="ts">
import { FileQuestion, Download } from 'lucide-vue-next';
import { useTranslator } from '../../composables/useTranslator';

defineProps<{
  fileName: string;
  fileType: string;
}>();

const { t } = useTranslator();

const emit = defineEmits<{
  (e: 'download'): void;
}>();
</script>

<template>
  <div
    class="vfp-flex vfp-flex-col vfp-items-center vfp-justify-center vfp-w-full vfp-h-full vfp-p-6 vfp-gap-4"
  >
    <div
      class="vfp-w-20 vfp-h-20 vfp-rounded-full vfp-bg-surface-2 vfp-flex vfp-items-center vfp-justify-center"
    >
      <FileQuestion class="vfp-w-10 vfp-h-10 vfp-text-fg-secondary" />
    </div>

    <div class="vfp-text-fg-primary vfp-text-center">
      <p class="vfp-text-lg vfp-font-medium vfp-mb-2">{{ fileName }}</p>
      <p class="vfp-text-fg-secondary">{{ t('common.unsupported_preview', { type: fileType }) }}</p>
    </div>

    <button
      class="vfp-flex vfp-items-center vfp-gap-2 vfp-px-4 vfp-py-2 vfp-bg-surface-2 hover:vfp-bg-surface-3 vfp-backdrop-blur-sm vfp-rounded-lg vfp-text-fg-primary vfp-font-medium vfp-transition-all"
      @click="emit('download')"
    >
      <Download class="vfp-w-5 vfp-h-5" />
      {{ t('common.download') }}
    </button>
  </div>
</template>
