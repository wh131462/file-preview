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
        class="vfp-w-12 vfp-h-12 vfp-mx-auto vfp-mb-3 vfp-rounded-full vfp-bg-red-500/10 vfp-flex vfp-items-center vfp-justify-center"
      >
        <AlertCircle class="vfp-w-6 vfp-h-6 vfp-text-red-400" />
      </div>
      <p class="vfp-text-base vfp-font-medium vfp-text-fg-primary vfp-mb-1">
        {{ message }}
      </p>
      <p v-if="detail" class="vfp-text-xs vfp-text-fg-tertiary">
        {{ detail }}
      </p>
    </div>
  </div>
</template>
