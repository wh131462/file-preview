import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';

interface JsonRendererProps {
  url: string;
  fileName: string;
}

// ---------- JSON 树节点 ----------

interface JsonNodeProps {
  keyName?: string;
  value: unknown;
  depth: number;
  defaultExpanded: boolean;
}

const JsonNode: React.FC<JsonNodeProps> = ({ keyName, value, depth, defaultExpanded }) => {
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
          <span className="rfp-text-[#9cdcfe] rfp-flex-shrink-0">
            "{keyName}"<span className="rfp-text-white/50">: </span>
          </span>
        )}
        {renderPrimitive(value)}
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
          <span className="rfp-text-[#9cdcfe] rfp-flex-shrink-0">
            "{keyName}"<span className="rfp-text-white/50">: </span>
          </span>
        )}
        <span className="rfp-text-white/70">{openBracket}{closeBracket}</span>
      </div>
    );
  }

  return (
    <div>
      {/* 折叠行 */}
      <div
        className="rfp-flex rfp-items-start rfp-py-px rfp-font-mono rfp-text-sm rfp-cursor-pointer hover:rfp-bg-white/5 rfp-select-none"
        style={{ paddingLeft: `${indent}px` }}
        onClick={toggle}
      >
        <span className="rfp-w-4 rfp-h-5 rfp-flex-shrink-0 rfp-flex rfp-items-center rfp-justify-center rfp-text-white/40">
          {expanded
            ? <ChevronDown className="rfp-w-3.5 rfp-h-3.5" />
            : <ChevronRight className="rfp-w-3.5 rfp-h-3.5" />
          }
        </span>
        {keyName !== undefined && (
          <span className="rfp-text-[#9cdcfe] rfp-flex-shrink-0">
            "{keyName}"<span className="rfp-text-white/50">: </span>
          </span>
        )}
        <span className="rfp-text-white/70">{openBracket}</span>
        {!expanded && (
          <span className="rfp-text-white/30 rfp-ml-1">
            {isArray ? `${count} ${t('json.items')}` : `${count} ${t('json.keys')}`}
            <span className="rfp-text-white/70"> {closeBracket}</span>
          </span>
        )}
      </div>

      {/* 子节点 */}
      {expanded && (
        <>
          {isArray
            ? (value as unknown[]).map((item, i) => (
                <JsonNode key={i} value={item} depth={depth + 1} defaultExpanded={depth < 1} />
              ))
            : Object.entries(value as Record<string, unknown>).map(([k, v]) => (
                <JsonNode key={k} keyName={k} value={v} depth={depth + 1} defaultExpanded={depth < 1} />
              ))
          }
          <div className="rfp-font-mono rfp-text-sm rfp-text-white/70 rfp-py-px" style={{ paddingLeft: `${indent + 20}px` }}>
            {closeBracket}
          </div>
        </>
      )}
    </div>
  );
};

function renderPrimitive(value: unknown) {
  if (value === null) return <span className="rfp-text-[#569cd6] rfp-italic">null</span>;
  if (value === undefined) return <span className="rfp-text-[#569cd6] rfp-italic">undefined</span>;
  if (typeof value === 'boolean') return <span className="rfp-text-[#569cd6]">{String(value)}</span>;
  if (typeof value === 'number') return <span className="rfp-text-[#b5cea8]">{String(value)}</span>;
  if (typeof value === 'string') return <span className="rfp-text-[#ce9178]">"{value}"</span>;
  return <span className="rfp-text-white/70">{String(value)}</span>;
}

// ---------- Main ----------

export const JsonRenderer: React.FC<JsonRendererProps> = ({ url }) => {
  const t = useTranslator();
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadJson = async () => {
      try {
        setLoading(true);
        setError(null);
        const text = await fetchTextUtf8(url);
        setData(JSON.parse(text));
      } catch (err) {
        setError(t('json.load_failed'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadJson();
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
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-bg-[#1e1e1e] rfp-py-3 rfp-pr-4">
      <JsonNode value={data} depth={0} defaultExpanded />
    </div>
  );
};
