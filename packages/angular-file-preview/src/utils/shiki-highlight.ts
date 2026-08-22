import { DestroyRef, inject, signal, type Signal } from '@angular/core';
import { codeToHtml, type ShikiTransformer } from 'shiki';
import { ThemeService } from '../di/theme.service';

export function createShikiHighlight(
  code: () => string,
  lang: () => string,
): {
  html: Signal<string>;
  lineHtmls: Signal<string[]>;
  loading: Signal<boolean>;
  highlight: () => Promise<void>;
} {
  const theme = inject(ThemeService, { optional: true });
  const html = signal('');
  const lineHtmls = signal<string[]>([]);
  const loading = signal(true);
  let seq = 0;

  const highlight = async () => {
    const current = ++seq;
    const value = code();
    if (!value) {
      html.set('');
      lineHtmls.set([]);
      loading.set(false);
      return;
    }
    loading.set(true);
    try {
      const lineNumbersTransformer: ShikiTransformer = {
        name: 'line-numbers',
        line(node, line) {
          node.properties['data-line'] = line;
          this.addClassToHast(node, 'line');
        },
      };
      const resolved = theme?.theme() ?? 'dark';
      const out = await codeToHtml(value, {
        lang: lang(),
        theme: resolved === 'light' ? 'github-light' : 'dark-plus',
        transformers: [lineNumbersTransformer],
      });
      if (current !== seq) return;
      html.set(out);
      lineHtmls.set(extractLines(out));
    } catch {
      if (current !== seq) return;
      html.set('');
      lineHtmls.set([]);
    } finally {
      if (current === seq) loading.set(false);
    }
  };

  inject(DestroyRef).onDestroy(() => {
    seq += 1;
  });

  return { html, lineHtmls, loading, highlight };
}

function extractLines(html: string): string[] {
  if (typeof window === 'undefined' || !html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const codeElement = doc.querySelector('code');
  if (!codeElement) return [];
  return Array.from(codeElement.querySelectorAll('.line')).map((line) => line.innerHTML);
}
