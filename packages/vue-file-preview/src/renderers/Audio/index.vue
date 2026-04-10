<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, toRef } from 'vue';
import { Play, Pause, Volume2, VolumeX, Volume1, SkipBack, SkipForward, Repeat } from 'lucide-vue-next';
import { useAudioPlayer } from '../../composables/useAudioPlayer';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const urlRef = toRef(props, 'url');

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
let volumeHideTimer: number | null = null;
const volumeRef = ref<HTMLDivElement | null>(null);

const progress = computed(() => (duration.value > 0 ? currentTime.value / duration.value : 0));

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
</script>

<template>
  <div v-if="error" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-text-white/70 vfp-text-center">
      <p class="vfp-text-lg">{{ error }}</p>
    </div>
  </div>

  <div
    v-else
    class="vfp-flex vfp-flex-col vfp-items-center vfp-justify-center vfp-w-full vfp-h-full vfp-p-4 md:vfp-p-8 vfp-gap-5 md:vfp-gap-8 vfp-select-none"
  >
    <!-- 唱片机 -->
    <div class="vfp-relative" style="width: 260px; height: 240px">
      <!-- 外圈光晕 -->
      <div
        class="vfp-absolute vfp-rounded-full"
        :style="{
          width: '220px',
          height: '220px',
          top: '18px',
          left: '8px',
          background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)',
          opacity: isPlaying ? 0.7 : 0.2,
          transition: 'opacity 0.5s',
        }"
      />

      <!-- 唱片主体 -->
      <div
        class="vfp-absolute vfp-rounded-full vfp-overflow-hidden"
        :style="{
          width: '200px',
          height: '200px',
          top: '28px',
          left: '18px',
          background: `
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
          `,
          boxShadow: isPlaying
            ? '0 0 36px rgba(129,140,248,0.1), 0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.4)',
          animation: 'vfp-vinyl-spin 8s linear infinite',
          animationPlayState: isPlaying ? 'running' : 'paused',
        }"
      >
        <!-- 中心标签 -->
        <div
          class="vfp-absolute vfp-rounded-full"
          :style="{
            width: '34%',
            height: '34%',
            top: '33%',
            left: '33%',
            background: 'radial-gradient(circle at 40% 38%, #818cf8, #6366f1, #4f46e5, #4338ca)',
            boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.25), inset 0 -1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(0,0,0,0.3)',
          }"
        >
          <div
            class="vfp-absolute vfp-rounded-full"
            :style="{
              width: '14%',
              height: '14%',
              top: '43%',
              left: '43%',
              background: 'radial-gradient(circle at 40% 40%, #333, #0d0d0d)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5)',
            }"
          />
        </div>
      </div>

      <!-- 唱臂 -->
      <div
        class="vfp-absolute"
        :style="{
          top: '-6px',
          right: '2px',
          width: '100px',
          height: '120px',
          transformOrigin: '76px 16px',
          zIndex: 5,
          transform: isPlaying ? 'rotate(16deg)' : 'rotate(0deg)',
          transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }"
      >
        <svg width="100" height="120" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="76" cy="16" r="13" fill="rgba(0,0,0,0.3)" />
          <circle cx="76" cy="16" r="11" fill="url(#vfp-baseGrad)" />
          <circle cx="76" cy="16" r="6" fill="url(#vfp-baseInnerGrad)" />
          <circle cx="76" cy="16" r="2.5" fill="#222" stroke="#555" stroke-width="0.5" />
          <path d="M74 22 L56 88" stroke="url(#vfp-armGrad)" stroke-width="3.5" stroke-linecap="round" />
          <rect x="50" y="86" width="12" height="7" rx="1.5" fill="url(#vfp-headGrad)" />
          <rect x="52.5" y="92" width="7" height="9" rx="1" fill="url(#vfp-cartridgeGrad)" />
          <line x1="56" y1="101" x2="56" y2="105" stroke="#bbb" stroke-width="1.2" stroke-linecap="round" />
          <circle cx="56" cy="105.5" r="0.8" fill="#ddd" />

          <defs>
            <radialGradient id="vfp-baseGrad" cx="40%" cy="35%">
              <stop offset="0%" stop-color="#555" />
              <stop offset="100%" stop-color="#1a1a1a" />
            </radialGradient>
            <radialGradient id="vfp-baseInnerGrad" cx="40%" cy="35%">
              <stop offset="0%" stop-color="#666" />
              <stop offset="100%" stop-color="#333" />
            </radialGradient>
            <linearGradient id="vfp-armGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#555" />
              <stop offset="50%" stop-color="#444" />
              <stop offset="100%" stop-color="#333" />
            </linearGradient>
            <linearGradient id="vfp-headGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#555" />
              <stop offset="100%" stop-color="#333" />
            </linearGradient>
            <linearGradient id="vfp-cartridgeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#444" />
              <stop offset="100%" stop-color="#222" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>

    <!-- 文件名 -->
    <div class="vfp-text-center vfp-max-w-sm md:vfp-max-w-md vfp-px-4">
      <div class="vfp-text-lg md:vfp-text-xl vfp-font-medium vfp-mb-1 vfp-truncate" style="color: #e0dff0">
        {{ fileName }}
      </div>
      <p class="vfp-text-xs vfp-tracking-widest vfp-uppercase" style="color: rgba(129,140,248,0.5)">Audio</p>
    </div>

    <!-- 控制面板 -->
    <div
      class="vfp-w-full vfp-max-w-sm md:vfp-max-w-md vfp-rounded-2xl vfp-p-4 md:vfp-p-6 vfp-border"
      :style="{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(129,140,248,0.12)',
      }"
    >
      <!-- 进度条 -->
      <div class="vfp-mb-5">
        <div class="vfp-relative vfp-h-4 vfp-flex vfp-items-center">
          <div
            class="vfp-absolute vfp-w-full vfp-h-[5px] vfp-rounded-full"
            style="background: rgba(255,255,255,0.08)"
          />
          <div
            class="vfp-absolute vfp-h-[5px] vfp-rounded-full vfp-pointer-events-none"
            :style="{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #6366f1, #818cf8)',
              boxShadow: isPlaying ? '0 0 8px rgba(129,140,248,0.4)' : 'none',
              transition: 'width 0.1s linear',
            }"
          />
          <input
            type="range"
            min="0"
            :max="duration > 0 ? duration : currentTime || 100"
            step="any"
            :value="currentTime"
            :disabled="duration <= 0"
            aria-label="播放进度"
            class="audio-slider vfp-absolute vfp-w-full"
            @input="(e) => seek(parseFloat((e.target as HTMLInputElement).value))"
          />
        </div>
        <div
          class="vfp-flex vfp-justify-between vfp-text-xs vfp-mt-2.5"
          style="color: rgba(129,140,248,0.5)"
        >
          <span style="font-variant-numeric: tabular-nums">{{ formatTime(currentTime) }}</span>
          <span style="font-variant-numeric: tabular-nums">{{ duration > 0 ? formatTime(duration) : '--:--' }}</span>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="vfp-flex vfp-items-center vfp-justify-center vfp-gap-3">
        <!-- 循环 -->
        <button
          class="vfp-w-9 vfp-h-9 vfp-rounded-full vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors"
          :style="{
            background: isLoop ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.06)',
            color: isLoop ? '#818cf8' : 'rgba(224,223,240,0.4)',
            border: 0,
            cursor: 'pointer',
          }"
          :aria-label="isLoop ? '关闭循环' : '开启循环'"
          @click="toggleLoop"
        >
          <Repeat class="vfp-w-4 vfp-h-4" />
        </button>

        <!-- 后退 -->
        <button
          class="vfp-w-10 vfp-h-10 vfp-rounded-full vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors"
          :style="{ background: 'rgba(255,255,255,0.06)', color: 'rgba(224,223,240,0.7)', border: 0, cursor: 'pointer' }"
          aria-label="后退10秒"
          @click="skip(-10)"
        >
          <SkipBack class="vfp-w-[18px] vfp-h-[18px]" />
        </button>

        <!-- 播放/暂停 -->
        <button
          class="vfp-w-14 vfp-h-14 vfp-rounded-full vfp-flex vfp-items-center vfp-justify-center"
          :style="{
            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
            border: 0,
            cursor: 'pointer',
          }"
          :aria-label="isPlaying ? '暂停' : '播放'"
          @click="togglePlay"
        >
          <Pause v-if="isPlaying" class="vfp-w-6 vfp-h-6" />
          <Play v-else class="vfp-w-6 vfp-h-6 vfp-ml-0.5" />
        </button>

        <!-- 前进 -->
        <button
          class="vfp-w-10 vfp-h-10 vfp-rounded-full vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors"
          :style="{ background: 'rgba(255,255,255,0.06)', color: 'rgba(224,223,240,0.7)', border: 0, cursor: 'pointer' }"
          aria-label="前进10秒"
          @click="skip(10)"
        >
          <SkipForward class="vfp-w-[18px] vfp-h-[18px]" />
        </button>

        <!-- 音量 -->
        <div ref="volumeRef" class="vfp-relative" @mouseenter="handleVolumeEnter" @mouseleave="handleVolumeLeave">
          <button
            class="vfp-w-9 vfp-h-9 vfp-rounded-full vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors"
            :style="{
              background: showVolume ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.06)',
              color: 'rgba(129,140,248,0.6)',
              border: 0,
              cursor: 'pointer',
            }"
            :aria-label="isMuted ? '取消静音' : '静音'"
            @click="toggleMute"
          >
            <component :is="VolumeIcon" class="vfp-w-4 vfp-h-4" />
          </button>

          <Transition name="vfp-fade">
            <div
              v-if="showVolume"
              class="vfp-absolute vfp-bottom-full vfp-mb-2 vfp-rounded-xl vfp-p-3 vfp-border"
              :style="{
                left: '50%',
                marginLeft: '-27px',
                background: 'rgba(20,20,20,0.95)',
                backdropFilter: 'blur(16px)',
                borderColor: 'rgba(129,140,248,0.15)',
              }"
              @mouseenter="handleVolumeEnter"
              @mouseleave="handleVolumeLeave"
            >
              <div class="vfp-flex vfp-flex-col vfp-items-center vfp-gap-2" style="height: 100px">
                <div
                  class="vfp-relative vfp-flex vfp-items-center vfp-justify-center"
                  style="width: 24px; height: 80px"
                >
                  <div
                    class="vfp-absolute vfp-rounded-full"
                    style="width: 3px; height: 100%; background: rgba(255,255,255,0.1)"
                  />
                  <div
                    class="vfp-absolute vfp-bottom-0 vfp-rounded-full vfp-pointer-events-none"
                    :style="{
                      width: '3px',
                      height: `${(isMuted ? 0 : volume) * 100}%`,
                      background: '#818cf8',
                      transition: 'height 0.1s linear',
                    }"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    :value="isMuted ? 0 : volume"
                    aria-label="音量"
                    class="volume-slider-vertical vfp-absolute"
                    style="width: 80px; height: 24px; transform: rotate(-90deg); transform-origin: center center"
                    @input="(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))"
                  />
                </div>
                <span class="vfp-text-[10px] vfp-tabular-nums" style="color: rgba(129,140,248,0.5)">
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
