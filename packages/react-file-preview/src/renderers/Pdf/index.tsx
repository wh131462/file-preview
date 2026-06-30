import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useTranslator } from '../../i18n/LocaleContext';
import { RendererError } from '../RendererError';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Menu, RefreshCw } from 'lucide-react';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';
// @ts-ignore - pdfjs-dist 类型路径
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

interface PdfOutlineItem {
  title: string;
  dest: any;
  items?: PdfOutlineItem[];
}

interface PdfPageProxy {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): {
    promise: Promise<void>;
    cancel(): void;
  };
}

interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  getOutline(): Promise<PdfOutlineItem[] | null>;
  destroy(): void;
}

interface PageState {
  element: HTMLDivElement;
  rendered: boolean;
  rendering: boolean;
  renderTask: { cancel(): void } | null;
}

export interface PdfRendererHandle extends RendererHandle {
  // 可选的公开方法
}

interface PdfRendererProps {
  url: string;
}

export const PdfRenderer = forwardRef<PdfRendererHandle, PdfRendererProps>(({
  url,
}, ref) => {
  const t = useTranslator();

  // 内部状态管理
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [showOutline, setShowOutline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [outline, setOutline] = useState<PdfOutlineItem[]>([]);
  const [activeOutlineItem, setActiveOutlineItem] = useState<string | null>(null);
  const outlinePageMapRef = useRef<Map<string, number>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PdfDocumentProxy | null>(null);
  const pageStatesRef = useRef<Map<number, PageState>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 事件发射器：用于通知主组件工具栏状态变化
  const listenersRef = useRef<Set<() => void>>(new Set());
  const notifyToolbarChange = useCallback(() => {
    listenersRef.current.forEach(listener => listener());
  }, []);

  // 监听影响工具栏的状态变化
  useEffect(() => {
    notifyToolbarChange();
  }, [zoom, notifyToolbarChange]);

  useEffect(() => {
    notifyToolbarChange();
  }, [currentPage, notifyToolbarChange]);

  useEffect(() => {
    notifyToolbarChange();
  }, [numPages, notifyToolbarChange]);

  useEffect(() => {
    notifyToolbarChange();
  }, [outline.length, notifyToolbarChange]);

  // 渲染单个页面
  const renderPage = useCallback(async (pageNumber: number, scale: number) => {
    if (!pdfDocRef.current) return;
    const state = pageStatesRef.current.get(pageNumber);
    if (!state || state.rendering) return;

    state.rendering = true;

    try {
      const page = await pdfDocRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.maxWidth = '100%';
      canvas.style.height = 'auto';
      canvas.style.borderRadius = '0';
      canvas.style.display = 'block';

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const renderTask = page.render({ canvasContext: ctx, viewport });
      state.renderTask = renderTask;
      await renderTask.promise;

      state.element.innerHTML = '';
      state.element.appendChild(canvas);

      state.rendered = true;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`渲染页面 ${pageNumber} 失败:`, err);
      }
    } finally {
      state.rendering = false;
      state.renderTask = null;
    }
  }, []);

  // 清理页面 canvas
  const clearPageCanvas = useCallback((pageNumber: number) => {
    const state = pageStatesRef.current.get(pageNumber);
    if (!state) return;

    // 取消正在进行的渲染
    if (state.renderTask) {
      state.renderTask.cancel();
      state.renderTask = null;
    }

    // 清理 canvas
    const canvas = state.element.querySelector('canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.remove();
    }

    state.element.innerHTML = '';
    state.rendered = false;
    state.rendering = false;
  }, []);

  // 初始化页面占位符
  // 构建大纲-页码映射
  const buildOutlinePageMap = async (items: PdfOutlineItem[], pdfDoc: PdfDocumentProxy, depth = 0) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemKey = `${item.title}-${i}-${depth}`;

      try {
        let pageNumber: number | null = null;
        const dest = item.dest;

        if (typeof dest === 'string') {
          const namedDest = await (pdfDoc as any).getDestination?.(dest);
          if (namedDest && namedDest[0] && typeof namedDest[0] === 'object') {
            pageNumber = await (pdfDoc as any).getPageIndex?.(namedDest[0]) + 1;
          }
        } else if (Array.isArray(dest) && dest[0] && typeof dest[0] === 'object') {
          pageNumber = await (pdfDoc as any).getPageIndex?.(dest[0]) + 1;
        }

        if (pageNumber !== null && pageNumber > 0) {
          outlinePageMapRef.current.set(itemKey, pageNumber);
        }

        if (item.items && item.items.length > 0) {
          await buildOutlinePageMap(item.items, pdfDoc, depth + 1);
        }
      } catch (err) {
        // 静默失败，某些大纲项可能无法映射到页码
      }
    }
  };

  // 根据当前页码更新激活的大纲项
  const updateActiveOutlineByPage = useCallback((page: number) => {
    let closestItem: string | null = null;
    let closestDistance = Infinity;

    outlinePageMapRef.current.forEach((itemPage, itemKey) => {
      if (itemPage <= page) {
        const distance = page - itemPage;
        if (distance < closestDistance) {
          closestDistance = distance;
          closestItem = itemKey;
        }
      }
    });

    if (closestItem !== activeOutlineItem) {
      setActiveOutlineItem(closestItem);
    }
  }, [activeOutlineItem]);

  // 监听页码变化，更新大纲高亮
  useEffect(() => {
    if (currentPage > 0 && outlinePageMapRef.current.size > 0) {
      updateActiveOutlineByPage(currentPage);
    }
  }, [currentPage, updateActiveOutlineByPage]);

  const initPagePlaceholders = useCallback(() => {
    if (!pdfDocRef.current || !scrollContainerRef.current) return;

    const wrapper = scrollContainerRef.current.querySelector('.pdf-pages') as HTMLDivElement | null;
    if (!wrapper) return;

    wrapper.innerHTML = '';
    pageStatesRef.current.clear();

    for (let i = 1; i <= numPages; i++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'rfp-pdf-page-placeholder rfp-relative rfp-flex rfp-justify-center';
      pageDiv.setAttribute('data-page-number', String(i));
      wrapper.appendChild(pageDiv);

      pageStatesRef.current.set(i, {
        element: pageDiv,
        rendered: false,
        rendering: false,
        renderTask: null,
      });

      // 观察页面元素
      if (observerRef.current) {
        observerRef.current.observe(pageDiv);
      }
    }
  }, [numPages]);

  // 加载 PDF 文档
  const loadPdf = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    setNumPages(0);

    if (pdfDocRef.current) {
      try {
        pdfDocRef.current.destroy();
      } catch {
        // ignore
      }
      pdfDocRef.current = null;
    }

    try {
      const loadingTask = pdfjsLib.getDocument({ url });
      pdfDocRef.current = (await loadingTask.promise) as PdfDocumentProxy;
      const total = pdfDocRef.current.numPages;

      setNumPages(total);
      setCurrentPage(1);

      // 提取大纲
      try {
        const outlineData = await pdfDocRef.current.getOutline();
        if (outlineData) {
          setOutline(outlineData);
          // 构建大纲-页码映射
          outlinePageMapRef.current.clear();
          await buildOutlinePageMap(outlineData, pdfDocRef.current);
        }
      } catch (err) {
        console.warn('PDF 大纲提取失败:', err);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('PDF 加载错误:', err);
      setError(t('pdf.load_failed'));
      setIsLoading(false);
    }
  }, [url, t]);

  // 滚动处理
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || pageStatesRef.current.size === 0) return;

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollCenter = scrollTop + containerHeight / 2;

    let currentVisiblePage = 1;
    let minDistance = Infinity;

    pageStatesRef.current.forEach((state, pageNumber) => {
      const rect = state.element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const pageCenter = rect.top - containerRect.top + rect.height / 2 + scrollTop;
      const distance = Math.abs(pageCenter - scrollCenter);

      if (distance < minDistance) {
        minDistance = distance;
        currentVisiblePage = pageNumber;
      }
    });

    if (currentVisiblePage !== currentPage) {
      setCurrentPage(currentVisiblePage);
    }
  }, [currentPage]);

  // 初始化 IntersectionObserver
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNumber = Number(entry.target.getAttribute('data-page-number'));
          if (!pageNumber) return;

          if (entry.isIntersecting) {
            // 页面进入视口，渲染
            renderPage(pageNumber, zoom);
          } else {
            // 页面离开视口，清理
            const state = pageStatesRef.current.get(pageNumber);
            if (state && state.rendered) {
              clearPageCanvas(pageNumber);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '500px 0px',
        threshold: 0,
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [zoom, renderPage, clearPageCanvas]);

  // 监听 URL 变化
  useEffect(() => {
    // 只有 URL 有效时才加载（避免空字符串或已 revoke 的 blob URL）
    if (url) {
      loadPdf();
    }
  }, [url, loadPdf]);

  // 监听 numPages 变化，初始化占位符
  useEffect(() => {
    if (numPages > 0) {
      // 等待 DOM 更新后初始化占位符
      setTimeout(() => {
        initPagePlaceholders();
      }, 0);
    }
  }, [numPages, initPagePlaceholders]);

  // 监听 zoom 变化（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      // 清理所有已渲染页面
      pageStatesRef.current.forEach((state, pageNumber) => {
        if (state.rendered) {
          clearPageCanvas(pageNumber);
        }
      });

      // 触发重新渲染
      if (observerRef.current && scrollContainerRef.current) {
        pageStatesRef.current.forEach((state) => {
          observerRef.current?.unobserve(state.element);
          observerRef.current?.observe(state.element);
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [zoom, clearPageCanvas]);

  // 监听滚动事件
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 清理
  useEffect(() => {
    return () => {
      // 清理所有渲染任务
      pageStatesRef.current.forEach((state) => {
        if (state.renderTask) {
          state.renderTask.cancel();
        }
      });
      pageStatesRef.current.clear();

      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // ignore
        }
        pdfDocRef.current = null;
      }
    };
  }, []);

  // 处理大纲点击跳转
  const handleOutlineClick = useCallback(async (dest: any, itemKey: string, onClose?: () => void) => {
    if (!pdfDocRef.current || !scrollContainerRef.current) return;

    try {
      let pageNumber: number;

      if (typeof dest === 'string') {
        // 命名目标
        const namedDest = await (pdfDocRef.current as any).getDestination(dest);
        if (namedDest && namedDest[0]) {
          const pageRef = namedDest[0];
          pageNumber = await (pdfDocRef.current as any).getPageIndex(pageRef) + 1;
        } else {
          return;
        }
      } else if (Array.isArray(dest) && dest[0]) {
        // 直接页面引用
        const pageRef = dest[0];
        pageNumber = await (pdfDocRef.current as any).getPageIndex(pageRef) + 1;
      } else {
        return;
      }

      // 设置激活项
      setActiveOutlineItem(itemKey);

      // 滚动到目标页面
      const pages = scrollContainerRef.current.querySelectorAll('[data-page-number]');
      const targetPage = pages[pageNumber - 1];
      if (targetPage) {
        targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // 跳转后自动关闭侧边栏
      if (onClose) {
        setTimeout(() => onClose(), 300);
      }
    } catch (err) {
      console.error('大纲跳转失败:', err);
    }
  }, []);

  // 渲染大纲项
  const renderOutlineItems = (items: PdfOutlineItem[], depth = 0, onClose?: () => void): React.ReactNode => {
    return (
      <ul style={{ marginLeft: depth > 0 ? 16 : 0 }}>
        {items.map((item, i) => {
          const itemKey = `${item.title}-${i}-${depth}`;
          const isActive = activeOutlineItem === itemKey;
          return (
            <li key={itemKey}>
              <button
                onClick={() => handleOutlineClick(item.dest, itemKey, onClose)}
                className={`rfp-w-full rfp-text-left rfp-py-2 rfp-px-3 rfp-text-sm rfp-rounded rfp-transition-all rfp-truncate ${
                  isActive
                    ? 'rfp-bg-surface-2 rfp-text-fg-primary rfp-font-medium'
                    : 'rfp-text-fg-secondary hover:rfp-text-fg-primary hover:rfp-bg-surface-2'
                }`}
                title={item.title}
              >
                {item.title}
              </button>
              {item.items && item.items.length > 0 && renderOutlineItems(item.items, depth + 1, onClose)}
            </li>
          );
        })}
      </ul>
    );
  };

  // 工具栏事件处理
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + 0.1, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - 0.1, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
  }, []);

  const handlePrevPage = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const pages = container.querySelectorAll('[data-page-number]');
    const targetPage = pages[Math.max(0, currentPage - 2)];
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const pages = container.querySelectorAll('[data-page-number]');
    const targetPage = pages[Math.min(pages.length - 1, currentPage)];
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage, numPages]);

  const handleToggleOutline = useCallback(() => {
    setShowOutline(prev => !prev);
  }, []);

  // 工具栏配置
  const getToolbarGroups = useCallback((): ToolbarGroup[] => {
    const groups: ToolbarGroup[] = [];

    // 大纲按钮（如果有大纲）
    if (outline.length > 0) {
      groups.push({
        items: [
          { type: 'button', icon: <Menu className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.outline'), action: handleToggleOutline, active: showOutline },
        ],
      });
    }

    // 翻页
    groups.push({
      items: [
        { type: 'button', icon: <ChevronLeft className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.prev_page'), action: handlePrevPage, disabled: currentPage <= 1 },
        { type: 'text', content: `${currentPage} / ${numPages}`, minWidth: '4rem' },
        { type: 'button', icon: <ChevronRight className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.next_page'), action: handleNextPage, disabled: currentPage >= numPages },
      ],
    });

    // 缩放
    groups.push({
      items: [
        { type: 'button', icon: <ZoomOut className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.zoom_out'), action: handleZoomOut, disabled: zoom <= 0.5 },
        { type: 'text', content: `${Math.round(zoom * 100)}%`, minWidth: '3rem' },
        { type: 'button', icon: <ZoomIn className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.zoom_in'), action: handleZoomIn, disabled: zoom >= 3 },
      ],
    });

    // 重置
    groups.push({
      items: [
        { type: 'button', icon: <RefreshCw className="rfp-w-4 rfp-h-4" />, tooltip: t('toolbar.reset'), action: handleReset },
      ],
    });

    return groups;
  }, [zoom, currentPage, numPages, showOutline, outline.length, t, handleZoomIn, handleZoomOut, handlePrevPage, handleNextPage, handleToggleOutline, handleReset]);

  // 暴露接口给父组件
  useImperativeHandle(ref, () => ({
    getToolbarGroups,
    onToolbarChange: (listener: () => void) => {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    },
  }), [getToolbarGroups]);

  return (
    <div ref={containerRef} className="rfp-relative rfp-w-full rfp-h-full">
      {/* 大纲侧边栏 */}
      {outline.length > 0 && (
        <div
          className="rfp-absolute rfp-inset-0 rfp-z-20 rfp-flex rfp-transition-opacity rfp-duration-300"
          style={{
            opacity: showOutline ? 1 : 0,
            pointerEvents: showOutline ? 'auto' : 'none',
          }}
        >
          <div
            className="rfp-w-72 rfp-max-w-[80%] rfp-h-full rfp-bg-surface-overlay rfp-backdrop-blur-xl rfp-border-r rfp-border-line-weak rfp-flex rfp-flex-col rfp-shadow-2xl rfp-transition-transform rfp-duration-300"
            style={{ transform: showOutline ? 'translateX(0)' : 'translateX(-100%)' }}
          >
            <div className="rfp-flex rfp-items-center rfp-justify-between rfp-px-4 rfp-py-3 rfp-border-b rfp-border-line-weak rfp-flex-shrink-0">
              <span className="rfp-text-fg-primary rfp-font-medium rfp-text-sm">{t('toolbar.outline')}</span>
              <button
                onClick={() => setShowOutline(false)}
                className="rfp-text-fg-tertiary hover:rfp-text-fg-primary rfp-transition-colors"
              >
                <X className="rfp-w-4 rfp-h-4" />
              </button>
            </div>
            <div className="rfp-flex-1 rfp-overflow-y-auto rfp-py-4 rfp-px-1">
              {renderOutlineItems(outline, 0, () => setShowOutline(false))}
            </div>
          </div>
          <div
            className="rfp-flex-1 rfp-transition-opacity rfp-duration-300"
            style={{ background: showOutline ? 'rgba(0,0,0,0.3)' : 'transparent' }}
            onClick={() => setShowOutline(false)}
          />
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="rfp-pdf-container rfp-w-full rfp-h-full rfp-overflow-auto rfp-py-6 rfp-px-4"
      >
        {error && (
          <RendererError message={error} />
        )}

        {!error && isLoading && (
          <div className="rfp-flex rfp-items-center rfp-justify-center rfp-min-h-screen">
            <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-line-strong rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
          </div>
        )}

        {!error && (
          <div className="rfp-flex rfp-flex-col rfp-items-center">
            <div className="pdf-pages rfp-flex rfp-flex-col rfp-gap-4" />
          </div>
        )}
      </div>
    </div>
  );
});
