<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { WrapText, Code, Eye } from 'lucide-vue-next';
import { getLanguageFromFileName, fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import { useShikiHighlight } from '../../composables/useShikiHighlight';
import RendererError from '../RendererError.vue';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const emitter = new ToolbarEventEmitter();

const { t } = useTranslator();
const fetcher = useFetcher();

// 内部状态
const wordWrap = ref(true);
const htmlPreview = ref(false);

const content = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);

const language = computed(() => getLanguageFromFileName(props.fileName));
const codeForShiki = computed(() => (language.value !== 'text' ? content.value : ''));
const { lineHtmls } = useShikiHighlight(codeForShiki, language);

const isHtml = computed(() => language.value === 'html');

// 监听状态变化，通知工具栏更新
watch([wordWrap, htmlPreview, loading, isHtml], () => {
  emitter.notify();
});

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

// 工具栏配置（对齐 React：WrapText 图标固定、Code/Eye 图标、翻译 key）
const getToolbarGroups = (): ToolbarGroup[] => {
  const groups: ToolbarGroup[] = [];

  groups.push({
    items: [
      {
        type: 'button',
        icon: WrapText,
        tooltip: wordWrap.value ? t.value('toolbar.wrap_off') : t.value('toolbar.wrap_on'),
        action: () => { wordWrap.value = !wordWrap.value; },
        active: wordWrap.value,
      },
    ],
  });

  if (isHtml.value) {
    groups.push({
      items: [
        {
          type: 'button',
          icon: htmlPreview.value ? Code : Eye,
          tooltip: htmlPreview.value ? t.value('toolbar.source') : t.value('toolbar.preview'),
          action: () => { htmlPreview.value = !htmlPreview.value; },
          active: htmlPreview.value,
        },
      ],
    });
  }

  return groups;
};

defineExpose<RendererHandle>({
  getToolbarGroups,
  onToolbarChange: (listener) => emitter.subscribe(listener),
});
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
