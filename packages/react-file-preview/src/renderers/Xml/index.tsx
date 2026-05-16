import { useState, useEffect } from 'react';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';
import { useShikiHighlight } from '../../hooks/useShikiHighlight';

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

export const XmlRenderer: React.FC<XmlRendererProps> = ({ url }) => {
  const t = useTranslator();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { html: highlighted } = useShikiHighlight(content, 'xml');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const raw = await fetchTextUtf8(url);
        setContent(prettyPrintXml(raw));
      } catch (err) {
        console.error(err);
        setError(t('xml.load_failed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [url]);

  if (loading) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-line-strong rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-fg-secondary rfp-text-center">
          <p className="rfp-text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-code-bg">
      {highlighted ? (
        <div
          className="rfp-shiki-wrapper with-line-numbers"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <pre className="rfp-p-6 rfp-text-fg-primary rfp-font-mono rfp-text-sm rfp-whitespace-pre-wrap rfp-break-words">
          {content}
        </pre>
      )}
    </div>
  );
};
