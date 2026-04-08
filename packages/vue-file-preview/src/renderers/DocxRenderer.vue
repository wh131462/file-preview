<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import mammoth from 'mammoth';

const PAGE_HEIGHT = 1123;
const PAGE_PADDING_Y = 60;
const PAGE_PADDING_X = 50;
const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_Y * 2;
const PAGE_GAP = 24;

const props = defineProps<{
  url: string;
}>();

const html = ref('');
const loading = ref(true);
const error = ref<string | null>(null);
const pages = ref<string[]>([]);
const measureRef = ref<HTMLDivElement | null>(null);

const loadDocx = async () => {
  loading.value = true;
  error.value = null;
  html.value = '';
  pages.value = [];

  try {
    const response = await fetch(props.url);
    if (!response.ok) throw new Error('文件加载失败');
    const arrayBuffer = await response.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    html.value = result.value;
  } catch (err) {
    console.error('Docx 解析错误:', err);
    error.value = 'Word 文档解析失败';
  } finally {
    loading.value = false;
  }
};

const paginate = () => {
  const container = measureRef.value;
  if (!container || !html.value) return;

  const children = Array.from(container.children) as HTMLElement[];
  if (children.length === 0) {
    pages.value = [html.value];
    return;
  }

  const result: string[][] = [[]];
  let currentPageUsed = 0;

  for (const child of children) {
    const h = child.offsetHeight;

    if (currentPageUsed > 0 && currentPageUsed + h > PAGE_CONTENT_HEIGHT) {
      result.push([]);
      currentPageUsed = 0;
    }

    result[result.length - 1].push(child.outerHTML);
    currentPageUsed += h;
  }

  if (result.length === 0) result.push([]);

  pages.value = result.map((blocks) => blocks.join(''));
};

watch(() => props.url, loadDocx, { immediate: true });

watch(html, async () => {
  if (!html.value) return;
  await nextTick();
  requestAnimationFrame(() => paginate());
});

const contentStyle = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  lineHeight: '1.8',
  color: '#333',
};

const measureStyle = {
  ...contentStyle,
  position: 'absolute' as const,
  visibility: 'hidden' as const,
  width: `${794 - PAGE_PADDING_X * 2}px`,
  pointerEvents: 'none' as const,
};

const pageStyle = {
  width: '100%',
  maxWidth: '794px',
  minHeight: `${PAGE_HEIGHT}px`,
  background: 'white',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
  flexShrink: 0,
  padding: `${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px`,
};
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

  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto" style="background: rgba(0, 0, 0, 0.15)">
    <!-- 隐藏测量区 -->
    <div ref="measureRef" :style="measureStyle" v-html="html" />

    <!-- 实际页面 -->
    <div
      class="vfp-py-6 md:vfp-py-10 vfp-flex vfp-flex-col vfp-items-center"
      :style="{ gap: `${PAGE_GAP}px` }"
    >
      <div v-for="(pageHtml, i) in pages.length > 0 ? pages : ['']" :key="i" :style="pageStyle">
        <div :style="contentStyle" v-html="pageHtml" />
      </div>
    </div>
  </div>
</template>
