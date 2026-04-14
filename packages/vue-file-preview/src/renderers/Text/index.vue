<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getLanguageFromFileName, fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { codeToHtml } from 'shiki';
import { useTranslator } from '../../composables/useTranslator';

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

const content = ref<string>('');
const highlighted = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);

const language = computed(() => getLanguageFromFileName(props.fileName));

const loadText = async () => {
  loading.value = true;
  error.value = null;
  try {
    const text = await fetchTextUtf8(props.url);
    content.value = text;

    if (language.value !== 'text') {
      try {
        highlighted.value = await codeToHtml(text, {
          lang: language.value,
          theme: 'dark-plus',
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

  <!-- HTML 预览模式 -->
  <div v-else-if="htmlPreview && language === 'html'" class="vfp-w-full vfp-h-full vfp-bg-white">
    <iframe
      :srcdoc="content"
      sandbox="allow-same-origin"
      class="vfp-w-full vfp-h-full vfp-border-0"
      :title="fileName"
    />
  </div>

  <!-- 源码模式 -->
  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto" style="background: #1e1e1e;">
    <pre
      v-if="!highlighted"
      class="vfp-p-6 vfp-text-white/90 vfp-font-mono vfp-text-sm"
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
  color: rgba(255, 255, 255, 0.3);
  user-select: none;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
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
