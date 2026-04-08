<script setup lang="ts">
import { FileQuestion, Download } from 'lucide-vue-next';

defineProps<{
  fileName: string;
  fileType: string;
}>();

const emit = defineEmits<{
  (e: 'download'): void;
}>();
</script>

<template>
  <div
    class="vfp-flex vfp-flex-col vfp-items-center vfp-justify-center vfp-w-full vfp-h-full vfp-p-8 vfp-gap-6"
  >
    <div
      class="vfp-w-32 vfp-h-32 vfp-rounded-full vfp-bg-white/10 vfp-flex vfp-items-center vfp-justify-center"
    >
      <FileQuestion class="vfp-w-16 vfp-h-16 vfp-text-white/70" />
    </div>

    <div class="vfp-text-white vfp-text-center">
      <p class="vfp-text-xl vfp-font-medium vfp-mb-2">{{ fileName }}</p>
      <p class="vfp-text-white/70">不支持预览此文件类型 ({{ fileType }})</p>
    </div>

    <button
      class="vfp-flex vfp-items-center vfp-gap-2 vfp-px-6 vfp-py-3 vfp-bg-white/10 hover:vfp-bg-white/20 vfp-backdrop-blur-sm vfp-rounded-lg vfp-text-white vfp-font-medium vfp-transition-all"
      @click="emit('download')"
    >
      <Download class="vfp-w-5 vfp-h-5" />
      下载文件查看
    </button>
  </div>
</template>
