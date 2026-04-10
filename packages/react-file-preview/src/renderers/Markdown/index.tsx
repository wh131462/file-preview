import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { ghcolors } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  url: string;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="rfp-absolute rfp-top-2 rfp-right-2 rfp-p-1.5 rfp-rounded-md rfp-bg-gray-100 hover:rfp-bg-gray-200 rfp-text-gray-500 hover:rfp-text-gray-700 rfp-transition-colors rfp-opacity-0 group-hover:rfp-opacity-100 rfp-border rfp-border-gray-200"
      title={copied ? '已复制' : '复制代码'}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ url }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('加载失败');
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError('Markdown 文件加载失败');
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
      <div className="rfp-max-w-full md:rfp-max-w-4xl rfp-mx-auto rfp-bg-white">
        <div className="rfp-p-6 md:rfp-p-10">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const codeString = String(children).replace(/\n$/, '');
                return !inline && match ? (
                  <div className="rfp-relative rfp-group rfp-my-4">
                    <div className="rfp-flex rfp-items-center rfp-px-4 rfp-py-2 rfp-bg-gray-100 rfp-border rfp-border-gray-200 rfp-rounded-t-md rfp-border-b-0">
                      <span className="rfp-text-xs rfp-text-gray-500 rfp-font-mono">{match[1]}</span>
                    </div>
                    <CopyButton text={codeString} />
                    <SyntaxHighlighter
                      style={ghcolors}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        borderRadius: '0 0 6px 6px',
                        border: '1px solid #d1d5db',
                        borderTop: 'none',
                        fontSize: '13px',
                        lineHeight: '1.5',
                      }}
                      {...props}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code
                    className="rfp-bg-gray-100 rfp-px-1.5 rfp-py-0.5 rfp-rounded rfp-text-sm rfp-font-mono rfp-text-gray-800 rfp-border rfp-border-gray-200"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              h1: ({ children }) => (
                <h1 className="rfp-text-3xl rfp-font-semibold rfp-mb-4 rfp-mt-6 rfp-text-gray-900 first:rfp-mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="rfp-text-2xl rfp-font-semibold rfp-mb-3 rfp-mt-8 rfp-text-gray-900">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="rfp-text-xl rfp-font-semibold rfp-mb-2 rfp-mt-6 rfp-text-gray-900">{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 className="rfp-text-lg rfp-font-semibold rfp-mb-2 rfp-mt-4 rfp-text-gray-900">{children}</h4>
              ),
              p: ({ children }) => (
                <p className="rfp-text-gray-700 rfp-mb-4 rfp-leading-7 rfp-text-base">{children}</p>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="rfp-text-blue-600 hover:rfp-text-blue-800 rfp-underline rfp-decoration-blue-300 hover:rfp-decoration-blue-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              ul: ({ children }) => (
                <ul className="rfp-list-disc rfp-pl-6 rfp-mb-4 rfp-text-gray-700 rfp-space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="rfp-list-decimal rfp-pl-6 rfp-mb-4 rfp-text-gray-700 rfp-space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="rfp-leading-7">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="rfp-border-l-4 rfp-border-gray-300 rfp-pl-4 rfp-text-gray-600 rfp-my-4 rfp-italic">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="rfp-overflow-x-auto rfp-my-4 rfp-rounded-md rfp-border rfp-border-gray-200">
                  <table className="rfp-min-w-full rfp-divide-y rfp-divide-gray-200">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="rfp-bg-gray-50">{children}</thead>,
              tbody: ({ children }) => (
                <tbody className="rfp-divide-y rfp-divide-gray-200 rfp-bg-white">{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:rfp-bg-gray-50 rfp-transition-colors">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="rfp-px-4 rfp-py-3 rfp-text-left rfp-text-xs rfp-font-semibold rfp-text-gray-600 rfp-uppercase rfp-tracking-wider">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="rfp-px-4 rfp-py-3 rfp-text-sm rfp-text-gray-700">{children}</td>
              ),
              hr: () => <hr className="rfp-border-gray-200 rfp-my-6" />,
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
                      className="rfp-mr-2 rfp-rounded rfp-border-gray-300"
                      {...props}
                    />
                  );
                }
                return <input type={type} {...props} />;
              },
              strong: ({ children }) => (
                <strong className="rfp-font-semibold rfp-text-gray-900">{children}</strong>
              ),
              em: ({ children }) => <em className="rfp-italic">{children}</em>,
              del: ({ children }) => (
                <del className="rfp-text-gray-400 rfp-line-through">{children}</del>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
