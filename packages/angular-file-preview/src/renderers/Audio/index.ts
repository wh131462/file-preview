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
import {
  AudioLines,
  LucideAngularModule,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-angular';
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
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full afp-p-4 afp-select-none afp-overflow-auto">
        <div class="afp-w-full afp-max-w-xl afp-flex-shrink-0 afp-rounded-lg afp-border afp-border-line-weak afp-bg-surface-1 afp-p-4">
          <div class="afp-flex afp-items-center afp-gap-3 afp-mb-4">
            <div
              aria-hidden="true"
              class="afp-audio-mark afp-w-10 afp-h-10 afp-flex afp-items-center afp-justify-center afp-rounded-md afp-flex-shrink-0"
              [class.afp-audio-mark-playing]="isPlaying()"
            >
              <i-lucide [img]="audioLinesIcon" class="afp-w-5 afp-h-5" />
            </div>
            <div class="afp-min-w-0 afp-flex-1 afp-truncate afp-text-sm afp-font-medium afp-text-fg-primary">
              {{ fileName() }}
            </div>
          </div>

          <div class="afp-flex afp-items-center afp-gap-3 afp-mb-4">
            <span class="afp-w-9 afp-flex-shrink-0 afp-text-right afp-text-[11px] afp-text-fg-tertiary afp-tabular-nums">
              {{ formatTime(displayTime()) }}
            </span>
            <div class="afp-relative afp-h-4 afp-flex afp-flex-1 afp-items-center">
              <div class="afp-absolute afp-left-[6px] afp-right-[6px] afp-h-[3px] afp-rounded-full afp-bg-surface-3">
                <div
                  class="afp-h-full afp-rounded-full afp-pointer-events-none"
                  [attr.style]="progressFillStyle()"
                ></div>
              </div>
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
            <span class="afp-w-9 afp-flex-shrink-0 afp-text-[11px] afp-text-fg-tertiary afp-tabular-nums">
              {{ duration() > 0 ? formatTime(duration()) : '--:--' }}
            </span>
          </div>

          <div class="afp-flex afp-items-center afp-gap-1">
            <button
              type="button"
              class="afp-audio-control afp-w-10 afp-h-10 afp-rounded-md afp-flex afp-items-center afp-justify-center afp-flex-shrink-0"
              [attr.style]="playBtnStyle()"
              [attr.title]="isPlaying() ? t('audio.aria.pause') : t('audio.aria.play')"
              [attr.aria-label]="isPlaying() ? t('audio.aria.pause') : t('audio.aria.play')"
              (click)="togglePlay()"
            >
              @if (isPlaying()) {
                <i-lucide [img]="pauseIcon" class="afp-w-5 afp-h-5" />
              } @else {
                <i-lucide [img]="playIcon" class="afp-w-5 afp-h-5 afp-ml-0.5" />
              }
            </button>

            <button
              type="button"
              class="afp-audio-control afp-w-9 afp-h-9 afp-rounded-md afp-flex afp-items-center afp-justify-center afp-transition-colors afp-text-fg-secondary hover:afp-bg-surface-3 afp-flex-shrink-0"
              [attr.title]="t('audio.aria.backward_10')"
              [attr.aria-label]="t('audio.aria.backward_10')"
              (click)="skip(-10)"
            >
              <i-lucide [img]="skipBackIcon" class="afp-w-[18px] afp-h-[18px]" />
            </button>

            <button
              type="button"
              class="afp-audio-control afp-w-9 afp-h-9 afp-rounded-md afp-flex afp-items-center afp-justify-center afp-transition-colors afp-text-fg-secondary hover:afp-bg-surface-3 afp-flex-shrink-0"
              [attr.title]="t('audio.aria.forward_10')"
              [attr.aria-label]="t('audio.aria.forward_10')"
              (click)="skip(10)"
            >
              <i-lucide [img]="skipForwardIcon" class="afp-w-[18px] afp-h-[18px]" />
            </button>

            <div class="afp-w-px afp-h-5 afp-mx-1 afp-bg-divide"></div>

            <button
              type="button"
              class="afp-audio-control afp-w-9 afp-h-9 afp-rounded-md afp-flex afp-items-center afp-justify-center afp-transition-colors afp-flex-shrink-0"
              [class.afp-bg-surface-3]="isLoop()"
              [class.afp-text-fg-primary]="isLoop()"
              [class.afp-text-fg-tertiary]="!isLoop()"
              [attr.title]="isLoop() ? t('audio.aria.loop_off') : t('audio.aria.loop_on')"
              [attr.aria-label]="isLoop() ? t('audio.aria.loop_off') : t('audio.aria.loop_on')"
              (click)="toggleLoop()"
            >
              <i-lucide [img]="repeatIcon" class="afp-w-4 afp-h-4" />
            </button>

            <div class="afp-flex-1"></div>

            <div
              #volumeRef
              class="afp-relative"
              (mouseenter)="handleVolumeEnter()"
              (mouseleave)="handleVolumeLeave()"
            >
              <button
                type="button"
                class="afp-audio-control afp-w-9 afp-h-9 afp-rounded-md afp-flex afp-items-center afp-justify-center afp-transition-colors afp-flex-shrink-0"
                [class.afp-bg-surface-3]="showVolume()"
                [class.afp-text-fg-primary]="showVolume()"
                [class.afp-text-fg-secondary]="!showVolume()"
                [attr.title]="isMuted() ? t('audio.aria.unmute') : t('audio.aria.mute')"
                [attr.aria-label]="isMuted() ? t('audio.aria.unmute') : t('audio.aria.mute')"
                (click)="toggleMute()"
              >
                <i-lucide [img]="volumeIcon()" class="afp-w-4 afp-h-4" />
              </button>

              @if (showVolume()) {
                <div
                  class="afp-absolute afp-right-0 afp-bottom-full afp-mb-2 afp-w-[54px] afp-rounded-md afp-p-3 afp-border afp-bg-surface-toolbar afp-border-line afp-volume-popup"
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

        <audio #audioRef [src]="url()" class="afp-hidden"></audio>
      </div>
    }
  `,
  styles: [`
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

  protected readonly audioLinesIcon = AudioLines;
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
  readonly isDragging = signal(false);
  readonly dragTime = signal(0);

  private readonly volumeRef = viewChild<ElementRef<HTMLDivElement>>('volumeRef');
  private readonly audioEl = viewChild<ElementRef<HTMLAudioElement>>('audioRef');

  private volumeHideTimer: number | null = null;
  private bindRaf = 0;

  protected readonly displayTime = computed(() =>
    this.isDragging() ? this.dragTime() : this.currentTime(),
  );
  protected readonly progress = computed(() =>
    this.duration() > 0 ? this.displayTime() / this.duration() : 0,
  );
  protected readonly volumeIcon = computed(() => {
    if (this.isMuted() || this.volume() === 0) return VolumeX;
    if (this.volume() < 0.5) return Volume1;
    return Volume2;
  });

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
      document.addEventListener('mousedown', this.handleClickOutside);
    });
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('mousedown', this.handleClickOutside);
      if (this.volumeHideTimer !== null) clearTimeout(this.volumeHideTimer);
      cancelAnimationFrame(this.bindRaf);
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

  protected progressFillStyle(): string {
    return `width:${this.progress() * 100}%;background:var(--fp-player-progress);transition:${this.isDragging() ? 'none' : 'width 0.1s linear'}`;
  }

  protected playBtnStyle(): string {
    return 'background:var(--fp-player-progress);color:var(--fp-fg-inverse)';
  }

  protected volumeFillStyle(): string {
    const h = (this.isMuted() ? 0 : this.volume()) * 100;
    return `width:3px;height:${h}%;background:var(--fp-player-progress);transition:height 0.1s linear`;
  }

  private readonly handleClickOutside = (e: MouseEvent): void => {
    const el = this.volumeRef()?.nativeElement;
    if (el && !el.contains(e.target as Node)) {
      this.showVolume.set(false);
    }
  };
}
