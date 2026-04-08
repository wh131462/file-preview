import { ref, watch, onUnmounted, type Ref } from 'vue';
import { formatTime } from '@eternalheart/file-preview-core';

/**
 * Vue 3 版本的音频播放器 composable
 * 与 React 版的 useAudioPlayer 行为对齐
 */
export function useAudioPlayer(url: Ref<string>) {
  const audioRef = ref<HTMLAudioElement | null>(null);
  const isPlaying = ref(false);
  const isLoading = ref(true);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(1);
  const isMuted = ref(false);
  const isLoop = ref(false);
  const error = ref<string | null>(null);

  let cleanup: (() => void) | null = null;

  const bindEvents = () => {
    const audio = audioRef.value;
    if (!audio) return;

    isLoading.value = true;
    error.value = null;

    const onTimeUpdate = () => {
      if (!isNaN(audio.currentTime)) {
        currentTime.value = audio.currentTime;
      }
    };

    const onDurationChange = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        duration.value = audio.duration;
      }
    };

    const onCanPlay = () => {
      isLoading.value = false;
      onDurationChange();
    };

    const onWaiting = () => {
      isLoading.value = true;
    };
    const onPlaying = () => {
      isLoading.value = false;
      isPlaying.value = true;
    };

    const onPlay = () => {
      isPlaying.value = true;
    };
    const onPause = () => {
      isPlaying.value = false;
    };
    const onEnded = () => {
      isPlaying.value = false;
    };

    const onError = () => {
      error.value = '音频加载失败';
      isLoading.value = false;
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDurationChange);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    if (audio.readyState >= 3) {
      isLoading.value = false;
      onDurationChange();
    } else if (audio.readyState >= 1) {
      onDurationChange();
    }

    cleanup = () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDurationChange);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  };

  // url 变化时重新绑定
  watch(
    url,
    () => {
      cleanup?.();
      cleanup = null;
      // 等待 DOM 更新（audio src 变化）
      requestAnimationFrame(() => bindEvents());
    },
    { flush: 'post' }
  );

  // 在 audioRef 挂载后首次绑定
  watch(
    audioRef,
    (el) => {
      if (el) bindEvents();
    },
    { flush: 'post' }
  );

  onUnmounted(() => {
    cleanup?.();
    cleanup = null;
  });

  const togglePlay = () => {
    const audio = audioRef.value;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const seek = (time: number) => {
    const audio = audioRef.value;
    if (!audio) return;
    audio.currentTime = time;
    currentTime.value = time;
  };

  const skip = (seconds: number) => {
    const audio = audioRef.value;
    if (!audio) return;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.currentTime + seconds, audio.duration || Infinity)
    );
  };

  const setVolume = (vol: number) => {
    const audio = audioRef.value;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(1, vol));
    audio.volume = clamped;
    volume.value = clamped;
    if (clamped > 0) {
      audio.muted = false;
      isMuted.value = false;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.value;
    if (!audio) return;
    audio.muted = !audio.muted;
    isMuted.value = audio.muted;
  };

  const toggleLoop = () => {
    const audio = audioRef.value;
    if (!audio) return;
    const next = !audio.loop;
    audio.loop = next;
    isLoop.value = next;
  };

  return {
    audioRef,
    isPlaying,
    isLoading,
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
  };
}
