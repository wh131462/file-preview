<script setup lang="ts">
import { useTranslator } from '../composables/useTranslator';
const { t } = useTranslator();
</script>

<template>
  <div class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full vfp-text-fg-muted">
    <div class="vfp-flex vfp-flex-col vfp-items-center vfp-gap-3">
      <div class="vfp-w-8 vfp-h-8 vfp-rounded-full vfp-border-2 vfp-border-fg-muted vfp-border-t-transparent vfp-animate-spin" />
      <span class="vfp-text-sm">{{ t('common.loading') || 'Loading...' }}</span>
    </div>
  </div>
</template>
