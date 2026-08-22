import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ChevronRight, ChevronDown, LucideAngularModule } from 'lucide-angular';
import { parse as parseJsonc } from 'jsonc-parser';
import { fetchTextUtf8 } from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { ThemeService, type ResolvedTheme } from '../../di/theme.service';
import { RendererError } from '../RendererError';
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

interface JsonChildEntry {
  track: string | number;
  keyName: string | undefined;
  value: unknown;
}

@Component({
  selector: 'afp-json-node',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isComposite()) {
      <div class="json-row" [style.paddingLeft.px]="indent()">
        <span class="json-arrow-placeholder"></span>
        @if (keyName() !== undefined) {
          <span class="json-key" [style.color]="colors().key">
            "{{ keyName() }}"<span [style.color]="colors().colon">: </span>
          </span>
        }
        <span [style.color]="primitiveColor()" [class.json-null]="isNullish()">{{ primitiveText() }}</span>
      </div>
    } @else if (count() === 0) {
      <div class="json-row" [style.paddingLeft.px]="indent()">
        <span class="json-arrow-placeholder"></span>
        @if (keyName() !== undefined) {
          <span class="json-key" [style.color]="colors().key">
            "{{ keyName() }}"<span [style.color]="colors().colon">: </span>
          </span>
        }
        <span [style.color]="colors().bracket">{{ openBracket() }}{{ closeBracket() }}</span>
      </div>
    } @else {
      <div class="json-row json-toggle" [style.paddingLeft.px]="indent()" (click)="toggle()">
        <span class="json-arrow" [style.color]="colors().arrow">
          <i-lucide [img]="expanded() ? chevronDown : chevronRight" class="afp-w-3.5 afp-h-3.5" />
        </span>
        @if (keyName() !== undefined) {
          <span class="json-key" [style.color]="colors().key">
            "{{ keyName() }}"<span [style.color]="colors().colon">: </span>
          </span>
        }
        <span [style.color]="colors().bracket">{{ openBracket() }}</span>
        @if (!expanded()) {
          <span class="json-collapsed" [style.color]="colors().collapsed">
            {{ collapsedLabel() }}<span [style.color]="colors().bracket"> {{ closeBracket() }}</span>
          </span>
        }
      </div>
      @if (expanded()) {
        @for (entry of childEntries(); track entry.track) {
          <afp-json-node
            [keyName]="entry.keyName"
            [value]="entry.value"
            [depth]="depth() + 1"
            [defaultExpanded]="depth() < 1"
          />
        }
        <div class="json-row" [style.paddingLeft.px]="indent() + 20">
          <span [style.color]="colors().bracket">{{ closeBracket() }}</span>
        </div>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class JsonNode {
  keyName = input<string | undefined>(undefined);
  value = input.required<unknown>();
  depth = input.required<number>();
  defaultExpanded = input(false);

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly themeService = inject(ThemeService, { optional: true });
  private readonly t = this.locale?.t() ?? getFallbackTranslator();

  protected readonly chevronRight = ChevronRight;
  protected readonly chevronDown = ChevronDown;

  protected readonly expanded = linkedSignal(() => this.defaultExpanded());
  protected readonly colors = computed(() => pickColors(this.themeService?.theme() ?? 'dark'));
  protected readonly indent = computed(() => this.depth() * 20);

  protected readonly isComposite = computed(() => {
    const v = this.value();
    return v !== null && v !== undefined && typeof v === 'object';
  });

  protected readonly isArr = computed(() => Array.isArray(this.value()));

  protected readonly count = computed(() => {
    const v = this.value();
    if (Array.isArray(v)) return v.length;
    if (v !== null && typeof v === 'object') return Object.keys(v as Record<string, unknown>).length;
    return 0;
  });

  protected readonly childEntries = computed<JsonChildEntry[]>(() => {
    const v = this.value();
    if (Array.isArray(v)) {
      return v.map((item, i) => ({ track: i, keyName: undefined, value: item }));
    }
    return Object.entries(v as Record<string, unknown>).map(([k, val]) => ({
      track: k,
      keyName: k,
      value: val,
    }));
  });

  protected openBracket(): string {
    return this.isArr() ? '[' : '{';
  }

  protected closeBracket(): string {
    return this.isArr() ? ']' : '}';
  }

  protected collapsedLabel(): string {
    return this.isArr()
      ? `${this.count()} ${this.t('json.items')}`
      : `${this.count()} ${this.t('json.keys')}`;
  }

  protected isNullish(): boolean {
    const v = this.value();
    return v === null || v === undefined;
  }

  protected primitiveColor(): string {
    const v = this.value();
    const c = this.colors();
    if (v === null || v === undefined) return c.keyword;
    if (typeof v === 'boolean') return c.keyword;
    if (typeof v === 'number') return c.number;
    if (typeof v === 'string') return c.string;
    return c.bracket;
  }

  protected primitiveText(): string {
    const v = this.value();
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return `"${v}"`;
    return String(v);
  }

  protected toggle(): void {
    this.expanded.update((v) => !v);
  }
}

@Component({
  selector: 'afp-json-renderer',
  standalone: true,
  imports: [RendererError, JsonNode],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"></div>
      </div>
    } @else if (error()) {
      <afp-renderer-error [message]="error()!" />
    } @else {
      <div class="afp-w-full afp-h-full afp-overflow-auto afp-bg-code-bg afp-py-6 afp-px-4">
        <afp-json-node [value]="data()" [depth]="0" [defaultExpanded]="true" />
      </div>
    }
  `,
  styles: `
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
  `,
})
export class JsonRenderer implements RendererHandle {
  url = input.required<string>();
  fileName = input.required<string>();

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly t = this.locale?.t() ?? getFallbackTranslator();

  readonly data = signal<unknown>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.url();
      void this.loadJson();
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  private async loadJson(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const text = await fetchTextUtf8(this.url(), { fetcher });
      this.data.set(parseJsonc(text));
    } catch (err) {
      console.error(err);
      this.error.set(this.t('json.load_failed'));
    } finally {
      this.loading.set(false);
    }
  }
}
