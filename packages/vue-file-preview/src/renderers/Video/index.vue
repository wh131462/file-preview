<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { getVideoMimeType } from '@eternalheart/file-preview-core';

type VideoJsPlayer = ReturnType<typeof videojs>;

const props = defineProps<{
  url: string;
}>();

const error = ref<string | null>(null);
const isLoading = ref(true);
const videoContainerRef = ref<HTMLDivElement | null>(null);
let player: VideoJsPlayer | null = null;

const initPlayer = () => {
  if (!videoContainerRef.value || player) return;

  const videoElement = document.createElement('video-js');
  videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-apple');
  videoContainerRef.value.appendChild(videoElement);

  const videoType = getVideoMimeType(props.url);

  const sources =
    videoType === 'video/quicktime'
      ? [
          { src: props.url, type: 'video/quicktime' },
          { src: props.url, type: 'video/mp4' },
        ]
      : [{ src: props.url, type: videoType }];

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
    console.error('Video.js error:', err);
    error.value = `视频加载失败: ${err?.message || '未知错误'}`;
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
  <div v-if="error" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-text-center">
      <div
        class="vfp-w-16 vfp-h-16 vfp-mx-auto vfp-mb-4 vfp-rounded-full vfp-bg-red-500/10 vfp-flex vfp-items-center vfp-justify-center"
      >
        <svg
          class="vfp-w-8 vfp-h-8 vfp-text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <p class="vfp-text-lg vfp-font-medium vfp-text-white/90 vfp-mb-2">视频加载失败</p>
      <p class="vfp-text-sm vfp-text-white/60">{{ error }}</p>
    </div>
  </div>

  <div v-else class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-w-full vfp-h-full vfp-relative">
      <div
        v-if="isLoading"
        class="vfp-absolute vfp-inset-0 vfp-flex vfp-items-center vfp-justify-center vfp-bg-black/20 vfp-backdrop-blur-sm vfp-rounded-2xl vfp-z-10"
      >
        <div class="vfp-text-center">
          <div
            class="vfp-w-12 vfp-h-12 vfp-mx-auto vfp-mb-3 vfp-border-4 vfp-border-white/20 vfp-border-t-white vfp-rounded-full vfp-animate-spin"
          />
          <p class="vfp-text-sm vfp-text-white/70 vfp-font-medium">加载视频中...</p>
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
