<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { Presentation } from 'lucide-vue-next';
import { init } from 'pptx-preview';

const props = withDefaults(
  defineProps<{
    url: string;
    tiled?: boolean;
  }>(),
  { tiled: true }
);

const loading = ref(true);
const error = ref<string | null>(null);
const slideCount = ref(0);
const containerRef = ref<HTMLDivElement | null>(null);
let previewer: ReturnType<typeof init> | null = null;
let resizeObserver: ResizeObserver | null = null;
let arrayBufferRef: ArrayBuffer | null = null;
let resizeTimeout: number | null = null;
let lastDimensions = { width: 0, height: 0 };

const calculateDimensions = () => {
  if (!containerRef.value) return { width: 960, height: 540 };
  const rawWidth = containerRef.value.clientWidth;
  const parentWidth = containerRef.value.parentElement?.clientWidth || 0;
  const containerWidth = rawWidth > 100 ? rawWidth : parentWidth > 100 ? parentWidth : 300;
  const height = Math.floor((containerWidth * 9) / 16);
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

  let timeoutId: number | null = window.setTimeout(() => {
    error.value = '加载超时，请检查网络或稍后重试';
    loading.value = false;
  }, 30000);

  try {
    const response = await fetch(props.url, {
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error('PPT 文件不存在');
      if (response.status === 403) throw new Error('无权限访问此文件');
      if (response.status >= 500) throw new Error('服务器错误，请稍后重试');
      throw new Error(`文件加载失败 (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) throw new Error('文件为空');

    arrayBufferRef = arrayBuffer;

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
        throw new Error('PPT 文件格式错误或已损坏');
      }

      const count = tempPreviewer.slideCount;
      if (!count || count === 0) throw new Error('PPT 文件无有效页面');

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
    let errorMsg = 'PPT 文件解析失败';
    if (err instanceof Error) errorMsg = err.message;
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
  () => {
    loadPptx();
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
</script>

<template>
  <div class="vfp-relative vfp-flex vfp-flex-col vfp-items-center vfp-w-full vfp-h-full">
    <div
      v-if="loading"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-bg-black/50 vfp-backdrop-blur-sm vfp-z-10 vfp-rounded-xl md:vfp-rounded-2xl"
    >
      <div class="vfp-text-center">
        <div
          class="vfp-w-10 vfp-h-10 md:vfp-w-12 md:vfp-h-12 vfp-mx-auto vfp-mb-3 vfp-border-4 vfp-border-white/20 vfp-border-t-white vfp-rounded-full vfp-animate-spin"
        />
        <p class="vfp-text-xs md:vfp-text-sm vfp-text-white/70 vfp-font-medium">加载 PPT 中...</p>
      </div>
    </div>

    <div
      v-if="error && !loading"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-bg-black/50 vfp-backdrop-blur-sm vfp-z-10 vfp-rounded-xl md:vfp-rounded-2xl"
    >
      <div class="vfp-text-center vfp-max-w-sm md:vfp-max-w-md vfp-px-4">
        <div
          class="vfp-w-24 vfp-h-24 md:vfp-w-32 md:vfp-h-32 vfp-mx-auto vfp-mb-4 md:vfp-mb-6 vfp-rounded-2xl md:vfp-rounded-3xl vfp-bg-gradient-to-br vfp-from-orange-500 vfp-via-red-500 vfp-to-pink-500 vfp-flex vfp-items-center vfp-justify-center vfp-shadow-2xl"
        >
          <Presentation class="vfp-w-12 vfp-h-12 md:vfp-w-16 md:vfp-h-16 vfp-text-white" />
        </div>
        <p class="vfp-text-lg md:vfp-text-xl vfp-text-white/90 vfp-mb-2 md:vfp-mb-3 vfp-font-medium">
          PPT 加载失败
        </p>
        <p class="vfp-text-xs md:vfp-text-sm vfp-text-white/60 vfp-mb-4 md:vfp-mb-6">{{ error }}</p>
        <a
          :href="url"
          download
          class="vfp-inline-flex vfp-items-center vfp-gap-2 vfp-px-4 vfp-py-2 md:vfp-px-6 md:vfp-py-3 vfp-bg-gradient-to-r vfp-from-purple-500 vfp-to-pink-500 vfp-text-white vfp-text-sm md:vfp-text-base vfp-rounded-lg md:vfp-rounded-xl hover:vfp-scale-105 vfp-transition-all vfp-shadow-lg"
        >
          下载文件
        </a>
        <p class="vfp-text-xs vfp-text-white/40 vfp-mt-3 md:vfp-mt-4">
          提示：可以使用 Microsoft PowerPoint 或 WPS 打开
        </p>
      </div>
    </div>

    <div
      v-if="!error"
      ref="containerRef"
      class="pptx-wrapper vfp-w-full vfp-max-w-full md:vfp-max-w-6xl"
      :style="{ opacity: loading ? 0 : 1 }"
    />
  </div>
</template>
