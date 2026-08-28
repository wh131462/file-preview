import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import MarkdownIt from 'markdown-it';
import MarkdownItKatex from '@traptitech/markdown-it-katex';
import { codeToHtml } from 'shiki';
import { Eye, Code } from 'lucide-angular';
import { fetchTextUtf8 } from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { ThemeService } from '../../di/theme.service';
import { RendererError } from '../RendererError';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';
import 'katex/dist/katex.min.css';

@Component({
  selector: 'afp-markdown-renderer',
  standalone: true,
  imports: [RendererError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div
          class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"
        ></div>
      </div>
    } @else if (error()) {
      <afp-renderer-error [message]="error()!" />
    } @else if (viewMode() === 'source') {
      <div class="afp-w-full afp-h-full afp-overflow-auto" style="background: var(--fp-code-bg);">
        @if (!highlightedSource()) {
          <pre
            class="afp-p-6 afp-text-fg-primary afp-font-mono afp-text-sm afp-whitespace-pre-wrap afp-break-words"
          >{{ content() }}</pre>
        } @else {
          <div class="shiki-wrapper" [innerHTML]="trustedSource()"></div>
        }
      </div>
    } @else {
      <div class="afp-w-full afp-h-full afp-overflow-auto afp-py-6 afp-px-4">
        <div #container class="markdown-body" [innerHTML]="trustedHtml()"></div>
      </div>
    }
  `,
  styles: `
    .markdown-body ::ng-deep .table-wrapper {
      overflow-x: auto;
      margin: 1rem 0;
      border-radius: 0.375rem;
      border: 1px solid var(--fp-surface-3);
    }
    .markdown-body ::ng-deep .table-wrapper > table {
      margin: 0;
      border: 0;
      border-radius: 0;
    }
    .markdown-body ::ng-deep .code-block-wrapper pre.shiki {
      margin: 0;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
      border-top: 0;
    }
    .markdown-body ::ng-deep .code-block-wrapper {
      overflow: visible;
    }
    .markdown-body ::ng-deep .code-block-wrapper pre {
      overflow: visible;
    }
    /* Shiki 完成前保留代码块尺寸，但不展示未高亮源码，避免样式闪烁 */
    .markdown-body ::ng-deep pre[data-shiki-pending="1"] code {
      visibility: hidden;
    }
    .markdown-body ::ng-deep .no-lang-pre {
      margin: 0;
      padding: 1rem;
      background: var(--fp-code-bg);
      border-radius: 0.375rem;
      border: 1px solid var(--fp-line);
    }
    .markdown-body ::ng-deep .no-lang-pre code {
      display: block;
      font-size: 0.8125rem;
      line-height: 1.5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--fp-fg-primary);
      white-space: pre;
      overflow-x: auto;
    }
    .markdown-body ::ng-deep pre.shiki code {
      display: block;
      padding: 1rem;
      font-size: 0.8125rem;
      line-height: 1.5;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .markdown-body ::ng-deep .katex {
      color: var(--fp-fg-primary);
    }
    .markdown-body ::ng-deep .katex-display {
      margin: 1.25rem 0;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .shiki-wrapper ::ng-deep pre {
      margin: 0;
      padding: 1.5rem;
      background: transparent !important;
      font-size: 0.875rem;
      overflow-x: auto;
    }
    .shiki-wrapper ::ng-deep code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  `,
})
export class MarkdownRenderer implements RendererHandle {
  url = input.required<string>();

  private readonly emitter = new ToolbarEventEmitter();
  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly themeService = inject(ThemeService, { optional: true });
  private readonly sanitizer = inject(DomSanitizer);
  private readonly injector = inject(Injector);
  private readonly t = this.locale?.t() ?? getFallbackTranslator();

  readonly viewMode = signal<'preview' | 'source'>('preview');
  readonly content = signal('');
  readonly html = signal('');
  readonly highlightedSource = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  private readonly container = viewChild<ElementRef<HTMLDivElement>>('container');

  readonly shikiTheme = computed(() =>
    (this.themeService?.theme() ?? 'dark') === 'light' ? 'github-light' : 'github-dark',
  );
  readonly trustedHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html()));
  readonly trustedSource = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.highlightedSource()));

  private readonly md = MarkdownRenderer.createMarkdownIt();
  private themeWatchStarted = false;

  constructor() {
    effect(() => {
      this.url();
      void this.loadMarkdown();
    });
    effect(() => {
      this.shikiTheme();
      if (!this.themeWatchStarted) {
        this.themeWatchStarted = true;
        return;
      }
      untracked(() => {
        if (this.content()) void this.loadMarkdown();
      });
    });
    effect(() => {
      this.viewMode();
      this.loading();
      this.emitter.notify();
    });
    effect(() => {
      const html = this.html();
      const mode = this.viewMode();
      const loading = this.loading();
      if (!html || loading || mode !== 'preview') return;
      afterNextRender(() => {
        void this.highlightAndInjectCopyButtons();
      }, { injector: this.injector });
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => {
    const groups: ToolbarGroup[] = [];
    groups.push({
      items: [
        {
          type: 'button',
          icon: this.viewMode() === 'preview' ? Code : Eye,
          tooltip: this.viewMode() === 'preview' ? this.t('toolbar.source') : this.t('toolbar.preview'),
          action: () => {
            this.viewMode.set(this.viewMode() === 'preview' ? 'source' : 'preview');
          },
          active: this.viewMode() === 'source',
        },
      ],
    });
    return groups;
  };

  onToolbarChange = (listener: () => void) => this.emitter.subscribe(listener);

  private static createMarkdownIt(): MarkdownIt {
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: false,
      breaks: false,
    });
    md.use(MarkdownItKatex);

    md.renderer.rules.fence = (tokens, idx) => {
      const token = tokens[idx];
      const info = token.info ? token.info.trim() : '';
      const code = token.content;

      if (!info) {
        return `<div class="code-block-wrapper">
    <pre class="no-lang-pre"><code>${md.utils.escapeHtml(code)}</code></pre>
  </div>`;
      }

      return `<div class="code-block-wrapper">
    <div class="code-block-header">
      <span>${info}</span>
    </div>
    <pre data-shiki-pending="1" data-lang="${info}"><code>${md.utils.escapeHtml(code)}</code></pre>
  </div>`;
    };

    md.renderer.rules.code_block = (tokens, idx) => {
      const code = tokens[idx].content;
      return `<div class="code-block-wrapper">
    <pre class="no-lang-pre"><code>${md.utils.escapeHtml(code)}</code></pre>
  </div>`;
    };

    const defaultTableOpen =
      md.renderer.rules.table_open ||
      ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
    md.renderer.rules.table_open = (tokens, idx, options, env, self) => {
      return '<div class="table-wrapper">' + defaultTableOpen(tokens, idx, options, env, self);
    };
    const defaultTableClose =
      md.renderer.rules.table_close ||
      ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
    md.renderer.rules.table_close = (tokens, idx, options, env, self) => {
      return defaultTableClose(tokens, idx, options, env, self) + '</div>';
    };

    return md;
  }

  private async loadMarkdown(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const text = await fetchTextUtf8(this.url(), { fetcher });
      this.content.set(text);
      this.html.set(this.md.render(text));
      this.loading.set(false);
      try {
        this.highlightedSource.set(
          await codeToHtml(text, { lang: 'markdown', theme: this.shikiTheme() }),
        );
      } catch {
        this.highlightedSource.set('');
      }
    } catch (err) {
      console.error(err);
      this.error.set(this.t('markdown.load_failed'));
      this.loading.set(false);
    }
  }

  private createCopyButton(code: string, inline: boolean): HTMLButtonElement {
    const COPY_SVG_SM = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    const COPY_SVG_MD = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    const CHECK_SVG_SM = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    const CHECK_SVG_MD = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = inline ? 'code-copy-btn' : 'code-copy-btn code-copy-float';
    btn.title = this.t('markdown.copy_code');
    btn.innerHTML = inline ? COPY_SVG_SM : COPY_SVG_MD;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(code);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      btn.innerHTML = inline ? CHECK_SVG_SM : CHECK_SVG_MD;
      btn.title = this.t('markdown.copied');
      setTimeout(() => {
        btn.innerHTML = inline ? COPY_SVG_SM : COPY_SVG_MD;
        btn.title = this.t('markdown.copy_code');
      }, 2000);
    });
    return btn;
  }

  private async highlightAndInjectCopyButtons(): Promise<void> {
    const el = this.container()?.nativeElement;
    if (!el) return;

    const pending = el.querySelectorAll<HTMLPreElement>('pre[data-shiki-pending="1"]');
    for (const pre of pending) {
      const lang = pre.getAttribute('data-lang') || 'text';
      const code = pre.querySelector('code')?.textContent || '';
      try {
        const highlighted = await codeToHtml(code, { lang, theme: this.shikiTheme() });
        const tmp = document.createElement('div');
        tmp.innerHTML = highlighted;
        const newPre = tmp.firstElementChild as HTMLElement;
        if (newPre) pre.replaceWith(newPre);
      } catch {
        pre.style.backgroundColor = 'var(--fp-code-bg)';
        pre.removeAttribute('data-shiki-pending');
      }
    }

    const wrappers = el.querySelectorAll<HTMLElement>('.code-block-wrapper');
    for (const wrapper of wrappers) {
      if (wrapper.querySelector('.code-copy-btn')) continue;
      const header = wrapper.querySelector('.code-block-header');
      const pre = wrapper.querySelector('pre');
      const code = pre?.querySelector('code')?.textContent ?? pre?.textContent ?? '';
      if (header) {
        header.appendChild(this.createCopyButton(code, true));
      } else {
        wrapper.appendChild(this.createCopyButton(code, false));
      }
    }
  }
}
