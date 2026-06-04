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
  <div class="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
    <div class="rfp-text-center">
      <div
        v-if="showIcon"
        class="rfp-w-16 rfp-h-16 rfp-mx-auto rfp-mb-4 rfp-rounded-full rfp-bg-red-500/10 rfp-flex rfp-items-center rfp-justify-center"
      >
        <AlertCircle class="rfp-w-8 rfp-h-8 rfp-text-red-400" />
      </div>
      <p class="rfp-text-lg md:rfp-text-xl rfp-font-medium rfp-text-fg-primary rfp-mb-2">
        {{ message }}
      </p>
      <p v-if="detail" class="rfp-text-sm rfp-text-fg-tertiary">
        {{ detail }}
      </p>
    </div>
  </div>
</template>
