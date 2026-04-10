import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import ePub from '@likecoin/epub-ts';
import { X } from 'lucide-react';

// 全局注入 epubjs 容器样式（只注入一次）
if (typeof document !== 'undefined' && !document.getElementById('rfp-epub-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'rfp-epub-styles';
  styleEl.textContent = `
    .epub-container { overflow-y: auto !important; scrollbar-width: thin; }
    .epub-container::-webkit-scrollbar { width: 8px; }
    .epub-container::-webkit-scrollbar-track { background: transparent; }
    .epub-container::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
    .epub-container::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }
    .epub-view > iframe { background: white; }
  `;
  document.head.appendChild(styleEl);
}

export interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}

export interface EpubRendererHandle {
  prevChapter: () => void;
  nextChapter: () => void;
  toggleFullWidth: () => void;
  toggleToc: () => void;
}

interface EpubRendererProps {
  url: string;
  onChapterChange?: (current: number, total: number) => void;
  onFullWidthChange?: (isFullWidth: boolean) => void;
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

export const EpubRenderer = forwardRef<EpubRendererHandle, EpubRendererProps>(
  ({ url, onChapterChange, onFullWidthChange }, ref) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<BookLike | null>(null);
    const renditionRef = useRef<RenditionLike | null>(null);
    const onChapterChangeRef = useRef(onChapterChange);
    const onFullWidthChangeRef = useRef(onFullWidthChange);
    onChapterChangeRef.current = onChapterChange;
    onFullWidthChangeRef.current = onFullWidthChange;

    const totalLocationsRef = useRef(0);
    const lastCfiRef = useRef<string | null>(null);
    const isFullWidthRef = useRef(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullWidth, setIsFullWidth] = useState(false);
    const [toc, setToc] = useState<TocItem[]>([]);
    const [showToc, setShowToc] = useState(false);
    const [activeTocHref, setActiveTocHref] = useState<string>('');
    const tocRef = useRef<TocItem[]>([]);
    tocRef.current = toc;

    isFullWidthRef.current = isFullWidth;

    const handlePrev = useCallback(() => {
      renditionRef.current?.prev();
    }, []);

    const handleNext = useCallback(() => {
      renditionRef.current?.next();
    }, []);

    // 滚动监听：接近底部时强制触发 check 加载后续 section
    const scrollContainerRef = useRef<Element | null>(null);
    const scrollRafRef = useRef(0);

    const onScrollRef = useRef((_e?: Event) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const el = container as HTMLElement;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
      if (nearBottom) {
        try {
          const mgr = (renditionRef.current as unknown as { manager?: { check?: (t?: number, e?: number) => Promise<unknown> } })?.manager;
          mgr?.check?.(500, 500);
        } catch { /* ignore */ }
      }
    });

    const reattachScrollListener = useCallback(() => {
      // 清理旧监听
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener('scroll', onScrollRef.current);
        scrollContainerRef.current = null;
      }
      cancelAnimationFrame(scrollRafRef.current);

      const tryAttach = () => {
        const container = viewerRef.current?.querySelector('.epub-container') ?? null;
        if (!container) {
          scrollRafRef.current = requestAnimationFrame(tryAttach);
          return;
        }
        scrollContainerRef.current = container;
        container.addEventListener('scroll', onScrollRef.current, { passive: true });
      };
      scrollRafRef.current = requestAnimationFrame(tryAttach);
    }, []);

    const toggleFullWidth = useCallback(() => {
      const newVal = !isFullWidthRef.current;
      setIsFullWidth(newVal);
      onFullWidthChangeRef.current?.(newVal);
      // 等 CSS transition 完成后再 resize 并恢复位置
      setTimeout(() => {
        const viewer = viewerRef.current;
        const rendition = renditionRef.current;
        if (!viewer || !rendition) return;
        rendition.resize(viewer.offsetWidth, viewer.offsetHeight);
        // 重排后恢复阅读位置
        if (lastCfiRef.current) {
          rendition.display(lastCfiRef.current);
        }
        // resize/display 可能重建 .epub-container，需要重新绑定滚动监听
        reattachScrollListener();
      }, 350);
    }, [reattachScrollListener]);

    const toggleToc = useCallback(() => {
      setShowToc(prev => !prev);
    }, []);

    const handleTocClick = useCallback((href: string) => {
      setActiveTocHref(href);
      renditionRef.current?.display(href);
      setShowToc(false);
    }, []);

    useImperativeHandle(ref, () => ({
      prevChapter: handlePrev,
      nextChapter: handleNext,
      toggleFullWidth,
      toggleToc,
    }), [handlePrev, handleNext, toggleFullWidth, toggleToc]);

    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      setLoading(true);
      setError(null);
      setToc([]);
      setShowToc(false);
      viewer.innerHTML = '';
      lastCfiRef.current = null;
      totalLocationsRef.current = 0;

      let cancelled = false;
      // StrictMode 下 effect 会立即 mount→unmount→mount
      // 用 microtask 延迟初始化，让第一次的 cleanup 先执行，避免 epubjs 内部状态被污染
      const loadTimer = window.setTimeout(() => {
        if (cancelled) return;
        load();
      }, 0);

      const load = async () => {
        try {
          let bookInput: string | ArrayBuffer = url;
          if (url.startsWith('blob:')) {
            const resp = await fetch(url);
            bookInput = await resp.arrayBuffer();
          }

          const book = ePub(bookInput) as unknown as BookLike;
          bookRef.current = book;

          const rendition = book.renderTo(viewer, {
            manager: 'continuous',
            flow: 'scrolled',
            width: '100%',
            height: '100%',
          });
          renditionRef.current = rendition;

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

          // 异步生成 locations 索引（用于实时页数）
          book.locations.generate(1024).then(() => {
            if (cancelled) return;
            totalLocationsRef.current = book.locations.length();
            // 触发一次更新让父组件拿到 total
            const loc = renditionRef.current?.currentLocation() as { start?: { location?: number; cfi?: string } } | undefined;
            const cur = loc?.start?.location ?? 0;
            onChapterChangeRef.current?.(cur + 1, totalLocationsRef.current);
          }).catch(() => { /* ignore */ });

          // 获取目录
          const nav = await book.loaded.navigation as { toc?: TocItem[] };
          if (!cancelled && Array.isArray(nav?.toc)) {
            setToc(nav.toc);
          }

          await rendition.display();

          if (cancelled) return;

          setLoading(false);
          onChapterChangeRef.current?.(1, totalLocationsRef.current || 1);

          rendition.on('relocated', (location: unknown) => {
            const loc = location as { start?: { cfi?: string; location?: number; href?: string } };
            if (loc?.start?.cfi) {
              lastCfiRef.current = loc.start.cfi;
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
              collect(tocRef.current);
              if (matches.length === 1) {
                // 唯一匹配，直接设置
                setActiveTocHref(matches[0]);
              }
              // 多个匹配（同一文件不同 anchor）时保持当前选中（由点击设置）
            }
            const cur = loc?.start?.location;
            const total = totalLocationsRef.current;
            if (typeof cur === 'number' && total > 0) {
              onChapterChangeRef.current?.(cur + 1, total);
            }
          });

        } catch (err) {
          console.error('EPUB 加载错误:', err);
          if (!cancelled) {
            setError('EPUB 文件加载失败');
            setLoading(false);
          }
        }
      };

      return () => {
        cancelled = true;
        window.clearTimeout(loadTimer);
        try { renditionRef.current?.destroy?.(); } catch { /* ignore */ }
        try { bookRef.current?.destroy(); } catch { /* ignore */ }
        renditionRef.current = null;
        bookRef.current = null;
      };
    }, [url]);

    useEffect(() => {
      const onResize = () => {
        const viewer = viewerRef.current;
        if (!viewer || !renditionRef.current) return;
        renditionRef.current.resize(viewer.offsetWidth, viewer.offsetHeight);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
      reattachScrollListener();
      return () => {
        cancelAnimationFrame(scrollRafRef.current);
        scrollContainerRef.current?.removeEventListener('scroll', onScrollRef.current);
      };
    }, [url, reattachScrollListener]);

    const isActive = useCallback((href: string) => {
      return href === activeTocHref;
    }, [activeTocHref]);

    const renderTocItems = (items: TocItem[], depth = 0) => (
      <ul style={{ marginLeft: depth > 0 ? 16 : 0 }}>
        {items.map((item, i) => {
          const active = isActive(item.href);
          return (
            <li key={`${item.href}-${i}`}>
              <button
                onClick={() => handleTocClick(item.href)}
                className={`rfp-w-full rfp-text-left rfp-py-2 rfp-px-3 rfp-text-sm rfp-rounded rfp-transition-all rfp-truncate ${active
                    ? 'rfp-text-white rfp-bg-white/15 rfp-font-medium'
                    : 'rfp-text-white/70 hover:rfp-text-white hover:rfp-bg-white/10'
                  }`}
                title={item.label}
              >
                {item.label.trim()}
              </button>
              {item.subitems && item.subitems.length > 0 && renderTocItems(item.subitems, depth + 1)}
            </li>
          );
        })}
      </ul>
    );

    return (
      <div className="rfp-relative rfp-w-full rfp-h-full rfp-flex rfp-justify-center rfp-bg-[#f5f5f0] rfp-overflow-hidden">
        {error && (
          <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-text-white/70 rfp-text-center">
            <p className="rfp-text-lg">{error}</p>
          </div>
        )}

        {loading && !error && (
          <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-z-10">
            <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
          </div>
        )}

        {/* 目录侧栏 - 滑入动画 */}
        {toc.length > 0 && (
          <div
            className="rfp-absolute rfp-inset-0 rfp-z-20 rfp-flex rfp-transition-opacity rfp-duration-300"
            style={{
              opacity: showToc ? 1 : 0,
              pointerEvents: showToc ? 'auto' : 'none',
            }}
          >
            <div
              className="rfp-w-72 rfp-max-w-[80%] rfp-h-full rfp-bg-black/90 rfp-backdrop-blur-xl rfp-border-r rfp-border-white/10 rfp-flex rfp-flex-col rfp-shadow-2xl rfp-transition-transform rfp-duration-300"
              style={{ transform: showToc ? 'translateX(0)' : 'translateX(-100%)' }}
            >
              <div className="rfp-flex rfp-items-center rfp-justify-between rfp-px-4 rfp-py-3 rfp-border-b rfp-border-white/10 rfp-flex-shrink-0">
                <span className="rfp-text-white rfp-font-medium rfp-text-sm">目录</span>
                <button
                  onClick={() => setShowToc(false)}
                  className="rfp-text-white/60 hover:rfp-text-white rfp-transition-colors"
                >
                  <X className="rfp-w-4 rfp-h-4" />
                </button>
              </div>
              <div className="rfp-flex-1 rfp-overflow-y-auto rfp-py-4 rfp-px-1">
                {renderTocItems(toc)}
              </div>
            </div>
            <div
              className="rfp-flex-1 rfp-transition-opacity rfp-duration-300"
              style={{ background: showToc ? 'rgba(0,0,0,0.3)' : 'transparent' }}
              onClick={() => setShowToc(false)}
            />
          </div>
        )}

        {!error && (
          <div
            ref={viewerRef}
            className="rfp-h-full rfp-bg-white rfp-shadow-lg"
            style={{
              width: isFullWidth ? '100%' : `${A4_WIDTH}px`,
              maxWidth: '100%',
              transition: 'width 0.3s ease',
              overflow: 'hidden',
            }}
          />
        )}
      </div>
    );
  }
);
