<script setup lang="ts">
import { ref, watch, onBeforeUnmount, defineComponent, h, type PropType } from 'vue';
import { X } from 'lucide-vue-next';
import 'foliate-js/view.js';

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
const emit = defineEmits<{
  (e: 'chapterChange', current: number, total: number): void;
  (e: 'fullWidthChange', isFullWidth: boolean): void;
}>();

const hostRef = ref<HTMLDivElement | null>(null);
let viewInstance: FoliateView | null = null;
let totalLocations = 1;

const loading = ref(true);
const error = ref<string | null>(null);
const toc = ref<TocItem[]>([]);
const showToc = ref(false);
const activeTocHref = ref('');
const isFullWidth = ref(false);

const reportProgress = (current: number, total: number) => {
  if (total > 0) totalLocations = total;
  emit('chapterChange', Math.max(1, current + 1), totalLocations);
};

const prevPage = () => { viewInstance?.prev().catch(() => {}); };
const nextPage = () => { viewInstance?.next().catch(() => {}); };
const toggleToc = () => { showToc.value = !showToc.value; };
const toggleFullWidth = () => {
  isFullWidth.value = !isFullWidth.value;
  emit('fullWidthChange', isFullWidth.value);
  if (viewInstance?.renderer) {
    viewInstance.renderer.setAttribute('max-inline-size', isFullWidth.value ? '9999' : '720');
  }
};

const handleTocClick = (href: string) => {
  activeTocHref.value = href;
  showToc.value = false;
  viewInstance?.goTo(href).catch(() => {});
};

defineExpose({ prevPage, nextPage, toggleFullWidth, toggleToc });

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

  try {
    const view = document.createElement('foliate-view') as FoliateView;
    host.appendChild(view);
    viewInstance = view;

    // 先注册事件
    view.addEventListener('relocate', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const loc = detail.location as { current?: number; total?: number } | undefined;
      if (loc && typeof loc.current === 'number' && typeof loc.total === 'number') {
        reportProgress(loc.current, loc.total);
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

    const res = await fetch(props.url);
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
      renderer.setStyles?.(READER_CSS);
      await renderer.next?.();
    }

    toc.value = (view.book?.toc ?? []) as TocItem[];
    loading.value = false;
    reportProgress(0, view.book?.sections.length ?? 1);
  } catch (err) {
    console.error('MOBI/AZW3 加载错误:', err);
    error.value = '电子书加载失败，文件可能已损坏或带有 DRM 保护';
    loading.value = false;
  }
};

watch(() => props.url, () => load(), { immediate: true });
onBeforeUnmount(() => {
  try { viewInstance?.book?.destroy?.(); } catch { /* ignore */ }
  viewInstance = null;
  hostRef.value?.replaceChildren();
});
</script>

<template>
  <div
    class="vfp-relative vfp-w-full vfp-h-full vfp-flex vfp-justify-center vfp-overflow-hidden"
    style="background: #f5f5f0"
  >
    <div
      v-if="error"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-text-white/70 vfp-text-center vfp-p-6"
    >
      <p class="vfp-text-lg">{{ error }}</p>
    </div>

    <div
      v-if="loading && !error"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-z-10"
    >
      <div class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-white/20 vfp-border-t-white vfp-rounded-full vfp-animate-spin" />
    </div>

    <!-- 目录侧栏 -->
    <div
      v-if="toc.length > 0"
      class="vfp-absolute vfp-inset-0 vfp-z-20 vfp-flex vfp-transition-opacity vfp-duration-300"
      :style="{ opacity: showToc ? 1 : 0, pointerEvents: showToc ? 'auto' : 'none' }"
    >
      <div
        class="vfp-w-72 vfp-max-w-[80%] vfp-h-full vfp-bg-black/90 vfp-backdrop-blur-xl vfp-border-r vfp-border-white/10 vfp-flex vfp-flex-col vfp-shadow-2xl vfp-transition-transform vfp-duration-300"
        :style="{ transform: showToc ? 'translateX(0)' : 'translateX(-100%)' }"
      >
        <div class="vfp-flex vfp-items-center vfp-justify-between vfp-px-4 vfp-py-3 vfp-border-b vfp-border-white/10 vfp-flex-shrink-0">
          <span class="vfp-text-white vfp-font-medium vfp-text-sm">目录</span>
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
      class="vfp-h-full vfp-bg-white vfp-shadow-lg"
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
                      ? 'vfp-text-white vfp-bg-white/15 vfp-font-medium'
                      : 'vfp-text-white/70 hover:vfp-text-white hover:vfp-bg-white/10',
                  ],
                  title: item.label,
                  style: 'background: none; border: none; cursor: pointer',
                },
                item.label?.trim()
              )
            : h(
                'div',
                { class: 'vfp-w-full vfp-py-2 vfp-px-3 vfp-text-sm vfp-text-white/50 vfp-truncate' },
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
  color: rgba(255, 255, 255, 0.6);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
}
.toc-close-btn:hover { color: #fff; }
</style>
