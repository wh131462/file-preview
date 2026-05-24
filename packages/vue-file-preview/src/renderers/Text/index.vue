<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getLanguageFromFileName, fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { codeToHtml } from 'shiki';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import { useResolvedTheme } from '../../composables/useResolvedTheme';

const props = withDefaults(defineProps<{
  url: string;
  fileName: string;
  wordWrap?: boolean;
  htmlPreview?: boolean;
}>(), {
  wordWrap: true,
  htmlPreview: false,
});

const { t } = useTranslator();
const fetcher = useFetcher();
const resolvedTheme = useResolvedTheme();

const content = ref<string>('');
const highlighted = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);

const language = computed(() => getLanguageFromFileName(props.fileName));

const loadText = async () => {
  loading.value = true;
  error.value = null;
  try {
    const text = await fetchTextUtf8(props.url, { fetcher: fetcher.value });
    content.value = text;

    if (language.value !== 'text') {
      try {
        highlighted.value = await codeToHtml(text, {
          lang: language.value,
          theme: resolvedTheme.value === 'light' ? 'github-light' : 'dark-plus',
        });
      } catch {
        highlighted.value = '';
      }
    } else {
      highlighted.value = '';
    }
  } catch (err) {
    console.error(err);
    error.value = t.value('text.load_failed');
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, loadText, { immediate: true });
watch(resolvedTheme, () => {
  // 主题切换时重新高亮
  if (content.value && language.value !== 'text') {
    loadText();
  }
});
</script>

<template>
  <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div
      class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
    />
  </div>

  <div v-else-if="error" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-text-fg-secondary vfp-text-center">
      <p class="vfp-text-lg">{{ error }}</p>
    </div>
  </div>

  <!-- HTML 预览模式 -->
  <div v-else-if="htmlPreview && language === 'html'" class="vfp-w-full vfp-h-full vfp-bg-surface-toolbar">
    <iframe
      :srcdoc="content"
      sandbox="allow-same-origin"
      class="vfp-w-full vfp-h-full vfp-border-0"
      :title="fileName"
    />
  </div>

  <!-- 源码模式 -->
  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto" style="background: var(--fp-code-bg);">
    <pre
      v-if="!highlighted"
      class="vfp-p-6 vfp-text-fg-primary vfp-font-mono vfp-text-sm"
      :class="wordWrap ? 'vfp-whitespace-pre-wrap vfp-break-words' : 'vfp-whitespace-pre'"
    >{{ content }}</pre>
    <div v-else class="shiki-wrapper" :class="{ 'no-wrap': !wordWrap }" v-html="highlighted" />
  </div>
</template>

<style scoped>
.shiki-wrapper :deep(pre) {
  margin: 0;
  padding: 1.5rem 1.5rem 1.5rem 0;
  background: transparent !important;
  font-size: 0.875rem;
  overflow-x: auto;
}
.shiki-wrapper :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  counter-reset: line;
}
.shiki-wrapper :deep(code .line) {
  counter-increment: line;
}
.shiki-wrapper :deep(code .line::before) {
  content: counter(line);
  display: inline-block;
  width: 3em;
  padding-right: 1em;
  margin-right: 0.5em;
  text-align: right;
  color: var(--fp-fg-disabled);
  user-select: none;
  border-right: 1px solid var(--fp-line);
}
.shiki-wrapper.no-wrap :deep(code) {
  white-space: pre;
  word-break: normal;
  overflow-wrap: normal;
}
.shiki-wrapper:not(.no-wrap) :deep(code) {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
}
</style>
