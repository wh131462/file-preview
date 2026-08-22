import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { LucideAngularModule, Play, Pause, Volume2, VolumeX, Volume1, SkipBack, SkipForward, Repeat } from 'lucide-angular';
import { formatTime } from '../../fp-core';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import { createAudioPlayer } from '../../utils/audio-player';
import { RendererError } from '../RendererError';
import { ToolbarEventEmitter } from '../base.types';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-audio-renderer',
  standalone: true,
  imports: [LucideAngularModule, RendererError],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    @if (error(); as err) {
      <afp-renderer-error [message]="t(err)" />
    } @else {
      <div
        #containerRef
        class="afp-flex afp-flex-col afp-items-center afp-justify-center afp-w-full afp-h-full afp-select-none afp-overflow-auto"
        [class.afp-p-3]="isCompact()"
        [class.afp-gap-3]="isCompact()"
        [class.afp-p-6]="!isCompact()"
        [class.afp-gap-6]="!isCompact()"
      >
        <div class="afp-relative afp-flex-shrink-0" [attr.style]="vinylBoxStyle()">
          <div
            class="afp-absolute afp-rounded-full"
            [attr.style]="glowStyle()"
          ></div>

          <div
            class="afp-absolute afp-rounded-full afp-overflow-hidden"
            [attr.style]="vinylStyle()"
          >
            <div class="afp-absolute afp-rounded-full" [attr.style]="labelStyle()">
              <div class="afp-absolute afp-rounded-full" [attr.style]="spindleStyle()"></div>
            </div>
          </div>

          <div class="afp-absolute" [attr.style]="tonearmStyle()">
            <svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="76" cy="16" r="13" fill="rgba(0,0,0,0.3)" />
              <circle cx="76" cy="16" r="11" fill="url(#afp-baseGrad)" />
              <circle cx="76" cy="16" r="6" fill="url(#afp-baseInnerGrad)" />
              <circle cx="76" cy="16" r="2.5" fill="#222" stroke="#555" stroke-width="0.5" />
              <path d="M74 22 L56 88" stroke="url(#afp-armGrad)" stroke-width="3.5" stroke-linecap="round" />
              <rect x="50" y="86" width="12" height="7" rx="1.5" fill="url(#afp-headGrad)" />
              <rect x="52.5" y="92" width="7" height="9" rx="1" fill="url(#afp-cartridgeGrad)" />
              <line x1="56" y1="101" x2="56" y2="105" stroke="#bbb" stroke-width="1.2" stroke-linecap="round" />
              <circle cx="56" cy="105.5" r="0.8" fill="#ddd" />

              <defs>
                <radialGradient id="afp-baseGrad" cx="40%" cy="35%">
                  <stop offset="0%" stop-color="#555" />
                  <stop offset="100%" stop-color="#1a1a1a" />
                </radialGradient>
                <radialGradient id="afp-baseInnerGrad" cx="40%" cy="35%">
                  <stop offset="0%" stop-color="#666" />
                  <stop offset="100%" stop-color="#333" />
                </radialGradient>
                <linearGradient id="afp-armGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#555" />
                  <stop offset="50%" stop-color="#444" />
                  <stop offset="100%" stop-color="#333" />
                </linearGradient>
                <linearGradient id="afp-headGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#555" />
                  <stop offset="100%" stop-color="#333" />
                </linearGradient>
                <linearGradient id="afp-cartridgeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#444" />
                  <stop offset="100%" stop-color="#222" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <div
          class="afp-text-center afp-max-w-md afp-flex-shrink-0"
          [class.afp-px-2]="isCompact()"
          [class.afp-px-4]="!isCompact()"
        >
          <div
            class="afp-font-medium afp-truncate afp-text-fg-primary"
            [class.afp-text-sm]="isCompact()"
            [class.afp-text-lg]="!isCompact()"
          >
            {{ fileName() }}
          </div>
        </div>

        <div class="afp-w-full afp-flex afp-justify-center afp-flex-shrink-0">
          <div
            class="afp-rounded-2xl afp-border afp-bg-surface-1 afp-border-line-weak"
            [class.afp-p-3]="isCompact()"
            [class.afp-p-5]="!isCompact()"
            [attr.style]="panelStyle()"
          >
            <div [class.afp-mb-3]="isCompact()" [class.afp-mb-5]="!isCompact()">
              <div class="afp-relative afp-h-4 afp-flex afp-items-center">
                <div class="afp-absolute afp-w-full afp-h-[5px] afp-rounded-full afp-bg-surface-2"></div>
                <div class="afp-absolute afp-h-[5px] afp-rounded-full afp-pointer-events-none" [attr.style]="progressFillStyle()"></div>
                <input
                  type="range"
                  min="0"
                  [max]="duration() > 0 ? duration() : currentTime() || 100"
                  step="any"
                  [value]="displayTime()"
                  [disabled]="duration() <= 0"
                  [attr.aria-label]="t('audio.aria.progress')"
                  class="audio-slider afp-absolute afp-w-full"
                  (pointerdown)="onProgressPointerDown()"
                  (input)="onProgressInput($event)"
                  (pointerup)="onProgressPointerUp($event)"
                  (pointercancel)="isDragging.set(false)"
                />
              </div>
              <div [class]="timeRowClass()">
                <span style="font-variant-numeric: tabular-nums">{{ formatTime(displayTime()) }}</span>
                <span style="font-variant-numeric: tabular-nums">{{ duration() > 0 ? formatTime(duration()) : '--:--' }}</span>
              </div>
            </div>

            <div
              class="afp-flex afp-items-center afp-justify-center"
              [class.afp-gap-2]="isCompact()"
              [class.afp-gap-3]="!isCompact()"
            >
              <button
                type="button"
                class="afp-rounded-full afp-flex afp-items-center afp-justify-center afp-transition-colors audio-ctrl-btn afp-flex-shrink-0"
                [class.afp-w-8]="isCompact()"
                [class.afp-h-8]="isCompact()"
                [class.afp-w-9]="!isCompact()"
                [class.afp-h-9]="!isCompact()"
                [class.afp-bg-accent-soft]="isLoop()"
                [class.afp-text-accent]="isLoop()"
                [class.afp-bg-surface-2]="!isLoop()"
                [class.afp-text-fg-tertiary]="!isLoop()"
                [attr.aria-label]="isLoop() ? t('audio.aria.loop_off') : t('audio.aria.loop_on')"
                (click)="toggleLoop()"
              >
                <i-lucide [img]="repeatIcon" [class]="isCompact() ? 'afp-w-3.5 afp-h-3.5' : 'afp-w-4 afp-h-4'" />
              </button>

              <button
                type="button"
                class="afp-rounded-full afp-flex afp-items-center afp-justify-center afp-transition-colors audio-ctrl-btn afp-bg-surface-2 afp-text-fg-secondary afp-flex-shrink-0"
                [class.afp-w-9]="isCompact()"
                [class.afp-h-9]="isCompact()"
                [class.afp-w-10]="!isCompact()"
                [class.afp-h-10]="!isCompact()"
                [attr.aria-label]="t('audio.aria.backward_10')"
                (click)="skip(-10)"
              >
                <i-lucide [img]="skipBackIcon" [class]="isCompact() ? 'afp-w-4 afp-h-4' : 'afp-w-[18px] afp-h-[18px]'" />
              </button>

              <button
                type="button"
                class="afp-rounded-full afp-flex afp-items-center afp-justify-center audio-ctrl-btn afp-flex-shrink-0"
                [class.afp-w-12]="isCompact()"
                [class.afp-h-12]="isCompact()"
                [class.afp-w-14]="!isCompact()"
                [class.afp-h-14]="!isCompact()"
                [attr.style]="playBtnStyle()"
                [attr.aria-label]="isPlaying() ? t('audio.aria.pause') : t('audio.aria.play')"
                (click)="togglePlay()"
              >
                @if (isPlaying()) {
                  <i-lucide [img]="pauseIcon" [class]="isCompact() ? 'afp-w-5 afp-h-5' : 'afp-w-6 afp-h-6'" />
                } @else {
                  <i-lucide [img]="playIcon" [class]="isCompact() ? 'afp-w-5 afp-h-5 afp-ml-0.5' : 'afp-w-6 afp-h-6 afp-ml-0.5'" />
                }
              </button>

              <button
                type="button"
                class="afp-rounded-full afp-flex afp-items-center afp-justify-center afp-transition-colors audio-ctrl-btn afp-bg-surface-2 afp-text-fg-secondary afp-flex-shrink-0"
                [class.afp-w-9]="isCompact()"
                [class.afp-h-9]="isCompact()"
                [class.afp-w-10]="!isCompact()"
                [class.afp-h-10]="!isCompact()"
                [attr.aria-label]="t('audio.aria.forward_10')"
                (click)="skip(10)"
              >
                <i-lucide [img]="skipForwardIcon" [class]="isCompact() ? 'afp-w-4 afp-h-4' : 'afp-w-[18px] afp-h-[18px]'" />
              </button>

              <div
                #volumeRef
                class="afp-relative"
                (mouseenter)="handleVolumeEnter()"
                (mouseleave)="handleVolumeLeave()"
              >
                <button
                  type="button"
                  class="afp-rounded-full afp-flex afp-items-center afp-justify-center afp-transition-colors audio-ctrl-btn afp-flex-shrink-0"
                  [class.afp-w-8]="isCompact()"
                  [class.afp-h-8]="isCompact()"
                  [class.afp-w-9]="!isCompact()"
                  [class.afp-h-9]="!isCompact()"
                  [class.afp-bg-accent-soft]="showVolume()"
                  [class.afp-text-accent]="showVolume()"
                  [class.afp-bg-surface-2]="!showVolume()"
                  [class.afp-text-fg-secondary]="!showVolume()"
                  [attr.aria-label]="isMuted() ? t('audio.aria.unmute') : t('audio.aria.mute')"
                  (click)="toggleMute()"
                >
                  <i-lucide [img]="volumeIcon()" [class]="isCompact() ? 'afp-w-3.5 afp-h-3.5' : 'afp-w-4 afp-h-4'" />
                </button>

                @if (showVolume()) {
                  <div
                    class="afp-absolute afp-bottom-full afp-mb-2 afp-rounded-xl afp-p-3 afp-border afp-bg-surface-3 afp-border-line afp-volume-popup"
                    [attr.style]="volumePopupStyle()"
                    (mouseenter)="handleVolumeEnter()"
                    (mouseleave)="handleVolumeLeave()"
                  >
                    <div class="afp-flex afp-flex-col afp-items-center afp-gap-2" style="height: 100px">
                      <div class="afp-relative afp-flex afp-items-center afp-justify-center" style="width: 24px; height: 80px">
                        <div class="afp-absolute afp-rounded-full afp-bg-surface-2" style="width: 3px; height: 100%"></div>
                        <div
                          class="afp-absolute afp-bottom-0 afp-rounded-full afp-pointer-events-none"
                          [attr.style]="volumeFillStyle()"
                        ></div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          [value]="isMuted() ? 0 : volume()"
                          [attr.aria-label]="t('audio.aria.volume')"
                          class="volume-slider-vertical afp-absolute"
                          style="width: 80px; height: 24px; transform: rotate(-90deg); transform-origin: center center"
                          (input)="onVolumeInput($event)"
                        />
                      </div>
                      <span class="afp-text-[10px] afp-tabular-nums afp-text-fg-tertiary">
                        {{ Math.round((isMuted() ? 0 : volume()) * 100) }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <audio #audioRef [src]="url()" class="afp-hidden"></audio>
      </div>
    }
  `,
  styles: [`
    .audio-ctrl-btn {
      border: 0;
      cursor: pointer;
    }
    .afp-volume-popup {
      animation: afp-fade-in 0.2s ease;
    }
    @keyframes afp-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
})
export class AudioRenderer implements RendererHandle {
  url = input.required<string>();
  fileName = input.required<string>();

  private readonly emitter = new ToolbarEventEmitter();
  private readonly locale = inject(LocaleService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();
  protected readonly formatTime = formatTime;
  protected readonly Math = Math;

  protected readonly playIcon = Play;
  protected readonly pauseIcon = Pause;
  protected readonly skipBackIcon = SkipBack;
  protected readonly skipForwardIcon = SkipForward;
  protected readonly repeatIcon = Repeat;

  private readonly player = createAudioPlayer();
  protected readonly isPlaying = this.player.isPlaying;
  protected readonly isLoop = this.player.isLoop;
  protected readonly currentTime = this.player.currentTime;
  protected readonly duration = this.player.duration;
  protected readonly volume = this.player.volume;
  protected readonly isMuted = this.player.isMuted;
  protected readonly error = this.player.error;
  protected readonly togglePlay = this.player.togglePlay;
  protected readonly toggleMute = this.player.toggleMute;
  protected readonly toggleLoop = this.player.toggleLoop;

  readonly showVolume = signal(false);
  readonly isCompact = signal(false);
  readonly controlScale = signal(1);
  readonly isDragging = signal(false);
  readonly dragTime = signal(0);

  private readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('containerRef');
  private readonly volumeRef = viewChild<ElementRef<HTMLDivElement>>('volumeRef');
  private readonly audioEl = viewChild<ElementRef<HTMLAudioElement>>('audioRef');

  private volumeHideTimer: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private bindRaf = 0;

  private readonly vinylBase = 260;
  private readonly vinylHeightBase = 240;

  protected readonly displayTime = computed(() =>
    this.isDragging() ? this.dragTime() : this.currentTime(),
  );
  protected readonly progress = computed(() =>
    this.duration() > 0 ? this.displayTime() / this.duration() : 0,
  );
  private readonly vinylScale = computed(() => (this.isCompact() ? 0.72 : 1));
  private readonly finalVinylScale = computed(() => this.vinylScale() * this.controlScale());
  protected readonly volumeIcon = computed(() => {
    if (this.isMuted() || this.volume() === 0) return VolumeX;
    if (this.volume() < 0.5) return Volume1;
    return Volume2;
  });
  protected readonly timeRowClass = computed(() =>
    this.isCompact()
      ? 'afp-flex afp-justify-between afp-text-fg-tertiary afp-text-[10px] afp-mt-1.5'
      : 'afp-flex afp-justify-between afp-text-fg-tertiary afp-text-xs afp-mt-2.5',
  );

  constructor() {
    effect(() => {
      this.url();
      const el = this.audioEl()?.nativeElement ?? null;
      untracked(() => {
        cancelAnimationFrame(this.bindRaf);
        this.bindRaf = requestAnimationFrame(() => {
          this.player.bind(el);
        });
      });
    });
    afterNextRender(() => {
      this.checkSize();
      const el = this.containerRef()?.nativeElement;
      if (el) {
        this.resizeObserver = new ResizeObserver(() => this.checkSize());
        this.resizeObserver.observe(el);
      }
      document.addEventListener('mousedown', this.handleClickOutside);
    });
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('mousedown', this.handleClickOutside);
      if (this.volumeHideTimer !== null) clearTimeout(this.volumeHideTimer);
      cancelAnimationFrame(this.bindRaf);
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.player.destroy();
    });
  }

  getToolbarGroups = (): ToolbarGroup[] => [];

  onToolbarChange = (listener: () => void) => this.emitter.subscribe(listener);

  protected skip(seconds: number): void {
    const dur = this.duration();
    const next = Math.max(0, Math.min(this.currentTime() + seconds, dur || Infinity));
    this.player.seek(next);
  }

  protected onProgressPointerDown(): void {
    this.dragTime.set(this.currentTime());
    this.isDragging.set(true);
  }

  protected onProgressInput(e: Event): void {
    const value = parseFloat((e.target as HTMLInputElement).value);
    if (this.isDragging()) {
      this.dragTime.set(value);
    } else {
      this.player.seek(value);
    }
  }

  protected onProgressPointerUp(e: Event): void {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.player.seek(value);
    this.isDragging.set(false);
  }

  protected onVolumeInput(e: Event): void {
    this.player.setVolume(parseFloat((e.target as HTMLInputElement).value));
  }

  protected handleVolumeEnter(): void {
    if (this.volumeHideTimer !== null) clearTimeout(this.volumeHideTimer);
    this.showVolume.set(true);
  }

  protected handleVolumeLeave(): void {
    this.volumeHideTimer = window.setTimeout(() => {
      this.showVolume.set(false);
    }, 300);
  }

  protected vinylBoxStyle(): string {
    const scale = this.finalVinylScale();
    const compact = this.isCompact();
    const m = compact ? `${-(this.vinylHeightBase * (1 - scale)) / 2}px` : '0';
    return `width:${this.vinylBase}px;height:${this.vinylHeightBase}px;transform:scale(${scale});transform-origin:center center;margin-top:${m};margin-bottom:${m}`;
  }

  protected glowStyle(): string {
    return `width:220px;height:220px;top:18px;left:8px;background:radial-gradient(circle, rgba(234,5,96,0.16) 0%, rgba(136,34,255,0.08) 42%, transparent 70%);opacity:${this.isPlaying() ? 0.7 : 0.2};transition:opacity 0.5s`;
  }

  protected vinylStyle(): string {
    const playing = this.isPlaying();
    const shadow = playing
      ? '0 0 36px rgba(241,7,18,0.18), 0 0 20px rgba(136,34,255,0.14), 0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.4)'
      : '0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.4)';
    return `width:200px;height:200px;top:28px;left:18px;background:radial-gradient(circle at center, transparent 95%, rgba(30,30,30,0.8) 95.5%, #111 97%),radial-gradient(circle at center, transparent 38%, rgba(50,50,50,0.5) 38.15%, transparent 38.4%),radial-gradient(circle at center, transparent 45%, rgba(50,50,50,0.3) 45.15%, transparent 45.4%),radial-gradient(circle at center, transparent 52%, rgba(50,50,50,0.5) 52.15%, transparent 52.4%),radial-gradient(circle at center, transparent 59%, rgba(50,50,50,0.3) 59.15%, transparent 59.4%),radial-gradient(circle at center, transparent 66%, rgba(50,50,50,0.5) 66.15%, transparent 66.4%),radial-gradient(circle at center, transparent 73%, rgba(50,50,50,0.3) 73.15%, transparent 73.4%),radial-gradient(circle at center, transparent 80%, rgba(50,50,50,0.4) 80.15%, transparent 80.4%),radial-gradient(circle at center, transparent 87%, rgba(50,50,50,0.3) 87.15%, transparent 87.4%),conic-gradient(from 0deg, #1c1c1c, #232323, #1a1a1a, #262626, #1c1c1c, #212121, #1a1a1a, #252525, #1c1c1c, #232323, #1a1a1a, #262626, #1c1c1c);box-shadow:${shadow};animation:afp-vinyl-spin 8s linear infinite;animation-play-state:${playing ? 'running' : 'paused'}`;
  }

  protected labelStyle(): string {
    return 'width:34%;height:34%;top:33%;left:33%;background:radial-gradient(circle at 40% 38%, #FA31A1, #F10712, #EA0560, #8822FF);box-shadow:inset 0 1px 3px rgba(255,255,255,0.25), inset 0 -1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(0,0,0,0.3)';
  }

  protected spindleStyle(): string {
    return 'width:14%;height:14%;top:43%;left:43%;background:radial-gradient(circle at 40% 40%, #333, #0d0d0d);box-shadow:inset 0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5)';
  }

  protected tonearmStyle(): string {
    return `top:-6px;right:2px;width:100px;height:120px;transform-origin:76px 16px;z-index:5;transform:rotate(${this.isPlaying() ? 16 : 0}deg);transition:transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)`;
  }

  protected panelStyle(): string {
    const scale = this.controlScale();
    const transform = scale < 1 ? `scale(${scale})` : undefined;
    const marginBottom = scale < 1 ? `${-(1 - scale) * 100}px` : undefined;
    return `width:448px;backdrop-filter:blur(16px)${transform ? `;transform:${transform};transform-origin:top center` : ''}${marginBottom ? `;margin-bottom:${marginBottom}` : ''}`;
  }

  protected progressFillStyle(): string {
    return `width:${this.progress() * 100}%;background:var(--fp-accent-gradient);box-shadow:${this.isPlaying() ? '0 0 8px rgba(136,34,255,0.4)' : 'none'};transition:${this.isDragging() ? 'none' : 'width 0.1s linear'}`;
  }

  protected playBtnStyle(): string {
    return 'background:var(--fp-accent-gradient);color:var(--fp-fg-inverse);box-shadow:0 4px 20px rgba(136,34,255,0.35)';
  }

  protected volumePopupStyle(): string {
    return 'left:50%;margin-left:-27px;backdrop-filter:blur(16px)';
  }

  protected volumeFillStyle(): string {
    const h = (this.isMuted() ? 0 : this.volume()) * 100;
    return `width:3px;height:${h}%;background:var(--fp-accent-hover);transition:height 0.1s linear`;
  }

  private checkSize = (): void => {
    const el = this.containerRef()?.nativeElement;
    if (!el) return;
    this.isCompact.set(el.clientHeight < 580);
    const width = el.clientWidth;
    const baseWidth = 464;
    const minVisualWidth = 320;
    const minScale = minVisualWidth / baseWidth;
    const scale = width >= baseWidth ? 1 : Math.max(minScale, width / baseWidth);
    this.controlScale.set(scale);
  };

  private readonly handleClickOutside = (e: MouseEvent): void => {
    const el = this.volumeRef()?.nativeElement;
    if (el && !el.contains(e.target as Node)) {
      this.showVolume.set(false);
    }
  };
}
