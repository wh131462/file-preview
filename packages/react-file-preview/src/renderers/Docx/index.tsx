import { useState, useEffect, useRef, useCallback } from 'react';
import mammoth from 'mammoth';

interface DocxRendererProps {
  url: string;
}

// A4 page dimensions (96dpi)
const PAGE_HEIGHT = 1123;
const PAGE_PADDING_Y = 60;
const PAGE_PADDING_X = 50;
const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_Y * 2;
const PAGE_GAP = 24;

const contentStyle: React.CSSProperties = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  lineHeight: '1.8',
  color: '#333',
};

export const DocxRenderer: React.FC<DocxRendererProps> = ({ url }) => {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDocx = async () => {
      setLoading(true);
      setError(null);
      setHtml('');

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('文件加载失败');
        }

        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtml(result.value);
      } catch (err) {
        console.error('Docx 解析错误:', err);
        setError('Word 文档解析失败');
      } finally {
        setLoading(false);
      }
    };

    loadDocx();
  }, [url]);

  const paginate = useCallback(() => {
    const container = measureRef.current;
    if (!container || !html) return;

    const children = Array.from(container.children) as HTMLElement[];
    if (children.length === 0) {
      setPages([html]);
      return;
    }

    const result: string[][] = [[]];
    let currentPageUsed = 0;

    for (const child of children) {
      const h = child.offsetHeight;

      // If adding this block would exceed page content area and page isn't empty,
      // start a new page
      if (currentPageUsed > 0 && currentPageUsed + h > PAGE_CONTENT_HEIGHT) {
        result.push([]);
        currentPageUsed = 0;
      }

      result[result.length - 1].push(child.outerHTML);
      currentPageUsed += h;
    }

    // At least one page
    if (result.length === 0) result.push([]);

    setPages(result.map(blocks => blocks.join('')));
  }, [html]);

  useEffect(() => {
    if (!html || !measureRef.current) return;
    requestAnimationFrame(() => {
      paginate();
    });
  }, [html, paginate]);

  if (loading) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-white/70 rfp-text-center">
          <p className="rfp-text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rfp-w-full rfp-h-full rfp-overflow-auto"
      style={{ background: 'rgba(0, 0, 0, 0.15)' }}
    >
      {/* Hidden measurement div — same width as page content area */}
      <div
        ref={measureRef}
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          ...contentStyle,
          position: 'absolute',
          visibility: 'hidden',
          width: `${794 - PAGE_PADDING_X * 2}px`,
          pointerEvents: 'none',
        }}
      />

      {/* Visible pages */}
      <div
        className="rfp-py-6 md:rfp-py-10 rfp-flex rfp-flex-col rfp-items-center"
        style={{ gap: `${PAGE_GAP}px` }}
      >
        {(pages.length > 0 ? pages : ['']).map((pageHtml, i) => (
          <div
            key={i}
            style={{
              width: '100%',
              maxWidth: '794px',
              minHeight: `${PAGE_HEIGHT}px`,
              background: 'white',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
              flexShrink: 0,
              padding: `${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px`,
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: pageHtml }}
              style={contentStyle}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
