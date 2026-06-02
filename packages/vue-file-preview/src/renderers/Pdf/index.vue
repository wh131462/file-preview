<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { configurePdfWorker } from '@eternalheart/file-preview-core';
// @ts-ignore - pdfjs-dist 类型路径
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { useTranslator } from '../../composables/useTranslator';

// 在模块加载时配置 PDF.js worker（默认走 CDN）
configurePdfWorker(pdfjsLib);

interface PdfPageProxy {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): {
    promise: Promise<void>;
    cancel(): void;
  };
}

interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  destroy(): void;
}

interface PageState {
  element: HTMLDivElement;
  rendered: boolean;
  rendering: boolean;
  renderTask: { cancel(): void } | null;
}

const props = defineProps<{
  url: string;
  zoom: number;
  currentPage: number;
}>();

const emit = defineEmits<{
  (e: 'pageChange', page: number): void;
  (e: 'totalPagesChange', total: number): void;
  (e: 'pageWidthChange', width: number): void;
}>();

const { t } = useTranslator();

const numPages = ref(0);
const error = ref<string | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let pdfDoc: PdfDocumentProxy | null = null;
const pageStates = new Map<number, PageState>();
let observer: IntersectionObserver | null = null;

const renderPage = async (pageNumber: number, scale: number) => {
  if (!pdfDoc) return;
  const state = pageStates.get(pageNumber);
  if (!state || state.rendering) return;

  state.rendering = true;

  try {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    canvas.style.borderRadius = '0';
    canvas.style.display = 'block';
    canvas.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.25)';
    canvas.style.filter = 'brightness(0.95) contrast(1.05)';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    state.renderTask = renderTask;
    await renderTask.promise;

    // 上报第一页原始宽度
    if (pageNumber === 1) {
      const baseViewport = page.getViewport({ scale: 1 });
      emit('pageWidthChange', baseViewport.width);
    }

    state.element.innerHTML = '';
    state.element.appendChild(canvas);

    // 页码标签
    const label = document.createElement('div');
    label.textContent = String(pageNumber);
    label.style.cssText =
      'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);color:white;font-size:12px;padding:4px 12px;border-radius:9999px;';
    state.element.appendChild(label);

    state.rendered = true;
  } catch (err: any) {
    if (err?.name !== 'RenderingCancelledException') {
      console.error(`渲染页面 ${pageNumber} 失败:`, err);
    }
  } finally {
    state.rendering = false;
    state.renderTask = null;
  }
};

const clearPageCanvas = (pageNumber: number) => {
  const state = pageStates.get(pageNumber);
  if (!state) return;

  // 取消正在进行的渲染
  if (state.renderTask) {
    state.renderTask.cancel();
    state.renderTask = null;
  }

  // 清理 canvas，保留占位符
  const canvas = state.element.querySelector('canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.remove();
  }

  state.element.innerHTML = '';
  state.rendered = false;
  state.rendering = false;
};

const initPagePlaceholders = async () => {
  if (!pdfDoc || !containerRef.value) return;
  const wrapper = containerRef.value.querySelector('.pdf-pages') as HTMLDivElement | null;
  if (!wrapper) return;

  wrapper.innerHTML = '';
  pageStates.clear();

  // 预计算所有页面的高度占位
  for (let i = 1; i <= numPages.value; i++) {
    const pageDiv = document.createElement('div');
    pageDiv.style.cssText = 'position:relative;display:flex;justify-content:center;min-height:800px;';
    pageDiv.dataset.pageNumber = String(i);
    wrapper.appendChild(pageDiv);

    pageStates.set(i, {
      element: pageDiv,
      rendered: false,
      rendering: false,
      renderTask: null,
    });

    // 使用 IntersectionObserver 监听
    if (observer) {
      observer.observe(pageDiv);
    }
  }
};

const loadPdf = async () => {
  error.value = null;
  numPages.value = 0;
  if (pdfDoc) {
    try {
      pdfDoc.destroy();
    } catch {
      // ignore
    }
    pdfDoc = null;
  }

  try {
    const loadingTask = pdfjsLib.getDocument({ url: props.url });
    pdfDoc = (await loadingTask.promise) as PdfDocumentProxy;
    numPages.value = pdfDoc.numPages;
    emit('totalPagesChange', pdfDoc.numPages);
    emit('pageChange', 1);
    await nextTick();
    await initPagePlaceholders();
  } catch (err) {
    console.error('PDF 加载错误:', err);
    error.value = t.value('pdf.load_failed');
  }
};

const handleScroll = () => {
  if (!containerRef.value || pageStates.size === 0) return;

  const container = containerRef.value;
  const scrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;
  const scrollCenter = scrollTop + containerHeight / 2;

  let currentVisiblePage = 1;
  let minDistance = Infinity;

  pageStates.forEach((state, pageNumber) => {
    const rect = state.element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const pageCenter = rect.top - containerRect.top + rect.height / 2 + scrollTop;
    const distance = Math.abs(pageCenter - scrollCenter);

    if (distance < minDistance) {
      minDistance = distance;
      currentVisiblePage = pageNumber;
    }
  });

  if (currentVisiblePage !== props.currentPage) {
    emit('pageChange', currentVisiblePage);
  }
};

let zoomDebounceTimer: number | null = null;
const handleZoomChange = () => {
  if (zoomDebounceTimer) {
    clearTimeout(zoomDebounceTimer);
  }

  zoomDebounceTimer = window.setTimeout(() => {
    // 清理所有已渲染页面
    pageStates.forEach((state, pageNumber) => {
      if (state.rendered) {
        clearPageCanvas(pageNumber);
      }
    });

    // 触发 IntersectionObserver 重新渲染可见页面
    if (observer && containerRef.value) {
      const wrapper = containerRef.value.querySelector('.pdf-pages') as HTMLDivElement | null;
      if (wrapper) {
        pageStates.forEach((state) => {
          observer?.unobserve(state.element);
          observer?.observe(state.element);
        });
      }
    }
  }, 150);
};

onMounted(() => {
  // 初始化 IntersectionObserver，设置缓冲区为上下 500px
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const pageNumber = Number(entry.target.getAttribute('data-page-number'));
        if (!pageNumber) return;

        if (entry.isIntersecting) {
          // 页面进入视口，渲染
          renderPage(pageNumber, props.zoom);
        } else {
          // 页面离开视口较远，清理 canvas
          const state = pageStates.get(pageNumber);
          if (state && state.rendered) {
            clearPageCanvas(pageNumber);
          }
        }
      });
    },
    {
      root: containerRef.value,
      rootMargin: '500px 0px',
      threshold: 0,
    }
  );

  loadPdf();
  if (containerRef.value) {
    containerRef.value.addEventListener('scroll', handleScroll);
  }
});

watch(
  () => props.url,
  () => {
    loadPdf();
  }
);

watch(() => props.zoom, handleZoomChange);

onBeforeUnmount(() => {
  if (zoomDebounceTimer) {
    clearTimeout(zoomDebounceTimer);
  }

  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', handleScroll);
  }

  // 清理所有渲染任务
  pageStates.forEach((state) => {
    if (state.renderTask) {
      state.renderTask.cancel();
    }
  });
  pageStates.clear();

  if (pdfDoc) {
    try {
      pdfDoc.destroy();
    } catch {
      // ignore
    }
    pdfDoc = null;
  }
});
</script>

<template>
  <div
    ref="containerRef"
    class="vfp-flex vfp-flex-col vfp-items-center vfp-w-full vfp-h-full vfp-overflow-auto vfp-py-4 md:vfp-py-8 vfp-px-2 md:vfp-px-4"
  >
    <div v-if="error" class="vfp-text-fg-secondary vfp-text-center">
      <p class="vfp-text-lg">{{ error }}</p>
    </div>

    <div v-if="!error && numPages === 0" class="vfp-flex vfp-items-center vfp-justify-center vfp-min-h-screen">
      <div
        class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
      />
    </div>

    <div v-show="!error && numPages > 0" class="pdf-pages vfp-flex vfp-flex-col vfp-gap-4" />

    <div
      v-if="numPages > 0"
      class="vfp-sticky vfp-bottom-2 md:vfp-bottom-4 vfp-mt-4 md:vfp-mt-8 vfp-bg-surface-nav-hover vfp-backdrop-blur-xl vfp-text-fg-primary vfp-px-4 vfp-py-2 md:vfp-px-6 md:vfp-py-3 vfp-rounded-full vfp-text-xs md:vfp-text-sm vfp-font-medium vfp-shadow-2xl vfp-border vfp-border-line-weak"
    >
      第 {{ currentPage }} 页 / 共 {{ numPages }} 页
    </div>
  </div>
</template>
