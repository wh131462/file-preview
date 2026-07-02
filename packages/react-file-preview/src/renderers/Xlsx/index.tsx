import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import ExcelJS from 'exceljs';
import Spreadsheet from 'x-data-spreadsheet';
import { convertWorkbookToSpreadsheetData } from '../../utils/excelDataConverter';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';

interface XlsxRendererProps {
  url: string;
}

export const XlsxRenderer = forwardRef<RendererHandle, XlsxRendererProps>(({ url }, ref) => {
  const t = useTranslator();
  const fetcher = useFetcher();
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
    // 只有 URL 有效时才加载（避免空字符串或已 revoke 的 blob URL）
    if (!url) return;

    let isMounted = true;

    const loadExcel = async () => {
      if (!containerRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetcher(url, {
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(t('xlsx.not_found'));
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
          let errorMsg = t('xlsx.parse_failed');
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

  // 暴露接口给父组件
  useImperativeHandle(ref, () => ({
    getToolbarGroups: () => [],
  }), []);

  return (
    <div className="rfp-relative rfp-flex rfp-flex-col rfp-items-center rfp-w-full rfp-h-full">
      {/* 加载状态 */}
      {loading && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-surface-toolbar rfp-backdrop-blur-sm rfp-z-10">
          <div className="rfp-text-center">
            <div className="rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-mx-auto rfp-mb-3 rfp-border-4 rfp-border-line-strong rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
            <p className="rfp-text-xs md:rfp-text-sm rfp-text-fg-secondary rfp-font-medium">{t('xlsx.loading')}</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && !loading && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-surface-toolbar rfp-backdrop-blur-sm rfp-z-10">
          <RendererError message={t('xlsx.load_failed')} detail={error} />
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
});
