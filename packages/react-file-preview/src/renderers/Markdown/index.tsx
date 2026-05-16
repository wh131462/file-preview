import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Copy, Check } from 'lucide-react';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';
import { useShikiHighlight } from '../../hooks/useShikiHighlight';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  url: string;
  viewMode?: 'preview' | 'source';
}

const useCopy = (text: string) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return { copied, handleCopy };
};

/** 内联版复制按钮：放在代码块 header 行内，始终可见 */
const InlineCopyButton = ({ text }: { text: string }) => {
  const t = useTranslator();
  const { copied, handleCopy } = useCopy(text);
  return (
    <button
      onClick={handleCopy}
      className="rfp-p-1 rfp-rounded rfp-text-fg-muted hover:rfp-text-fg-secondary rfp-transition-colors rfp-flex rfp-items-center rfp-gap-1"
      title={copied ? t('markdown.copied') : t('markdown.copy_code')}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
};

/** 浮动版复制按钮：无 header 时绝对定位于代码块右上角（hover 显示） */
const FloatingCopyButton = ({ text }: { text: string }) => {
  const t = useTranslator();
  const { copied, handleCopy } = useCopy(text);
  return (
    <button
      onClick={handleCopy}
      className="rfp-absolute rfp-top-2 rfp-right-2 rfp-p-1.5 rfp-rounded-md rfp-bg-surface-2 hover:rfp-bg-surface-3 rfp-text-fg-tertiary hover:rfp-text-fg-secondary rfp-transition-colors rfp-opacity-0 group-hover:rfp-opacity-100 rfp-border rfp-border-line"
      title={copied ? t('markdown.copied') : t('markdown.copy_code')}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

/** 带语言标注的代码块：shiki 高亮 + header + 复制按钮 */
const ShikiCodeBlock = ({ code, lang }: { code: string; lang: string }) => {
  const { html } = useShikiHighlight(code, lang);
  return (
    <div className="rfp-relative rfp-group rfp-my-4">
      <div className="rfp-flex rfp-items-center rfp-justify-between rfp-px-4 rfp-py-1.5 rfp-bg-surface-1 rfp-border rfp-border-line-weak rfp-rounded-t-md rfp-border-b-0">
        <span className="rfp-text-xs rfp-text-fg-secondary rfp-font-mono rfp-select-none">{lang}</span>
        <InlineCopyButton text={code} />
      </div>
      {html ? (
        <div
          className="rfp-shiki-wrapper rfp-rounded-b-md rfp-border rfp-border-line-weak rfp-border-t-0 rfp-overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre
          className="rfp-m-0 rfp-rounded-b-md rfp-border rfp-border-line-weak rfp-border-t-0 rfp-overflow-x-auto rfp-p-4 rfp-bg-code-bg"
          style={{ fontSize: '13px', lineHeight: '1.5' }}
        >
          <code className="rfp-font-mono rfp-text-code-fg rfp-text-sm">{code}</code>
        </pre>
      )}
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ url, viewMode = 'preview' }) => {
  const t = useTranslator();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { html: sourceHtml } = useShikiHighlight(
    viewMode === 'source' ? content : '',
    'markdown',
  );

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setLoading(true);
        setError(null);
        const text = await fetchTextUtf8(url);
        setContent(text);
      } catch (err) {
        setError(t('markdown.load_failed'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadMarkdown();
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

  // 源码视图
  if (viewMode === 'source') {
    return (
      <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-code-bg">
        {sourceHtml ? (
          <div
            className="rfp-shiki-wrapper with-line-numbers"
            dangerouslySetInnerHTML={{ __html: sourceHtml }}
          />
        ) : (
          <pre className="rfp-p-6 rfp-text-fg-primary rfp-font-mono rfp-text-sm rfp-whitespace-pre-wrap rfp-break-words">
            {content}
          </pre>
        )}
      </div>
    );
  }

  // 预览视图
  return (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-p-6 md:rfp-p-10">
      <div className="rfp-max-w-full md:rfp-max-w-4xl rfp-mx-auto">
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeRaw, rehypeKatex]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                if (!inline && match) {
                  // 有语言标注的代码块 - shiki 高亮
                  return <ShikiCodeBlock code={codeString} lang={match[1]} />;
                }
                if (!inline) {
                  // 无语言标注的代码块 - 纯文本暗色显示
                  return (
                    <div className="rfp-relative rfp-group rfp-my-4">
                      <FloatingCopyButton text={codeString} />
                      <pre
                        className="rfp-m-0 rfp-rounded-md rfp-border rfp-border-line-weak rfp-overflow-x-auto rfp-p-4 rfp-bg-code-bg"
                        style={{ fontSize: '13px', lineHeight: '1.5' }}
                      >
                        <code className="rfp-font-mono rfp-text-code-fg rfp-text-sm">{children}</code>
                      </pre>
                    </div>
                  );
                }
                // 行内代码
                return (
                  <code
                    className="rfp-bg-surface-2 rfp-px-1.5 rfp-py-0.5 rfp-rounded rfp-text-sm rfp-font-mono rfp-text-fg-primary rfp-border rfp-border-line-weak"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              h1: ({ children }) => (
                <h1 className="rfp-text-3xl rfp-font-semibold rfp-mb-4 rfp-mt-6 rfp-text-fg-primary first:rfp-mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="rfp-text-2xl rfp-font-semibold rfp-mb-3 rfp-mt-8 rfp-text-fg-primary">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="rfp-text-xl rfp-font-semibold rfp-mb-2 rfp-mt-6 rfp-text-fg-primary">{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 className="rfp-text-lg rfp-font-semibold rfp-mb-2 rfp-mt-4 rfp-text-fg-primary">{children}</h4>
              ),
              p: ({ children }) => (
                <p className="rfp-text-fg-secondary rfp-mb-4 rfp-leading-7 rfp-text-base">{children}</p>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="rfp-text-indigo-400 hover:rfp-text-indigo-300 rfp-underline rfp-decoration-indigo-600 hover:rfp-decoration-indigo-400"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              ul: ({ children }) => (
                <ul className="rfp-list-disc rfp-pl-6 rfp-mb-4 rfp-text-fg-secondary rfp-space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="rfp-list-decimal rfp-pl-6 rfp-mb-4 rfp-text-fg-secondary rfp-space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="rfp-leading-7">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="rfp-border-l-4 rfp-border-line-strong rfp-pl-4 rfp-text-fg-tertiary rfp-my-4 rfp-italic">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="rfp-overflow-x-auto rfp-my-4 rfp-rounded-md rfp-border rfp-border-line">
                  <table className="rfp-min-w-full rfp-divide-y rfp-divide-divide">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="rfp-bg-surface-1">{children}</thead>,
              tbody: ({ children }) => (
                <tbody className="rfp-divide-y rfp-divide-divide rfp-bg-transparent">{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:rfp-bg-surface-1 rfp-transition-colors">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="rfp-px-4 rfp-py-3 rfp-text-left rfp-text-xs rfp-font-semibold rfp-text-fg-tertiary rfp-uppercase rfp-tracking-wider">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="rfp-px-4 rfp-py-3 rfp-text-sm rfp-text-fg-secondary">{children}</td>
              ),
              hr: () => <hr className="rfp-border-line rfp-my-6" />,
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt}
                  className="rfp-rounded-md rfp-max-w-full rfp-h-auto rfp-my-4 rfp-mx-auto rfp-block rfp-shadow-sm"
                />
              ),
              input: ({ type, checked, ...props }) => {
                if (type === 'checkbox') {
                  return (
                    <input
                      type="checkbox"
                      checked={checked}
                      readOnly
                      className="rfp-mr-2 rfp-rounded rfp-border-line"
                      {...props}
                    />
                  );
                }
                return <input type={type} {...props} />;
              },
              strong: ({ children }) => (
                <strong className="rfp-font-semibold rfp-text-fg-primary">{children}</strong>
              ),
              em: ({ children }) => <em className="rfp-italic">{children}</em>,
              del: ({ children }) => (
                <del className="rfp-text-fg-muted rfp-line-through">{children}</del>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
      </div>
    </div>
  );
};
