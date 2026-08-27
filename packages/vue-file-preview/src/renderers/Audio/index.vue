<script setup lang="ts">
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

import { ref, computed, onMounted, onBeforeUnmount, toRef } from 'vue';
import { AudioLines, Play, Pause, Volume2, VolumeX, Volume1, SkipBack, SkipForward, Repeat } from 'lucide-vue-next';
import { useAudioPlayer } from '../../composables/useAudioPlayer';
import { useTranslator } from '../../composables/useTranslator';
import RendererError from '../RendererError.vue';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const urlRef = toRef(props, 'url');
const { t } = useTranslator();

const {
  audioRef,
  isPlaying,
  isLoop,
  currentTime,
  duration,
  volume,
  isMuted,
  error,
  togglePlay,
  seek,
  skip,
  setVolume,
  toggleMute,
  toggleLoop,
  formatTime,
} = useAudioPlayer(urlRef);

const showVolume = ref(false);
const isDragging = ref(false);
const dragTime = ref(0);
const volumeRef = ref<HTMLDivElement | null>(null);
let volumeHideTimer: number | null = null;

const displayTime = computed(() => (isDragging.value ? dragTime.value : currentTime.value));
const progress = computed(() => (duration.value > 0 ? displayTime.value / duration.value : 0));

const VolumeIcon = computed(() => {
  if (isMuted.value || volume.value === 0) return VolumeX;
  if (volume.value < 0.5) return Volume1;
  return Volume2;
});

const handleClickOutside = (e: MouseEvent) => {
  if (volumeRef.value && !volumeRef.value.contains(e.target as Node)) {
    showVolume.value = false;
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  if (volumeHideTimer !== null) clearTimeout(volumeHideTimer);
});

const handleVolumeEnter = () => {
  if (volumeHideTimer !== null) clearTimeout(volumeHideTimer);
  showVolume.value = true;
};

const handleVolumeLeave = () => {
  volumeHideTimer = window.setTimeout(() => {
    showVolume.value = false;
  }, 300);
};

const getToolbarGroups = (): ToolbarGroup[] => [];

defineExpose<RendererHandle>({
  getToolbarGroups,
});
</script>

<template>
  <RendererError v-if="error" :message="error" />

  <div
    v-else
    class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full vfp-p-4 vfp-select-none vfp-overflow-auto"
  >
    <div
      class="vfp-w-full vfp-max-w-xl vfp-flex-shrink-0 vfp-rounded-lg vfp-border vfp-border-line-weak vfp-bg-surface-1 vfp-p-4"
    >
      <div class="vfp-flex vfp-items-center vfp-gap-3 vfp-mb-4">
        <div
          aria-hidden="true"
          :class="[
            'vfp-audio-mark vfp-w-10 vfp-h-10 vfp-flex vfp-items-center vfp-justify-center vfp-rounded-md vfp-flex-shrink-0',
            isPlaying ? 'vfp-audio-mark-playing' : '',
          ]"
        >
          <AudioLines class="vfp-w-5 vfp-h-5" />
        </div>
        <div class="vfp-min-w-0 vfp-flex-1 vfp-truncate vfp-text-sm vfp-font-medium vfp-text-fg-primary">
          {{ fileName }}
        </div>
      </div>

      <div class="vfp-flex vfp-items-center vfp-gap-3 vfp-mb-4">
        <span class="vfp-w-9 vfp-flex-shrink-0 vfp-text-right vfp-text-[11px] vfp-text-fg-tertiary vfp-tabular-nums">
          {{ formatTime(displayTime) }}
        </span>
        <div class="vfp-relative vfp-h-4 vfp-flex vfp-flex-1 vfp-items-center">
          <div class="vfp-absolute vfp-left-[6px] vfp-right-[6px] vfp-h-[3px] vfp-rounded-full vfp-bg-surface-3">
            <div
              class="vfp-h-full vfp-rounded-full vfp-pointer-events-none"
              :style="{
                width: `${progress * 100}%`,
                background: 'var(--fp-player-progress)',
                transition: isDragging ? 'none' : 'width 0.1s linear',
              }"
            />
          </div>
          <input
            type="range"
            min="0"
            :max="duration > 0 ? duration : currentTime || 100"
            step="any"
            :value="displayTime"
            :disabled="duration <= 0"
            :aria-label="t('audio.aria.progress')"
            class="audio-slider vfp-absolute vfp-w-full"
            @pointerdown="() => { dragTime = currentTime; isDragging = true; }"
            @input="(e) => {
              const value = parseFloat((e.target as HTMLInputElement).value);
              if (isDragging) {
                dragTime = value;
              } else {
                seek(value);
              }
            }"
            @pointerup="(e) => {
              const value = parseFloat((e.target as HTMLInputElement).value);
              seek(value);
              isDragging = false;
            }"
            @pointercancel="isDragging = false"
          />
        </div>
        <span class="vfp-w-9 vfp-flex-shrink-0 vfp-text-[11px] vfp-text-fg-tertiary vfp-tabular-nums">
          {{ duration > 0 ? formatTime(duration) : '--:--' }}
        </span>
      </div>

      <div class="vfp-flex vfp-items-center vfp-gap-1">
        <button
          type="button"
          class="vfp-audio-control vfp-w-10 vfp-h-10 vfp-rounded-md vfp-flex vfp-items-center vfp-justify-center vfp-flex-shrink-0"
          :style="{
            background: 'var(--fp-player-progress)',
            color: 'var(--fp-fg-inverse)',
          }"
          :title="isPlaying ? t('audio.aria.pause') : t('audio.aria.play')"
          :aria-label="isPlaying ? t('audio.aria.pause') : t('audio.aria.play')"
          @click="togglePlay"
        >
          <Pause v-if="isPlaying" class="vfp-w-5 vfp-h-5" />
          <Play v-else class="vfp-w-5 vfp-h-5 vfp-ml-0.5" />
        </button>

        <button
          type="button"
          class="vfp-audio-control vfp-w-9 vfp-h-9 vfp-rounded-md vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors vfp-text-fg-secondary hover:vfp-bg-surface-3 vfp-flex-shrink-0"
          :title="t('audio.aria.backward_10')"
          :aria-label="t('audio.aria.backward_10')"
          @click="skip(-10)"
        >
          <SkipBack class="vfp-w-[18px] vfp-h-[18px]" />
        </button>

        <button
          type="button"
          class="vfp-audio-control vfp-w-9 vfp-h-9 vfp-rounded-md vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors vfp-text-fg-secondary hover:vfp-bg-surface-3 vfp-flex-shrink-0"
          :title="t('audio.aria.forward_10')"
          :aria-label="t('audio.aria.forward_10')"
          @click="skip(10)"
        >
          <SkipForward class="vfp-w-[18px] vfp-h-[18px]" />
        </button>

        <div class="vfp-w-px vfp-h-5 vfp-mx-1 vfp-bg-divide" />

        <button
          type="button"
          :class="[
            'vfp-audio-control vfp-w-9 vfp-h-9 vfp-rounded-md vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors vfp-flex-shrink-0',
            isLoop
              ? 'vfp-bg-surface-3 vfp-text-fg-primary'
              : 'vfp-text-fg-tertiary hover:vfp-bg-surface-3',
          ]"
          :title="isLoop ? t('audio.aria.loop_off') : t('audio.aria.loop_on')"
          :aria-label="isLoop ? t('audio.aria.loop_off') : t('audio.aria.loop_on')"
          @click="toggleLoop"
        >
          <Repeat class="vfp-w-4 vfp-h-4" />
        </button>

        <div class="vfp-flex-1" />

        <div ref="volumeRef" class="vfp-relative" @mouseenter="handleVolumeEnter" @mouseleave="handleVolumeLeave">
          <button
            type="button"
            :class="[
              'vfp-audio-control vfp-w-9 vfp-h-9 vfp-rounded-md vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors vfp-flex-shrink-0',
              showVolume
                ? 'vfp-bg-surface-3 vfp-text-fg-primary'
                : 'vfp-text-fg-secondary hover:vfp-bg-surface-3',
            ]"
            :title="isMuted ? t('audio.aria.unmute') : t('audio.aria.mute')"
            :aria-label="isMuted ? t('audio.aria.unmute') : t('audio.aria.mute')"
            @click="toggleMute"
          >
            <component :is="VolumeIcon" class="vfp-w-4 vfp-h-4" />
          </button>

          <Transition name="vfp-fade">
            <div
              v-if="showVolume"
              class="vfp-absolute vfp-right-0 vfp-bottom-full vfp-mb-2 vfp-w-[54px] vfp-rounded-md vfp-p-3 vfp-border vfp-bg-surface-toolbar vfp-border-line"
              @mouseenter="handleVolumeEnter"
              @mouseleave="handleVolumeLeave"
            >
              <div class="vfp-flex vfp-flex-col vfp-items-center vfp-gap-2" style="height: 100px">
                <div class="vfp-relative vfp-flex vfp-items-center vfp-justify-center" style="width: 24px; height: 80px">
                  <div class="vfp-absolute vfp-rounded-full vfp-bg-surface-2" style="width: 3px; height: 100%" />
                  <div
                    class="vfp-absolute vfp-bottom-0 vfp-rounded-full vfp-pointer-events-none"
                    :style="{
                      width: '3px',
                      height: `${(isMuted ? 0 : volume) * 100}%`,
                      background: 'var(--fp-player-progress)',
                      transition: 'height 0.1s linear',
                    }"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    :value="isMuted ? 0 : volume"
                    :aria-label="t('audio.aria.volume')"
                    class="volume-slider-vertical vfp-absolute"
                    style="width: 80px; height: 24px; transform: rotate(-90deg); transform-origin: center center"
                    @input="(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))"
                  />
                </div>
                <span class="vfp-text-[10px] vfp-tabular-nums vfp-text-fg-tertiary">
                  {{ Math.round((isMuted ? 0 : volume) * 100) }}
                </span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <audio ref="audioRef" :src="url" class="vfp-hidden" />
  </div>
</template>
