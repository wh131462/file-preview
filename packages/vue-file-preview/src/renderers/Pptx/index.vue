<script setup lang="ts">
import { PreviewError, resolveEmptyHint, translateError, type EmptyHintMode } from '@eternalheart/file-preview-core';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { init } from 'pptx-preview';
import { readPptxSlideSize } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import RendererError from '../RendererError.vue';
import EmptyState from '../EmptyState.vue';

const props = withDefaults(
  defineProps<{
    url: string;
    tiled?: boolean;
    /** 空内容提示策略，默认 'auto'（结构化类型显示提示） */
    emptyHint?: EmptyHintMode;
  }>(),
  { tiled: true }
);

const { t } = useTranslator();
const fetcher = useFetcher();

const loading = ref(true);
const error = ref<string | null>(null);
const empty = ref(false);
const slideCount = ref(0);
const containerRef = ref<HTMLDivElement | null>(null);
let previewer: ReturnType<typeof init> | null = null;
let resizeObserver: ResizeObserver | null = null;
let arrayBufferRef: ArrayBuffer | null = null;
let resizeTimeout: number | null = null;
let lastDimensions = { width: 0, height: 0 };
let slideRatio = 9 / 16;

const calculateDimensions = () => {
  if (!containerRef.value) return { width: 960, height: 540 };
  const rawWidth = containerRef.value.clientWidth;
  const parentWidth = containerRef.value.parentElement?.clientWidth || 0;
  const containerWidth = rawWidth > 100 ? rawWidth : parentWidth > 100 ? parentWidth : 300;
  const height = Math.floor(containerWidth * slideRatio);
  return { width: containerWidth, height };
};

const reinitializePreviewer = async () => {
  if (!containerRef.value || !arrayBufferRef || slideCount.value === 0) return;

  try {
    if (previewer) {
      try {
        previewer.destroy();
      } catch {
        // ignore
      }
    }

    containerRef.value.innerHTML = '';

    const currentDimensions = calculateDimensions();
    previewer = init(containerRef.value, {
      width: currentDimensions.width,
      height: props.tiled ? currentDimensions.height * slideCount.value : currentDimensions.height,
      mode: props.tiled ? 'list' : 'slide',
    });

    await previewer.preview(arrayBufferRef);
  } catch {
    // 静默处理
  }
};

const loadPptx = async () => {
  if (!containerRef.value) return;

  loading.value = true;
  error.value = null;
  empty.value = false;

  let timeoutId: number | null = window.setTimeout(() => {
    error.value = t.value('pptx.timeout');
    loading.value = false;
  }, 30000);

  try {
    const response = await fetcher.value(props.url, {
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error(t.value('pptx.not_found'));
      if (response.status === 403) throw new PreviewError('file.forbidden');
      if (response.status >= 500) throw new PreviewError('file.server_error');
      throw new PreviewError('file.load_failed_status', { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    // 空文件不是错误：标记空态，由 emptyHint 决定是否提示
    if (arrayBuffer.byteLength === 0) {
      if (timeoutId !== null) clearTimeout(timeoutId);
      empty.value = true;
      loading.value = false;
      return;
    }

    arrayBufferRef = arrayBuffer;
    slideRatio = (await readPptxSlideSize(arrayBuffer)).ratio;

    // 步骤 1: 创建隐藏容器获取 slideCount
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden';
    document.body.appendChild(hiddenContainer);

    try {
      const tempPreviewer = init(hiddenContainer, {
        width: 100,
        height: 100,
        mode: 'slide',
      });

      try {
        await tempPreviewer.preview(arrayBuffer);
      } catch {
        throw new Error(t.value('pptx.invalid_format'));
      }

      const count = tempPreviewer.slideCount;
      if (!count || count === 0) throw new Error(t.value('pptx.no_pages'));

      tempPreviewer.destroy();

      slideCount.value = count;

      if (containerRef.value) {
        containerRef.value.innerHTML = '';
      }

      const currentDimensions = calculateDimensions();
      previewer = init(containerRef.value, {
        width: currentDimensions.width,
        height: props.tiled ? currentDimensions.height * count : currentDimensions.height,
        mode: props.tiled ? 'list' : 'slide',
      });

      await previewer.preview(arrayBuffer);

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      loading.value = false;
    } finally {
      if (document.body.contains(hiddenContainer)) {
        document.body.removeChild(hiddenContainer);
      }
    }
  } catch (err) {
    if (timeoutId !== null) clearTimeout(timeoutId);
    let errorMsg = t.value('pptx.parse_failed');
    if (err instanceof Error) errorMsg = translateError(t.value, err);
    else if (typeof err === 'string') errorMsg = err;
    error.value = errorMsg;
    loading.value = false;
  }
};

onMounted(() => {
  if (!containerRef.value) return;

  let isInitialRender = true;

  resizeObserver = new ResizeObserver(() => {
    if (isInitialRender) {
      isInitialRender = false;
      lastDimensions = calculateDimensions();
      return;
    }

    const newDimensions = calculateDimensions();
    const widthDiff = Math.abs(lastDimensions.width - newDimensions.width);
    const heightDiff = Math.abs(lastDimensions.height - newDimensions.height);

    if (widthDiff < 10 && heightDiff < 10) return;

    lastDimensions = newDimensions;

    if (resizeTimeout !== null) clearTimeout(resizeTimeout);

    resizeTimeout = window.setTimeout(() => {
      if (previewer && arrayBufferRef) reinitializePreviewer();
    }, 800);
  });

  resizeObserver.observe(containerRef.value);

  setTimeout(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => loadPptx()));
  }, 150);
});

watch(
  () => props.url,
  (newUrl) => {
    // 只有 URL 有效时才加载（避免空字符串或已 revoke 的 blob URL）
    if (newUrl) {
      loadPptx();
    }
  }
);

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (resizeTimeout !== null) clearTimeout(resizeTimeout);
  arrayBufferRef = null;
  slideCount.value = 0;
  if (previewer) {
    try {
      previewer.destroy();
    } catch {
      // ignore
    }
  }
  previewer = null;
});

const getToolbarGroups = (): ToolbarGroup[] => [];

// 空文件：结构化类型无原生空白，默认显示中性空提示
const showEmptyHint = computed(() => resolveEmptyHint(props.emptyHint, 'structured'));

defineExpose<RendererHandle>({
  getToolbarGroups,
});

</script>

<template>
  <div class="vfp-relative vfp-flex vfp-flex-col vfp-items-center vfp-w-full vfp-h-full">
    <div
      v-if="loading"
      class="vfp-renderer-overlay vfp-renderer-loading"
    >
      <div class="vfp-renderer-loading-content">
        <div class="vfp-renderer-spinner" />
        <p class="vfp-renderer-loading-text">{{ t('pptx.loading') }}</p>
      </div>
    </div>

    <!-- 空文件状态：覆盖层，保持容器挂载 -->
    <div
      v-if="empty && !loading && showEmptyHint"
      class="vfp-renderer-overlay"
    >
      <EmptyState />
    </div>

    <div v-if="error && !loading" class="vfp-renderer-overlay">
      <RendererError
        :message="t('pptx.load_failed')"
        :detail="error"
      />
    </div>

    <div
      v-if="!error"
      ref="containerRef"
      class="pptx-wrapper vfp-w-full vfp-max-w-full md:vfp-max-w-6xl"
      :style="{ opacity: loading || empty ? 0 : 1 }"
    />
  </div>
</template>
