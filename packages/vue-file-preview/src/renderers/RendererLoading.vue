<script setup lang="ts">
import { useTranslator } from '../composables/useTranslator';
const { t } = useTranslator();
</script>

<template>
  <div class="vfp-renderer-loading">
    <div class="vfp-renderer-loading-content">
      <div class="vfp-renderer-spinner" />
      <span class="vfp-renderer-loading-text">{{ t('common.loading') || 'Loading...' }}</span>
    </div>
  </div>
</template>
