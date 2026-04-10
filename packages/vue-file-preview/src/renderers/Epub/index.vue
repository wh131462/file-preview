<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import ePub from '@likecoin/epub-ts';
import { X } from 'lucide-vue-next';

interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

interface RenditionLike {
  display: (target?: string) => Promise<unknown>;
  next: () => Promise<unknown>;
  prev: () => Promise<unknown>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  resize: (width: number, height: number) => void;
  currentLocation: () => unknown;
  destroy?: () => void;
  themes: {
    register: (name: string, styles: Record<string, unknown>) => void;
    select: (name: string) => void;
  };
}

interface BookLike {
  ready: Promise<unknown>;
  loaded: { navigation: Promise<unknown> };
  locations: {
    generate: (chars: number) => Promise<string[]>;
    length: () => number;
    locationFromCfi: (cfi: string) => number;
  };
  renderTo: (el: HTMLElement, opts: Record<string, unknown>) => RenditionLike;
  destroy: () => void;
}

const A4_WIDTH = 794;

const props = defineProps<{ url: string }>();

const emit = defineEmits<{
  (e: 'chapterChange', current: number, total: number): void;
  (e: 'fullWidthChange', isFullWidth: boolean): void;
}>();

const viewerRef = ref<HTMLDivElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const isFullWidth = ref(false);
const toc = ref<TocItem[]>([]);
const showToc = ref(false);
const activeTocHref = ref('');

let book: BookLike | null = null;
let rendition: RenditionLike | null = null;
let totalLocations = 0;
let lastCfi: string | null = null;

const cleanup = () => {
  try { rendition?.destroy?.(); } catch { /* ignore */ }
  try { book?.destroy(); } catch { /* ignore */ }
  rendition = null;
  book = null;
  totalLocations = 0;
  lastCfi = null;
};

const prevChapter = () => { rendition?.prev(); };
const nextChapter = () => { rendition?.next(); };
const toggleFullWidth = () => {
  isFullWidth.value = !isFullWidth.value;
  emit('fullWidthChange', isFullWidth.value);
  setTimeout(() => {
    if (viewerRef.value && rendition) {
      rendition.resize(viewerRef.value.offsetWidth, viewerRef.value.offsetHeight);
      if (lastCfi) {
        rendition.display(lastCfi);
      }
      // resize/display 可能重建 .epub-container，需要重新绑定滚动监听
      reattachScrollListener();
    }
  }, 350);
};
const toggleToc = () => { showToc.value = !showToc.value; };
const handleTocClick = (href: string) => {
  activeTocHref.value = href;
  rendition?.display(href);
  showToc.value = false;
};

const isActive = (href: string) => {
  return href === activeTocHref.value;
};

defineExpose({ prevChapter, nextChapter, toggleFullWidth, toggleToc });

const loadEpub = async () => {
  if (!viewerRef.value) return;

  loading.value = true;
  error.value = null;
  toc.value = [];
  showToc.value = false;
  viewerRef.value.innerHTML = '';
  cleanup();

  try {
    let bookInput: string | ArrayBuffer = props.url;
    if (props.url.startsWith('blob:')) {
      const resp = await fetch(props.url);
      bookInput = await resp.arrayBuffer();
    }

    book = ePub(bookInput) as unknown as BookLike;

    rendition = book.renderTo(viewerRef.value, {
      manager: 'continuous',
      flow: 'scrolled',
      width: '100%',
      height: '100%',
    });

    rendition.themes.register('default', {
      body: {
        background: '#ffffff !important',
        color: '#1a1a1a !important',
        'font-family': '"Noto Serif SC", "Source Han Serif SC", Georgia, "Times New Roman", serif !important',
        'font-size': '16px !important',
        'line-height': '2 !important',
        padding: '40px 60px !important',
        'max-width': '100% !important',
        'box-sizing': 'border-box !important',
        'word-break': 'break-word !important',
        'overflow-wrap': 'break-word !important',
      },
      p: { 'text-indent': '2em !important', margin: '0.8em 0 !important' },
      h1: { 'text-align': 'center !important', margin: '1.5em 0 1em !important' },
      h2: { margin: '1.2em 0 0.8em !important' },
      h3: { margin: '1em 0 0.6em !important' },
      img: { 'max-width': '100% !important', height: 'auto !important' },
      a: { color: '#2563eb !important', 'text-decoration': 'none !important' },
    });
    rendition.themes.select('default');

    await book.ready;

    // 异步生成 locations 索引
    book.locations.generate(1024).then(() => {
      if (!book) return;
      totalLocations = book.locations.length();
      const loc = rendition?.currentLocation() as { start?: { location?: number } } | undefined;
      const cur = loc?.start?.location ?? 0;
      emit('chapterChange', cur + 1, totalLocations);
    }).catch(() => { /* ignore */ });

    const nav = await book.loaded.navigation as { toc?: TocItem[] };
    if (Array.isArray(nav?.toc)) {
      toc.value = nav.toc;
    }

    await rendition.display();

    loading.value = false;
    emit('chapterChange', 1, totalLocations || 1);

    rendition.on('relocated', (location: unknown) => {
      const loc = location as { start?: { cfi?: string; location?: number; href?: string } };
      if (loc?.start?.cfi) {
        lastCfi = loc.start.cfi;
      }
      if (loc?.start?.href) {
        // 根据 spine href 查找匹配的 TOC 项
        const spineHref = loc.start.href;
        const matches: string[] = [];
        const collect = (items: TocItem[]) => {
          for (const item of items) {
            const base = item.href.split('#')[0];
            if (base && (spineHref === base || spineHref.endsWith('/' + base) || spineHref.endsWith(base))) {
              matches.push(item.href);
            }
            if (item.subitems) collect(item.subitems);
          }
        };
        collect(toc.value);
        if (matches.length === 1) {
          activeTocHref.value = matches[0];
        }
        // 多个匹配（同一文件不同 anchor）时保持当前选中（由点击设置）
      }
      const cur = loc?.start?.location;
      if (typeof cur === 'number' && totalLocations > 0) {
        emit('chapterChange', cur + 1, totalLocations);
      }
    });
  } catch (err) {
    console.error('EPUB 加载错误:', err);
    error.value = 'EPUB 文件加载失败';
    loading.value = false;
  }
};

const onResize = () => {
  if (!viewerRef.value || !rendition) return;
  rendition.resize(viewerRef.value.offsetWidth, viewerRef.value.offsetHeight);
};

// 监听 epub-container 滚动，接近底部时强制加载后续 section
let scrollContainer: Element | null = null;
const onContainerScroll = () => {
  if (!scrollContainer) return;
  const el = scrollContainer as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
    try {
      const mgr = (rendition as unknown as { manager?: { check?: (t?: number, e?: number) => Promise<unknown> } })?.manager;
      // 传递垂直偏移量参数，让 check() 在接近底部时就触发加载下一节
      mgr?.check?.(500, 500);
    } catch { /* ignore */ }
  }
};

const reattachScrollListener = () => {
  // 清理旧监听
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', onContainerScroll);
    scrollContainer = null;
  }
  const tryAttach = () => {
    scrollContainer = viewerRef.value?.querySelector('.epub-container') ?? null;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onContainerScroll, { passive: true });
    } else {
      requestAnimationFrame(tryAttach);
    }
  };
  requestAnimationFrame(tryAttach);
};

onMounted(() => {
  loadEpub();
  window.addEventListener('resize', onResize);
  reattachScrollListener();
});

watch(() => props.url, () => loadEpub());

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  scrollContainer?.removeEventListener('scroll', onContainerScroll);
  cleanup();
});
</script>

<template>
  <div class="vfp-relative vfp-w-full vfp-h-full vfp-flex vfp-justify-center vfp-overflow-hidden" style="background: #f5f5f0">
    <div v-if="error" class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-text-white/70 vfp-text-center">
      <p class="vfp-text-lg">{{ error }}</p>
    </div>

    <div
      v-if="loading && !error"
      class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-z-10"
    >
      <div class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-white/20 vfp-border-t-white vfp-rounded-full vfp-animate-spin" />
    </div>

    <!-- 目录侧栏 - 滑入动画 -->
    <div
      v-if="toc.length > 0"
      class="vfp-absolute vfp-inset-0 vfp-z-20 vfp-flex"
      :style="{ opacity: showToc ? 1 : 0, pointerEvents: showToc ? 'auto' : 'none', transition: 'opacity 0.3s' }"
    >
      <div
        class="vfp-w-72 vfp-h-full vfp-flex vfp-flex-col"
        :style="{
          maxWidth: '80%',
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          transform: showToc ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
        }"
      >
        <div class="vfp-flex vfp-items-center vfp-justify-between vfp-flex-shrink-0" style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1)">
          <span style="color: white; font-weight: 500; font-size: 14px">目录</span>
          <button style="color: rgba(255,255,255,0.6); background: none; border: none; cursor: pointer; padding: 4px" @click="showToc = false">
            <X style="width: 16px; height: 16px" />
          </button>
        </div>
        <div class="vfp-flex-1 vfp-overflow-y-auto" style="padding: 8px 4px">
          <template v-for="(item, i) in toc" :key="`${item.href}-${i}`">
            <button
              :style="{
                width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '14px',
                color: isActive(item.href) ? 'white' : 'rgba(255,255,255,0.7)',
                fontWeight: isActive(item.href) ? '500' : '400',
                background: isActive(item.href) ? 'rgba(255,255,255,0.15)' : 'none',
                border: 'none', cursor: 'pointer', borderRadius: '4px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                transition: 'all 0.15s',
              }"
              :title="item.label"
              @click="handleTocClick(item.href)"
              @mouseenter="!isActive(item.href) && (($event.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)')"
              @mouseleave="!isActive(item.href) && (($event.target as HTMLElement).style.background = 'none')"
            >
              {{ item.label.trim() }}
            </button>
            <template v-if="item.subitems && item.subitems.length > 0">
              <button
                v-for="(sub, j) in item.subitems"
                :key="`${sub.href}-${j}`"
                :style="{
                  width: '100%', textAlign: 'left', padding: '8px 12px 8px 28px', fontSize: '13px',
                  color: isActive(sub.href) ? 'white' : 'rgba(255,255,255,0.6)',
                  fontWeight: isActive(sub.href) ? '500' : '400',
                  background: isActive(sub.href) ? 'rgba(255,255,255,0.15)' : 'none',
                  border: 'none', cursor: 'pointer', borderRadius: '4px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                  transition: 'all 0.15s',
                }"
                :title="sub.label"
                @click="handleTocClick(sub.href)"
                @mouseenter="!isActive(sub.href) && (($event.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)')"
                @mouseleave="!isActive(sub.href) && (($event.target as HTMLElement).style.background = 'none')"
              >
                {{ sub.label.trim() }}
              </button>
            </template>
          </template>
        </div>
      </div>
      <div
        class="vfp-flex-1"
        :style="{ background: showToc ? 'rgba(0,0,0,0.3)' : 'transparent', transition: 'background 0.3s' }"
        @click="showToc = false"
      />
    </div>

    <div
      v-if="!error"
      ref="viewerRef"
      class="vfp-h-full vfp-bg-white"
      :style="{
        width: isFullWidth ? '100%' : `${A4_WIDTH}px`,
        maxWidth: '100%',
        transition: 'width 0.3s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }"
    />
  </div>
</template>

<style>
.epub-container { overflow-y: auto !important; scrollbar-width: thin; }
.epub-container::-webkit-scrollbar { width: 8px; }
.epub-container::-webkit-scrollbar-track { background: transparent; }
.epub-container::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
.epub-container::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }
.epub-view > iframe { background: white; }
</style>
