<script setup lang="ts">
import { PreviewError, resolveEmptyHint, translateError, type EmptyHintMode } from '@eternalheart/file-preview-core';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import ExcelJS from 'exceljs';
import Spreadsheet from 'x-data-spreadsheet';
import {
  convertLegacyXlsToSpreadsheetData,
  convertWorkbookToSpreadsheetData,
  getSpreadsheetRowCount,
  isLegacyXls,
  normalizeExcelBuffer,
  parseLegacyXls,
  type XSheetData,
} from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import RendererError from '../RendererError.vue';
import EmptyState from '../EmptyState.vue';

async function loadXlsxWorkbook(data: Uint8Array): Promise<ExcelJS.Workbook> {
  try {
    return await new ExcelJS.Workbook().xlsx.load(data.slice().buffer as ArrayBuffer);
  } catch (error) {
    if (error instanceof TypeError && /sheets/i.test(error.message)) {
      throw new PreviewError('xlsx.invalid_format');
    }
    throw error;
  }
}

const props = defineProps<{
  url: string;
  /** 空内容提示策略，默认 'auto'（结构化类型显示提示） */
  emptyHint?: EmptyHintMode;
}>();

const { t } = useTranslator();
const fetcher = useFetcher();

const loading = ref(true);
const error = ref<string | null>(null);
const empty = ref(false);
const containerRef = ref<HTMLDivElement | null>(null);
let sheetData: XSheetData[] | null = null;
let rowLen = 100;
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
      len: rowLen,
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
  empty.value = false;

  try {
    const response = await fetcher.value(props.url, {
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error(t.value('xlsx.not_found'));
      if (response.status === 403) throw new PreviewError('file.forbidden');
      throw new PreviewError('file.load_failed_status', { status: response.status });
    }

    const excelBuffer = normalizeExcelBuffer(await response.arrayBuffer());

    // 空文件不是错误：标记空态，由 emptyHint 决定是否提示
    if (excelBuffer.byteLength === 0) {
      empty.value = true;
      loading.value = false;
      return;
    }

    let data: XSheetData[];
    if (isLegacyXls(excelBuffer)) {
      const legacyWorkbook = parseLegacyXls(excelBuffer);
      if (!legacyWorkbook || !Array.isArray(legacyWorkbook.sheets)) {
        throw new PreviewError('xlsx.invalid_legacy_data');
      }
      data = convertLegacyXlsToSpreadsheetData(legacyWorkbook);
    } else {
      data = convertWorkbookToSpreadsheetData(
        await loadXlsxWorkbook(excelBuffer),
      );
    }

    sheetData = data;
    rowLen = getSpreadsheetRowCount(data);
    mountSpreadsheet();
    loading.value = false;
  } catch (err) {
    console.error(t.value('xlsx.parse_failed') + ':', err);
    let errorMsg = t.value('xlsx.parse_failed');
    if (err instanceof Error) errorMsg = translateError(t.value, err);
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
  (newUrl) => {
    // 只有 URL 有效时才加载（避免空字符串或已 revoke 的 blob URL）
    if (newUrl) loadExcel();
  }
);

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (resizeTimeout !== null) clearTimeout(resizeTimeout);
  sheetData = null;
  rowLen = 100;
  if (containerRef.value) containerRef.value.innerHTML = '';
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
      class="vfp-absolute vfp-inset-0 vfp-renderer-loading vfp-bg-surface-toolbar vfp-backdrop-blur-sm vfp-z-10"
    >
      <div class="vfp-renderer-loading-content">
        <div class="vfp-renderer-spinner" />
        <p class="vfp-renderer-loading-text vfp-text-xs md:vfp-text-sm vfp-text-fg-secondary vfp-font-medium">{{ t('xlsx.loading') }}</p>
      </div>
    </div>

    <!-- 空文件状态：覆盖层，保持容器挂载 -->
    <div
      v-if="empty && !loading && showEmptyHint"
      class="vfp-absolute vfp-inset-0 vfp-bg-surface-toolbar vfp-z-10"
    >
      <EmptyState />
    </div>

    <RendererError
      v-if="error && !loading"
      :message="t('xlsx.load_failed')"
      :detail="error"
      class="vfp-absolute vfp-inset-0 vfp-bg-surface-toolbar vfp-backdrop-blur-sm vfp-z-10"
    />

    <div
      v-if="!error"
      ref="containerRef"
      class="xlsx-spreadsheet-container vfp-w-full vfp-h-full"
      :style="{ opacity: loading || empty ? 0 : 1 }"
    />
  </div>
</template>
