<script setup lang="ts">
import { ref, watch } from 'vue';
import { Code } from 'lucide-vue-next';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { codeToHtml } from 'shiki';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

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
    const raw = await fetchTextUtf8(props.url);
    content.value = prettyPrintXml(raw);
    try {
      highlighted.value = await codeToHtml(content.value, {
        lang: 'xml',
        theme: 'dark-plus',
      });
    } catch {
      highlighted.value = '';
    }
  } catch (err) {
    console.error(err);
    error.value = 'XML 文件加载失败';
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, load, { immediate: true });
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
        <Code class="vfp-w-4 vfp-h-4 md:vfp-w-5 md:vfp-h-5 vfp-text-white/70 vfp-flex-shrink-0" />
        <span class="vfp-text-white vfp-font-medium vfp-text-sm md:vfp-text-base vfp-truncate">{{ fileName }}</span>
        <span class="vfp-ml-auto vfp-text-xs vfp-text-white/50 vfp-uppercase vfp-flex-shrink-0">XML</span>
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
