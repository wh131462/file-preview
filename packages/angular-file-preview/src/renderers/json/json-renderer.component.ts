import { Component, computed, effect, input, signal, ViewEncapsulation } from '@angular/core';
import { LucideAngularModule, ChevronRight, ChevronDown } from 'lucide-angular';
import { parse as parseJsonc } from 'jsonc-parser';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { injectTranslator } from '../../inject/translator';
import { injectFetcher } from '../../inject/request';
import { injectResolvedTheme } from '../../inject/theme';
import type { ResolvedTheme } from '../../inject/tokens';
import { RendererErrorComponent } from '../renderer-error.component';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

interface JsonColors {
  key: string;
  string: string;
  number: string;
  keyword: string;
  bracket: string;
  colon: string;
  collapsed: string;
  arrow: string;
}

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

function pickColors(theme: ResolvedTheme): JsonColors {
  return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

@Component({
  selector: 'afp-json-node',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (isPrimitive()) {
      <div class="json-row" [style.padding-left.px]="indent()">
        <span class="json-arrow-placeholder"></span>
        @if (hasKey()) {
          <span class="json-key" [style.color]="colors().key">
            "{{ keyName() }}"<span [style.color]="colors().colon">: </span>
          </span>
        }
        @if (value() === null) {
          <span class="json-null" [style.color]="colors().keyword">null</span>
        } @else if (value() === undefined) {
          <span class="json-null" [style.color]="colors().keyword">undefined</span>
        } @else if (isBoolean()) {
          <span [style.color]="colors().keyword">{{ display() }}</span>
        } @else if (isNumber()) {
          <span [style.color]="colors().number">{{ display() }}</span>
        } @else if (isString()) {
          <span [style.color]="colors().string">"{{ value() }}"</span>
        } @else {
          <span [style.color]="colors().bracket">{{ display() }}</span>
        }
      </div>
    } @else if (count() === 0) {
      <div class="json-row" [style.padding-left.px]="indent()">
        <span class="json-arrow-placeholder"></span>
        @if (hasKey()) {
          <span class="json-key" [style.color]="colors().key">
            "{{ keyName() }}"<span [style.color]="colors().colon">: </span>
          </span>
        }
        <span [style.color]="colors().bracket">{{ open() }}{{ close() }}</span>
      </div>
    } @else {
      <div>
        <div class="json-row json-toggle" [style.padding-left.px]="indent()" (click)="toggle()">
          <span class="json-arrow" [style.color]="colors().arrow">
            <lucide-icon [img]="expanded() ? chevronDown : chevronRight" class="afp-w-3.5 afp-h-3.5" />
          </span>
          @if (hasKey()) {
            <span class="json-key" [style.color]="colors().key">
              "{{ keyName() }}"<span [style.color]="colors().colon">: </span>
            </span>
          }
          <span [style.color]="colors().bracket">{{ open() }}</span>
          @if (!expanded()) {
            <span class="json-collapsed" [style.color]="colors().collapsed">
              {{ count() }} {{ isArr() ? t('json.items') : t('json.keys') }}
              <span [style.color]="colors().bracket"> {{ close() }}</span>
            </span>
          }
        </div>
        @if (expanded()) {
          @if (isArr()) {
            @for (item of arrayItems(); track $index) {
              <afp-json-node [value]="item" [depth]="depth() + 1" [defaultExpanded]="depth() < 1" />
            }
          } @else {
            @for (entry of objectEntries(); track entry[0]) {
              <afp-json-node [keyName]="entry[0]" [value]="entry[1]" [depth]="depth() + 1" [defaultExpanded]="depth() < 1" />
            }
          }
          <div class="json-row" [style.padding-left.px]="indent() + 20">
            <span [style.color]="colors().bracket">{{ close() }}</span>
          </div>
        }
      </div>
    }
  `,
})
export class JsonNodeComponent {
  readonly keyName = input<string>();
  readonly value = input.required<unknown>();
  readonly depth = input.required<number>();
  readonly defaultExpanded = input(false);

  private readonly translator = injectTranslator();
  private readonly resolvedTheme = injectResolvedTheme();

  readonly chevronDown = ChevronDown;
  readonly chevronRight = ChevronRight;
  readonly expanded = signal(false);

  readonly colors = computed<JsonColors>(() => pickColors(this.resolvedTheme()));
  readonly indent = computed(() => this.depth() * 20);
  readonly hasKey = computed(() => this.keyName() !== undefined);
  readonly isPrimitive = computed(() => {
    const v = this.value();
    return v === null || v === undefined || typeof v !== 'object';
  });
  readonly isArr = computed(() => Array.isArray(this.value()));
  readonly count = computed(() => {
    const v = this.value();
    if (v === null || v === undefined || typeof v !== 'object') return 0;
    return Array.isArray(v) ? v.length : Object.keys(v as object).length;
  });
  readonly open = computed(() => (this.isArr() ? '[' : '{'));
  readonly close = computed(() => (this.isArr() ? ']' : '}'));
  readonly arrayItems = computed(() => (this.isArr() ? (this.value() as unknown[]) : []));
  readonly objectEntries = computed(() => {
    const v = this.value();
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return [] as [string, unknown][];
    return Object.entries(v as Record<string, unknown>);
  });

  constructor() {
    this.expanded.set(this.defaultExpanded());
  }

  t(key: 'json.items' | 'json.keys'): string {
    return this.translator.t()(key);
  }

  toggle(): void {
    this.expanded.update((v) => !v);
  }

  isBoolean(): boolean {
    return typeof this.value() === 'boolean';
  }

  isNumber(): boolean {
    return typeof this.value() === 'number';
  }

  isString(): boolean {
    return typeof this.value() === 'string';
  }

  display(): string {
    return String(this.value());
  }
}

@Component({
  selector: 'afp-json-renderer',
  standalone: true,
  imports: [RendererErrorComponent, JsonNodeComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
      </div>
    } @else if (error(); as err) {
      <afp-renderer-error [message]="err" />
    } @else {
      <div class="afp-w-full afp-h-full afp-overflow-auto afp-bg-code-bg afp-py-6 afp-px-4">
        <afp-json-node [value]="data()" [depth]="0" [defaultExpanded]="true" />
      </div>
    }
  `,
  styles: [`
    .afp-root .json-row {
      display: flex;
      align-items: flex-start;
      padding-top: 1px;
      padding-bottom: 1px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.4;
    }
    .afp-root .json-toggle {
      cursor: pointer;
      user-select: none;
    }
    .afp-root .json-toggle:hover {
      background: var(--fp-surface-1);
    }
    .afp-root .json-arrow {
      width: 16px;
      height: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .afp-root .json-arrow-placeholder {
      width: 16px;
      height: 20px;
      flex-shrink: 0;
    }
    .afp-root .json-key {
      flex-shrink: 0;
    }
    .afp-root .json-collapsed {
      margin-left: 4px;
    }
    .afp-root .json-null {
      font-style: italic;
    }
  `],
})
export class JsonRendererComponent implements RendererHandle {
  readonly url = input.required<string>();
  readonly fileName = input.required<string>();

  private readonly translator = injectTranslator();
  private readonly fetcher = injectFetcher();

  readonly data = signal<unknown>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const url = this.url();
      void this.loadJson(url);
    });
  }

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }

  private async loadJson(url: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const text = await fetchTextUtf8(url, { fetcher: this.fetcher() });
      this.data.set(parseJsonc(text));
    } catch (err) {
      console.error(err);
      this.error.set(this.translator.t()('json.load_failed'));
    } finally {
      this.loading.set(false);
    }
  }
}
