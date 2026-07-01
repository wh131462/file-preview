import { useState, useEffect, Fragment, forwardRef, useImperativeHandle } from 'react';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';
import { useShikiHighlight } from '../../hooks/useShikiHighlight';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';

interface XmlRendererProps {
  url: string;
  fileName: string;
}

/**
 * 用 DOMParser 美化 XML：失败则原样返回
 */
const prettyPrintXml = (xml: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    // 检测解析错误
    const errNode = doc.querySelector('parsererror');
    if (errNode) return xml;
    // 使用 XSLT 或手动缩进：这里手动缩进更稳
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(doc);
    return indentXml(serialized);
  } catch {
    return xml;
  }
};

const indentXml = (xml: string): string => {
  const PADDING = '  ';
  const reg = /(>)(<)(\/*)/g;
  let formatted = xml.replace(reg, '$1\n$2$3');
  // 自闭合和 CDATA 等不处理
  let pad = 0;
  return formatted
    .split('\n')
    .map((line) => {
      let indent = 0;
      if (/^<\/\w/.test(line)) {
        pad = Math.max(pad - 1, 0);
      } else if (/^<\w[^>]*[^/]>.*$/.test(line) && !/<.+<\/.+>$/.test(line)) {
        indent = 1;
      }
      const padded = PADDING.repeat(pad) + line;
      pad += indent;
      return padded;
    })
    .join('\n');
};

export const XmlRenderer = forwardRef<RendererHandle, XmlRendererProps>(({ url }, ref) => {
  const t = useTranslator();
  const fetcher = useFetcher();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lineHtmls } = useShikiHighlight(content, 'xml');

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const raw = await fetchTextUtf8(url, { fetcher, signal: controller.signal });
        setContent(prettyPrintXml(raw));
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error(err);
        setError(t('xml.load_failed'));
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [url]);

  // 暴露接口给父组件（必须在 early return 之前调用）
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

  if (lineHtmls.length === 0) {
    return (
      <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-code-bg">
        <pre className="rfp-py-6 rfp-px-4 rfp-text-fg-primary rfp-font-mono rfp-text-sm rfp-whitespace-pre-wrap rfp-break-words">
          {content}
        </pre>
      </div>
    );
  }

  const lines = content.split('\n');
  return (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-code-bg">
      <div
        className="rfp-code-block with-line-numbers rfp-w-full"
        style={{ gridTemplateRows: `repeat(${lines.length}, auto) minmax(1.5rem, 1fr)` }}
      >
        {lines.map((_, i) => (
          <Fragment key={i}>
            <span className="rfp-code-gutter">{i + 1}</span>
            <span
              className="rfp-code-line"
              dangerouslySetInnerHTML={{ __html: lineHtmls[i] ?? '' }}
            />
          </Fragment>
        ))}
        {/* 占位行：撑满剩余高度，让 gutter border 延伸到底部 */}
        <span className="rfp-code-gutter-filler" />
        <span className="rfp-code-line-filler" />
      </div>
    </div>
  );
});
