<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { FileText } from 'lucide-vue-next';
import { getLanguageFromFileName } from '@eternalheart/file-preview-core';
import { codeToHtml } from 'shiki';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const content = ref<string>('');
const highlighted = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);

const language = computed(() => getLanguageFromFileName(props.fileName));

const loadText = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(props.url);
    if (!response.ok) throw new Error('加载失败');
    const text = await response.text();
    content.value = text;

    if (language.value !== 'text') {
      try {
        highlighted.value = await codeToHtml(text, {
          lang: language.value,
          theme: 'dark-plus',
        });
      } catch {
        // 不支持的语言或解析失败,降级为纯文本
        highlighted.value = '';
      }
    } else {
      highlighted.value = '';
    }
  } catch (err) {
    console.error(err);
    error.value = '文本文件加载失败';
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, loadText, { immediate: true });
</script>

<template>
  <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div
      class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-white/20 vfp-border-t-white vfp-rounded-full vfp-animate-spin"
    />
  </div>

  <div v-else-if="error" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-text-white/70 vfp-text-center">
      <p class="vfp-text-lg">{{ error }}</p>
    </div>
  </div>

  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto vfp-p-4 md:vfp-p-8">
    <div
      class="vfp-max-w-full md:vfp-max-w-6xl vfp-mx-auto vfp-bg-white/5 vfp-backdrop-blur-sm vfp-rounded-2xl vfp-border vfp-border-white/10 vfp-overflow-hidden"
    >
      <div
        class="vfp-flex vfp-items-center vfp-gap-2 md:vfp-gap-3 vfp-px-4 vfp-py-3 md:vfp-px-6 md:vfp-py-4 vfp-bg-white/5 vfp-border-b vfp-border-white/10"
      >
        <FileText class="vfp-w-4 vfp-h-4 md:vfp-w-5 md:vfp-h-5 vfp-text-white/70 vfp-flex-shrink-0" />
        <span class="vfp-text-white vfp-font-medium vfp-text-sm md:vfp-text-base vfp-truncate">{{ fileName }}</span>
        <span class="vfp-ml-auto vfp-text-xs vfp-text-white/50 vfp-uppercase vfp-flex-shrink-0">{{ language }}</span>
      </div>

      <div class="vfp-text-sm">
        <pre
          v-if="!highlighted"
          class="vfp-p-6 vfp-text-white/90 vfp-font-mono vfp-whitespace-pre-wrap vfp-break-words"
          >{{ content }}</pre
        >
        <div v-else class="shiki-wrapper" v-html="highlighted" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.shiki-wrapper :deep(pre) {
  margin: 0;
  padding: 1.5rem;
  background: transparent !important;
  font-size: 0.875rem;
  overflow-x: auto;
}
.shiki-wrapper :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
