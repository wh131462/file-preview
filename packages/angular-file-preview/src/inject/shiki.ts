import { DestroyRef, effect, inject, signal, type Signal } from '@angular/core';
import { codeToHtml, type ShikiTransformer } from 'shiki';
import { injectResolvedTheme } from './theme';

export function injectShikiHighlight(code: Signal<string>, lang: Signal<string>) {
  const resolvedTheme = injectResolvedTheme();
  const html = signal('');
  const lineHtmls = signal<string[]>([]);
  const loading = signal(true);
  let generation = 0;

  const highlight = async () => {
    const gen = ++generation;
    const src = code();
    if (!src) {
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
      const out = await codeToHtml(src, {
        lang: lang(),
        theme: resolvedTheme() === 'light' ? 'github-light' : 'dark-plus',
        transformers: [lineNumbersTransformer],
      });
      if (gen !== generation) return;
      html.set(out);
      lineHtmls.set(extractLines(out));
    } catch {
      if (gen !== generation) return;
      html.set('');
      lineHtmls.set([]);
    } finally {
      if (gen === generation) loading.set(false);
    }
  };

  inject(DestroyRef).onDestroy(() => {
    generation++;
  });

  effect(() => {
    void code();
    void lang();
    void resolvedTheme();
    void highlight();
  });

  return { html, lineHtmls, loading, highlight };
}

function extractLines(html: string): string[] {
  if (typeof window === 'undefined' || !html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const codeElement = doc.querySelector('code');
  if (!codeElement) return [];
  const lineElements = codeElement.querySelectorAll('.line');
  return Array.from(lineElements).map((line) => line.innerHTML);
}
