<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { codeToHtml } from 'shiki';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import { useResolvedTheme } from '../../composables/useResolvedTheme';
import RendererError from '../RendererError.vue';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const { t } = useTranslator();
const fetcher = useFetcher();
const resolvedTheme = useResolvedTheme();

const content = ref<string>('');
const highlighted = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);

const indentXml = (xml: string): string => {
  const PADDING = '  ';
  const reg = /(>)(<)(\/*)/g;
  const formatted = xml.replace(reg, '$1\n$2$3');
  let pad = 0;
  return formatted
    .split('\n')
    .map((line) => {
      let indent = 0;
      if (/^<\/\w/.test(line)) {
        pad = Math.max(pad - 1, 0);
      } else if (/^<\w[^>]*[^/]>.*$/.test(line) && !/<.+<\/.+>$/.test(line)) {
        indent = 1;
      }
      const padded = PADDING.repeat(pad) + line;
      pad += indent;
      return padded;
    })
    .join('\n');
};

const prettyPrintXml = (xml: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return xml;
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(doc);
    return indentXml(serialized);
  } catch {
    return xml;
  }
};

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const raw = await fetchTextUtf8(props.url, { fetcher: fetcher.value });
    content.value = prettyPrintXml(raw);
    try {
      highlighted.value = await codeToHtml(content.value, {
        lang: 'xml',
        theme: resolvedTheme.value === 'light' ? 'github-light' : 'dark-plus',
      });
    } catch {
      highlighted.value = '';
    }
  } catch (err) {
    console.error(err);
    error.value = t.value('xml.load_failed');
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, load, { immediate: true });
watch(resolvedTheme, () => {
  if (content.value) load();
});
</script>

<template>
  <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div
      class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
    />
  </div>

  <RendererError v-else-if="error" :message="error" />

  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto" style="background: var(--fp-code-bg);">
    <pre
      v-if="!highlighted"
      class="vfp-py-6 vfp-px-4 vfp-text-fg-primary vfp-font-mono vfp-text-sm vfp-whitespace-pre-wrap vfp-break-words"
      >{{ content }}</pre
    >
    <div v-else class="shiki-wrapper" v-html="highlighted" />
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
  display: inline-block;
  width: 100%;
  padding-left: 4.5em;
  text-indent: -4.5em;
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
</style>
