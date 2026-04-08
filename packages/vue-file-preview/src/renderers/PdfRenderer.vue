<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { configurePdfWorker } from '@eternalheart/file-preview-core';
// @ts-ignore - pdfjs-dist 类型路径
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

// 在模块加载时配置 PDF.js worker（默认走 CDN）
configurePdfWorker(pdfjsLib);

interface PdfPageProxy {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): {
    promise: Promise<void>;
  };
}

interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  destroy(): void;
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

const numPages = ref(0);
const error = ref<string | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let pdfDoc: PdfDocumentProxy | null = null;
const pageElements: HTMLDivElement[] = [];

const renderPage = async (pageNumber: number, scale: number, container: HTMLDivElement) => {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';
  canvas.style.borderRadius = '8px';
  canvas.style.display = 'block';
  canvas.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.25)';
  canvas.style.filter = 'brightness(0.95) contrast(1.05)';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  await page.render({ canvasContext: ctx, viewport }).promise;

  // 上报第一页原始宽度
  if (pageNumber === 1) {
    const baseViewport = page.getViewport({ scale: 1 });
    emit('pageWidthChange', baseViewport.width);
  }

  container.innerHTML = '';
  container.appendChild(canvas);

  // 页码标签
  const label = document.createElement('div');
  label.textContent = String(pageNumber);
  label.style.cssText =
    'position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);color:white;font-size:12px;padding:4px 12px;border-radius:9999px;';
  container.appendChild(label);
};

const renderAll = async () => {
  if (!pdfDoc || !containerRef.value) return;
  const wrapper = containerRef.value.querySelector('.pdf-pages') as HTMLDivElement | null;
  if (!wrapper) return;
  wrapper.innerHTML = '';
  pageElements.length = 0;

  for (let i = 1; i <= numPages.value; i++) {
    const pageDiv = document.createElement('div');
    pageDiv.style.cssText = 'position:relative;display:flex;justify-content:center;';
    wrapper.appendChild(pageDiv);
    pageElements.push(pageDiv);
    // eslint-disable-next-line no-await-in-loop
    await renderPage(i, props.zoom, pageDiv);
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
    await renderAll();
  } catch (err) {
    console.error('PDF 加载错误:', err);
    error.value = 'PDF 文件加载失败';
  }
};

const handleScroll = () => {
  if (!containerRef.value) return;

  const container = containerRef.value;
  const scrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;
  const scrollCenter = scrollTop + containerHeight / 2;

  let currentVisiblePage = 1;
  let minDistance = Infinity;

  pageElements.forEach((pageEl, idx) => {
    const pageNumber = idx + 1;
    const rect = pageEl.getBoundingClientRect();
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

onMounted(() => {
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

watch(
  () => props.zoom,
  () => {
    renderAll();
  }
);

onBeforeUnmount(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', handleScroll);
  }
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
    <div v-if="error" class="vfp-text-white/70 vfp-text-center">
      <p class="vfp-text-lg">{{ error }}</p>
    </div>

    <div v-if="!error && numPages === 0" class="vfp-flex vfp-items-center vfp-justify-center vfp-min-h-screen">
      <div
        class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-white/20 vfp-border-t-white vfp-rounded-full vfp-animate-spin"
      />
    </div>

    <div v-show="!error && numPages > 0" class="pdf-pages vfp-flex vfp-flex-col vfp-gap-4" />

    <div
      v-if="numPages > 0"
      class="vfp-sticky vfp-bottom-2 md:vfp-bottom-4 vfp-mt-4 md:vfp-mt-8 vfp-bg-black/60 vfp-backdrop-blur-xl vfp-text-white vfp-px-4 vfp-py-2 md:vfp-px-6 md:vfp-py-3 vfp-rounded-full vfp-text-xs md:vfp-text-sm vfp-font-medium vfp-shadow-2xl vfp-border vfp-border-white/10"
    >
      第 {{ currentPage }} 页 / 共 {{ numPages }} 页
    </div>
  </div>
</template>
