<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { getVideoMimeType } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import RendererError from '../RendererError.vue';

type VideoJsPlayer = ReturnType<typeof videojs>;

const props = defineProps<{
  url: string;
  fileName?: string;
}>();

const { t } = useTranslator();

interface ErrorState {
  title: string;
  detail: string;
}

// 浏览器原生不支持的视频容器（无论编码，<video> 都无法播放）
const BROWSER_UNSUPPORTED_EXTS = new Set(['avi', 'wmv', 'flv']);

const error = ref<ErrorState | null>(null);
const isLoading = ref(true);
const videoContainerRef = ref<HTMLDivElement | null>(null);
let player: VideoJsPlayer | null = null;

const getVideoExt = (url: string, fileName?: string): string => {
  const source = fileName || url;
  return source.split('.').pop()?.toLowerCase().split('?')[0] || '';
};

const initPlayer = () => {
  if (!videoContainerRef.value || player) return;

  const videoExt = getVideoExt(props.url, props.fileName);

  // 已知浏览器不支持的容器：跳过 videojs 初始化，直接展示友好提示
  if (BROWSER_UNSUPPORTED_EXTS.has(videoExt)) {
    error.value = {
      title: t.value('video.unsupported_title'),
      detail: t.value('video.unsupported_detail', { format: videoExt.toUpperCase() }),
    };
    isLoading.value = false;
    return;
  }

  const videoElement = document.createElement('video-js');
  videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-apple');
  videoContainerRef.value.appendChild(videoElement);

  const videoType = getVideoMimeType(props.url);

  // 为特定格式提供多个 MIME 类型作为备用
  let sources: Array<{ src: string; type: string }>;

  if (videoType === 'video/quicktime') {
    // MOV 格式 fallback
    sources = [
      { src: props.url, type: 'video/quicktime' },
      { src: props.url, type: 'video/mp4' }
    ];
  } else {
    sources = [{ src: props.url, type: videoType }];
  }

  player = videojs(videoElement, {
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

  const videoEl = player.el().querySelector('video');
  if (videoEl) {
    (videoEl as HTMLVideoElement).style.objectFit = 'contain';
  }

  player.on('loadeddata', () => {
    isLoading.value = false;
  });

  player.on('error', () => {
    const err = player?.error();
    console.warn('[VideoRenderer] Video playback error:', err?.message || 'Unknown error');

    // MEDIA_ERR_SRC_NOT_SUPPORTED（code=4）：编码或容器层面浏览器解不了
    if (err?.code === 4) {
      error.value = {
        title: t.value('video.unsupported_title'),
        detail: t.value('video.unsupported_detail', {
          format: videoExt ? videoExt.toUpperCase() : t.value('common.unknown_error'),
        }),
      };
    } else {
      error.value = {
        title: t.value('video.load_failed'),
        detail: err?.message || t.value('common.unknown_error'),
      };
    }
    isLoading.value = false;
  });
};

onMounted(initPlayer);

watch(
  () => props.url,
  () => {
    if (player && !player.isDisposed()) {
      player.src({ src: props.url, type: getVideoMimeType(props.url) });
    }
  }
);

onBeforeUnmount(() => {
  if (player && !player.isDisposed()) {
    player.dispose();
    player = null;
  }
});
</script>

<template>
  <RendererError v-if="error" :message="error.title" :detail="error.detail" />

  <div v-else class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-w-full vfp-h-full vfp-relative">
      <div
        v-if="isLoading"
        class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-bg-surface-3 vfp-backdrop-blur-sm vfp-z-10"
      >
        <div class="vfp-text-center">
          <div
            class="vfp-w-12 vfp-h-12 vfp-mx-auto vfp-mb-3 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
          />
          <p class="vfp-text-sm vfp-text-fg-secondary vfp-font-medium">{{ t('video.loading') }}</p>
        </div>
      </div>

      <div
        ref="videoContainerRef"
        class="vfp-overflow-hidden vfp-w-full vfp-h-full"
        style="box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)"
      />
    </div>
  </div>
</template>
