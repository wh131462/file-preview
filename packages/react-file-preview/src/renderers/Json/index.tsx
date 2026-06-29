import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { parse as parseJsonc } from 'jsonc-parser';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';
import { useResolvedTheme, type ResolvedTheme } from '../../ThemeContext';
import { RendererError } from '../RendererError';

interface JsonRendererProps {
  url: string;
  fileName: string;
}

interface JsonColors {
  key: string;
  string: string;
  number: string;
  keyword: string;
  bracket: string;   // { } [ ]
  colon: string;     // :
  collapsed: string; // "N items / N keys" 折叠提示
  arrow: string;     // 折叠箭头
}

// VSCode Dark Plus / GitHub Light 两套配色，与 react-syntax-highlighter 的 vscDarkPlus / vs 主题保持一致
const DARK_COLORS: JsonColors = {
  key: '#9cdcfe',
  string: '#ce9178',
  number: '#b5cea8',
  keyword: '#569cd6',
  bracket: '#d4d4d4',
  colon: 'rgb(255 255 255 / 0.6)',
  collapsed: 'rgb(255 255 255 / 0.4)',
  arrow: 'rgb(255 255 255 / 0.5)',
};

const LIGHT_COLORS: JsonColors = {
  key: '#005cc5',
  string: '#032f62',
  number: '#005cc5',
  keyword: '#d73a49',
  bracket: '#24292e',
  colon: 'rgb(23 23 23 / 0.6)',
  collapsed: 'rgb(23 23 23 / 0.45)',
  arrow: 'rgb(23 23 23 / 0.55)',
};

// ---------- JSON 树节点 ----------

interface JsonNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  defaultExpanded: boolean;
  colors: JsonColors;
}

const JsonNode: React.FC<JsonNodeProps> = ({ keyName, value, depth, defaultExpanded, colors }) => {
  const t = useTranslator();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const indent = depth * 20;

  const toggle = useCallback(() => setExpanded(prev => !prev), []);

  // 基本类型
  if (value === null || value === undefined || typeof value !== 'object') {
    return (
      <div className="rfp-flex rfp-items-start rfp-py-px rfp-font-mono rfp-text-sm" style={{ paddingLeft: `${indent}px` }}>
        <span className="rfp-w-4 rfp-h-5 rfp-flex-shrink-0" />
        {keyName !== undefined && (
          <span className="rfp-flex-shrink-0" style={{ color: colors.key }}>
            "{keyName}"<span style={{ color: colors.colon }}>: </span>
          </span>
        )}
        {renderPrimitive(value, colors)}
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray ? (value as unknown[]) : Object.entries(value as Record<string, unknown>);
  const count = entries.length;
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  // 空对象/数组
  if (count === 0) {
    return (
      <div className="rfp-flex rfp-items-start rfp-py-px rfp-font-mono rfp-text-sm" style={{ paddingLeft: `${indent}px` }}>
        <span className="rfp-w-4 rfp-h-5 rfp-flex-shrink-0" />
        {keyName !== undefined && (
          <span className="rfp-flex-shrink-0" style={{ color: colors.key }}>
            "{keyName}"<span style={{ color: colors.colon }}>: </span>
          </span>
        )}
        <span style={{ color: colors.bracket }}>{openBracket}{closeBracket}</span>
      </div>
    );
  }

  return (
    <div>
      {/* 折叠行 */}
      <div
        className="rfp-flex rfp-items-start rfp-py-px rfp-font-mono rfp-text-sm rfp-cursor-pointer hover:rfp-bg-surface-1 rfp-select-none"
        style={{ paddingLeft: `${indent}px` }}
        onClick={toggle}
      >
        <span className="rfp-w-4 rfp-h-5 rfp-flex-shrink-0 rfp-flex rfp-items-center rfp-justify-center" style={{ color: colors.arrow }}>
          {expanded
            ? <ChevronDown className="rfp-w-3.5 rfp-h-3.5" />
            : <ChevronRight className="rfp-w-3.5 rfp-h-3.5" />
          }
        </span>
        {keyName !== undefined && (
          <span className="rfp-flex-shrink-0" style={{ color: colors.key }}>
            "{keyName}"<span style={{ color: colors.colon }}>: </span>
          </span>
        )}
        <span style={{ color: colors.bracket }}>{openBracket}</span>
        {!expanded && (
          <span className="rfp-ml-1" style={{ color: colors.collapsed }}>
            {isArray ? `${count} ${t('json.items')}` : `${count} ${t('json.keys')}`}
            <span style={{ color: colors.bracket }}> {closeBracket}</span>
          </span>
        )}
      </div>

      {/* 子节点 */}
      {expanded && (
        <>
          {isArray
            ? (value as unknown[]).map((item, i) => (
                <JsonNode key={i} value={item} depth={depth + 1} defaultExpanded={depth < 1} colors={colors} />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <JsonNode key={k} keyName={k} value={v} depth={depth + 1} defaultExpanded={depth < 1} colors={colors} />
              ))
          }
          <div className="rfp-font-mono rfp-text-sm rfp-py-px" style={{ paddingLeft: `${indent + 20}px`, color: colors.bracket }}>
            {closeBracket}
          </div>
        </>
      )}
    </div>
  );
};

function renderPrimitive(value: unknown, colors: JsonColors) {
  if (value === null) return <span style={{ color: colors.keyword, fontStyle: 'italic' }}>null</span>;
  if (value === undefined) return <span style={{ color: colors.keyword, fontStyle: 'italic' }}>undefined</span>;
  if (typeof value === 'boolean') return <span style={{ color: colors.keyword }}>{String(value)}</span>;
  if (typeof value === 'number') return <span style={{ color: colors.number }}>{String(value)}</span>;
  if (typeof value === 'string') return <span style={{ color: colors.string }}>"{value}"</span>;
  return <span style={{ color: colors.bracket }}>{String(value)}</span>;
}

function pickColors(theme: ResolvedTheme): JsonColors {
  return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

// ---------- Main ----------

export const JsonRenderer: React.FC<JsonRendererProps> = ({ url }) => {
  const t = useTranslator();
  const fetcher = useFetcher();
  const resolvedTheme = useResolvedTheme();
  const colors = useMemo(() => pickColors(resolvedTheme), [resolvedTheme]);
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadJson = async () => {
      try {
        setLoading(true);
        setError(null);
        const text = await fetchTextUtf8(url, { fetcher, signal: controller.signal });
        const parsed = parseJsonc(text);
        setData(parsed);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(t('json.load_failed'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadJson();
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

  return (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-code-bg rfp-py-6 rfp-px-4">
      <JsonNode value={data} depth={0} defaultExpanded colors={colors} />
    </div>
  );
};
