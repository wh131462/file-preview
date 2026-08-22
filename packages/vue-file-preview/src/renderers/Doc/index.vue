<script setup lang="ts">
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';
import { ref, watch } from 'vue';
import { renderLegacyDocHtml } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import RendererError from '../RendererError.vue';

const props = defineProps<{
  url: string;
}>();

const { t } = useTranslator();
const fetcher = useFetcher();

const html = ref('');
const loading = ref(true);
const error = ref<string | null>(null);

const loadDoc = async () => {
  loading.value = true;
  error.value = null;
  html.value = '';
  try {
    const response = await fetcher.value(props.url);
    if (!response.ok) throw new Error('load failed');
    const buffer = await response.arrayBuffer();
    html.value = await renderLegacyDocHtml(buffer);
  } catch (err) {
    console.error('Doc 解析错误:', err);
    error.value = t.value('doc.parse_failed');
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, (newUrl) => {
  if (newUrl) void loadDoc();
}, { immediate: true });

const getToolbarGroups = (): ToolbarGroup[] => [];

defineExpose<RendererHandle>({
  getToolbarGroups,
});
</script>

<template>
  <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div
      class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
    />
  </div>

  <RendererError v-else-if="error" :message="error" />

  <div v-else class="vfp-docx-container vfp-w-full vfp-h-full vfp-overflow-auto vfp-py-6 vfp-px-4">
    <div class="vfp-flex vfp-flex-col vfp-items-center">
      <div class="vfp-legacy-doc-paper">
        <div v-html="html" />
      </div>
    </div>
  </div>
</template>
