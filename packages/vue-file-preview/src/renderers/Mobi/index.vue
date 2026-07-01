<script setup lang="ts">
import { ref, watch, onBeforeUnmount, onMounted, defineComponent, h, type PropType } from 'vue';
import { X, ChevronLeft, ChevronRight, List, Maximize2, Minimize2 } from 'lucide-vue-next';
import 'foliate-js/view.js';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import RendererError from '../RendererError.vue';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

interface TocItem {
  label: string;
  href?: string;
  subitems?: TocItem[];
}

interface FoliateView extends HTMLElement {
  book: {
    sections: unknown[];
    toc?: TocItem[];
    destroy?: () => void;
  } | null;
  renderer: HTMLElement & {
    setStyles?: (css: string) => void;
    next?: () => Promise<void>;
    page?: number;
    pages?: number;
  };
  open(target: string | Blob | File | ArrayBuffer): Promise<void>;
  goTo(target: number | string): Promise<void>;
  prev(distance?: number): Promise<void>;
  next(distance?: number): Promise<void>;
}

const READER_CSS = `
  @namespace epub "http://www.idpf.org/2007/ops";
  html { color-scheme: light; }
  body {
    background: #ffffff !important;
    color: #1a1a1a !important;
    font-family: "Noto Serif SC", "Source Han Serif SC", Georgia, "Times New Roman", serif !important;
    font-size: 16px !important;
    line-height: 2 !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }
  p, li, blockquote, dd { line-height: 2; text-align: justify; }
  p { text-indent: 2em; margin: 0.8em 0; }
  h1 { text-align: center; margin: 1.5em 0 1em; }
  h2 { margin: 1.2em 0 0.8em; }
  h3 { margin: 1em 0 0.6em; }
  img { max-width: 100% !important; height: auto !important; }
  a { color: #2563eb; text-decoration: none; }
  pre { white-space: pre-wrap !important; }
`;

const A4_WIDTH = 794;

const props = defineProps<{ url: string }>();

const emitter = new ToolbarEventEmitter();

const { t } = useTranslator();
const fetcher = useFetcher();

const hostRef = ref<HTMLDivElement | null>(null);
let viewInstance: FoliateView | null = null;
let totalLocations = 1;

// 内部状态
const currentChapter = ref(1);
const totalChapters = ref(1);

const loading = ref(false);
const error = ref<string | null>(null);
const toc = ref<TocItem[]>([]);
const showToc = ref(false);
const activeTocHref = ref('');
const isFullWidth = ref(false);

// 监听状态变化，通知工具栏更新（对齐 React：增加 toc.length 监听）
watch([currentChapter, totalChapters, isFullWidth, showToc, loading, () => toc.value.length], () => {
  emitter.notify();
});

const reportProgress = (current: number, total: number) => {
  if (total > 0) totalLocations = total;
  currentChapter.value = Math.max(1, current + 1);
  totalChapters.value = totalLocations;
};

const prevPage = () => { viewInstance?.prev().catch(() => {}); };
const nextPage = () => { viewInstance?.next().catch(() => {}); };
const toggleToc = () => { showToc.value = !showToc.value; };
const toggleFullWidth = () => {
  isFullWidth.value = !isFullWidth.value;
  if (viewInstance?.renderer) {
    viewInstance.renderer.setAttribute('max-inline-size', isFullWidth.value ? '9999' : '720');
  }
};

const handleTocClick = (href: string) => {
  activeTocHref.value = href;
  showToc.value = false;
  viewInstance?.goTo(href).catch(() => {});
};

// 工具栏配置（对齐 React：List 图标、disabled 代替条件、Minimize2/Maximize2 切换）
const getToolbarGroups = (): ToolbarGroup[] => [
  {
    items: [
      {
        type: 'button',
        icon: List,
        tooltip: t.value('toolbar.toc'),
        action: toggleToc,
        disabled: toc.value.length === 0,
        active: showToc.value,
      },
    ],
  },
  {
    items: [
      {
        type: 'button',
        icon: ChevronLeft,
        tooltip: t.value('toolbar.prev_page'),
        action: prevPage,
        disabled: currentChapter.value <= 1,
      },
      {
        type: 'text',
        content: `${currentChapter.value} / ${totalChapters.value}`,
        minWidth: '4rem',
      },
      {
        type: 'button',
        icon: ChevronRight,
        tooltip: t.value('toolbar.next_page'),
        action: nextPage,
        disabled: currentChapter.value >= totalChapters.value,
      },
    ],
  },
  {
    items: [
      {
        type: 'button',
        icon: isFullWidth.value ? Minimize2 : Maximize2,
        tooltip: isFullWidth.value ? t.value('toolbar.normal_width') : t.value('toolbar.full_width'),
        action: toggleFullWidth,
        active: isFullWidth.value,
      },
    ],
  },
];

defineExpose<RendererHandle>({
  getToolbarGroups,
  onToolbarChange: (listener) => emitter.subscribe(listener),
});

// 吞掉 foliate-js paginator 卸载/切换窗口期由 ResizeObserver 触发的 uncaught error。
// 上游 bug：Paginator.destroy 里 unobserve 目标错了（unobserve(this) 而非 unobserve(container)），
// observer 从未真正解除，view 已经半 destroy 时仍会触发一次 render，此时 #view / iframe body 已 null。
// 已知触发：
//   - "Cannot destructure property 'style' of 'el' as it is null" (setStylesImportant)
//   - "Failed to execute 'getComputedStyle' on 'Window': parameter 1 is not of type 'Element'" (#replaceBackground)
const paginatorErrorHandler = (e: ErrorEvent) => {
  if (e.filename?.includes('paginator')) {
    e.preventDefault();
  }
};
onMounted(() => window.addEventListener('error', paginatorErrorHandler));
onBeforeUnmount(() => window.removeEventListener('error', paginatorErrorHandler));

const load = async () => {
  const host = hostRef.value;
  if (!host) return;
  loading.value = true;
  error.value = null;
  toc.value = [];
  showToc.value = false;
  activeTocHref.value = '';
  host.replaceChildren();
  viewInstance = null;
  let progressReported = false;
  // 多 section 文件的页码累加器：记录各 section 的实际页数
  const sectionPagesMap = new Map<number, number>();

  try {
    const view = document.createElement('foliate-view') as FoliateView;
    host.appendChild(view);
    viewInstance = view;

    // 先注册事件
    view.addEventListener('relocate', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;

      const sectionCount = viewInstance?.book?.sections.length ?? 0;
      const renderer = viewInstance?.renderer as
        | {
            page?: number;
            pages?: number;
            getContents?: () => Array<{ index: number }>;
          }
        | undefined;

      // 用 Paginator 的 page/pages 得到精确翻页数：
      // - 单 section：pages - 2 就是全书总页数
      // - 多 section：记录已翻过的 section 的 pages，累加得到全书页码
      const sectionIdx = renderer?.getContents?.()[0]?.index ?? -1;
      if (
        renderer
        && typeof renderer.page === 'number'
        && typeof renderer.pages === 'number'
        && renderer.pages > 2
        && sectionIdx >= 0
      ) {
        progressReported = true;
        const curSectionPages = renderer.pages - 2;
        // 更新当前 section 的实际页数（每次进入该 section 都刷新，防止首次未 render 完整）
        sectionPagesMap.set(sectionIdx, curSectionPages);

        // 累加已确知的前置 section pages
        let pagesBefore = 0;
        for (let i = 0; i < sectionIdx; i++) {
          pagesBefore += sectionPagesMap.get(i) ?? 0;
        }
        const currentPage = pagesBefore + Math.min(curSectionPages, Math.max(1, renderer.page));

        // total 策略：
        // - 单 section：pages - 2 就是全书精确页数
        // - 多 section：用"当前 section 字符/页数比"外推未访问 section 的 pages。
        //   同一本书字体、行距、页宽恒定，比率稳定，比 SectionProgress 字符估算准得多。
        //   翻到末页（fraction ≈ 1）时用 currentPage 覆盖，得到真实总数。
        const atEnd = (detail.fraction ?? 0) >= 0.999;
        let total: number;
        if (sectionCount === 1) {
          total = curSectionPages;
        } else if (atEnd) {
          total = currentPage;
        } else {
          const sections = viewInstance?.book?.sections ?? [];
          const curSize = (sections[sectionIdx] as { size?: number } | undefined)?.size ?? 0;
          const ratio = curSize > 0 ? curSectionPages / curSize : 0;
          let est = 0;
          for (let i = 0; i < sectionCount; i++) {
            if (sectionPagesMap.has(i)) {
              est += sectionPagesMap.get(i)!;
            } else {
              const s = (sections[i] as { size?: number } | undefined)?.size ?? 0;
              est += Math.max(1, Math.round(s * ratio));
            }
          }
          total = Math.max(currentPage, est);
        }

        reportProgress(currentPage - 1, total);
        const tocItem = detail.tocItem as { href?: string } | undefined;
        if (tocItem?.href) activeTocHref.value = tocItem.href;
        return;
      }

      // 兜底：SectionProgress.location（基于字符数估算）
      const loc = detail.location as { current?: number; total?: number } | undefined;
      if (loc && typeof loc.current === 'number' && typeof loc.total === 'number') {
        progressReported = true;
        // 当翻到末尾时（fraction 达到 1 表示全书 100%），用 current + 1 作为实际可达的 total，
        // 覆盖 SectionProgress 基于字符数向上取整的估算值（会高估）
        const atEnd = (detail.fraction ?? 0) >= 0.999;
        const actualTotal = atEnd ? loc.current + 1 : loc.total;
        reportProgress(loc.current, actualTotal);
      } else {
        const sections = viewInstance?.book?.sections ?? [];
        const idx = detail.index ?? 0;
        const frac = detail.fraction ?? 0;
        const total = Math.max(sections.length, 1);
        reportProgress(Math.round((idx + frac) / total * total), total);
      }
      const tocItem = detail.tocItem as { href?: string } | undefined;
      if (tocItem?.href) activeTocHref.value = tocItem.href;
    });

    const res = await fetcher.value(props.url);
    if (!res.ok) throw new Error(`请求失败: ${res.status}`);
    const blob = await res.blob();
    let name = 'book.mobi';
    try {
      const u = new URL(props.url, window.location.href);
      const base = u.pathname.split('/').pop();
      if (base) name = decodeURIComponent(base);
    } catch { /* blob: URL */ }

    await view.open(new File([blob], name));

    // 配置 paginator：paginated 模式 + 动画
    const renderer = view.renderer;
    if (renderer) {
      renderer.setAttribute('animated', '');
      renderer.setAttribute('max-inline-size', '720');
      renderer.setAttribute('margin', '48');
      renderer.setAttribute('gap', '5%');
      await renderer.next?.();
      // setStyles 依赖 view.document 存在，必须在 next() 触发首次渲染后调用
      renderer.setStyles?.(READER_CSS);
    }

    toc.value = (view.book?.toc ?? []) as TocItem[];
    loading.value = false;
    // 只在 relocate 事件从未报告 progress 时使用 sections.length 作为 fallback，
    // 避免覆盖 SectionProgress 报告的更准确的 total
    if (!progressReported) {
      reportProgress(0, view.book?.sections.length ?? 1);
    }
  } catch (err) {
    console.error('MOBI/AZW3 加载错误:', err);
    error.value = t.value('mobi.load_failed');
    loading.value = false;
  }
};

// mount 后如果已有 URL 立即加载；后续 URL 变化通过 watch 触发
onMounted(() => {
  if (props.url) load();
});
watch(() => props.url, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl) load();
});
onBeforeUnmount(() => {
  try { (viewInstance as unknown as { close?: () => void })?.close?.(); } catch { /* ignore */ }
  try { viewInstance?.book?.destroy?.(); } catch { /* ignore */ }
  viewInstance = null;
  hostRef.value?.replaceChildren();
});
</script>

<template>
  <div
    class="vfp-relative vfp-w-full vfp-h-full vfp-flex vfp-justify-center vfp-bg-surface-1 vfp-overflow-hidden"
  >
    <RendererError v-if="error" :message="error" class="vfp-absolute vfp-inset-0" />

    <div
      v-if="loading && !error"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-z-10"
    >
      <div class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin" />
    </div>

    <!-- 目录侧栏 -->
    <div
      v-if="toc.length > 0"
      class="vfp-absolute vfp-inset-0 vfp-z-20 vfp-flex vfp-transition-opacity vfp-duration-300"
      :style="{ opacity: showToc ? 1 : 0, pointerEvents: showToc ? 'auto' : 'none' }"
    >
      <div
        class="vfp-w-72 vfp-max-w-[80%] vfp-h-full vfp-bg-surface-overlay vfp-backdrop-blur-xl vfp-border-r vfp-border-line-weak vfp-flex vfp-flex-col vfp-shadow-2xl vfp-transition-transform vfp-duration-300"
        :style="{ transform: showToc ? 'translateX(0)' : 'translateX(-100%)' }"
      >
        <div class="vfp-flex vfp-items-center vfp-justify-between vfp-px-4 vfp-py-3 vfp-border-b vfp-border-line-weak vfp-flex-shrink-0">
          <span class="vfp-text-fg-primary vfp-font-medium vfp-text-sm">{{ t('toolbar.toc') }}</span>
          <button class="toc-close-btn" @click="showToc = false">
            <X class="vfp-w-4 vfp-h-4" />
          </button>
        </div>
        <div class="vfp-flex-1 vfp-overflow-y-auto vfp-py-4 vfp-px-1">
          <MobiTocList :items="toc" :active-href="activeTocHref" @select="handleTocClick" />
        </div>
      </div>
      <div
        class="vfp-flex-1 vfp-transition-opacity vfp-duration-300"
        :style="{ background: showToc ? 'rgba(0,0,0,0.3)' : 'transparent' }"
        @click="showToc = false"
      />
    </div>

    <div
      v-if="!error"
      ref="hostRef"
      class="vfp-h-full vfp-bg-surface-toolbar vfp-shadow-lg"
      :style="{ width: isFullWidth ? '100%' : A4_WIDTH + 'px', maxWidth: '100%', transition: 'width 0.3s ease' }"
    />
  </div>
</template>

<script lang="ts">
interface TocItemLocal {
  label: string;
  href?: string;
  subitems?: TocItemLocal[];
}

const MobiTocList = defineComponent({
  name: 'MobiTocList',
  props: {
    items: { type: Array as PropType<TocItemLocal[]>, required: true },
    activeHref: { type: String, default: '' },
    depth: { type: Number, default: 0 },
  },
  emits: ['select'],
  render(): ReturnType<typeof h> {
    return h(
      'ul',
      { style: { listStyle: 'none', padding: 0, margin: this.depth > 0 ? '0 0 0 16px' : 0 } },
      this.items.map((item: TocItemLocal, i: number) =>
        h('li', { key: `${item.href ?? item.label}-${i}` }, [
          item.href
            ? h(
                'button',
                {
                  onClick: () => this.$emit('select', item.href),
                  class: [
                    'vfp-w-full vfp-text-left vfp-py-2 vfp-px-3 vfp-text-sm vfp-rounded vfp-transition-all vfp-truncate',
                    this.activeHref === item.href
                      ? 'vfp-text-fg-primary vfp-bg-surface-3 vfp-font-medium'
                      : 'vfp-text-fg-secondary hover:vfp-text-fg-primary hover:vfp-bg-surface-2',
                  ],
                  title: item.label,
                  style: 'background: none; border: none; cursor: pointer',
                },
                item.label?.trim()
              )
            : h(
                'div',
                { class: 'vfp-w-full vfp-py-2 vfp-px-3 vfp-text-sm vfp-text-fg-tertiary vfp-truncate' },
                item.label?.trim()
              ),
          item.subitems?.length
            ? h(MobiTocList, {
                items: item.subitems,
                activeHref: this.activeHref,
                depth: (this.depth as number) + 1,
                onSelect: (href: string) => this.$emit('select', href),
              })
            : null,
        ])
      )
    );
  },
});

export default { name: 'MobiRenderer' };
</script>

<style scoped>
.toc-close-btn {
  color: var(--fp-fg-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}
.toc-close-btn:hover { color: #fff; }
</style>
