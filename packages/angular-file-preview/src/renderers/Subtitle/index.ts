import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  parseSubtitle,
  formatSubtitleTime,
  fetchTextUtf8,
  type SubtitleParseResult,
  type SubtitleFormat,
} from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { RequestService } from '../../di/request.service';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

const FORMAT_BY_EXT: Record<string, SubtitleFormat> = {
  srt: 'srt',
  vtt: 'vtt',
  lrc: 'lrc',
  elrc: 'elrc',
  ass: 'ass',
  ssa: 'ssa',
  ttml: 'ttml',
  dfxp: 'ttml',
};

@Component({
  selector: 'afp-subtitle-renderer',
  standalone: true,
  imports: [RendererError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    @if (loading()) {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full afp-bg-[#0f0f12]">
        <div
          class="afp-w-12 afp-h-12 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"
        ></div>
      </div>
    } @else if (error() || !parsed()) {
      <afp-renderer-error
        [message]="error() || t('subtitle.parse_failed')"
        class="afp-bg-[#0f0f12]"
      />
    } @else {
      <div
        class="afp-relative afp-w-full afp-h-full afp-bg-[#0f0f12]"
        [class.flavor-lyric]="isLyric()"
        [class.flavor-subtitle]="!isLyric()"
      >
        <div class="content-scroll">
          <div class="timeline">
            <div class="timeline-line"></div>
            <ol class="cues">
              @for (cue of parsed()!.cues; track $index) {
                <li class="cue-row">
                  <div class="cue-dot"></div>
                  <div class="cue-meta">
                    <span class="cue-time">{{ formatSubtitleTime(cue.start) }}</span>
                    <span class="cue-arrow">→</span>
                    <span class="cue-time">{{ formatSubtitleTime(cue.end) }}</span>
                    <span class="cue-id">#{{ cue.id ?? $index + 1 }}</span>
                    @if (cue.style) {
                      <span class="cue-style">{{ cue.style }}</span>
                    }
                  </div>
                  @if (cue.words && cue.words.length > 0) {
                    <div class="cue-words">
                      @for (word of cue.words; track $index) {
                        <span class="cue-word" [title]="formatSubtitleTime(word.start)">
                          <span class="cue-word-time">{{ wordTimeShort(word.start) }}</span>
                          <span class="cue-word-text">{{ word.text }}</span>
                        </span>
                      }
                    </div>
                  } @else {
                    <p class="cue-text" [class.lyric]="isLyric()">{{ cue.text }}</p>
                  }
                </li>
              }
            </ol>
          </div>
        </div>

        <div class="status-pill">
          <span>{{ parsed()!.cues.length }} {{ isLyric() ? t('subtitle.lines') : t('subtitle.cues') }}</span>
          @if (meta()['length']) {
            <span class="dot">·</span>
            <span>{{ meta()['length'] }}</span>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .content-scroll {
      width: 100%;
      height: 100%;
      overflow: auto;
      padding: 1.5rem 1rem 4rem;
    }
    .status-pill {
      pointer-events: none;
      position: absolute;
      bottom: 0.75rem;
      right: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      border: 1px solid var(--fp-line);
      font-size: 0.625rem;
      color: var(--fp-fg-tertiary);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }
    .dot {
      color: var(--fp-fg-disabled);
    }

    .timeline {
      position: relative;
    }
    .timeline-line {
      position: absolute;
      left: 5px;
      top: 0.5rem;
      bottom: 0.5rem;
      width: 1px;
      background: var(--fp-line-weak);
    }
    .cues {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .cue-row {
      position: relative;
      padding-left: 1.5rem;
    }
    .cue-dot {
      position: absolute;
      left: 0;
      top: 0.4rem;
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 9999px;
      background: var(--fp-surface-3);
      border: 2px solid #0f0f12;
      transition: background-color 0.2s;
    }
    .flavor-lyric .cue-row:hover .cue-dot {
      background: rgb(167, 139, 250);
    }
    .flavor-subtitle .cue-row:hover .cue-dot {
      background: rgb(56, 189, 248);
    }
    .cue-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.25rem 0.75rem;
      margin-bottom: 0.375rem;
    }
    .cue-time {
      font-size: 0.6875rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--fp-fg-muted);
      font-variant-numeric: tabular-nums;
    }
    .cue-arrow {
      font-size: 0.6875rem;
      color: var(--fp-fg-disabled);
    }
    .cue-id {
      font-size: 0.625rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: var(--fp-fg-disabled);
      font-variant-numeric: tabular-nums;
    }
    .cue-style {
      font-size: 0.5625rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--fp-fg-tertiary);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      background: var(--fp-line-weak);
      border: 1px solid var(--fp-line);
    }
    .cue-text {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.625;
      color: var(--fp-fg-primary);
      font-size: 0.875rem;
      min-height: 1.25rem;
      transition: color 0.2s;
    }
    .cue-text.lyric {
      font-size: 1rem;
      font-weight: 500;
    }
    .cue-row:hover .cue-text {
      color: #fff;
    }
    .cue-words {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.375rem;
      font-size: 1rem;
      color: var(--fp-fg-primary);
      line-height: 1.625;
      transition: color 0.2s;
    }
    .cue-row:hover .cue-words {
      color: #fff;
    }
    .cue-word {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .cue-word-time {
      font-size: 0.5625rem;
      color: var(--fp-fg-disabled);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .cue-word-text {
      line-height: 1.4;
    }
  `,
})
export class SubtitleRenderer implements RendererHandle {
  url = input.required<string>();
  fileName = input.required<string>();

  private readonly locale = inject(LocaleService, { optional: true });
  private readonly request = inject(RequestService, { optional: true });
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();

  readonly text = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly parsed = computed<SubtitleParseResult | null>(() => {
    if (!this.text()) return null;
    try {
      return parseSubtitle(this.text(), SubtitleRenderer.getFormat(this.fileName()));
    } catch (err) {
      console.error(err);
      return null;
    }
  });

  readonly isLyric = computed(() => this.parsed()?.format === 'lrc' || this.parsed()?.format === 'elrc');
  readonly meta = computed<Record<string, string>>(() => this.parsed()?.metadata ?? {});

  constructor() {
    effect(() => {
      this.url();
      void this.load();
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  protected readonly formatSubtitleTime = formatSubtitleTime;

  protected wordTimeShort(time: number): string {
    return formatSubtitleTime(time).slice(3, 8);
  }

  private static getFormat(fileName: string): SubtitleFormat | undefined {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return FORMAT_BY_EXT[ext];
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const fetcher = this.request?.fetcher() ?? ((u: string, init?: RequestInit) => fetch(u, init));
      this.text.set(await fetchTextUtf8(this.url(), { fetcher }));
    } catch (err) {
      console.error(err);
      this.error.set(this.t('subtitle.load_failed'));
    } finally {
      this.loading.set(false);
    }
  }
}
