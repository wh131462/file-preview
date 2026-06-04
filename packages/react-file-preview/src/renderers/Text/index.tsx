import { useState, useEffect } from 'react';
import { fetchTextUtf8, getLanguageFromFileName } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';
import { useShikiHighlight } from '../../hooks/useShikiHighlight';
import { RendererError } from '../RendererError';

interface TextRendererProps {
  url: string;
  fileName: string;
  wordWrap?: boolean;
  htmlPreview?: boolean;
}

export const TextRenderer: React.FC<TextRendererProps> = ({
  url,
  fileName,
  wordWrap = true,
  htmlPreview = false,
}) => {
  const t = useTranslator();
  const fetcher = useFetcher();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const language = getLanguageFromFileName(fileName);
  const { html: highlighted } = useShikiHighlight(
    language !== 'text' ? content : '',
    language,
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadText = async () => {
      try {
        setLoading(true);
        setError(null);
        const text = await fetchTextUtf8(url, { fetcher, signal: controller.signal });
        setContent(text);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(t('text.load_failed'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadText();
    return () => controller.abort();
  }, [url]);

  if (loading) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-line-strong rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
      </div>
    );
  }

  if (error) {
    return <RendererError message={error} />;
  }

  // HTML 预览模式
  if (htmlPreview && (language === 'html')) {
    return (
      <div className="rfp-w-full rfp-h-full rfp-bg-surface-toolbar">
        <iframe
          srcDoc={content}
          sandbox="allow-same-origin"
          className="rfp-w-full rfp-h-full rfp-border-0"
          title={fileName}
        />
      </div>
    );
  }

  // 源码模式
  return (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-code-bg">
      {language === 'text' || !highlighted ? (
        <pre
          className={`rfp-p-6 rfp-text-fg-primary rfp-font-mono rfp-text-sm ${
            wordWrap ? 'rfp-whitespace-pre-wrap rfp-break-words' : 'rfp-whitespace-pre'
          }`}
        >
          {content}
        </pre>
      ) : (
        <div
          className={`rfp-shiki-wrapper with-line-numbers ${wordWrap ? '' : 'no-wrap'}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      )}
    </div>
  );
};
