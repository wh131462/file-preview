<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { FileSpreadsheet } from 'lucide-vue-next';
import ExcelJS from 'exceljs';
import Spreadsheet from 'x-data-spreadsheet';
import { convertWorkbookToSpreadsheetData } from '@eternalheart/file-preview-core';

const props = defineProps<{
  url: string;
}>();

const loading = ref(true);
const error = ref<string | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let sheetData: Record<string, unknown>[] | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeTimeout: number | null = null;
let lastDimensions = { width: 0, height: 0 };

const calculateDimensions = () => {
  if (!containerRef.value) return { width: 800, height: 600 };
  const rawWidth = containerRef.value.clientWidth;
  const rawHeight = containerRef.value.clientHeight;
  const width = rawWidth > 100 ? rawWidth : 800;
  const height = rawHeight > 100 ? rawHeight : 600;
  return { width, height };
};

const mountSpreadsheet = () => {
  if (!containerRef.value || !sheetData) return;

  containerRef.value.innerHTML = '';

  const { width, height } = calculateDimensions();
  const isMobile = width < 640;

  const s = new Spreadsheet(containerRef.value, {
    mode: 'read',
    showToolbar: false,
    showContextmenu: false,
    showGrid: true,
    row: {
      len: 100,
      height: 25,
    },
    col: {
      len: 26,
      width: isMobile ? 80 : 100,
      indexWidth: isMobile ? 40 : 60,
      minWidth: isMobile ? 40 : 60,
    },
    view: {
      height: () => height,
      width: () => width,
    },
  });

  s.loadData(sheetData as unknown as Record<string, unknown>);
};

const loadExcel = async () => {
  if (!containerRef.value) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(props.url, {
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error('Excel 文件不存在');
      if (response.status === 403) throw new Error('无权限访问此文件');
      throw new Error(`文件加载失败 (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      throw new Error('文件为空');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const data = convertWorkbookToSpreadsheetData(workbook);

    sheetData = data as unknown as Record<string, unknown>[];
    mountSpreadsheet();
    loading.value = false;
  } catch (err) {
    console.error('Excel 解析错误:', err);
    let errorMsg = 'Excel 文件解析失败';
    if (err instanceof Error) errorMsg = err.message;
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
      if (sheetData) mountSpreadsheet();
    }, 500);
  });

  resizeObserver.observe(containerRef.value);

  setTimeout(() => {
    requestAnimationFrame(() => loadExcel());
  }, 100);
});

watch(
  () => props.url,
  () => {
    loadExcel();
  }
);

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (resizeTimeout !== null) clearTimeout(resizeTimeout);
  sheetData = null;
  if (containerRef.value) containerRef.value.innerHTML = '';
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
        <p class="vfp-text-xs md:vfp-text-sm vfp-text-white/70 vfp-font-medium">加载 Excel 中...</p>
      </div>
    </div>

    <div
      v-if="error && !loading"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-bg-black/50 vfp-backdrop-blur-sm vfp-z-10 vfp-rounded-xl md:vfp-rounded-2xl"
    >
      <div class="vfp-text-center vfp-max-w-sm md:vfp-max-w-md vfp-px-4">
        <div
          class="vfp-w-24 vfp-h-24 md:vfp-w-32 md:vfp-h-32 vfp-mx-auto vfp-mb-4 md:vfp-mb-6 vfp-rounded-2xl md:vfp-rounded-3xl vfp-bg-gradient-to-br vfp-from-green-500 vfp-via-emerald-500 vfp-to-teal-500 vfp-flex vfp-items-center vfp-justify-center vfp-shadow-2xl"
        >
          <FileSpreadsheet class="vfp-w-12 vfp-h-12 md:vfp-w-16 md:vfp-h-16 vfp-text-white" />
        </div>
        <p class="vfp-text-lg md:vfp-text-xl vfp-text-white/90 vfp-mb-2 md:vfp-mb-3 vfp-font-medium">
          Excel 加载失败
        </p>
        <p class="vfp-text-xs md:vfp-text-sm vfp-text-white/60 vfp-mb-4 md:vfp-mb-6">{{ error }}</p>
        <a
          :href="url"
          download
          class="vfp-inline-flex vfp-items-center vfp-gap-2 vfp-px-4 vfp-py-2 md:vfp-px-6 md:vfp-py-3 vfp-bg-gradient-to-r vfp-from-purple-500 vfp-to-pink-500 vfp-text-white vfp-text-sm md:vfp-text-base vfp-rounded-lg md:vfp-rounded-xl hover:vfp-scale-105 vfp-transition-all vfp-shadow-lg"
        >
          下载文件
        </a>
        <p class="vfp-text-xs vfp-text-white/40 vfp-mt-3 md:vfp-mt-4">提示：可以使用 Microsoft Excel 或 WPS 打开</p>
      </div>
    </div>

    <div
      v-if="!error"
      ref="containerRef"
      class="xlsx-spreadsheet-container vfp-w-full vfp-h-full"
      :style="{ opacity: loading ? 0 : 1 }"
    />
  </div>
</template>
