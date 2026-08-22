import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { renderLegacyPptHtml } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';

interface PptRendererProps {
  url: string;
}

export const PptRenderer = forwardRef<RendererHandle, PptRendererProps>(({ url }, ref) => {
  const t = useTranslator();
  const fetcher = useFetcher();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      setHtml('');
      try {
        const response = await fetcher(url);
        if (!response.ok) throw new Error('load failed');
        const buffer = await response.arrayBuffer();
        setHtml(await renderLegacyPptHtml(buffer));
      } catch (err) {
        console.error('Ppt 解析错误:', err);
        setError(t('ppt.parse_failed'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [url, fetcher, t]);

  useImperativeHandle(ref, () => ({
    getToolbarGroups: () => [],
  }), []);

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

  return (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-py-6 rfp-px-4">
      <div className="rfp-legacy-ppt-wrap" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
});

PptRenderer.displayName = 'PptRenderer';
