import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Code } from 'lucide-react';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';

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

export const XmlRenderer: React.FC<XmlRendererProps> = ({ url, fileName }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const raw = await fetchTextUtf8(url);
        setContent(prettyPrintXml(raw));
      } catch (err) {
        console.error(err);
        setError('XML 文件加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [url]);

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
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-p-4 md:rfp-p-8">
      <div className="rfp-max-w-full md:rfp-max-w-6xl rfp-mx-auto rfp-bg-white/5 rfp-backdrop-blur-sm rfp-rounded-2xl rfp-border rfp-border-white/10 rfp-overflow-hidden">
        <div className="rfp-flex rfp-items-center rfp-gap-2 md:rfp-gap-3 rfp-px-4 rfp-py-3 md:rfp-px-6 md:rfp-py-4 rfp-bg-white/5 rfp-border-b rfp-border-white/10">
          <Code className="rfp-w-4 rfp-h-4 md:rfp-w-5 md:rfp-h-5 rfp-text-white/70 rfp-flex-shrink-0" />
          <span className="rfp-text-white rfp-font-medium rfp-text-sm md:rfp-text-base rfp-truncate">{fileName}</span>
          <span className="rfp-ml-auto rfp-text-xs rfp-text-white/50 rfp-uppercase rfp-flex-shrink-0">XML</span>
        </div>
        <div className="rfp-text-sm">
          <SyntaxHighlighter
            language="xml"
            style={vscDarkPlus}
            showLineNumbers
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              background: 'transparent',
              fontSize: '0.875rem',
            }}
            lineNumberStyle={{
              minWidth: '3em',
              paddingRight: '1em',
              color: 'rgba(255, 255, 255, 0.3)',
              userSelect: 'none',
            }}
          >
            {content}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};
