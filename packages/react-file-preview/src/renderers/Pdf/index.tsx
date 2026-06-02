import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslator } from '../../i18n/LocaleContext';
// @ts-ignore - pdfjs-dist 类型路径
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

interface PdfPageProxy {
  getViewport(opts: { scale: number }): { width: number; height: number };
  render(opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): {
    promise: Promise<void>;
  };
}

interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  destroy(): void;
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
  const pageElementsRef = useRef<HTMLDivElement[]>([]);

  // 渲染单个页面
  const renderPage = useCallback(async (pageNumber: number, scale: number, container: HTMLDivElement) => {
    if (!pdfDocRef.current) return;

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

    await page.render({ canvasContext: ctx, viewport }).promise;

    // 上报第一页原始宽度
    if (pageNumber === 1 && onPageWidthChange) {
      const baseViewport = page.getViewport({ scale: 1 });
      onPageWidthChange(baseViewport.width);
    }

    container.innerHTML = '';
    container.appendChild(canvas);

    // 页码标签
    const label = document.createElement('div');
    label.textContent = String(pageNumber);
    label.className = 'rfp-absolute rfp-top-2 rfp-right-2 rfp-bg-surface-nav-hover rfp-backdrop-blur-sm rfp-text-fg-primary rfp-text-xs rfp-px-3 rfp-py-1 rfp-rounded-full';
    container.appendChild(label);
  }, [onPageWidthChange]);

  // 渲染所有页面
  const renderAllPages = useCallback(async () => {
    if (!pdfDocRef.current || !containerRef.current) return;

    const wrapper = containerRef.current.querySelector('.pdf-pages') as HTMLDivElement | null;
    if (!wrapper) return;

    wrapper.innerHTML = '';
    pageElementsRef.current = [];

    for (let i = 1; i <= numPages; i++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'rfp-relative rfp-flex rfp-justify-center';
      wrapper.appendChild(pageDiv);
      pageElementsRef.current.push(pageDiv);
      await renderPage(i, zoom, pageDiv);
    }
  }, [numPages, zoom, renderPage]);

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

      // 等待 DOM 更新后渲染
      setTimeout(() => {
        renderAllPages();
      }, 0);
    } catch (err) {
      console.error('PDF 加载错误:', err);
      setError(t('pdf.load_failed'));
      setIsLoading(false);
    }
  }, [url, onTotalPagesChange, onPageChange, renderAllPages, t]);

  // 监听 URL 变化
  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  // 监听 zoom 变化
  useEffect(() => {
    if (numPages > 0) {
      renderAllPages();
    }
  }, [zoom, numPages, renderAllPages]);

  // 滚动处理
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollCenter = scrollTop + containerHeight / 2;

    let currentVisiblePage = 1;
    let minDistance = Infinity;

    pageElementsRef.current.forEach((pageEl, idx) => {
      const pageNumber = idx + 1;
      const rect = pageEl.getBoundingClientRect();
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
        <div className="rfp-text-fg-secondary rfp-text-center">
          <p className="rfp-text-lg">{error}</p>
        </div>
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
