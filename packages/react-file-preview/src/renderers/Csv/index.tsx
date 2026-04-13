import { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { parseCsv, guessCsvDelimiter, fetchTextUtf8, type CsvParseResult } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';

interface CsvRendererProps {
  url: string;
  fileName: string;
}

export const CsvRenderer: React.FC<CsvRendererProps> = ({ url, fileName }) => {
  const t = useTranslator();
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setText(await fetchTextUtf8(url));
      } catch (err) {
        console.error(err);
        setError(t('csv.load_failed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [url]);

  const parsed: CsvParseResult | null = useMemo(() => {
    if (!text) return null;
    try {
      return parseCsv(text, { delimiter: guessCsvDelimiter(fileName) });
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [text, fileName]);

  if (loading) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
      </div>
    );
  }

  if (error || !parsed) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-white/70 rfp-text-center">
          <p className="rfp-text-lg">{error || t('csv.parse_failed')}</p>
        </div>
      </div>
    );
  }

  const { header, rows, columnCount, delimiter } = parsed;
  const hasHeader = header.length > 0;
  const label = delimiter === '\t' ? 'TSV' : 'CSV';
  const columns = Array.from({ length: columnCount }, (_, i) => i);

  return (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-p-4 md:rfp-p-8">
      <div className="rfp-max-w-full md:rfp-max-w-6xl rfp-mx-auto rfp-bg-white/5 rfp-backdrop-blur-sm rfp-rounded-2xl rfp-border rfp-border-white/10 rfp-overflow-hidden">
        <div className="rfp-flex rfp-items-center rfp-gap-2 md:rfp-gap-3 rfp-px-4 rfp-py-3 md:rfp-px-6 md:rfp-py-4 rfp-bg-white/5 rfp-border-b rfp-border-white/10">
          <FileSpreadsheet className="rfp-w-4 rfp-h-4 md:rfp-w-5 md:rfp-h-5 rfp-text-white/70 rfp-flex-shrink-0" />
          <span className="rfp-text-white rfp-font-medium rfp-text-sm md:rfp-text-base rfp-truncate">{fileName}</span>
          <span className="rfp-ml-auto rfp-text-xs rfp-text-white/50 rfp-uppercase rfp-flex-shrink-0">
            {label} · {rows.length} rows · {columnCount} cols
          </span>
        </div>

        <div className="rfp-overflow-auto rfp-text-sm rfp-text-white/90">
          <table className="rfp-w-full rfp-border-collapse rfp-font-mono">
            {hasHeader && (
              <thead className="rfp-sticky rfp-top-0 rfp-bg-white/10 rfp-backdrop-blur">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={`h-${c}`}
                      className="rfp-text-left rfp-px-3 rfp-py-2 rfp-border-b rfp-border-white/10 rfp-font-semibold rfp-text-white rfp-whitespace-nowrap"
                    >
                      {header[c] ?? ''}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, ri) => (
                <tr
                  key={`r-${ri}`}
                  className={ri % 2 === 0 ? 'rfp-bg-white/0' : 'rfp-bg-white/5'}
                >
                  {columns.map((c) => (
                    <td
                      key={`c-${ri}-${c}`}
                      className="rfp-px-3 rfp-py-2 rfp-border-b rfp-border-white/5 rfp-whitespace-pre-wrap rfp-break-words"
                    >
                      {row[c] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
