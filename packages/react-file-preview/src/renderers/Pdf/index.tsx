import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslator } from '../../i18n/LocaleContext';
import { RendererError } from '../RendererError';
// @ts-ignore - pdfjs-dist 类型路径
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

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
  destroy(): void;
}

interface PageState {
  element: HTMLDivElement;
  rendered: boolean;
  rendering: boolean;
  renderTask: { cancel(): void } | null;
}

interface PdfRendererProps {
  url: string;
  zoom: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onTotalPagesChange: (total: number) => void;
  onPageWidthChange?: (width: number) => void;
}

export const PdfRenderer: React.FC<PdfRendererProps> = ({
  url,
  zoom,
  currentPage,
  onPageChange,
  onTotalPagesChange,
  onPageWidthChange,
}) => {
  const t = useTranslator();
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PdfDocumentProxy | null>(null);
  const pageStatesRef = useRef<Map<number, PageState>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

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

      // 上报第一页原始宽度
      if (pageNumber === 1 && onPageWidthChange) {
        const baseViewport = page.getViewport({ scale: 1 });
        onPageWidthChange(baseViewport.width);
      }

      state.element.innerHTML = '';
      state.element.appendChild(canvas);

      // 页码标签
      const label = document.createElement('div');
      label.textContent = String(pageNumber);
      label.className = 'rfp-absolute rfp-top-2 rfp-right-2 rfp-bg-surface-nav-hover rfp-backdrop-blur-sm rfp-text-fg-primary rfp-text-xs rfp-px-3 rfp-py-1 rfp-rounded-full';
      state.element.appendChild(label);

      state.rendered = true;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error(`渲染页面 ${pageNumber} 失败:`, err);
      }
    } finally {
      state.rendering = false;
      state.renderTask = null;
    }
  }, [onPageWidthChange]);

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
  const initPagePlaceholders = useCallback(() => {
    if (!pdfDocRef.current || !containerRef.current) return;

    const wrapper = containerRef.current.querySelector('.pdf-pages') as HTMLDivElement | null;
    if (!wrapper) return;

    wrapper.innerHTML = '';
    pageStatesRef.current.clear();

    for (let i = 1; i <= numPages; i++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'rfp-relative rfp-flex rfp-justify-center rfp-min-h-[800px]';
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
      onTotalPagesChange(total);
      onPageChange(1);
      setIsLoading(false);
    } catch (err) {
      console.error('PDF 加载错误:', err);
      setError(t('pdf.load_failed'));
      setIsLoading(false);
    }
  }, [url, onTotalPagesChange, onPageChange, t]);

  // 滚动处理
  const handleScroll = useCallback(() => {
    if (!containerRef.current || pageStatesRef.current.size === 0) return;

    const container = containerRef.current;
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
      onPageChange(currentVisiblePage);
    }
  }, [currentPage, onPageChange]);

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
        root: containerRef.current,
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
      if (observerRef.current && containerRef.current) {
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
    const container = containerRef.current;
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

  return (
    <div
      ref={containerRef}
      className="rfp-flex rfp-flex-col rfp-items-center rfp-w-full rfp-h-full rfp-overflow-auto rfp-py-4 md:rfp-py-8 rfp-px-2 md:rfp-px-4"
    >
      {error && (
        <RendererError message={error} />
      )}

      {!error && isLoading && (
        <div className="rfp-flex rfp-items-center rfp-justify-center rfp-min-h-screen">
          <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-line-strong rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
        </div>
      )}

      {!error && !isLoading && (
        <div className="pdf-pages rfp-flex rfp-flex-col rfp-gap-4" />
      )}

      {/* 底部页码指示器 */}
      {numPages > 0 && (
        <div className="rfp-sticky rfp-bottom-2 md:rfp-bottom-4 rfp-mt-4 md:rfp-mt-8 rfp-bg-surface-nav-hover rfp-backdrop-blur-xl rfp-text-fg-primary rfp-px-4 rfp-py-2 md:rfp-px-6 md:rfp-py-3 rfp-rounded-full rfp-text-xs md:rfp-text-sm rfp-font-medium rfp-shadow-2xl rfp-border rfp-border-line-weak">
          第 {currentPage} 页 / 共 {numPages} 页
        </div>
      )}
    </div>
  );
};
