import { useState, useEffect, Fragment, forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { fetchTextUtf8, getLanguageFromFileName } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';
import { useShikiHighlight } from '../../hooks/useShikiHighlight';
import { RendererError } from '../RendererError';
import { WrapText, Code, Eye } from 'lucide-react';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

interface TextRendererProps {
  url: string;
  fileName: string;
}

export const TextRenderer = forwardRef<RendererHandle, TextRendererProps>(({
  url,
  fileName,
}, ref) => {
  const t = useTranslator();
  const fetcher = useFetcher();

  // 内部状态管理
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wordWrap, setWordWrap] = useState(true);
  const [htmlPreview, setHtmlPreview] = useState(false);

  const language = getLanguageFromFileName(fileName);
  const { lineHtmls } = useShikiHighlight(
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

  // 事件发射器：用于通知主组件工具栏状态变化
  const listenersRef = useRef<Set<() => void>>(new Set());
  const notifyToolbarChange = useCallback(() => {
    listenersRef.current.forEach(listener => listener());
  }, []);

  // 监听影响工具栏的状态变化
  useEffect(() => {
    notifyToolbarChange();
  }, [wordWrap, notifyToolbarChange]);

  useEffect(() => {
    notifyToolbarChange();
  }, [htmlPreview, notifyToolbarChange]);

  // 切换操作
  const toggleWordWrap = useCallback(() => {
    setWordWrap(prev => !prev);
  }, []);

  const toggleHtmlPreview = useCallback(() => {
    setHtmlPreview(prev => !prev);
  }, []);

  // 工具栏配置
  const getToolbarGroups = useCallback((): ToolbarGroup[] => {
    const groups: ToolbarGroup[] = [
      {
        items: [
          {
            type: 'button',
            icon: <WrapText className="rfp-w-4 rfp-h-4" />,
            tooltip: wordWrap ? t('toolbar.wrap_off') : t('toolbar.wrap_on'),
            action: toggleWordWrap,
            active: wordWrap,
          },
        ],
      },
    ];

    // HTML 文件显示预览按钮
    if (language === 'html') {
      groups.push({
        items: [
          {
            type: 'button',
            icon: htmlPreview
              ? <Code className="rfp-w-4 rfp-h-4" />
              : <Eye className="rfp-w-4 rfp-h-4" />,
            tooltip: htmlPreview ? t('toolbar.source') : t('toolbar.preview'),
            action: toggleHtmlPreview,
            active: htmlPreview,
          },
        ],
      });
    }

    return groups;
  }, [wordWrap, htmlPreview, language, t, toggleWordWrap, toggleHtmlPreview]);

  // 暴露接口给父组件
  useImperativeHandle(ref, () => ({
    getToolbarGroups,
    onToolbarChange: (listener: () => void) => {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    },
  }), [getToolbarGroups]);

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

  // 纯文本或高亮未就绪：fallback 到普通 pre
  if (language === 'text' || lineHtmls.length === 0) {
    return (
      <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-code-bg">
        <pre
          className={`rfp-py-6 rfp-px-4 rfp-text-fg-primary rfp-font-mono rfp-text-sm ${
            wordWrap ? 'rfp-whitespace-pre-wrap rfp-break-words' : 'rfp-whitespace-pre'
          }`}
        >
          {content}
        </pre>
      </div>
    );
  }

  // 双列布局：左 gutter（行号），右 code（shiki 高亮）
  const lines = content.split('\n');
  return (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-code-bg">
      <div
        className={`rfp-code-block with-line-numbers ${wordWrap ? '' : 'no-wrap'} rfp-w-full`}
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
