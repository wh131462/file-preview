<script setup lang="ts">
import { FileMinus } from 'lucide-vue-next';
import { useTranslator } from '../composables/useTranslator';

const { t } = useTranslator();
</script>

<template>
  <div class="vfp-renderer-empty">
    <div class="vfp-renderer-empty-content">
      <div class="vfp-w-12 vfp-h-12 vfp-rounded-full vfp-bg-surface-2 vfp-flex vfp-items-center vfp-justify-center">
        <FileMinus class="vfp-w-6 vfp-h-6 vfp-text-fg-tertiary" />
      </div>
      <p class="vfp-renderer-empty-text">{{ t('file.empty') }}</p>
    </div>
  </div>
</template>
