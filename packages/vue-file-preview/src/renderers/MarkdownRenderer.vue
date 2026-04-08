<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import MarkdownIt from 'markdown-it';
import { codeToHtml } from 'shiki';

const props = defineProps<{
  url: string;
}>();

const content = ref('');
const html = ref('');
const loading = ref(true);
const error = ref<string | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// 创建 markdown-it 实例（支持 GFM 表格、删除线、任务列表）
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: false,
});

// 自定义代码块渲染：包裹 code-block-wrapper + header
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : '';
  const lang = info || 'text';
  const code = token.content;
  // 将代码 base64 编码后存到 data 属性,稍后异步用 shiki 高亮
  const encoded = btoa(unescape(encodeURIComponent(code)));
  return `<div class="code-block-wrapper">
    <div class="code-block-header">
      <span>${lang}</span>
      <button class="code-copy-btn" type="button" data-code="${encoded}" title="复制">复制</button>
    </div>
    <pre data-shiki-pending="1" data-lang="${lang}"><code>${md.utils.escapeHtml(code)}</code></pre>
  </div>`;
};

// 表格添加包裹层（用于横向滚动）
const defaultTableOpen =
  md.renderer.rules.table_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
  return '<div class="table-wrapper">' + defaultTableOpen(tokens, idx, options, env, self);
};
const defaultTableClose =
  md.renderer.rules.table_close ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.table_close = (tokens, idx, options, env, self) => {
  return defaultTableClose(tokens, idx, options, env, self) + '</div>';
};

const loadMarkdown = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(props.url);
    if (!response.ok) throw new Error('加载失败');
    const text = await response.text();
    content.value = text;
    html.value = md.render(text);
  } catch (err) {
    console.error(err);
    error.value = 'Markdown 文件加载失败';
  } finally {
    loading.value = false;
  }
};

const highlightCodeBlocks = async () => {
  if (!containerRef.value) return;
  const pending = containerRef.value.querySelectorAll<HTMLPreElement>('pre[data-shiki-pending="1"]');
  for (const pre of pending) {
    const lang = pre.getAttribute('data-lang') || 'text';
    const codeEl = pre.querySelector('code');
    const code = codeEl?.textContent || '';
    try {
      const highlighted = await codeToHtml(code, { lang, theme: 'github-light' });
      pre.outerHTML = highlighted;
    } catch {
      // 不支持的语言保持原样,移除 pending 标记
      pre.removeAttribute('data-shiki-pending');
    }
  }
};

const handleCopyClick = async (e: MouseEvent) => {
  const target = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLButtonElement | null;
  if (!target) return;
  e.preventDefault();
  const encoded = target.getAttribute('data-code') || '';
  try {
    const code = decodeURIComponent(escape(atob(encoded)));
    await navigator.clipboard.writeText(code);
    const original = target.textContent;
    target.textContent = '已复制';
    setTimeout(() => {
      target.textContent = original;
    }, 2000);
  } catch {
    // ignore
  }
};

onMounted(() => {
  document.addEventListener('click', handleCopyClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleCopyClick);
});

watch(() => props.url, loadMarkdown, { immediate: true });

watch(html, async () => {
  if (!html.value) return;
  await nextTick();
  highlightCodeBlocks();
});
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
    <div class="vfp-max-w-full md:vfp-max-w-4xl vfp-mx-auto vfp-bg-white">
      <div ref="containerRef" class="markdown-body vfp-p-6 md:vfp-p-10" v-html="html" />
    </div>
  </div>
</template>

<style scoped>
.markdown-body :deep(.table-wrapper) {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
}
.markdown-body :deep(.table-wrapper > table) {
  margin: 0;
  border: 0;
  border-radius: 0;
}
</style>
