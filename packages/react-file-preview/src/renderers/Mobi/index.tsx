import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { X } from 'lucide-react';
import 'foliate-js/view.js';
import type { FoliateView, TocItem } from 'foliate-js/view.js';

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

export interface MobiRendererHandle {
  prevPage: () => void;
  nextPage: () => void;
  toggleFullWidth: () => void;
  toggleToc: () => void;
}

interface MobiRendererProps {
  url: string;
  onChapterChange?: (current: number, total: number) => void;
  onFullWidthChange?: (isFullWidth: boolean) => void;
}

export const MobiRenderer = forwardRef<MobiRendererHandle, MobiRendererProps>(
  ({ url, onChapterChange, onFullWidthChange }, ref) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<FoliateView | null>(null);
    const onChapterChangeRef = useRef(onChapterChange);
    const onFullWidthChangeRef = useRef(onFullWidthChange);
    onChapterChangeRef.current = onChapterChange;
    onFullWidthChangeRef.current = onFullWidthChange;

    // 模拟 epub.js 的 locations 显示
    const totalLocationsRef = useRef(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toc, setToc] = useState<TocItem[]>([]);
    const [showToc, setShowToc] = useState(false);
    const [activeTocHref, setActiveTocHref] = useState<string>('');
    const [isFullWidth, setIsFullWidth] = useState(false);
    const isFullWidthRef = useRef(false);
    isFullWidthRef.current = isFullWidth;

    const reportProgress = useCallback((current: number, total: number) => {
      if (total > 0) totalLocationsRef.current = total;
      onChapterChangeRef.current?.(Math.max(1, current + 1), totalLocationsRef.current);
    }, []);

    const handlePrev = useCallback(() => {
      const view = viewRef.current;
      if (!view) return;
      view.prev().catch(() => {});
    }, []);

    const handleNext = useCallback(() => {
      const view = viewRef.current;
      if (!view) return;
      view.next().catch(() => {});
    }, []);

    const toggleToc = useCallback(() => setShowToc((prev) => !prev), []);

    const toggleFullWidth = useCallback(() => {
      const newVal = !isFullWidthRef.current;
      setIsFullWidth(newVal);
      onFullWidthChangeRef.current?.(newVal);
      // 宽度改变后 paginator 需要重新分页
      const view = viewRef.current;
      if (!view) return;
      const renderer = (view as unknown as { renderer?: HTMLElement }).renderer;
      if (renderer) {
        renderer.setAttribute('max-inline-size', newVal ? '9999' : '720');
      }
    }, []);

    const handleTocClick = useCallback((href: string) => {
      setActiveTocHref(href);
      setShowToc(false);
      viewRef.current?.goTo(href).catch(() => {});
    }, []);

    useImperativeHandle(ref, () => ({
      prevPage: handlePrev,
      nextPage: handleNext,
      toggleFullWidth,
      toggleToc,
    }), [handlePrev, handleNext, toggleFullWidth, toggleToc]);

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      setLoading(true);
      setError(null);
      setToc([]);
      setShowToc(false);
      setActiveTocHref('');
      host.replaceChildren();

      let cancelled = false;
      let view: FoliateView | null = null;

      const load = async () => {
        try {
          if (cancelled) return;

          view = document.createElement('foliate-view') as FoliateView;
          host.appendChild(view);
          viewRef.current = view;

          // 先注册事件
          view.addEventListener('relocate', (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;
            // SectionProgress 返回的 location 对象: { current, next, total }
            const loc = detail.location as { current?: number; total?: number } | undefined;
            if (loc && typeof loc.current === 'number' && typeof loc.total === 'number') {
              reportProgress(loc.current, loc.total);
            } else {
              // fallback：用 section 级别估算
              const sections = viewRef.current?.book?.sections ?? [];
              const idx = detail.index ?? 0;
              const frac = detail.fraction ?? 0;
              const total = Math.max(sections.length, 1);
              const current = Math.round((idx + frac) / total * total);
              reportProgress(current, total);
            }
            const tocItem = detail.tocItem as { href?: string } | undefined;
            if (tocItem?.href) {
              setActiveTocHref(tocItem.href);
            }
          });

          const res = await fetch(url);
          if (!res.ok) throw new Error(`请求失败: ${res.status}`);
          const blob = await res.blob();
          let name = 'book.mobi';
          try {
            const u = new URL(url, window.location.href);
            const base = u.pathname.split('/').pop();
            if (base) name = decodeURIComponent(base);
          } catch { /* blob: URL */ }
          const file = new File([blob], name);

          await view.open(file);
          if (cancelled) { view.book?.destroy?.(); return; }

          // 配置 paginator：paginated 模式（默认），带动画
          const renderer = (view as unknown as { renderer: HTMLElement & {
            setStyles?: (css: string) => void;
            next?: () => Promise<void>;
          } }).renderer;

          if (renderer) {
            // flow="paginated" 是默认值，不需要显式设置
            renderer.setAttribute('animated', '');
            renderer.setAttribute('max-inline-size', '720');
            renderer.setAttribute('margin', '48');
            renderer.setAttribute('gap', '5%');
            renderer.setStyles?.(READER_CSS);
            // 必须调 next() 渲染首页
            await renderer.next?.();
          }

          setToc(view.book?.toc ?? []);
          setLoading(false);
          reportProgress(0, view.book?.sections.length ?? 1);
        } catch (err) {
          console.error('MOBI/AZW3 加载错误:', err);
          if (!cancelled) {
            setError('电子书加载失败，文件可能已损坏或带有 DRM 保护');
            setLoading(false);
          }
        }
      };

      load();

      return () => {
        cancelled = true;
        try { viewRef.current?.book?.destroy?.(); } catch { /* ignore */ }
        viewRef.current = null;
        host.replaceChildren();
      };
    }, [url, reportProgress]);

    const isActive = useCallback(
      (href: string | undefined) => !!href && href === activeTocHref,
      [activeTocHref]
    );

    const renderTocItems = (items: TocItem[], depth = 0) => (
      <ul style={{ listStyle: 'none', padding: 0, margin: depth > 0 ? '0 0 0 16px' : 0 }}>
        {items.map((item, i) => (
          <li key={`${item.href ?? item.label}-${i}`}>
            {item.href ? (
              <button
                onClick={() => handleTocClick(item.href!)}
                className={`rfp-w-full rfp-text-left rfp-py-2 rfp-px-3 rfp-text-sm rfp-rounded rfp-transition-all rfp-truncate ${
                  isActive(item.href)
                    ? 'rfp-text-white rfp-bg-white/15 rfp-font-medium'
                    : 'rfp-text-white/70 hover:rfp-text-white hover:rfp-bg-white/10'
                }`}
                title={item.label}
              >
                {item.label?.trim()}
              </button>
            ) : (
              <div className="rfp-w-full rfp-py-2 rfp-px-3 rfp-text-sm rfp-text-white/50 rfp-truncate">
                {item.label?.trim()}
              </div>
            )}
            {item.subitems && item.subitems.length > 0 && renderTocItems(item.subitems, depth + 1)}
          </li>
        ))}
      </ul>
    );

    return (
      <div className="rfp-relative rfp-w-full rfp-h-full rfp-flex rfp-justify-center rfp-bg-[#f5f5f0] rfp-overflow-hidden">
        {error && (
          <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-text-white/70 rfp-text-center rfp-p-6">
            <p className="rfp-text-lg">{error}</p>
          </div>
        )}

        {loading && !error && (
          <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-z-10">
            <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
          </div>
        )}

        {/* 目录侧栏 */}
        {toc.length > 0 && (
          <div
            className="rfp-absolute rfp-inset-0 rfp-z-20 rfp-flex rfp-transition-opacity rfp-duration-300"
            style={{ opacity: showToc ? 1 : 0, pointerEvents: showToc ? 'auto' : 'none' }}
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
            ref={hostRef}
            className="rfp-h-full rfp-bg-white rfp-shadow-lg"
            style={{
              width: isFullWidth ? '100%' : `${A4_WIDTH}px`,
              maxWidth: '100%',
              transition: 'width 0.3s ease',
            }}
          />
        )}
      </div>
    );
  }
);

MobiRenderer.displayName = 'MobiRenderer';
