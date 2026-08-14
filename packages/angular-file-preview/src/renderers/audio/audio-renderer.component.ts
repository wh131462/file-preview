import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideAngularModule,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  SkipBack,
  SkipForward,
  Repeat,
} from 'lucide-angular';
import { injectAudioPlayer } from '../../inject/audio-player';
import { injectTranslator } from '../../inject/translator';
import { RendererErrorComponent } from '../renderer-error.component';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-audio-renderer',
  standalone: true,
  imports: [LucideAngularModule, RendererErrorComponent],
  template: `
    @if (player.error(); as err) {
      <afp-renderer-error [message]="err" />
    } @else {
      <div
        #containerRef
        class="afp-flex afp-flex-col afp-items-center afp-justify-center afp-w-full afp-h-full afp-select-none afp-overflow-auto"
        [class.afp-p-3]="isCompact()"
        [class.afp-gap-3]="isCompact()"
        [class.afp-p-6]="!isCompact()"
        [class.afp-gap-6]="!isCompact()"
      >
        <div
          class="afp-relative afp-flex-shrink-0"
          [style.width.px]="vinylBase"
          [style.height.px]="vinylHeightBase"
          [style.transform]="'scale(' + finalVinylScale() + ')'"
          [style.transform-origin]="'center center'"
          [style.margin-top]="isCompact() ? -(vinylHeightBase * (1 - finalVinylScale())) / 2 + 'px' : '0'"
          [style.margin-bottom]="isCompact() ? -(vinylHeightBase * (1 - finalVinylScale())) / 2 + 'px' : '0'"
        >
          <div
            class="afp-absolute afp-rounded-full"
            [style.width]="'220px'"
            [style.height]="'220px'"
            [style.top]="'18px'"
            [style.left]="'8px'"
            [style.background]="'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)'"
            [style.opacity]="player.isPlaying() ? 0.7 : 0.2"
            [style.transition]="'opacity 0.5s'"
          ></div>

          <div
            class="afp-absolute afp-rounded-full afp-overflow-hidden"
            [style.width]="'200px'"
            [style.height]="'200px'"
            [style.top]="'28px'"
            [style.left]="'18px'"
            [style.background]="vinylBackground"
            [style.box-shadow]="player.isPlaying()
              ? '0 0 36px rgba(129,140,248,0.1), 0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.4)'"
            [style.animation]="'afp-vinyl-spin 8s linear infinite'"
            [style.animation-play-state]="player.isPlaying() ? 'running' : 'paused'"
          >
            <div
              class="afp-absolute afp-rounded-full"
              [style.width]="'34%'"
              [style.height]="'34%'"
              [style.top]="'33%'"
              [style.left]="'33%'"
              [style.background]="'radial-gradient(circle at 40% 38%, #818cf8, #6366f1, #4f46e5, #4338ca)'"
              [style.box-shadow]="'inset 0 1px 3px rgba(255,255,255,0.25), inset 0 -1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(0,0,0,0.3)'"
            >
              <div
                class="afp-absolute afp-rounded-full"
                [style.width]="'14%'"
                [style.height]="'14%'"
                [style.top]="'43%'"
                [style.left]="'43%'"
                [style.background]="'radial-gradient(circle at 40% 40%, #333, #0d0d0d)'"
                [style.box-shadow]="'inset 0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5)'"
              ></div>
            </div>
          </div>

          <div
            class="afp-absolute"
            [style.top]="'-6px'"
            [style.right]="'2px'"
            [style.width]="'100px'"
            [style.height]="'120px'"
            [style.transform-origin]="'76px 16px'"
            [style.z-index]="5"
            [style.transform]="player.isPlaying() ? 'rotate(16deg)' : 'rotate(0deg)'"
            [style.transition]="'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'"
          >
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
            [style.width]="'448px'"
            [style.backdrop-filter]="'blur(16px)'"
            [style.transform]="controlScale() < 1 ? 'scale(' + controlScale() + ')' : undefined"
            [style.transform-origin]="'top center'"
            [style.margin-bottom]="controlScale() < 1 ? -(1 - controlScale()) * 100 + 'px' : undefined"
          >
            <div [class.afp-mb-3]="isCompact()" [class.afp-mb-5]="!isCompact()">
              <div class="afp-relative afp-h-4 afp-flex afp-items-center">
                <div class="afp-absolute afp-w-full afp-h-[5px] afp-rounded-full afp-bg-surface-2"></div>
                <div
                  class="afp-absolute afp-h-[5px] afp-rounded-full afp-pointer-events-none"
                  [style.width.%]="progress() * 100"
                  [style.background]="'linear-gradient(90deg, var(--fp-accent), var(--fp-accent-hover))'"
                  [style.box-shadow]="player.isPlaying() ? '0 0 8px rgba(129,140,248,0.4)' : 'none'"
                  [style.transition]="isDragging() ? 'none' : 'width 0.1s linear'"
                ></div>
                <input
                  type="range"
                  min="0"
                  [max]="player.duration() > 0 ? player.duration() : player.currentTime() || 100"
                  step="any"
                  [value]="displayTime()"
                  [disabled]="player.duration() <= 0"
                  [attr.aria-label]="translator.t()('audio.aria.progress')"
                  class="audio-slider afp-absolute afp-w-full"
                  (pointerdown)="onProgressPointerDown()"
                  (input)="onProgressInput($event)"
                  (pointerup)="onProgressPointerUp($event)"
                  (pointercancel)="isDragging.set(false)"
                />
              </div>
              <div
                class="afp-flex afp-justify-between afp-text-fg-tertiary"
                [class.afp-text-[10px]]="isCompact()"
                [class.afp-mt-1.5]="isCompact()"
                [class.afp-text-xs]="!isCompact()"
                [class.afp-mt-2.5]="!isCompact()"
              >
                <span style="font-variant-numeric: tabular-nums">{{ player.formatTime(displayTime()) }}</span>
                <span style="font-variant-numeric: tabular-nums">
                  {{ player.duration() > 0 ? player.formatTime(player.duration()) : '--:--' }}
                </span>
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
                [class.afp-bg-accent-soft]="player.isLoop()"
                [class.afp-text-accent]="player.isLoop()"
                [class.afp-bg-surface-2]="!player.isLoop()"
                [class.afp-text-fg-tertiary]="!player.isLoop()"
                [attr.aria-label]="player.isLoop() ? translator.t()('audio.aria.loop_off') : translator.t()('audio.aria.loop_on')"
                (click)="player.toggleLoop()"
              >
                <lucide-icon [img]="repeatIcon" [class]="isCompact() ? 'afp-w-3.5 afp-h-3.5' : 'afp-w-4 afp-h-4'" />
              </button>

              <button
                type="button"
                class="afp-rounded-full afp-flex afp-items-center afp-justify-center afp-transition-colors audio-ctrl-btn afp-bg-surface-2 afp-text-fg-secondary afp-flex-shrink-0"
                [class.afp-w-9]="isCompact()"
                [class.afp-h-9]="isCompact()"
                [class.afp-w-10]="!isCompact()"
                [class.afp-h-10]="!isCompact()"
                [attr.aria-label]="translator.t()('audio.aria.backward_10')"
                (click)="player.skip(-10)"
              >
                <lucide-icon [img]="skipBackIcon" [class]="isCompact() ? 'afp-w-4 afp-h-4' : 'afp-w-[18px] afp-h-[18px]'" />
              </button>

              <button
                type="button"
                class="afp-rounded-full afp-flex afp-items-center afp-justify-center audio-ctrl-btn afp-flex-shrink-0"
                [class.afp-w-12]="isCompact()"
                [class.afp-h-12]="isCompact()"
                [class.afp-w-14]="!isCompact()"
                [class.afp-h-14]="!isCompact()"
                [style.background]="'linear-gradient(135deg, var(--fp-accent-hover), var(--fp-accent))'"
                [style.color]="'var(--fp-fg-inverse)'"
                [style.box-shadow]="'0 4px 20px rgba(99,102,241,0.35)'"
                [attr.aria-label]="player.isPlaying() ? translator.t()('audio.aria.pause') : translator.t()('audio.aria.play')"
                (click)="player.togglePlay()"
              >
                @if (player.isPlaying()) {
                  <lucide-icon [img]="pauseIcon" [class]="isCompact() ? 'afp-w-5 afp-h-5' : 'afp-w-6 afp-h-6'" />
                } @else {
                  <lucide-icon [img]="playIcon" [class]="isCompact() ? 'afp-w-5 afp-h-5 afp-ml-0.5' : 'afp-w-6 afp-h-6 afp-ml-0.5'" />
                }
              </button>

              <button
                type="button"
                class="afp-rounded-full afp-flex afp-items-center afp-justify-center afp-transition-colors audio-ctrl-btn afp-bg-surface-2 afp-text-fg-secondary afp-flex-shrink-0"
                [class.afp-w-9]="isCompact()"
                [class.afp-h-9]="isCompact()"
                [class.afp-w-10]="!isCompact()"
                [class.afp-h-10]="!isCompact()"
                [attr.aria-label]="translator.t()('audio.aria.forward_10')"
                (click)="player.skip(10)"
              >
                <lucide-icon [img]="skipForwardIcon" [class]="isCompact() ? 'afp-w-4 afp-h-4' : 'afp-w-[18px] afp-h-[18px]'" />
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
                  [attr.aria-label]="player.isMuted() ? translator.t()('audio.aria.unmute') : translator.t()('audio.aria.mute')"
                  (click)="player.toggleMute()"
                >
                  <lucide-icon [img]="volumeIcon()" [class]="isCompact() ? 'afp-w-3.5 afp-h-3.5' : 'afp-w-4 afp-h-4'" />
                </button>

                @if (showVolume()) {
                  <div
                    class="afp-absolute afp-bottom-full afp-mb-2 afp-rounded-xl afp-p-3 afp-border afp-bg-surface-3 afp-border-line"
                    [style.left]="'50%'"
                    [style.margin-left]="'-27px'"
                    [style.backdrop-filter]="'blur(16px)'"
                    (mouseenter)="handleVolumeEnter()"
                    (mouseleave)="handleVolumeLeave()"
                  >
                    <div class="afp-flex afp-flex-col afp-items-center afp-gap-2" style="height: 100px">
                      <div
                        class="afp-relative afp-flex afp-items-center afp-justify-center"
                        style="width: 24px; height: 80px"
                      >
                        <div class="afp-absolute afp-rounded-full afp-bg-surface-2" style="width: 3px; height: 100%"></div>
                        <div
                          class="afp-absolute afp-bottom-0 afp-rounded-full afp-pointer-events-none"
                          [style.width]="'3px'"
                          [style.height.%]="(player.isMuted() ? 0 : player.volume()) * 100"
                          [style.background]="'var(--fp-accent-hover)'"
                          [style.transition]="'height 0.1s linear'"
                        ></div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          [value]="player.isMuted() ? 0 : player.volume()"
                          [attr.aria-label]="translator.t()('audio.aria.volume')"
                          class="volume-slider-vertical afp-absolute"
                          style="width: 80px; height: 24px; transform: rotate(-90deg); transform-origin: center center"
                          (input)="onVolumeInput($event)"
                        />
                      </div>
                      <span class="afp-text-[10px] afp-tabular-nums afp-text-fg-tertiary">
                        {{ Math.round((player.isMuted() ? 0 : player.volume()) * 100) }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <audio #audioEl [src]="url()" class="afp-hidden"></audio>
      </div>
    }
  `,
  styles: [`
    .audio-ctrl-btn {
      border: 0;
      cursor: pointer;
    }
  `],
})
export class AudioRendererComponent implements RendererHandle {
  readonly url = input.required<string>();
  readonly fileName = input.required<string>();

  readonly translator = injectTranslator();
  readonly player = injectAudioPlayer();

  readonly playIcon = Play;
  readonly pauseIcon = Pause;
  readonly skipBackIcon = SkipBack;
  readonly skipForwardIcon = SkipForward;
  readonly repeatIcon = Repeat;
  readonly Math = Math;

  readonly vinylBase = 260;
  readonly vinylHeightBase = 240;
  readonly vinylBackground = `
    radial-gradient(circle at center, transparent 95%, rgba(30,30,30,0.8) 95.5%, #111 97%),
    radial-gradient(circle at center, transparent 38%, rgba(50,50,50,0.5) 38.15%, transparent 38.4%),
    radial-gradient(circle at center, transparent 45%, rgba(50,50,50,0.3) 45.15%, transparent 45.4%),
    radial-gradient(circle at center, transparent 52%, rgba(50,50,50,0.5) 52.15%, transparent 52.4%),
    radial-gradient(circle at center, transparent 59%, rgba(50,50,50,0.3) 59.15%, transparent 59.4%),
    radial-gradient(circle at center, transparent 66%, rgba(50,50,50,0.5) 66.15%, transparent 66.4%),
    radial-gradient(circle at center, transparent 73%, rgba(50,50,50,0.3) 73.15%, transparent 73.4%),
    radial-gradient(circle at center, transparent 80%, rgba(50,50,50,0.4) 80.15%, transparent 80.4%),
    radial-gradient(circle at center, transparent 87%, rgba(50,50,50,0.3) 87.15%, transparent 87.4%),
    conic-gradient(from 0deg, #1c1c1c, #232323, #1a1a1a, #262626, #1c1c1c, #212121, #1a1a1a, #252525, #1c1c1c, #232323, #1a1a1a, #262626, #1c1c1c)
  `;

  readonly showVolume = signal(false);
  readonly isCompact = signal(false);
  readonly controlScale = signal(1);
  readonly isDragging = signal(false);
  readonly dragTime = signal(0);

  readonly containerRef = viewChild<ElementRef<HTMLDivElement>>('containerRef');
  readonly volumeRef = viewChild<ElementRef<HTMLDivElement>>('volumeRef');
  readonly audioRef = viewChild<ElementRef<HTMLAudioElement>>('audioEl');

  readonly displayTime = computed(() => (this.isDragging() ? this.dragTime() : this.player.currentTime()));
  readonly progress = computed(() => {
    const duration = this.player.duration();
    return duration > 0 ? this.displayTime() / duration : 0;
  });
  readonly vinylScale = computed(() => (this.isCompact() ? 0.72 : 1));
  readonly finalVinylScale = computed(() => this.vinylScale() * this.controlScale());
  readonly volumeIcon = computed(() => {
    if (this.player.isMuted() || this.player.volume() === 0) return VolumeX;
    if (this.player.volume() < 0.5) return Volume1;
    return Volume2;
  });

  private volumeHideTimer: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      this.player.setAudioEl(this.audioRef()?.nativeElement ?? null);
      this.bindResize();
    });

    effect(() => {
      void this.url();
      if (this.player.audioEl()) {
        requestAnimationFrame(() => this.player.rebind());
      }
    });

    const onClickOutside = (e: MouseEvent) => this.handleClickOutside(e);
    document.addEventListener('mousedown', onClickOutside);

    this.destroyRef.onDestroy(() => {
      document.removeEventListener('mousedown', onClickOutside);
      if (this.volumeHideTimer !== null) clearTimeout(this.volumeHideTimer);
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });
  }

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }

  onProgressPointerDown() {
    this.dragTime.set(this.player.currentTime());
    this.isDragging.set(true);
  }

  onProgressInput(e: Event) {
    const value = parseFloat((e.target as HTMLInputElement).value);
    if (this.isDragging()) {
      this.dragTime.set(value);
    } else {
      this.player.seek(value);
    }
  }

  onProgressPointerUp(e: Event) {
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.player.seek(value);
    this.isDragging.set(false);
  }

  onVolumeInput(e: Event) {
    this.player.setVolume(parseFloat((e.target as HTMLInputElement).value));
  }

  handleVolumeEnter() {
    if (this.volumeHideTimer !== null) clearTimeout(this.volumeHideTimer);
    this.showVolume.set(true);
  }

  handleVolumeLeave() {
    this.volumeHideTimer = window.setTimeout(() => {
      this.showVolume.set(false);
    }, 300);
  }

  private handleClickOutside(e: MouseEvent) {
    const el = this.volumeRef()?.nativeElement;
    if (el && !el.contains(e.target as Node)) {
      this.showVolume.set(false);
    }
  }

  private bindResize() {
    const checkSize = () => {
      const container = this.containerRef()?.nativeElement;
      if (!container) return;
      this.isCompact.set(container.clientHeight < 580);
      const width = container.clientWidth;
      const baseWidth = 464;
      const minVisualWidth = 320;
      const minScale = minVisualWidth / baseWidth;
      const scale = width >= baseWidth ? 1 : Math.max(minScale, width / baseWidth);
      this.controlScale.set(scale);
    };
    checkSize();
    const container = this.containerRef()?.nativeElement;
    if (container) {
      this.resizeObserver = new ResizeObserver(checkSize);
      this.resizeObserver.observe(container);
    }
  }
}
