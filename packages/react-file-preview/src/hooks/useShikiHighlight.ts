import { useState, useEffect } from 'react';
import { codeToHtml } from 'shiki';
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
 *  - `html`: 高亮后的 HTML 字符串（失败或加载中为 ''）
 *  - `loading`: 是否正在高亮
 */
export function useShikiHighlight(code: string, lang: string): { html: string; loading: boolean } {
  const resolvedTheme = useResolvedTheme();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    codeToHtml(code, {
      lang,
      theme: resolvedTheme === 'light' ? 'github-light' : 'dark-plus',
    })
      .then((out) => {
        if (!cancelled) {
          setHtml(out);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHtml('');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang, resolvedTheme]);

  return { html, loading };
}
