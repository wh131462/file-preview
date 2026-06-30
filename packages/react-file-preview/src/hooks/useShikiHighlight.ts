import { useState, useEffect } from 'react';
import { codeToHtml, type ShikiTransformer } from 'shiki';
import { useResolvedTheme } from '../ThemeContext';

/**
 * 用 shiki 把代码高亮成 HTML（与 vue-file-preview 同引擎、同主题，保证两端视觉一致）。
 *
 * - dark 主题用 `dark-plus`（VSCode Dark Plus）
 * - light 主题用 `github-light`（GitHub Light）
 *
 * shiki 输出的 <pre> 自带 inline 背景/前景色，主题切换时必须重新高亮，
 * 因此 resolvedTheme 进入依赖数组。
 *
 * @returns
 *  - `html`: 完整的 shiki 输出 HTML（含 pre/code 包裹），markdown 等场景使用
 *  - `lineHtmls`: 拆分后的每一行 HTML（用于双列行号布局）
 *  - `loading`: 是否正在高亮
 */
export function useShikiHighlight(
  code: string,
  lang: string,
): { html: string; lineHtmls: string[]; loading: boolean } {
  const resolvedTheme = useResolvedTheme();
  const [html, setHtml] = useState('');
  const [lineHtmls, setLineHtmls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const lineNumbersTransformer: ShikiTransformer = {
      name: 'line-numbers',
      line(node, line) {
        node.properties['data-line'] = line;
        this.addClassToHast(node, 'line');
      },
    };

    codeToHtml(code, {
      lang,
      theme: resolvedTheme === 'light' ? 'github-light' : 'dark-plus',
      transformers: [lineNumbersTransformer],
    })
      .then((out) => {
        if (!cancelled) {
          setHtml(out);
          setLineHtmls(extractLines(out));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHtml('');
          setLineHtmls([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang, resolvedTheme]);

  return { html, lineHtmls, loading };
}

/**
 * 从 shiki 输出的 HTML 中提取每一行的内容（保留高亮标签）
 */
function extractLines(html: string): string[] {
  if (typeof window === 'undefined' || !html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const codeElement = doc.querySelector('code');
  if (!codeElement) return [];
  const lineElements = codeElement.querySelectorAll('.line');
  return Array.from(lineElements).map((line) => line.innerHTML);
}
