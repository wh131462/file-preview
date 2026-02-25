import { useState, useEffect, useRef, useCallback } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import Spreadsheet from 'x-data-spreadsheet';
import { convertWorkbookToSpreadsheetData } from '../utils/excelDataConverter';

interface XlsxRendererProps {
  url: string;
}

export const XlsxRenderer: React.FC<XlsxRendererProps> = ({ url }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spreadsheetRef = useRef<Spreadsheet | null>(null);
  const sheetDataRef = useRef<Record<string, unknown>[] | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const lastDimensionsRef = useRef({ width: 0, height: 0 });

  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) return { width: 800, height: 600 };
    const rawWidth = containerRef.current.clientWidth;
    const rawHeight = containerRef.current.clientHeight;
    const width = rawWidth > 100 ? rawWidth : 800;
    const height = rawHeight > 100 ? rawHeight : 600;
    return { width, height };
  }, []);

  const mountSpreadsheet = useCallback(() => {
    if (!containerRef.current || !sheetDataRef.current) return;

    // 清空容器
    containerRef.current.innerHTML = '';
    spreadsheetRef.current = null;

    const { width, height } = calculateDimensions();
    const isMobile = width < 640;

    const s = new Spreadsheet(containerRef.current, {
      mode: 'read',
      showToolbar: false,
      showContextmenu: false,
      showGrid: true,
      row: {
        len: 100,
        height: 25,
      },
      col: {
        len: 26,
        width: isMobile ? 80 : 100,
        indexWidth: isMobile ? 40 : 60,
        minWidth: isMobile ? 40 : 60,
      },
      view: {
        height: () => height,
        width: () => width,
      },
    });

    s.loadData(sheetDataRef.current as unknown as Record<string, unknown>);
    spreadsheetRef.current = s;
  }, [calculateDimensions]);

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    let isInitialRender = true;

    const updateDimensions = () => {
      if (isInitialRender) {
        isInitialRender = false;
        lastDimensionsRef.current = calculateDimensions();
        return;
      }

      const newDimensions = calculateDimensions();
      const lastDimensions = lastDimensionsRef.current;
      const widthDiff = Math.abs(lastDimensions.width - newDimensions.width);
      const heightDiff = Math.abs(lastDimensions.height - newDimensions.height);

      if (widthDiff < 10 && heightDiff < 10) return;

      lastDimensionsRef.current = newDimensions;

      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = window.setTimeout(() => {
        if (sheetDataRef.current) {
          mountSpreadsheet();
        }
      }, 500);
    };

    resizeObserverRef.current = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [calculateDimensions, mountSpreadsheet]);

  useEffect(() => {
    let isMounted = true;

    const loadExcel = async () => {
      if (!containerRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Excel 文件不存在');
          } else if (response.status === 403) {
            throw new Error('无权限访问此文件');
          } else {
            throw new Error(`文件加载失败 (${response.status})`);
          }
        }

        const arrayBuffer = await response.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
          throw new Error('文件为空');
        }

        // 使用 exceljs 解析
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        // 转换为 x-data-spreadsheet 数据格式
        const sheetData = convertWorkbookToSpreadsheetData(workbook);

        if (!isMounted) return;

        sheetDataRef.current = sheetData as unknown as Record<string, unknown>[];

        // 挂载 x-data-spreadsheet
        mountSpreadsheet();

        setLoading(false);
      } catch (err) {
        if (isMounted) {
          console.error('Excel 解析错误:', err);
          let errorMsg = 'Excel 文件解析失败';
          if (err instanceof Error) {
            errorMsg = err.message;
          }
          setError(errorMsg);
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        loadExcel();
      });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      sheetDataRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      spreadsheetRef.current = null;
    };
  }, [url, mountSpreadsheet]);

  return (
    <div className="rfp-relative rfp-flex rfp-flex-col rfp-items-center rfp-w-full rfp-h-full">
      {/* 加载状态 */}
      {loading && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-black/50 rfp-backdrop-blur-sm rfp-z-10 rfp-rounded-xl md:rfp-rounded-2xl">
          <div className="rfp-text-center">
            <div className="rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-mx-auto rfp-mb-3 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
            <p className="rfp-text-xs md:rfp-text-sm rfp-text-white/70 rfp-font-medium">加载 Excel 中...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-black/50 rfp-backdrop-blur-sm rfp-z-10 rfp-rounded-xl md:rfp-rounded-2xl">
          <div className="rfp-text-center rfp-max-w-sm md:rfp-max-w-md rfp-px-4">
            <div className="rfp-w-24 rfp-h-24 md:rfp-w-32 md:rfp-h-32 rfp-mx-auto rfp-mb-4 md:rfp-mb-6 rfp-rounded-2xl md:rfp-rounded-3xl rfp-bg-gradient-to-br rfp-from-green-500 rfp-via-emerald-500 rfp-to-teal-500 rfp-flex rfp-items-center rfp-justify-center rfp-shadow-2xl">
              <FileSpreadsheet className="rfp-w-12 rfp-h-12 md:rfp-w-16 md:rfp-h-16 rfp-text-white" />
            </div>
            <p className="rfp-text-lg md:rfp-text-xl rfp-text-white/90 rfp-mb-2 md:rfp-mb-3 rfp-font-medium">Excel 加载失败</p>
            <p className="rfp-text-xs md:rfp-text-sm rfp-text-white/60 rfp-mb-4 md:rfp-mb-6">
              {error}
            </p>
            <a
              href={url}
              download
              className="rfp-inline-flex rfp-items-center rfp-gap-2 rfp-px-4 rfp-py-2 md:rfp-px-6 md:rfp-py-3 rfp-bg-gradient-to-r rfp-from-purple-500 rfp-to-pink-500 rfp-text-white rfp-text-sm md:rfp-text-base rfp-rounded-lg md:rfp-rounded-xl hover:rfp-scale-105 rfp-transition-all rfp-shadow-lg"
            >
              <svg className="rfp-w-4 rfp-h-4 md:rfp-w-5 md:rfp-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载文件
            </a>
            <p className="rfp-text-xs rfp-text-white/40 rfp-mt-3 md:rfp-mt-4">
              提示：可以使用 Microsoft Excel 或 WPS 打开
            </p>
          </div>
        </div>
      )}

      {/* Spreadsheet 容器 */}
      {!error && (
        <div
          ref={containerRef}
          className="xlsx-spreadsheet-container rfp-w-full rfp-h-full"
          style={{ opacity: loading ? 0 : 1 }}
        />
      )}
    </div>
  );
};
