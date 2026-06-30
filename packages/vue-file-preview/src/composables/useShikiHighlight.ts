import { ref, watch, type Ref } from 'vue';
import { codeToHtml, type ShikiTransformer } from 'shiki';
import { useResolvedTheme } from './useResolvedTheme';

/**
 * 用 shiki 把代码高亮成 HTML（与 react-file-preview 同引擎、同主题）
 *
 * - dark 主题用 `dark-plus`（VSCode Dark Plus）
 * - light 主题用 `github-light`（GitHub Light）
 *
 * @returns
 *  - `html`: 完整的 shiki 输出 HTML（含 pre/code 包裹），markdown 等场景使用
 *  - `lineHtmls`: 拆分后的每一行 HTML（用于双列行号布局）
 *  - `loading`: 是否正在高亮
 */
export function useShikiHighlight(code: Ref<string>, lang: Ref<string>) {
  const resolvedTheme = useResolvedTheme();
  const html = ref('');
  const lineHtmls = ref<string[]>([]);
  const loading = ref(true);

  const highlight = async () => {
    if (!code.value) {
      html.value = '';
      lineHtmls.value = [];
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      const lineNumbersTransformer: ShikiTransformer = {
        name: 'line-numbers',
        line(node, line) {
          node.properties['data-line'] = line;
          this.addClassToHast(node, 'line');
        },
      };

      const out = await codeToHtml(code.value, {
        lang: lang.value,
        theme: resolvedTheme.value === 'light' ? 'github-light' : 'dark-plus',
        transformers: [lineNumbersTransformer],
      });

      html.value = out;
      lineHtmls.value = extractLines(out);
    } catch {
      html.value = '';
      lineHtmls.value = [];
    } finally {
      loading.value = false;
    }
  };

  watch([code, lang, resolvedTheme], highlight, { immediate: true });

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
