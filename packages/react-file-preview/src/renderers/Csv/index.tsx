import { useState, useEffect, useRef, useCallback } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import Spreadsheet from 'x-data-spreadsheet';
import 'x-data-spreadsheet/dist/xspreadsheet.css';
import {
  parseCsv,
  guessCsvDelimiter,
  fetchTextUtf8,
  convertCsvToSpreadsheetData,
} from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';

interface CsvRendererProps {
  url: string;
  fileName: string;
}

export const CsvRenderer: React.FC<CsvRendererProps> = ({ url, fileName }) => {
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

    const loadCsv = async () => {
      if (!containerRef.current) return;

      setLoading(true);
      setError(null);

      try {
        const text = await fetchTextUtf8(url, { fetcher });
        const parsed = parseCsv(text, { delimiter: guessCsvDelimiter(fileName) });
        const sheetData = convertCsvToSpreadsheetData(parsed.header, parsed.rows, fileName);

        if (!isMounted) return;

        sheetDataRef.current = sheetData as unknown as Record<string, unknown>[];
        mountSpreadsheet();
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          console.error('CSV 解析错误:', err);
          setError(t('csv.load_failed'));
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        loadCsv();
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
  }, [url, fileName, mountSpreadsheet]);

  return (
    <div className="rfp-relative rfp-flex rfp-flex-col rfp-items-center rfp-w-full rfp-h-full">
      {loading && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-surface-toolbar rfp-backdrop-blur-sm rfp-z-10">
          <div className="rfp-text-center">
            <div className="rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-mx-auto rfp-mb-3 rfp-border-4 rfp-border-line-strong rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
            <p className="rfp-text-xs md:rfp-text-sm rfp-text-fg-secondary rfp-font-medium">{t('csv.loading')}</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-surface-toolbar rfp-backdrop-blur-sm rfp-z-10">
          <div className="rfp-text-center rfp-max-w-sm md:rfp-max-w-md rfp-px-4">
            <div className="rfp-w-24 rfp-h-24 md:rfp-w-32 md:rfp-h-32 rfp-mx-auto rfp-mb-4 md:rfp-mb-6 rfp-rounded-2xl md:rfp-rounded-3xl rfp-bg-gradient-to-br rfp-from-green-500 rfp-via-emerald-500 rfp-to-teal-500 rfp-flex rfp-items-center rfp-justify-center rfp-shadow-2xl">
              <FileSpreadsheet className="rfp-w-12 rfp-h-12 md:rfp-w-16 md:rfp-h-16 rfp-text-fg-primary" />
            </div>
            <p className="rfp-text-lg md:rfp-text-xl rfp-text-fg-primary rfp-mb-2 md:rfp-mb-3 rfp-font-medium">{t('csv.load_failed')}</p>
            <p className="rfp-text-xs md:rfp-text-sm rfp-text-fg-tertiary rfp-mb-4 md:rfp-mb-6">{error}</p>
          </div>
        </div>
      )}

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
