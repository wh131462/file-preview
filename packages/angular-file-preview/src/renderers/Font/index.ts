import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { parse } from 'opentype.js';
import type { Font as OpentypeFont } from 'opentype.js';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { ThemeService } from '../../di/theme.service';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';
import { FontPreviewLine } from './font-preview-line';

interface FontMetadata {
  family: string;
  subfamily: string;
  version: string;
  designer: string;
  glyphCount: number;
  format: string;
}

type RenderMode = 'fontface' | 'canvas';
type MetadataStatus = 'loading' | 'ready' | 'unavailable';

const MAGIC_WOFF2 = 0x774f4632;
const MAGIC_WOFF = 0x774f4646;
const MAGIC_OTTO = 0x4f54544f;
const MAGIC_TTF1 = 0x00010000;
const MAGIC_TRUE = 0x74727565;

type DetectedFormat = 'woff2' | 'woff' | 'otf' | 'ttf' | 'unknown';

const detectMagic = (buf: ArrayBuffer): DetectedFormat => {
  if (buf.byteLength < 4) return 'unknown';
  const m = new DataView(buf).getUint32(0);
  if (m === MAGIC_WOFF2) return 'woff2';
  if (m === MAGIC_WOFF) return 'woff';
  if (m === MAGIC_OTTO) return 'otf';
  if (m === MAGIC_TTF1 || m === MAGIC_TRUE) return 'ttf';
  return 'unknown';
};

const DEFAULT_SAMPLES = {
  latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 .,;:!?@#$%&*()[]{}',
  chinese: '春夏秋冬东南西北天地人和风雨雷电山水日月',
  mixed: 'The Quick Brown Fox Jumps Over The Lazy Dog\n敏捷的棕色狐狸跳过了懒狗',
};

const SIZES = [72, 48, 36, 24, 18];

@Component({
  selector: 'afp-font-renderer',
  standalone: true,
  imports: [RendererError, FontPreviewLine],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div class="afp-flex afp-flex-col afp-w-full afp-h-full afp-overflow-hidden">
      @if (loading()) {
        <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
          <div class="afp-text-fg-secondary">{{ t('font.loading') }}</div>
        </div>
      } @else if (error() || !metadata()) {
        <afp-renderer-error [message]="error() || t('font.parse_failed')" />
      } @else {
        <div class="afp-flex-shrink-0 afp-px-6 afp-py-4 afp-bg-surface-1 afp-border-b afp-border-line-weak afp-min-w-0">
          <div class="afp-grid afp-grid-cols-2 afp-gap-x-6 afp-gap-y-2 afp-text-sm afp-min-w-0">
            <div class="afp-flex afp-items-center afp-gap-2 afp-min-w-0">
              <span class="afp-text-fg-tertiary afp-flex-shrink-0">{{ t('font.meta.family') }}:</span>
              <span class="afp-text-fg-primary afp-font-semibold afp-truncate">
                {{ showMetaPlaceholder() ? metaPlaceholder() : metadata()!.family }}
              </span>
            </div>
            @if (metadata()!.subfamily) {
              <div class="afp-flex afp-items-center afp-gap-2 afp-min-w-0">
                <span class="afp-text-fg-tertiary afp-flex-shrink-0">{{ t('font.meta.subfamily') }}:</span>
                <span class="afp-text-fg-primary afp-truncate">{{ metadata()!.subfamily }}</span>
              </div>
            }
            <div class="afp-flex afp-items-center afp-gap-2 afp-min-w-0">
              <span class="afp-text-fg-tertiary afp-flex-shrink-0">{{ t('font.meta.format') }}:</span>
              <span class="afp-text-fg-primary afp-truncate">{{ metadata()!.format }}</span>
            </div>
            <div class="afp-flex afp-items-center afp-gap-2 afp-min-w-0">
              <span class="afp-text-fg-tertiary afp-flex-shrink-0">{{ t('font.meta.glyphs') }}:</span>
              <span class="afp-text-fg-primary afp-truncate">
                {{ showMetaPlaceholder() ? metaPlaceholder() : metadata()!.glyphCount }}
              </span>
            </div>
            @if (metadata()!.designer) {
              <div class="afp-flex afp-items-center afp-gap-2 afp-min-w-0">
                <span class="afp-text-fg-tertiary afp-flex-shrink-0">{{ t('font.meta.designer') }}:</span>
                <span class="afp-text-fg-primary afp-truncate">{{ metadata()!.designer }}</span>
              </div>
            }
            @if (metadata()!.version) {
              <div class="afp-flex afp-items-center afp-gap-2 afp-min-w-0">
                <span class="afp-text-fg-tertiary afp-flex-shrink-0">{{ t('font.meta.version') }}:</span>
                <span class="afp-text-fg-primary afp-truncate">{{ metadata()!.version }}</span>
              </div>
            }
          </div>
        </div>

        <div class="afp-flex-1 afp-overflow-auto afp-min-w-0">
          <div class="afp-px-6 afp-py-6 afp-space-y-8 afp-min-w-0">
            <div class="afp-min-w-0">
              <label class="afp-block afp-text-xs afp-text-fg-tertiary afp-mb-2">
                {{ t('font.sample_text_placeholder') }}
              </label>
              <textarea
                [value]="customText()"
                class="afp-block afp-w-full afp-box-border afp-px-3 afp-py-2.5 afp-bg-surface-2 afp-text-fg-primary afp-text-sm afp-leading-relaxed afp-border afp-border-line afp-rounded-md afp-resize-y focus:afp-outline-none focus:afp-border-line-strong"
                rows="2"
                [placeholder]="t('font.sample_text_placeholder')"
                [style.minHeight]="'64px'"
                [style.maxHeight]="'160px'"
                (input)="onCustomInput($event)"
              ></textarea>
            </div>

            <div class="afp-space-y-6 afp-min-w-0">
              @for (size of sizes; track size) {
                <div class="afp-space-y-2 afp-min-w-0">
                  <div class="afp-text-xs afp-text-fg-tertiary">{{ size }}px</div>
                  <afp-font-preview-line
                    [font]="font()"
                    [text]="displayText()"
                    [fontSize]="size"
                    [renderMode]="effectiveRenderMode()"
                    [theme]="resolvedTheme()"
                  />
                </div>
              }
            </div>

            <div class="afp-space-y-6 afp-pt-6 afp-border-t afp-border-line-weak afp-min-w-0">
              <div class="afp-min-w-0">
                <div class="afp-text-sm afp-text-fg-tertiary afp-mb-3">Latin Alphabet</div>
                <afp-font-preview-line
                  [font]="font()"
                  [text]="samples.latin"
                  [fontSize]="24"
                  [renderMode]="effectiveRenderMode()"
                  [theme]="resolvedTheme()"
                />
              </div>

              <div class="afp-min-w-0">
                <div class="afp-text-sm afp-text-fg-tertiary afp-mb-3">Chinese Characters</div>
                <afp-font-preview-line
                  [font]="font()"
                  [text]="samples.chinese"
                  [fontSize]="24"
                  [renderMode]="effectiveRenderMode()"
                  [theme]="resolvedTheme()"
                />
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class FontRenderer implements RendererHandle {
  url = input.required<string>();

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  private readonly theme = inject(ThemeService, { optional: true });
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();

  protected readonly sizes = SIZES;
  protected readonly samples = DEFAULT_SAMPLES;

  readonly font = signal<OpentypeFont | null>(null);
  readonly metadata = signal<FontMetadata | null>(null);
  readonly metadataStatus = signal<MetadataStatus>('loading');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly customText = signal('');
  readonly renderMode = signal<RenderMode>('fontface');

  readonly displayText = computed(() => this.customText() || DEFAULT_SAMPLES.mixed);
  readonly showMetaPlaceholder = computed(() => this.metadataStatus() !== 'ready');
  readonly metaPlaceholder = computed(() =>
    this.metadataStatus() === 'loading' ? this.t('font.metadata_loading') : this.t('font.metadata_unavailable'),
  );
  readonly effectiveRenderMode = computed<RenderMode>(() =>
    (this.renderMode() === 'canvas' && this.font() ? 'canvas' : 'fontface'),
  );
  readonly resolvedTheme = computed(() => this.theme?.theme() ?? 'dark');

  private fontFace: FontFace | null = null;

  constructor() {
    effect(() => {
      const url = this.url();
      if (!url) return;
      untracked(() => { void this.loadFont(); });
    });

    inject(DestroyRef).onDestroy(() => this.releaseFontFace());
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  protected onCustomInput(ev: Event): void {
    this.customText.set((ev.target as HTMLTextAreaElement).value);
  }

  private releaseFontFace(): void {
    if (this.fontFace) {
      document.fonts.delete(this.fontFace);
      this.fontFace = null;
    }
  }

  private detectFormat(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
    const formatMap: Record<string, string> = {
      ttf: 'TrueType (TTF)',
      otf: 'OpenType (OTF)',
      woff: 'Web Open Font Format (WOFF)',
      woff2: 'Web Open Font Format 2 (WOFF2)',
    };
    return formatMap[ext] || 'TTF';
  }

  private formatLabel(magic: DetectedFormat, url: string): string {
    const labels: Record<DetectedFormat, string | null> = {
      woff2: 'Web Open Font Format 2 (WOFF2)',
      woff: 'Web Open Font Format (WOFF)',
      otf: 'OpenType (OTF)',
      ttf: 'TrueType (TTF)',
      unknown: null,
    };
    return labels[magic] ?? this.detectFormat(url);
  }

  private async loadFontFace(faceBuffer: ArrayBuffer): Promise<void> {
    try {
      this.fontFace = new FontFace('PreviewFont', faceBuffer);
      await this.fontFace.load();
      document.fonts.add(this.fontFace);
      this.renderMode.set('fontface');
    } catch (faceErr) {
      console.warn('[FontRenderer] FontFace API rejected, fallback to Canvas:', faceErr);
      this.renderMode.set('canvas');
      throw faceErr;
    }
  }

  private async loadMetadata(arrayBuffer: ArrayBuffer, magic: DetectedFormat): Promise<void> {
    if (magic === 'woff2') {
      throw new Error('WOFF2 metadata parsing intentionally skipped');
    }

    const fontData = parse(arrayBuffer) as unknown as OpentypeFont;
    if (!fontData) {
      throw new Error('Font data is invalid');
    }

    const rawNames = (fontData.names || {}) as unknown as Record<string, unknown>;
    const platformTables = ['windows', 'macintosh', 'unicode']
      .map((k) => rawNames[k])
      .filter((t): t is Record<string, { en?: string; 'zh-Hans'?: string }> => !!t && typeof t === 'object');
    const pickName = (key: string): string => {
      for (const table of platformTables) {
        const entry = table[key];
        const val = entry?.en || entry?.['zh-Hans'];
        if (val) return val;
      }
      const flat = rawNames[key] as { en?: string; 'zh-Hans'?: string } | undefined;
      return flat?.en || flat?.['zh-Hans'] || '';
    };

    const meta: FontMetadata = {
      family: pickName('fontFamily') || pickName('postScriptName') || 'Unknown',
      subfamily: pickName('fontSubfamily'),
      version: pickName('version'),
      designer: pickName('designer'),
      glyphCount: fontData.numGlyphs || 0,
      format: this.formatLabel(magic, this.url()),
    };

    this.font.set(fontData);
    this.metadata.set(meta);
    this.metadataStatus.set('ready');
  }

  private async loadFont(): Promise<void> {
    this.releaseFontFace();
    this.font.set(null);

    try {
      this.loading.set(true);
      this.error.set(null);
      this.metadataStatus.set('loading');

      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      const response = await fetcher(this.url());
      if (!response.ok) {
        throw new Error('Failed to load font file');
      }
      const arrayBuffer = await response.arrayBuffer();

      const faceBuffer = arrayBuffer.slice(0);
      const magic = detectMagic(arrayBuffer);

      const facePromise = this.loadFontFace(faceBuffer);
      const metadataPromise = this.loadMetadata(arrayBuffer, magic);

      await facePromise.catch(() => {
        // FontFace 失败由 metadata 兜底
      });
      this.loading.set(false);

      try {
        await metadataPromise;
      } catch (metaErr) {
        if (magic !== 'woff2') {
          console.warn(
            '[FontRenderer] Metadata parse failed, font is still rendered via FontFace:',
            metaErr instanceof Error ? metaErr.message : String(metaErr),
          );
        }
        this.metadataStatus.set('unavailable');
        this.metadata.set({
          family: 'Unknown',
          subfamily: '',
          version: '',
          designer: '',
          glyphCount: 0,
          format: this.formatLabel(magic, this.url()),
        });
      }
    } catch (err) {
      console.warn(
        '[FontRenderer] Failed to load font:',
        err instanceof Error ? err.message : String(err),
      );
      this.error.set(this.t('font.load_failed'));
      this.loading.set(false);
      this.metadataStatus.set('unavailable');
    }
  }
}
