<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { configurePdfWorker } from '@eternalheart/file-preview-core';
// @ts-ignore - pdfjs-dist 类型路径
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { useTranslator } from '../../composables/useTranslator';
import RendererError from '../RendererError.vue';
import { X } from 'lucide-vue-next';

// 在模块加载时配置 PDF.js worker（默认走 CDN）
configurePdfWorker(pdfjsLib);

interface PdfOutlineItem {
  title: string;
  dest: any;
  items?: PdfOutlineItem[];
}

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
  getOutline(): Promise<PdfOutlineItem[] | null>;
  destroy(): void;
}

interface PageState {
  element: HTMLDivElement;
  rendered: boolean;
  rendering: boolean;
  renderTask: any;
}

const props = defineProps<{
  url: string;
  zoom: number;
  currentPage: number;
  showOutline?: boolean;
}>();

const emit = defineEmits<{
  (e: 'pageChange', page: number): void;
  (e: 'totalPagesChange', total: number): void;
  (e: 'pageWidthChange', width: number): void;
  (e: 'toggleOutline'): void;
}>();

const { t } = useTranslator();

const numPages = ref(0);
const error = ref<string | null>(null);
const isLoading = ref(true);
const outline = ref<PdfOutlineItem[]>([]);
const activeOutlineItem = ref<string | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const scrollContainerRef = ref<HTMLDivElement | null>(null);
const outlinePageMap = new Map<string, number>();
let pdfDoc: PdfDocumentProxy | null = null;
const pageStates = new Map<number, PageState>();
let observer: IntersectionObserver | null = null;

// 构建大纲-页码映射
const buildOutlinePageMap = async (items: PdfOutlineItem[], pdfDocument: PdfDocumentProxy, depth = 0) => {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemKey = `${item.title}-${i}-${depth}`;

    try {
      let pageNumber: number | null = null;
      const dest = item.dest;

      if (typeof dest === 'string') {
        const namedDest = await (pdfDocument as any).getDestination?.(dest);
        if (namedDest && namedDest[0] && typeof namedDest[0] === 'object') {
          pageNumber = await (pdfDocument as any).getPageIndex?.(namedDest[0]) + 1;
        }
      } else if (Array.isArray(dest) && dest[0] && typeof dest[0] === 'object') {
        pageNumber = await (pdfDocument as any).getPageIndex?.(dest[0]) + 1;
      }

      if (pageNumber !== null && pageNumber > 0) {
        outlinePageMap.set(itemKey, pageNumber);
      }

      if (item.items && item.items.length > 0) {
        await buildOutlinePageMap(item.items, pdfDocument, depth + 1);
      }
    } catch (err) {
      // 静默失败
    }
  }
};

// 根据当前页码更新激活的大纲项
const updateActiveOutlineByPage = (page: number) => {
  let closestItem: string | null = null;
  let closestDistance = Infinity;

  outlinePageMap.forEach((itemPage, itemKey) => {
    if (itemPage <= page) {
      const distance = page - itemPage;
      if (distance < closestDistance) {
        closestDistance = distance;
        closestItem = itemKey;
      }
    }
  });

  if (closestItem !== activeOutlineItem.value) {
    activeOutlineItem.value = closestItem;
  }
};

// 处理大纲点击跳转
const handleOutlineClick = async (dest: any, itemKey: string) => {
  if (!pdfDoc || !scrollContainerRef.value) return;

  try {
    let pageNumber: number;

    if (typeof dest === 'string') {
      const namedDest = await (pdfDoc as any).getDestination?.(dest);
      if (namedDest && namedDest[0]) {
        pageNumber = await (pdfDoc as any).getPageIndex?.(namedDest[0]) + 1;
      } else {
        return;
      }
    } else if (Array.isArray(dest) && dest[0]) {
      pageNumber = await (pdfDoc as any).getPageIndex?.(dest[0]) + 1;
    } else {
      return;
    }

    // 设置激活项
    activeOutlineItem.value = itemKey;

    // 滚动到目标页面
    const pages = scrollContainerRef.value.querySelectorAll('[data-page-number]');
    const targetPage = pages[pageNumber - 1];
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 跳转后自动关闭侧边栏
    setTimeout(() => emit('toggleOutline'), 300);
  } catch (err) {
    console.error('大纲跳转失败:', err);
  }
};

// 渲染大纲项（递归组件会更复杂，这里用简单的方式）
const renderOutlineItemsHtml = (items: PdfOutlineItem[], depth = 0): string => {
  return items.map((item, i) => {
    const itemKey = `${item.title}-${i}-${depth}`;
    const isActive = activeOutlineItem.value === itemKey;
    const activeClass = isActive
      ? 'vfp-bg-surface-2 vfp-text-fg-primary vfp-font-medium'
      : 'vfp-text-fg-secondary hover:vfp-text-fg-primary hover:vfp-bg-surface-2';

    let html = `<li style="margin-left: ${depth > 0 ? 16 : 0}px;">
      <button
        data-outline-key="${itemKey}"
        data-outline-dest="${JSON.stringify(item.dest).replace(/"/g, '&quot;')}"
        class="vfp-w-full vfp-text-left vfp-py-2 vfp-px-3 vfp-text-sm vfp-rounded vfp-transition-all vfp-truncate ${activeClass}"
        title="${item.title}"
      >
        ${item.title}
      </button>`;

    if (item.items && item.items.length > 0) {
      html += `<ul>${renderOutlineItemsHtml(item.items, depth + 1)}</ul>`;
    }

    html += '</li>';
    return html;
  }).join('');
};

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

  if (state.renderTask) {
    state.renderTask.cancel();
    state.renderTask = null;
  }

  const canvas = state.element.querySelector('canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  state.element.innerHTML = '';
  state.rendered = false;
  state.rendering = false;
};

const initPagePlaceholders = () => {
  if (!pdfDoc || !scrollContainerRef.value) return;

  const wrapper = scrollContainerRef.value.querySelector('.pdf-pages') as HTMLDivElement | null;
  if (!wrapper) return;

  wrapper.innerHTML = '';
  pageStates.clear();

  for (let i = 1; i <= numPages.value; i++) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'vfp-relative vfp-flex vfp-justify-center vfp-min-h-[800px]';
    pageDiv.setAttribute('data-page-number', String(i));
    wrapper.appendChild(pageDiv);

    pageStates.set(i, {
      element: pageDiv,
      rendered: false,
      rendering: false,
      renderTask: null,
    });

    if (observer) {
      observer.observe(pageDiv);
    }
  }
};

const loadPdf = async () => {
  error.value = null;
  isLoading.value = true;
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
    const total = pdfDoc.numPages;

    numPages.value = total;
    emit('totalPagesChange', total);
    emit('pageChange', 1);

    // 提取大纲
    try {
      const outlineData = await pdfDoc.getOutline();
      if (outlineData) {
        outline.value = outlineData;
        // 构建大纲-页码映射
        outlinePageMap.clear();
        await buildOutlinePageMap(outlineData, pdfDoc);
      }
    } catch (err) {
      console.warn('PDF 大纲提取失败:', err);
    }

    isLoading.value = false;
  } catch (err) {
    console.error('PDF 加载错误:', err);
    error.value = t.value('pdf.load_failed');
    isLoading.value = false;
  }
};

const handleScroll = () => {
  if (!scrollContainerRef.value || pageStates.size === 0) return;

  const container = scrollContainerRef.value;
  const scrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;
  const scrollCenter = scrollTop + containerHeight / 2;

  let currentVisiblePage = 1;
  let minDistance = Infinity;

  pageStates.forEach((state, pageNumber) => {
    const rect = state.element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const pageCenter = rect.top - containerRect.top + rect.height / 2 + scrollTop;

    const distance = Math.abs(scrollCenter - pageCenter);
    if (distance < minDistance) {
      minDistance = distance;
      currentVisiblePage = pageNumber;
    }
  });

  if (currentVisiblePage !== props.currentPage) {
    emit('pageChange', currentVisiblePage);
  }
};

// 设置大纲点击事件代理
const setupOutlineEventDelegation = () => {
  nextTick(() => {
    const outlineContainer = containerRef.value?.querySelector('.outline-items');
    if (!outlineContainer) return;

    outlineContainer.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest('[data-outline-key]');
      if (!button) return;

      const itemKey = button.getAttribute('data-outline-key');
      const destStr = button.getAttribute('data-outline-dest');
      if (!itemKey || !destStr) return;

      try {
        const dest = JSON.parse(destStr);
        handleOutlineClick(dest, itemKey);
      } catch (err) {
        console.error('解析大纲目标失败:', err);
      }
    });
  });
};

// 监听 URL 变化
watch(() => props.url, () => {
  if (props.url) {
    loadPdf();
  }
}, { immediate: true });

// 监听 numPages 变化，初始化占位符
watch(numPages, (val) => {
  if (val > 0) {
    nextTick(() => {
      initPagePlaceholders();
    });
  }
});

// 监听 zoom 变化
watch(() => props.zoom, () => {
  pageStates.forEach((state, pageNumber) => {
    if (state.rendered) {
      clearPageCanvas(pageNumber);
    }
  });

  setTimeout(() => {
    if (observer && scrollContainerRef.value) {
      pageStates.forEach((state) => {
        observer?.unobserve(state.element);
        observer?.observe(state.element);
      });
    }
  }, 150);
});

// 监听 currentPage 变化，更新大纲高亮
watch(() => props.currentPage, (page) => {
  if (page > 0 && outlinePageMap.size > 0) {
    updateActiveOutlineByPage(page);
  }
});

// 监听 activeOutlineItem 变化，更新大纲 UI
watch(activeOutlineItem, () => {
  nextTick(() => {
    const outlineContainer = containerRef.value?.querySelector('.outline-items');
    if (!outlineContainer) return;

    // 重新渲染大纲项
    if (outline.value.length > 0) {
      outlineContainer.innerHTML = `<ul>${renderOutlineItemsHtml(outline.value)}</ul>`;
      // 重新绑定事件
      setupOutlineEventDelegation();
    }
  });
});

// 监听 outline 变化，渲染大纲
watch(outline, () => {
  nextTick(() => {
    const outlineContainer = containerRef.value?.querySelector('.outline-items');
    if (!outlineContainer && outline.value.length > 0) {
      // 容器还没准备好，等待下一次
      setTimeout(() => {
        const container = containerRef.value?.querySelector('.outline-items');
        if (container) {
          container.innerHTML = `<ul>${renderOutlineItemsHtml(outline.value)}</ul>`;
          setupOutlineEventDelegation();
        }
      }, 100);
    } else if (outlineContainer && outline.value.length > 0) {
      outlineContainer.innerHTML = `<ul>${renderOutlineItemsHtml(outline.value)}</ul>`;
      setupOutlineEventDelegation();
    }
  });
}, { deep: true });

onMounted(() => {
  // 设置 IntersectionObserver
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const pageNumber = Number(entry.target.getAttribute('data-page-number'));
        if (!pageNumber) return;

        if (entry.isIntersecting) {
          renderPage(pageNumber, props.zoom);
        } else {
          const state = pageStates.get(pageNumber);
          if (state && state.rendered) {
            clearPageCanvas(pageNumber);
          }
        }
      });
    },
    {
      root: scrollContainerRef.value,
      rootMargin: '500px 0px',
      threshold: 0,
    }
  );

  // 监听滚动
  const container = scrollContainerRef.value;
  if (container) {
    container.addEventListener('scroll', handleScroll);
  }
});

onBeforeUnmount(() => {
  // 清理
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  const container = scrollContainerRef.value;
  if (container) {
    container.removeEventListener('scroll', handleScroll);
  }

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
  <div ref="containerRef" class="vfp-relative vfp-w-full vfp-h-full">
    <!-- 大纲侧边栏 -->
    <div
      v-if="outline.length > 0"
      class="vfp-absolute vfp-inset-0 vfp-z-20 vfp-flex vfp-transition-opacity vfp-duration-300"
      :style="{
        opacity: showOutline ? 1 : 0,
        pointerEvents: showOutline ? 'auto' : 'none',
      }"
    >
      <div
        class="vfp-w-72 vfp-max-w-[80%] vfp-h-full vfp-bg-surface-overlay vfp-backdrop-blur-xl vfp-border-r vfp-border-line-weak vfp-flex vfp-flex-col vfp-shadow-2xl vfp-transition-transform vfp-duration-300"
        :style="{ transform: showOutline ? 'translateX(0)' : 'translateX(-100%)' }"
      >
        <div class="vfp-flex vfp-items-center vfp-justify-between vfp-px-4 vfp-py-3 vfp-border-b vfp-border-line-weak vfp-flex-shrink-0">
          <span class="vfp-text-fg-primary vfp-font-medium vfp-text-sm">{{ t('toolbar.outline') }}</span>
          <button
            @click="emit('toggleOutline')"
            class="vfp-text-fg-tertiary hover:vfp-text-fg-primary vfp-transition-colors"
          >
            <X class="vfp-w-4 vfp-h-4" />
          </button>
        </div>
        <div class="vfp-flex-1 vfp-overflow-y-auto vfp-py-4 vfp-px-1 outline-items" v-html="renderOutlineItemsHtml(outline)" />
      </div>
      <div
        class="vfp-flex-1 vfp-transition-opacity vfp-duration-300"
        :style="{ background: showOutline ? 'rgba(0,0,0,0.3)' : 'transparent' }"
        @click="emit('toggleOutline')"
      />
    </div>

    <div
      ref="scrollContainerRef"
      class="vfp-w-full vfp-h-full vfp-overflow-auto vfp-py-6 vfp-px-4"
    >
      <RendererError v-if="error" :message="error" />

      <div v-if="!error && isLoading" class="vfp-flex vfp-items-center vfp-justify-center vfp-min-h-screen">
        <div
          class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
        />
      </div>

      <div v-if="!error" class="vfp-flex vfp-flex-col vfp-items-center">
        <div class="pdf-pages vfp-flex vfp-flex-col vfp-gap-4" />
      </div>
    </div>
  </div>
</template>
