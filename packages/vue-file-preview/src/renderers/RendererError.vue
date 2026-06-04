<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';

interface Props {
  message: string;
  detail?: string;
  showIcon?: boolean;
}

withDefaults(defineProps<Props>(), {
  showIcon: true,
});
</script>

<template>
  <div class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-text-center">
      <div
        v-if="showIcon"
        class="vfp-w-16 vfp-h-16 vfp-mx-auto vfp-mb-4 vfp-rounded-full vfp-bg-red-500/10 vfp-flex vfp-items-center vfp-justify-center"
      >
        <AlertCircle class="vfp-w-8 vfp-h-8 vfp-text-red-400" />
      </div>
      <p class="vfp-text-lg md:vfp-text-xl vfp-font-medium vfp-text-fg-primary vfp-mb-2">
        {{ message }}
      </p>
      <p v-if="detail" class="vfp-text-sm vfp-text-fg-tertiary">
        {{ detail }}
      </p>
    </div>
  </div>
</template>
