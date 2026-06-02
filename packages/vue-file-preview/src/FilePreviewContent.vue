<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, toRef, provide } from 'vue';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import {
  normalizeFiles,
  getFileType,
  downloadFileWithFetcher,
  type PreviewFile,
  type PreviewFileInput,
  type Locale,
  type Messages,
  type Theme,
  type CustomRendererEventPayload,
  type RequestHandler,
  type RequestInitFactory,
  type ShouldFetchAsBlob,
} from '@eternalheart/file-preview-core';
import type { CustomRenderer, CustomRendererContext } from './types';
import { provideLocale, useTranslator } from './composables/useTranslator';
import { provideResolvedTheme } from './composables/useResolvedTheme';
import { provideRequestContext, useResolvedUrl, useFetcher } from './composables/useRequest';
import type { ToolbarGroup, ToolbarButtonItem, ToolbarTextItem } from './renderers/toolbar.types';
import { getImageToolbarGroups } from './renderers/Image/toolbar';
import { getPdfToolbarGroups } from './renderers/Pdf/toolbar';
import { getEpubToolbarGroups } from './renderers/Epub/toolbar';
import { getMobiToolbarGroups } from './renderers/Mobi/toolbar';
import { getZipToolbarGroups, type ZipToolbarStats } from './renderers/Zip/toolbar';
import { getTextToolbarGroups } from './renderers/Text/toolbar';
import { getMarkdownToolbarGroups } from './renderers/Markdown/toolbar';
// Renderer 通过 defineAsyncComponent 动态加载，运行时按需下载对应 chunk
import {
  ImageRenderer,
  PdfRenderer,
  DocxRenderer,
  XlsxRenderer,
  PptxRenderer,
  MsgRenderer,
  EpubRenderer,
  MobiRenderer,
  VideoRenderer,
  AudioRenderer,
  MarkdownRenderer,
  JsonRenderer,
  CsvRenderer,
  XmlRenderer,
  SubtitleRenderer,
  ZipRenderer,
  TextRenderer,
  FontRenderer,
} from './renderers/lazy';
// Unsupported 体量极小且每次回退都用，直接静态打包到主入口
import UnsupportedRenderer from './renderers/Unsupported/index.vue';

const MAX_ZIP_NESTING_DEPTH = 3;

interface Props {
  files: PreviewFileInput[];
  currentIndex: number;
  customRenderers?: CustomRenderer[];
  /** 运行模式: modal(弹窗) 或 embed(嵌入) */
  mode?: 'modal' | 'embed';
  /** ZIP 嵌套深度（内部使用），超过上限时不再递归渲染 ZIP */
  zipNestingDepth?: number;
  /** 语言 */
  locale?: Locale;
  /** 自定义翻译字典 */
  messages?: Partial<Record<Locale, Partial<Messages>>>;
  /** 无头模式：隐藏工具栏和导航箭头，仅渲染文件内容 */
  headless?: boolean;
  /** 主题模式，默认 'dark' */
  theme?: Theme;
  /** 自定义 RequestInit（或工厂函数）：注入 Authorization 等鉴权头 */
  requestInit?: RequestInitFactory;
  /** 自定义请求处理器：完全接管库内 fetch */
  requestHandler?: RequestHandler;
  /** 返回 true 时，对应文件先 fetcher→blob URL 后喂给 image/video/audio/pdf 等 renderer */
  shouldFetchAsBlob?: ShouldFetchAsBlob;
  /** 自定义下载回调；不传时库内默认通过 fetcher 拉 Blob 触发下载 */
  onDownload?: (file: PreviewFile) => void | Promise<void>;
}

const props = withDefaults(defineProps<Props>(), {
  customRenderers: () => [],
  mode: 'modal',
  zipNestingDepth: 0,
  locale: undefined,
  messages: undefined,
  headless: false,
  theme: 'dark',
  requestInit: undefined,
  requestHandler: undefined,
  shouldFetchAsBlob: undefined,
  onDownload: undefined,
});

provideRequestContext(() => ({
  requestInit: props.requestInit,
  requestHandler: props.requestHandler,
  shouldFetchAsBlob: props.shouldFetchAsBlob,
}));

const emit = defineEmits<{
  (e: 'navigate', index: number): void;
  (e: 'close'): void;
  (e: 'custom-event', payload: CustomRendererEventPayload): void;
}>();

provideLocale(toRef(props, 'locale'), toRef(props, 'messages'));
const { t } = useTranslator();

const systemDark = ref(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true,
);

let mediaQueryCleanup: (() => void) | null = null;

watch(
  () => props.theme,
  (theme) => {
    if (mediaQueryCleanup) {
      mediaQueryCleanup();
      mediaQueryCleanup = null;
    }
    if (theme === 'auto') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => { systemDark.value = e.matches; };
      mql.addEventListener('change', handler);
      mediaQueryCleanup = () => mql.removeEventListener('change', handler);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (mediaQueryCleanup) mediaQueryCleanup();
});

const resolvedTheme = computed(() =>
  props.theme === 'auto' ? (systemDark.value ? 'dark' : 'light') : props.theme,
);
provideResolvedTheme(resolvedTheme);

const zoom = ref(1);
const rotation = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const contentNaturalWidth = ref(0);
const contentNaturalHeight = ref(0);
const imageResetKey = ref(0);

const contentRef = ref<HTMLDivElement | null>(null);
const rootRef = ref<HTMLDivElement | null>(null);

// 导航箭头自动隐藏
const navVisible = ref(true);
let navHideTimer: number | null = null;
const NAV_HIDE_DELAY = 2000;

const resetNavTimer = () => {
  navVisible.value = true;
  if (navHideTimer !== null) {
    clearTimeout(navHideTimer);
  }
  navHideTimer = window.setTimeout(() => {
    navVisible.value = false;
  }, NAV_HIDE_DELAY);
};

const handleMouseMove = () => resetNavTimer();

// 标准化文件输入
const normalizedFiles = computed(() => normalizeFiles(props.files));

const currentFile = computed(() => normalizedFiles.value[props.currentIndex]);

// 命中 shouldFetchAsBlob 时，把 file.url 转成 blob: URL 喂给 src 类 renderer
const resolvedUrl = useResolvedUrl(currentFile);

// 自定义渲染器匹配
const customRenderer = computed(() => {
  if (!currentFile.value) return null;
  return props.customRenderers.find((r) => r.test(currentFile.value!)) || null;
});

const customRendererComponent = computed(() => {
  if (!customRenderer.value || !currentFile.value) return null;
  return customRenderer.value.render(currentFile.value, customCtx.value);
});

const fileType = computed(() => (currentFile.value ? getFileType(currentFile.value) : 'unsupported'));

// 自定义渲染器事件派发器：未绑定 @custom-event 时仍调用 emit（Vue 会安全忽略未声明监听）
const emitCustom = (name: string, payload?: unknown) => {
  if (!currentFile.value) return;
  const ev: CustomRendererEventPayload = { name, payload, file: currentFile.value };
  emit('custom-event', ev);
};

// 自定义渲染器上下文
const customCtx = computed<CustomRendererContext>(() => ({
  emit: emitCustom,
  t: t.value,
  theme: resolvedTheme.value,
  locale: (props.locale ?? 'zh-CN') as Locale,
}));

// 通过 provide 暴露给深层子组件 inject 使用
provide('file-preview:custom-ctx', customCtx);

// 重置状态当文件改变时
watch(
  () => props.currentIndex,
  () => {
    zoom.value = 1;
    rotation.value = 0;
    currentPage.value = 1;
    totalPages.value = 1;
    contentNaturalWidth.value = 0;
    contentNaturalHeight.value = 0;
    navVisible.value = true;
    if (navHideTimer !== null) {
      clearTimeout(navHideTimer);
    }
  }
);

// 图片加载后默认适应窗口
watch(
  [fileType, contentNaturalWidth, contentNaturalHeight],
  () => {
    if (
      fileType.value === 'image' &&
      contentNaturalWidth.value > 0 &&
      contentNaturalHeight.value > 0 &&
      contentRef.value
    ) {
      const containerWidth = contentRef.value.clientWidth;
      const containerHeight = contentRef.value.clientHeight;
      const scaleX = containerWidth / contentNaturalWidth.value;
      const scaleY = containerHeight / contentNaturalHeight.value;
      const newZoom = Math.min(scaleX, scaleY);
      zoom.value = Math.max(0.01, Math.min(10, newZoom));
    }
  }
);

// 导航箭头自动隐藏计时器
watch(
  () => normalizedFiles.value.length,
  (len) => {
    if (len > 1) resetNavTimer();
  },
  { immediate: true }
);

// 键盘导航
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.mode === 'modal') {
    emit('close');
  } else if (e.key === 'ArrowLeft' && props.currentIndex > 0) {
    emit('navigate', props.currentIndex - 1);
  } else if (e.key === 'ArrowRight' && props.currentIndex < normalizedFiles.value.length - 1) {
    emit('navigate', props.currentIndex + 1);
  }
};

onMounted(() => {
  if (props.mode === 'modal') {
    window.addEventListener('keydown', handleKeyDown);
  } else if (rootRef.value) {
    rootRef.value.addEventListener('keydown', handleKeyDown as EventListener);
  }
});

onBeforeUnmount(() => {
  if (navHideTimer !== null) clearTimeout(navHideTimer);
  if (props.mode === 'modal') {
    window.removeEventListener('keydown', handleKeyDown);
  } else if (rootRef.value) {
    rootRef.value.removeEventListener('keydown', handleKeyDown as EventListener);
  }
});

const handleZoomIn = () => {
  zoom.value = Math.min(zoom.value + 0.1, 10);
};
const handleZoomOut = () => {
  zoom.value = Math.max(zoom.value - 0.1, 0.01);
};
const handleRotate = () => {
  rotation.value = rotation.value + 90;
};
const handleRotateLeft = () => {
  rotation.value = rotation.value - 90;
};

const handleFitToWidth = () => {
  if (contentRef.value && contentNaturalWidth.value > 0 && contentNaturalHeight.value > 0) {
    const containerWidth = contentRef.value.clientWidth;
    const containerHeight = contentRef.value.clientHeight;
    const scaleX = containerWidth / contentNaturalWidth.value;
    const scaleY = containerHeight / contentNaturalHeight.value;
    const newZoom = Math.min(scaleX, scaleY);
    zoom.value = Math.max(0.01, Math.min(10, newZoom));
  } else {
    zoom.value = 1;
  }
  rotation.value = 0;
  imageResetKey.value++;
};

const handleOriginalSize = () => {
  zoom.value = 1;
  rotation.value = 0;
  imageResetKey.value++;
};

const handleZoomChange = (newZoom: number) => {
  zoom.value = newZoom;
};

const handleReset = () => {
  zoom.value = 1;
  rotation.value = 0;
  imageResetKey.value++;
};

const fetcher = useFetcher();
const handleDownload = async () => {
  if (!currentFile.value) return;
  if (props.onDownload) {
    await props.onDownload(currentFile.value);
    return;
  }
  try {
    await downloadFileWithFetcher(currentFile.value.url, currentFile.value.name, fetcher.value);
  } catch (err) {
    console.error('[file-preview] download failed:', err);
  }
};

const showCloseButton = computed(() => props.mode === 'modal');

const epubRef = ref<{ prevPage: () => void; nextPage: () => void; toggleFullWidth: () => void; toggleToc: () => void } | null>(null);
const epubCurrent = ref(0);
const epubTotal = ref(0);
const epubFullWidth = ref(false);

const mobiRef = ref<{ prevPage: () => void; nextPage: () => void; toggleFullWidth: () => void; toggleToc: () => void } | null>(null);
const mobiCurrent = ref(0);
const mobiTotal = ref(0);
const mobiFullWidth = ref(false);

const handleEpubChapterChange = (current: number, total: number) => {
  epubCurrent.value = current;
  epubTotal.value = total;
};

const handleMobiChapterChange = (current: number, total: number) => {
  mobiCurrent.value = current;
  mobiTotal.value = total;
};

const zipStats = ref<ZipToolbarStats | null>(null);
const handleZipStatsChange = (stats: ZipToolbarStats | null) => {
  zipStats.value = stats;
};

const textWordWrap = ref(true);
const textHtmlPreview = ref(false);
const markdownViewMode = ref<'preview' | 'source'>('preview');

// 工具栏配置 — 各 Renderer 自行声明。命中自定义渲染器时优先使用其 getToolbarGroups
const toolGroups = computed(() => {
  if (customRenderer.value) {
    return (
      customRenderer.value.getToolbarGroups?.(currentFile.value!, customCtx.value) ?? []
    );
  }
  if (fileType.value === 'image') {
    return getImageToolbarGroups({
      zoom: zoom.value,
      onZoomIn: handleZoomIn,
      onZoomOut: handleZoomOut,
      onFitToWidth: handleFitToWidth,
      onOriginalSize: handleOriginalSize,
      onRotateLeft: handleRotateLeft,
      onRotateRight: handleRotate,
      onReset: handleReset,
      t: t.value,
    });
  }
  if (fileType.value === 'pdf') {
    return getPdfToolbarGroups({
      zoom: zoom.value,
      onZoomIn: handleZoomIn,
      onZoomOut: handleZoomOut,
      onReset: handleReset,
      t: t.value,
    });
  }
  if (fileType.value === 'epub') {
    return getEpubToolbarGroups({
      epubRef: epubRef.value,
      current: epubCurrent.value,
      total: epubTotal.value,
      fullWidth: epubFullWidth.value,
      t: t.value,
    });
  }
  if (fileType.value === 'mobi') {
    return getMobiToolbarGroups({
      mobiRef: mobiRef.value,
      current: mobiCurrent.value,
      total: mobiTotal.value,
      fullWidth: mobiFullWidth.value,
      t: t.value,
    });
  }
  if (fileType.value === 'zip') {
    return getZipToolbarGroups({ stats: zipStats.value, t: t.value });
  }
  if (fileType.value === 'text') {
    const ext = currentFile.value!.name.split('.').pop()?.toLowerCase() || '';
    return getTextToolbarGroups({
      wordWrap: textWordWrap.value,
      onToggleWrap: () => { textWordWrap.value = !textWordWrap.value; },
      isHtml: ext === 'html' || ext === 'htm',
      htmlPreview: textHtmlPreview.value,
      onToggleHtmlPreview: () => { textHtmlPreview.value = !textHtmlPreview.value; },
      t: t.value,
    });
  }
  if (fileType.value === 'markdown') {
    return getMarkdownToolbarGroups({
      viewMode: markdownViewMode.value,
      onToggleViewMode: () => { markdownViewMode.value = markdownViewMode.value === 'preview' ? 'source' : 'preview'; },
      t: t.value,
    });
  }
  return [];
});

// 操作组：下载、关闭（通用，不属于任何 Renderer）
const actionGroups = computed<ToolbarGroup[]>(() => {
  const groups: ToolbarGroup[] = [
    {
      items: [
        { type: 'button', icon: Download, tooltip: t.value('common.download'), action: handleDownload },
      ],
    },
  ];
  if (showCloseButton.value) {
    groups.push({
      items: [
        { type: 'button', icon: X, tooltip: t.value('common.close'), action: () => emit('close') },
      ],
    });
  }
  return groups;
});

const hasToolGroups = computed(() => toolGroups.value.length > 0);
</script>

<template>
  <div
    ref="rootRef"
    :tabindex="mode === 'embed' ? 0 : -1"
    :data-theme="resolvedTheme"
    class="vfp-relative vfp-w-full vfp-h-full vfp-flex vfp-flex-col vfp-overflow-hidden vfp-outline-none"
  >
    <!-- 顶部工具栏 -->
    <div
      v-if="!headless"
      class="vfp-flex-shrink-0 vfp-z-10 vfp-backdrop-blur-md vfp-border-b vfp-bg-surface-toolbar vfp-border-line"
      style="padding-top: env(safe-area-inset-top, 0px)"
    >
      <!-- 第一行: 文件名 + 桌面端工具按钮 -->
      <div class="vfp-flex vfp-items-center vfp-justify-between vfp-px-3 md:vfp-px-5 vfp-py-1.5 md:vfp-py-2.5">
        <!-- 左侧: 文件名 + 分页 -->
        <div class="vfp-flex vfp-items-center vfp-flex-1 vfp-min-w-0 vfp-mr-2 md:vfp-mr-3">
          <h2 class="vfp-font-medium vfp-text-xs md:vfp-text-sm vfp-truncate vfp-text-fg-primary">
            {{ currentFile?.name }}
          </h2>
          <span class="vfp-text-xs vfp-ml-2 vfp-flex-shrink-0 vfp-text-fg-muted">
            {{ currentIndex + 1 }}/{{ normalizedFiles.length }}
          </span>
        </div>

        <!-- 移动端: 仅下载 + 关闭 -->
        <div class="vfp-flex vfp-items-center vfp-gap-1 md:vfp-hidden vfp-flex-shrink-0">
          <template v-for="(group, gi) in actionGroups" :key="'m-action-' + gi">
            <template v-for="(item, ii) in group.items" :key="'m-action-' + gi + '-' + ii">
              <button
                v-if="item.type === 'button'"
                class="toolbar-btn"
                :data-tooltip="(item as ToolbarButtonItem).tooltip"
                :disabled="(item as ToolbarButtonItem).disabled"
                @click="(item as ToolbarButtonItem).action"
              >
                <component :is="(item as ToolbarButtonItem).icon" class="vfp-w-4 vfp-h-4" />
              </button>
            </template>
          </template>
        </div>

        <!-- 桌面端: 完整工具按钮 -->
        <div class="vfp-hidden md:vfp-flex vfp-items-center vfp-gap-1 vfp-flex-shrink-0">
          <template v-for="(group, gi) in toolGroups" :key="'d-tool-' + gi">
            <template v-for="(item, ii) in group.items" :key="'d-tool-' + gi + '-' + ii">
              <button
                v-if="item.type === 'button'"
                class="toolbar-btn"
                :data-tooltip="(item as ToolbarButtonItem).tooltip"
                :disabled="(item as ToolbarButtonItem).disabled"
                @click="(item as ToolbarButtonItem).action"
              >
                <component :is="(item as ToolbarButtonItem).icon" class="vfp-w-4 vfp-h-4" />
              </button>
              <span
                v-else-if="item.type === 'text'"
                class="vfp-text-xs vfp-text-center vfp-font-medium vfp-tabular-nums vfp-text-fg-tertiary"
                :style="{ minWidth: (item as ToolbarTextItem).minWidth || 'auto' }"
              >
                {{ (item as ToolbarTextItem).content }}
              </span>
            </template>
            <div class="vfp-w-px vfp-h-4 vfp-mx-1 vfp-bg-divide" />
          </template>
          <template v-for="(group, gi) in actionGroups" :key="'d-action-' + gi">
            <template v-for="(item, ii) in group.items" :key="'d-action-' + gi + '-' + ii">
              <button
                v-if="item.type === 'button'"
                class="toolbar-btn"
                :data-tooltip="(item as ToolbarButtonItem).tooltip"
                :disabled="(item as ToolbarButtonItem).disabled"
                @click="(item as ToolbarButtonItem).action"
              >
                <component :is="(item as ToolbarButtonItem).icon" class="vfp-w-4 vfp-h-4" />
              </button>
            </template>
          </template>
        </div>
      </div>

      <!-- 移动端第二行工具按钮 -->
      <div
        v-if="hasToolGroups"
        class="vfp-flex vfp-items-center vfp-gap-1 vfp-px-3 vfp-pb-1.5 vfp-overflow-x-auto scrollbar-hide md:vfp-hidden"
      >
        <template v-for="(group, gi) in toolGroups" :key="'m-tool-' + gi">
          <div v-if="gi > 0" class="vfp-w-px vfp-h-4 vfp-mx-0.5 vfp-bg-divide" />
          <template v-for="(item, ii) in group.items" :key="'m-tool-' + gi + '-' + ii">
            <button
              v-if="item.type === 'button'"
              class="toolbar-btn"
              :data-tooltip="(item as ToolbarButtonItem).tooltip"
              :disabled="(item as ToolbarButtonItem).disabled"
              @click="(item as ToolbarButtonItem).action"
            >
              <component :is="(item as ToolbarButtonItem).icon" class="vfp-w-4 vfp-h-4" />
            </button>
            <span
              v-else-if="item.type === 'text'"
              class="vfp-text-xs vfp-text-center vfp-font-medium vfp-tabular-nums vfp-text-fg-tertiary"
              :style="{ minWidth: (item as ToolbarTextItem).minWidth || 'auto' }"
            >
              {{ (item as ToolbarTextItem).content }}
            </span>
          </template>
        </template>
      </div>
    </div>

    <!-- 内容区域 -->
    <div
      ref="contentRef"
      class="vfp-flex-1 vfp-flex vfp-items-center vfp-justify-center vfp-overflow-auto"
      @mousemove="handleMouseMove"
    >
      <template v-if="currentFile">
        <component :is="customRendererComponent" v-if="customRendererComponent" :file="currentFile" :ctx="customCtx" />
        <template v-else>
          <ImageRenderer
            v-if="fileType === 'image'"
            :url="resolvedUrl"
            :zoom="zoom"
            :rotation="rotation"
            :reset-key="imageResetKey"
            :file-size="currentFile.size"
            @zoom-change="handleZoomChange"
            @natural-width-change="(w: number) => (contentNaturalWidth = w)"
            @natural-height-change="(h: number) => (contentNaturalHeight = h)"
          />
          <PdfRenderer
            v-else-if="fileType === 'pdf'"
            :url="resolvedUrl"
            :zoom="zoom"
            :current-page="currentPage"
            @page-change="(p: number) => (currentPage = p)"
            @total-pages-change="(t: number) => (totalPages = t)"
            @page-width-change="(w: number) => (contentNaturalWidth = w)"
          />
          <DocxRenderer v-else-if="fileType === 'docx'" :url="resolvedUrl" />
          <XlsxRenderer v-else-if="fileType === 'xlsx'" :url="resolvedUrl" />
          <PptxRenderer v-else-if="fileType === 'pptx'" :url="resolvedUrl" />
          <MsgRenderer v-else-if="fileType === 'msg'" :url="resolvedUrl" />
          <EpubRenderer
            v-else-if="fileType === 'epub'"
            ref="epubRef"
            :url="resolvedUrl"
            @chapter-change="handleEpubChapterChange"
            @full-width-change="(v: boolean) => (epubFullWidth = v)"
          />
          <MobiRenderer
            v-else-if="fileType === 'mobi'"
            ref="mobiRef"
            :url="resolvedUrl"
            @chapter-change="handleMobiChapterChange"
            @full-width-change="(v: boolean) => (mobiFullWidth = v)"
          />
          <VideoRenderer v-else-if="fileType === 'video'" :url="resolvedUrl" />
          <AudioRenderer
            v-else-if="fileType === 'audio'"
            :url="resolvedUrl"
            :file-name="currentFile.name"
          />
          <MarkdownRenderer v-else-if="fileType === 'markdown'" :url="resolvedUrl" :view-mode="markdownViewMode" />
          <JsonRenderer
            v-else-if="fileType === 'json'"
            :url="resolvedUrl"
            :file-name="currentFile.name"
          />
          <CsvRenderer
            v-else-if="fileType === 'csv'"
            :url="resolvedUrl"
            :file-name="currentFile.name"
          />
          <XmlRenderer
            v-else-if="fileType === 'xml'"
            :url="resolvedUrl"
            :file-name="currentFile.name"
          />
          <SubtitleRenderer
            v-else-if="fileType === 'subtitle'"
            :url="resolvedUrl"
            :file-name="currentFile.name"
          />
          <template v-else-if="fileType === 'zip' && props.zipNestingDepth >= MAX_ZIP_NESTING_DEPTH">
            <UnsupportedRenderer
              :file-name="currentFile.name"
              :file-type="currentFile.type"
              @download="handleDownload"
            />
          </template>
          <ZipRenderer
            v-else-if="fileType === 'zip'"
            :url="resolvedUrl"
            :nesting-depth="props.zipNestingDepth"
            @stats-change="handleZipStatsChange"
          />
          <TextRenderer
            v-else-if="fileType === 'text'"
            :url="resolvedUrl"
            :file-name="currentFile.name"
            :word-wrap="textWordWrap"
            :html-preview="textHtmlPreview"
          />
          <FontRenderer v-else-if="fileType === 'font'" :url="resolvedUrl" />
          <UnsupportedRenderer
            v-else
            :file-name="currentFile.name"
            :file-type="currentFile.type"
            @download="handleDownload"
          />
        </template>
      </template>
    </div>

    <!-- 左右导航箭头 -->
    <template v-if="!headless && normalizedFiles.length > 1">
      <button
        v-if="currentIndex > 0"
        :style="{
          opacity: navVisible ? 1 : 0,
          transform: navVisible ? 'translateY(-50%)' : 'translateY(-50%) translateX(-20px)',
          pointerEvents: navVisible ? 'auto' : 'none',
          transition: 'opacity 0.2s, transform 0.2s',
        }"
        class="vfp-absolute vfp-z-20 vfp-left-2 md:vfp-left-4 vfp-top-1/2 vfp-w-10 vfp-h-10 md:vfp-w-12 md:vfp-h-12 vfp-rounded-full vfp-backdrop-blur-xl vfp-border vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors vfp-shadow-2xl vfp-bg-surface-nav vfp-border-line hover:vfp-bg-surface-nav-hover vfp-text-fg-primary"
        @click="emit('navigate', currentIndex - 1)"
        @mouseenter="navVisible = true"
      >
        <ChevronLeft class="vfp-w-5 vfp-h-5 md:vfp-w-6 md:vfp-h-6" />
      </button>

      <button
        v-if="currentIndex < normalizedFiles.length - 1"
        :style="{
          opacity: navVisible ? 1 : 0,
          transform: navVisible ? 'translateY(-50%)' : 'translateY(-50%) translateX(20px)',
          pointerEvents: navVisible ? 'auto' : 'none',
          transition: 'opacity 0.2s, transform 0.2s',
        }"
        class="vfp-absolute vfp-z-20 vfp-right-2 md:vfp-right-4 vfp-top-1/2 vfp-w-10 vfp-h-10 md:vfp-w-12 md:vfp-h-12 vfp-rounded-full vfp-backdrop-blur-xl vfp-border vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors vfp-shadow-2xl vfp-bg-surface-nav vfp-border-line hover:vfp-bg-surface-nav-hover vfp-text-fg-primary"
        @click="emit('navigate', currentIndex + 1)"
        @mouseenter="navVisible = true"
      >
        <ChevronRight class="vfp-w-5 vfp-h-5 md:vfp-w-6 md:vfp-h-6" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.toolbar-btn {
  position: relative;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.15s;
  user-select: none;
  color: var(--fp-fg-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
}
@media (min-width: 768px) {
  .toolbar-btn {
    padding: 0.375rem;
  }
}
.toolbar-btn:hover {
  background: var(--fp-surface-2);
}
.toolbar-btn:active {
  background: var(--fp-surface-3);
}
.toolbar-btn:disabled {
  color: var(--fp-fg-disabled);
  cursor: not-allowed;
}
/* Tooltip */
.toolbar-btn[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  margin-top: 6px;
  padding: 4px 8px;
  background: var(--fp-fg-primary);
  color: var(--fp-fg-inverse);
  font-size: 12px;
  line-height: 1.5;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
  z-index: 50;
}
.toolbar-btn[data-tooltip]::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  margin-top: 2px;
  border: 4px solid transparent;
  border-bottom-color: var(--fp-fg-primary);
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
  z-index: 50;
}
.toolbar-btn[data-tooltip]:hover::after,
.toolbar-btn[data-tooltip]:hover::before {
  opacity: 1;
  visibility: visible;
}
</style>
