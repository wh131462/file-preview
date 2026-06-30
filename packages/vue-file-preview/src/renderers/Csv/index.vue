<script setup lang="ts">
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import Spreadsheet from 'x-data-spreadsheet';
import 'x-data-spreadsheet/dist/xspreadsheet.css';
import {
  parseCsv,
  guessCsvDelimiter,
  fetchTextUtf8,
  convertCsvToSpreadsheetData,
} from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import RendererError from '../RendererError.vue';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const { t } = useTranslator();
const fetcher = useFetcher();

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
    const text = await fetchTextUtf8(props.url, { fetcher: fetcher.value });
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

const getToolbarGroups = (): ToolbarGroup[] => [];

defineExpose<RendererHandle>({
  getToolbarGroups,
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

    <RendererError
      v-if="error && !loading"
      :message="error"
      class="vfp-absolute vfp-inset-0 vfp-bg-surface-toolbar vfp-backdrop-blur-sm vfp-z-10"
    />

    <div
      v-if="!error"
      ref="containerRef"
      class="xlsx-spreadsheet-container vfp-w-full vfp-h-full"
      :style="{ opacity: loading ? 0 : 1 }"
    />
  </div>
</template>
