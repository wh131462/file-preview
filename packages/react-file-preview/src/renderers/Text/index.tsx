import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';

interface TextRendererProps {
  url: string;
  fileName: string;
  wordWrap?: boolean;
  htmlPreview?: boolean;
}

const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    json: 'json',
    xml: 'xml',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    conf: 'nginx',
    md: 'markdown',
    txt: 'text',
  };
  return languageMap[ext] || 'text';
};

export const TextRenderer: React.FC<TextRendererProps> = ({
  url,
  fileName,
  wordWrap = true,
  htmlPreview = false,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const language = getLanguageFromFileName(fileName);

  useEffect(() => {
    const loadText = async () => {
      try {
        setLoading(true);
        setError(null);
        const text = await fetchTextUtf8(url);
        setContent(text);
      } catch (err) {
        setError('文本文件加载失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadText();
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

  // HTML 预览模式
  if (htmlPreview && (language === 'html')) {
    return (
      <div className="rfp-w-full rfp-h-full rfp-bg-white">
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
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-[#1e1e1e]">
      {language === 'text' ? (
        <pre
          className={`rfp-p-6 rfp-text-white/90 rfp-font-mono rfp-text-sm ${
            wordWrap ? 'rfp-whitespace-pre-wrap rfp-break-words' : 'rfp-whitespace-pre'
          }`}
        >
          {content}
        </pre>
      ) : (
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers
          wrapLongLines={wordWrap}
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
      )}
    </div>
  );
};
