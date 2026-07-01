import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, List } from 'lucide-react';
import 'foliate-js/view.js';
import type { FoliateView, TocItem } from 'foliate-js/view.js';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

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

export interface MobiRendererHandle extends RendererHandle {
  prevPage: () => void;
  nextPage: () => void;
  toggleFullWidth: () => void;
  toggleToc: () => void;
}

interface MobiRendererProps {
  url: string;
}

export const MobiRenderer = forwardRef<MobiRendererHandle, MobiRendererProps>(
  ({ url }, ref) => {
    const t = useTranslator();
    const fetcher = useFetcher();
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<FoliateView | null>(null);

    // 模拟 epub.js 的 locations 显示
    const totalLocationsRef = useRef(1);

    // 内部状态管理
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toc, setToc] = useState<TocItem[]>([]);
    const [showToc, setShowToc] = useState(false);
    const [activeTocHref, setActiveTocHref] = useState<string>('');
    const [isFullWidth, setIsFullWidth] = useState(false);
    const [currentChapter, setCurrentChapter] = useState(0);
    const [totalChapters, setTotalChapters] = useState(0);
    const isFullWidthRef = useRef(false);
    isFullWidthRef.current = isFullWidth;

    const reportProgress = useCallback((current: number, total: number) => {
      if (total > 0) totalLocationsRef.current = total;
      setCurrentChapter(Math.max(1, current + 1));
      setTotalChapters(totalLocationsRef.current);
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
      // 宽度改变后 paginator 需要重新分页
      const view = viewRef.current;
      if (!view) return;
      const renderer = (view as unknown as { renderer?: HTMLElement }).renderer;
      if (renderer) {
        renderer.setAttribute('max-inline-size', newVal ? '9999' : '720');
      }
    }, []);

    // 事件发射器：用于通知主组件工具栏状态变化
    const listenersRef = useRef<Set<() => void>>(new Set());
    const notifyToolbarChange = useCallback(() => {
      listenersRef.current.forEach(listener => listener());
    }, []);

    // 监听影响工具栏的状态变化
    useEffect(() => {
      notifyToolbarChange();
    }, [currentChapter, notifyToolbarChange]);

    useEffect(() => {
      notifyToolbarChange();
    }, [totalChapters, notifyToolbarChange]);

    useEffect(() => {
      notifyToolbarChange();
    }, [isFullWidth, notifyToolbarChange]);

    useEffect(() => {
      notifyToolbarChange();
    }, [toc.length, notifyToolbarChange]);

    // 工具栏配置
    const getToolbarGroups = useCallback((): ToolbarGroup[] => [
      {
        items: [
          { type: 'button', icon: <List className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.toc'), action: toggleToc, disabled: toc.length === 0, active: showToc },
        ],
      },
      {
        items: [
          { type: 'button', icon: <ChevronLeft className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.prev_page'), action: handlePrev, disabled: currentChapter <= 1 },
          { type: 'text', content: `${currentChapter} / ${totalChapters}`, minWidth: '4rem' },
          { type: 'button', icon: <ChevronRight className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.next_page'), action: handleNext, disabled: currentChapter >= totalChapters },
        ],
      },
      {
        items: [
          { type: 'button', icon: isFullWidth ? <Minimize2 className="rfp-w-4 rfp-h-4" /> : <Maximize2 className="rfp-w-4 rfp-h-4" />, tooltip: isFullWidth ? t('toolbar.normal_width') : t('toolbar.full_width'), action: toggleFullWidth, active: isFullWidth },
        ],
      },
    ], [currentChapter, totalChapters, isFullWidth, showToc, toc.length, t, handlePrev, handleNext, toggleToc, toggleFullWidth]);

    const handleTocClick = useCallback((href: string) => {
      setActiveTocHref(href);
      setShowToc(false);
      viewRef.current?.goTo(href).catch(() => {});
    }, []);

    useImperativeHandle(ref, () => ({
      getToolbarGroups,
      onToolbarChange: (listener: () => void) => {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
      },
      prevPage: handlePrev,
      nextPage: handleNext,
      toggleFullWidth,
      toggleToc,
    }), [getToolbarGroups, handlePrev, handleNext, toggleFullWidth, toggleToc]);

    // 吞掉 foliate-js paginator 卸载/切换窗口期由 ResizeObserver 触发的 uncaught error。
    // 上游 bug：Paginator.destroy 里 unobserve 目标错了（unobserve(this) 而非 unobserve(container)），
    // observer 从未真正解除，view 已经半 destroy 时仍会触发一次 render，此时 #view / iframe body 已 null。
    // 已知触发：
    //   - "Cannot destructure property 'style' of 'el' as it is null" (setStylesImportant)
    //   - "Failed to execute 'getComputedStyle' on 'Window': parameter 1 is not of type 'Element'" (#replaceBackground)
    useEffect(() => {
      const handler = (e: ErrorEvent) => {
        if (e.filename?.includes('paginator')) {
          e.preventDefault();
        }
      };
      window.addEventListener('error', handler);
      return () => window.removeEventListener('error', handler);
    }, []);

    useEffect(() => {
      const host = hostRef.current;
      // 只有 URL 有效时才加载（避免空字符串或已 revoke 的 blob URL）
      if (!host || !url) return;

      let cancelled = false;
      let view: FoliateView | null = null;
      let progressReported = false;
      // 多 section 文件的页码累加器：记录各 section 的实际页数
      const sectionPagesMap = new Map<number, number>();

      const load = async () => {
        if (cancelled) return;

        setLoading(true);
        setError(null);
        setToc([]);
        setShowToc(false);
        setActiveTocHref('');
        host.replaceChildren();

        try {
          view = document.createElement('foliate-view') as FoliateView;
          host.appendChild(view);
          viewRef.current = view;

          // 先注册事件
          view.addEventListener('relocate', (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;

            const currentView = viewRef.current;
            const sectionCount = currentView?.book?.sections.length ?? 0;
            const renderer = currentView?.renderer as
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
                const sections = currentView?.book?.sections ?? [];
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
              if (tocItem?.href) setActiveTocHref(tocItem.href);
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

          const res = await fetcher(url);
          if (cancelled) return;
          if (!res.ok) throw new Error(`请求失败: ${res.status}`);
          const blob = await res.blob();
          if (cancelled) return;
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
            // 必须调 next() 渲染首页
            await renderer.next?.();
            // setStyles 依赖 view.document 存在，必须在 next() 触发首次渲染后调用
            renderer.setStyles?.(READER_CSS);
          }
          if (cancelled) return;

          setToc(view.book?.toc ?? []);
          setLoading(false);
          // 只在 relocate 事件从未报告 progress 时使用 sections.length 作为 fallback，
          // 避免覆盖 SectionProgress 报告的更准确的 total（通常在首页 render 时通过 relocate 已报告）
          if (!progressReported) {
            reportProgress(0, view.book?.sections.length ?? 1);
          }
        } catch (err) {
          // MOBI/EPUB 加载错误通常是文件损坏或 DRM 保护，用 warn 级别记录
          console.warn('[MobiRenderer] Failed to load ebook:', err instanceof Error ? err.message : String(err));
          if (!cancelled) {
            setError(t('mobi.load_failed'));
            setLoading(false);
          }
        }
      };

      // 延迟到 microtask 队列执行，让 StrictMode 的第一次 cleanup 有机会取消，
      // 避免两个并发的 view.open() 污染 foliate-js MOBI 解析器内部状态
      Promise.resolve().then(load);

      return () => {
        cancelled = true;
        try { (view as unknown as { close?: () => void })?.close?.(); } catch { /* ignore */ }
        try { view?.book?.destroy?.(); } catch { /* ignore */ }
        if (view && view.parentNode === host) {
          try { host.removeChild(view); } catch { /* ignore */ }
        }
        if (viewRef.current === view) viewRef.current = null;
      };
    }, [url, reportProgress, t]);

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
                    ? 'rfp-text-fg-primary rfp-bg-surface-3 rfp-font-medium'
                    : 'rfp-text-fg-secondary hover:rfp-text-fg-primary hover:rfp-bg-surface-2'
                }`}
                title={item.label}
              >
                {item.label?.trim()}
              </button>
            ) : (
              <div className="rfp-w-full rfp-py-2 rfp-px-3 rfp-text-sm rfp-text-fg-tertiary rfp-truncate">
                {item.label?.trim()}
              </div>
            )}
            {item.subitems && item.subitems.length > 0 && renderTocItems(item.subitems, depth + 1)}
          </li>
        ))}
      </ul>
    );

    return (
      <div className="rfp-relative rfp-w-full rfp-h-full rfp-flex rfp-justify-center rfp-bg-surface-1 rfp-overflow-hidden">
        {error && <RendererError message={error} />}

        {loading && !error && (
          <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-z-10">
            <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-line-strong rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
          </div>
        )}

        {/* 目录侧栏 */}
        {toc.length > 0 && (
          <div
            className="rfp-absolute rfp-inset-0 rfp-z-20 rfp-flex rfp-transition-opacity rfp-duration-300"
            style={{ opacity: showToc ? 1 : 0, pointerEvents: showToc ? 'auto' : 'none' }}
          >
            <div
              className="rfp-w-72 rfp-max-w-[80%] rfp-h-full rfp-bg-surface-overlay rfp-backdrop-blur-xl rfp-border-r rfp-border-line-weak rfp-flex rfp-flex-col rfp-shadow-2xl rfp-transition-transform rfp-duration-300"
              style={{ transform: showToc ? 'translateX(0)' : 'translateX(-100%)' }}
            >
              <div className="rfp-flex rfp-items-center rfp-justify-between rfp-px-4 rfp-py-3 rfp-border-b rfp-border-line-weak rfp-flex-shrink-0">
                <span className="rfp-text-fg-primary rfp-font-medium rfp-text-sm">{t('toolbar.toc')}</span>
                <button
                  onClick={() => setShowToc(false)}
                  className="rfp-text-fg-tertiary hover:rfp-text-fg-primary rfp-transition-colors"
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
            className="rfp-h-full rfp-bg-surface-toolbar rfp-shadow-lg"
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
