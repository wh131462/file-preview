<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { getLanguageFromFileName, fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import { useShikiHighlight } from '../../composables/useShikiHighlight';
import RendererError from '../RendererError.vue';

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

const content = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);

const language = computed(() => getLanguageFromFileName(props.fileName));
const codeForShiki = computed(() => (language.value !== 'text' ? content.value : ''));
const { lineHtmls } = useShikiHighlight(codeForShiki, language);

const loadText = async () => {
  loading.value = true;
  error.value = null;
  try {
    const text = await fetchTextUtf8(props.url, { fetcher: fetcher.value });
    content.value = text;
  } catch (err) {
    console.error(err);
    error.value = t.value('text.load_failed');
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, loadText, { immediate: true });

const lines = computed(() => content.value.split('\n'));
</script>

<template>
  <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div
      class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
    />
  </div>

  <RendererError v-else-if="error" :message="error" />

  <!-- HTML 预览模式 -->
  <div v-else-if="htmlPreview && language === 'html'" class="vfp-w-full vfp-h-full vfp-bg-surface-toolbar">
    <iframe
      :srcdoc="content"
      sandbox="allow-same-origin"
      class="vfp-w-full vfp-h-full vfp-border-0"
      :title="fileName"
    />
  </div>

  <!-- 纯文本或高亮未就绪：fallback -->
  <div v-else-if="language === 'text' || lineHtmls.length === 0" class="vfp-w-full vfp-h-full vfp-overflow-auto" style="background: var(--fp-code-bg);">
    <pre
      class="vfp-py-6 vfp-px-4 vfp-text-fg-primary vfp-font-mono vfp-text-sm"
      :class="wordWrap ? 'vfp-whitespace-pre-wrap vfp-break-words' : 'vfp-whitespace-pre'"
    >{{ content }}</pre>
  </div>

  <!-- 双列布局：左 gutter（行号），右 code（shiki 高亮） -->
  <div
    v-else
    class="vfp-code-block with-line-numbers vfp-w-full vfp-h-full"
    :class="{ 'no-wrap': !wordWrap }"
    :style="{ gridTemplateRows: `repeat(${lines.length}, auto) minmax(1.5rem, 1fr)` }"
  >
    <template v-for="(_, i) in lines" :key="i">
      <span class="vfp-code-gutter">{{ i + 1 }}</span>
      <span class="vfp-code-line" v-html="lineHtmls[i] ?? ''" />
    </template>
    <!-- 占位行：撑满剩余高度，让 gutter border 延伸到底部 -->
    <span class="vfp-code-gutter-filler" />
    <span class="vfp-code-line-filler" />
  </div>
</template>
