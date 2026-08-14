import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { getVideoMimeType } from '@eternalheart/file-preview-core';
import { injectTranslator } from '../../inject/translator';
import { RendererErrorComponent } from '../renderer-error.component';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

type VideoJsPlayer = ReturnType<typeof videojs>;

interface ErrorState {
  title: string;
  detail: string;
}

const BROWSER_UNSUPPORTED_EXTS = new Set(['avi', 'wmv', 'flv']);

@Component({
  selector: 'afp-video-renderer',
  standalone: true,
  imports: [RendererErrorComponent],
  template: `
    @if (error(); as err) {
      <afp-renderer-error [message]="err.title" [detail]="err.detail" />
    } @else {
      <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
        <div class="afp-w-full afp-h-full afp-relative">
          @if (isLoading()) {
            <div
              class="afp-absolute afp-inset-0 afp-flex afp-items-center afp-justify-center afp-bg-surface-3 afp-backdrop-blur-sm afp-z-10"
            >
              <div class="afp-text-center">
                <div
                  class="afp-w-12 afp-h-12 afp-mx-auto afp-mb-3 afp-border-4 afp-border-line-strong afp-border-t-spinner-head afp-rounded-full afp-animate-spin"
                ></div>
                <p class="afp-text-sm afp-text-fg-secondary afp-font-medium">
                  {{ translator.t()('video.loading') }}
                </p>
              </div>
            </div>
          }

          <div
            #videoContainerRef
            class="afp-overflow-hidden afp-w-full afp-h-full"
            style="box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)"
          ></div>
        </div>
      </div>
    }
  `,
})
export class VideoRendererComponent implements RendererHandle {
  readonly url = input.required<string>();
  readonly fileName = input<string>();

  readonly translator = injectTranslator();
  readonly error = signal<ErrorState | null>(null);
  readonly isLoading = signal(true);
  readonly videoContainerRef = viewChild<ElementRef<HTMLDivElement>>('videoContainerRef');

  private player: VideoJsPlayer | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.initPlayer());

    effect(() => {
      const url = this.url();
      if (this.player && !this.player.isDisposed()) {
        this.player.src({ src: url, type: getVideoMimeType(url) });
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.player && !this.player.isDisposed()) {
        this.player.dispose();
        this.player = null;
      }
    });
  }

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }

  private getVideoExt(url: string, fileName?: string): string {
    const source = fileName || url;
    return source.split('.').pop()?.toLowerCase().split('?')[0] || '';
  }

  private initPlayer() {
    const container = this.videoContainerRef()?.nativeElement;
    if (!container || this.player) return;

    const t = this.translator.t;
    const videoExt = this.getVideoExt(this.url(), this.fileName());

    if (BROWSER_UNSUPPORTED_EXTS.has(videoExt)) {
      this.error.set({
        title: t()('video.unsupported_title'),
        detail: t()('video.unsupported_detail', { format: videoExt.toUpperCase() }),
      });
      this.isLoading.set(false);
      return;
    }

    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-apple');
    container.appendChild(videoElement);

    const videoType = getVideoMimeType(this.url());
    let sources: Array<{ src: string; type: string }>;

    if (videoType === 'video/quicktime') {
      sources = [
        { src: this.url(), type: 'video/quicktime' },
        { src: this.url(), type: 'video/mp4' },
      ];
    } else {
      sources = [{ src: this.url(), type: videoType }];
    }

    this.player = videojs(videoElement, {
      controls: true,
      fill: true,
      preload: 'auto',
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'remainingTimeDisplay',
          'fullscreenToggle',
        ],
        volumePanel: {
          inline: false,
        },
      },
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeVideoTracks: false,
        nativeAudioTracks: false,
        nativeTextTracks: false,
      },
      sources,
    });

    const videoEl = this.player.el().querySelector('video');
    if (videoEl) {
      (videoEl as HTMLVideoElement).style.objectFit = 'contain';
    }

    this.player.on('loadeddata', () => {
      this.isLoading.set(false);
    });

    this.player.on('error', () => {
      const err = this.player?.error();
      console.warn('[VideoRenderer] Video playback error:', err?.message || 'Unknown error');

      if (err?.code === 4) {
        this.error.set({
          title: t()('video.unsupported_title'),
          detail: t()('video.unsupported_detail', {
            format: videoExt ? videoExt.toUpperCase() : t()('common.unknown_error'),
          }),
        });
      } else {
        this.error.set({
          title: t()('video.load_failed'),
          detail: err?.message || t()('common.unknown_error'),
        });
      }
      this.isLoading.set(false);
    });
  }
}
