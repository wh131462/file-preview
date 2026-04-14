<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownItKatex from '@traptitech/markdown-it-katex';
import { codeToHtml } from 'shiki';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import 'katex/dist/katex.min.css';

const props = defineProps<{
  url: string;
  viewMode?: 'preview' | 'source';
}>();

const { t } = useTranslator();

const content = ref('');
const html = ref('');
const highlightedSource = ref('');
const loading = ref(true);
const error = ref<string | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// 创建 markdown-it 实例（支持 GFM 表格、删除线、任务列表、HTML、数学公式）
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  breaks: false,
});
md.use(MarkdownItKatex);

// 自定义代码块渲染：包裹 code-block-wrapper + header（不含复制按钮，由 JS 动态注入）
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : '';
  const code = token.content;

  if (!info) {
    return `<div class="code-block-wrapper">
    <pre class="no-lang-pre"><code>${md.utils.escapeHtml(code)}</code></pre>
  </div>`;
  }

  return `<div class="code-block-wrapper">
    <div class="code-block-header">
      <span>${info}</span>
    </div>
    <pre data-shiki-pending="1" data-lang="${info}"><code>${md.utils.escapeHtml(code)}</code></pre>
  </div>`;
};

// 4-space 缩进代码块：同样包裹 code-block-wrapper（无头，注入浮动复制按钮）
md.renderer.rules.code_block = (tokens, idx) => {
  const code = tokens[idx].content;
  return `<div class="code-block-wrapper">
    <pre class="no-lang-pre"><code>${md.utils.escapeHtml(code)}</code></pre>
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
    const text = await fetchTextUtf8(props.url);
    content.value = text;
    html.value = md.render(text);
    loading.value = false;
    // 异步生成源码高亮（不阻塞预览渲染）
    try {
      highlightedSource.value = await codeToHtml(text, { lang: 'markdown', theme: 'github-dark' });
    } catch {
      highlightedSource.value = '';
    }
  } catch (err) {
    console.error(err);
    error.value = t.value('markdown.load_failed');
    loading.value = false;
  }
};

const COPY_SVG_SM = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const COPY_SVG_MD = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_SVG_SM = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const CHECK_SVG_MD = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

const createCopyButton = (code: string, inline: boolean): HTMLButtonElement => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = inline ? 'code-copy-btn' : 'code-copy-btn code-copy-float';
  btn.title = t.value('markdown.copy_code');
  btn.innerHTML = inline ? COPY_SVG_SM : COPY_SVG_MD;
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    btn.innerHTML = inline ? CHECK_SVG_SM : CHECK_SVG_MD;
    btn.title = t.value('markdown.copied');
    setTimeout(() => {
      btn.innerHTML = inline ? COPY_SVG_SM : COPY_SVG_MD;
      btn.title = t.value('markdown.copy_code');
    }, 2000);
  });
  return btn;
};

const highlightAndInjectCopyButtons = async () => {
  if (!containerRef.value) return;

  // 1. shiki 高亮有语言的代码块
  const pending = containerRef.value.querySelectorAll<HTMLPreElement>('pre[data-shiki-pending="1"]');
  for (const pre of pending) {
    const lang = pre.getAttribute('data-lang') || 'text';
    const code = pre.querySelector('code')?.textContent || '';
    try {
      const highlighted = await codeToHtml(code, { lang, theme: 'github-dark' });
      const tmp = document.createElement('div');
      tmp.innerHTML = highlighted;
      const newPre = tmp.firstElementChild as HTMLElement;
      if (newPre) pre.replaceWith(newPre);
    } catch {
      pre.style.backgroundColor = '#1e1e1e';
      pre.removeAttribute('data-shiki-pending');
    }
  }

  // 2. 为所有代码块注入复制按钮（避免重复注入）
  const wrappers = containerRef.value.querySelectorAll<HTMLElement>('.code-block-wrapper');
  for (const wrapper of wrappers) {
    if (wrapper.querySelector('.code-copy-btn')) continue;
    const header = wrapper.querySelector('.code-block-header');
    const pre = wrapper.querySelector('pre');
    const code = pre?.querySelector('code')?.textContent ?? pre?.textContent ?? '';
    if (header) {
      // 有语言：按钮放入 header 右侧
      header.appendChild(createCopyButton(code, true));
    } else {
      // 无语言：浮动按钮
      wrapper.appendChild(createCopyButton(code, false));
    }
  }
};

watch(() => props.url, loadMarkdown, { immediate: true });

watch(html, async () => {
  if (!html.value) return;
  await nextTick();
  highlightAndInjectCopyButtons();
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

  <!-- 源码视图 -->
  <div v-else-if="viewMode === 'source'" class="vfp-w-full vfp-h-full vfp-overflow-auto" style="background: #1e1e1e;">
    <pre
      v-if="!highlightedSource"
      class="vfp-p-6 vfp-text-white/90 vfp-font-mono vfp-text-sm vfp-whitespace-pre-wrap vfp-break-words"
      >{{ content }}</pre
    >
    <div v-else class="shiki-wrapper" v-html="highlightedSource" />
  </div>

  <!-- 预览视图 -->
  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto vfp-p-6 md:vfp-p-10">
    <div class="vfp-max-w-full md:vfp-max-w-4xl vfp-mx-auto">
      <div ref="containerRef" class="markdown-body" v-html="html" />
    </div>
  </div>
</template>

<style scoped>
.markdown-body :deep(.table-wrapper) {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.markdown-body :deep(.table-wrapper > table) {
  margin: 0;
  border: 0;
  border-radius: 0;
}
/* shiki 生成的 pre：修正在 code-block-wrapper 内的边距与圆角 */
.markdown-body :deep(.code-block-wrapper pre.shiki) {
  margin: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: 0;
}
/* 无语言代码块：pre 不裁剪，让浮动按钮可见 */
.markdown-body :deep(.code-block-wrapper) {
  overflow: visible;
}
.markdown-body :deep(.code-block-wrapper pre) {
  overflow: visible;
}
/* 无语言代码块纯文本样式 */
.markdown-body :deep(.no-lang-pre) {
  margin: 0;
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.markdown-body :deep(.no-lang-pre code) {
  display: block;
  font-size: 0.8125rem;
  line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: rgba(255, 255, 255, 0.85);
  white-space: pre;
  overflow-x: auto;
}
/* shiki 生成的 code：补充 padding，使代码有适当内边距 */
.markdown-body :deep(pre.shiki code) {
  display: block;
  padding: 1rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
/* KaTeX 公式颜色适配暗色背景 */
.markdown-body :deep(.katex) {
  color: rgba(255, 255, 255, 0.9);
}
.markdown-body :deep(.katex-display) {
  margin: 1.25rem 0;
  overflow-x: auto;
  overflow-y: hidden;
}
/* 源码视图 shiki */
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
