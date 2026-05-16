<script setup lang="ts">
import { useTranslator } from '../composables/useTranslator';
const { t } = useTranslator();
</script>

<template>
  <div class="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-text-fg-muted">
    <div class="rfp-flex rfp-flex-col rfp-items-center rfp-gap-3">
      <div class="rfp-w-8 rfp-h-8 rfp-rounded-full rfp-border-2 rfp-border-fg-muted rfp-border-t-transparent rfp-animate-spin" />
      <span class="rfp-text-sm">{{ t('common.loading') || 'Loading...' }}</span>
    </div>
  </div>
</template>
