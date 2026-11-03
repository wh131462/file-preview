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
  <div class="vfp-renderer-error">
    <div class="vfp-renderer-error-content">
      <div
        v-if="showIcon"
        class="vfp-w-12 vfp-h-12 vfp-rounded-full vfp-bg-red-500/10 vfp-flex vfp-items-center vfp-justify-center"
      >
        <AlertCircle class="vfp-w-6 vfp-h-6 vfp-text-red-400" />
      </div>
      <div>
        <p class="vfp-renderer-error-text">
          {{ message }}
        </p>
        <p v-if="detail" class="vfp-renderer-error-detail">
          {{ detail }}
        </p>
      </div>
    </div>
  </div>
</template>
