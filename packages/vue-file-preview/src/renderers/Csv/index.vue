<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { FileSpreadsheet } from 'lucide-vue-next';
import Spreadsheet from 'x-data-spreadsheet';
import 'x-data-spreadsheet/dist/xspreadsheet.css';
import {
  parseCsv,
  guessCsvDelimiter,
  fetchTextUtf8,
  convertCsvToSpreadsheetData,
} from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const { t } = useTranslator();

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

const loadCsv = async () => {
  if (!containerRef.value) return;

  loading.value = true;
  error.value = null;

  try {
    const text = await fetchTextUtf8(props.url);
    const parsed = parseCsv(text, { delimiter: guessCsvDelimiter(props.fileName) });
    const data = convertCsvToSpreadsheetData(parsed.header, parsed.rows, props.fileName);

    sheetData = data as unknown as Record<string, unknown>[];
    mountSpreadsheet();
    loading.value = false;
  } catch (err) {
    console.error('CSV 解析错误:', err);
    error.value = t.value('csv.load_failed');
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
    requestAnimationFrame(() => loadCsv());
  }, 100);
});

watch(
  () => props.url,
  () => {
    loadCsv();
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
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-bg-surface-toolbar vfp-backdrop-blur-sm vfp-z-10"
    >
      <div class="vfp-text-center">
        <div
          class="vfp-w-10 vfp-h-10 md:vfp-w-12 md:vfp-h-12 vfp-mx-auto vfp-mb-3 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
        />
        <p class="vfp-text-xs md:vfp-text-sm vfp-text-fg-secondary vfp-font-medium">{{ t('csv.loading') }}</p>
      </div>
    </div>

    <div
      v-if="error && !loading"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-bg-surface-toolbar vfp-backdrop-blur-sm vfp-z-10"
    >
      <div class="vfp-text-center vfp-max-w-sm md:vfp-max-w-md vfp-px-4">
        <div
          class="vfp-w-24 vfp-h-24 md:vfp-w-32 md:vfp-h-32 vfp-mx-auto vfp-mb-4 md:vfp-mb-6 vfp-rounded-2xl md:vfp-rounded-3xl vfp-bg-gradient-to-br vfp-from-green-500 vfp-via-emerald-500 vfp-to-teal-500 vfp-flex vfp-items-center vfp-justify-center vfp-shadow-2xl"
        >
          <FileSpreadsheet class="vfp-w-12 vfp-h-12 md:vfp-w-16 md:vfp-h-16 vfp-text-fg-primary" />
        </div>
        <p class="vfp-text-lg md:vfp-text-xl vfp-text-fg-primary vfp-mb-2 md:vfp-mb-3 vfp-font-medium">
          {{ t('csv.load_failed') }}
        </p>
        <p class="vfp-text-xs md:vfp-text-sm vfp-text-fg-tertiary vfp-mb-4 md:vfp-mb-6">{{ error }}</p>
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
