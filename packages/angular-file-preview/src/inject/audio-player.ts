import { DestroyRef, inject, signal } from '@angular/core';
import { formatTime } from '@eternalheart/file-preview-core';

export function injectAudioPlayer() {
  const audioEl = signal<HTMLAudioElement | null>(null);
  const isPlaying = signal(false);
  const isLoading = signal(true);
  const currentTime = signal(0);
  const duration = signal(0);
  const volume = signal(1);
  const isMuted = signal(false);
  const isLoop = signal(false);
  const error = signal<string | null>(null);

  let cleanup: (() => void) | null = null;

  const bindEvents = () => {
    cleanup?.();
    cleanup = null;
    const audio = audioEl();
    if (!audio) return;

    isLoading.set(true);
    error.set(null);

    const onTimeUpdate = () => {
      if (!isNaN(audio.currentTime)) currentTime.set(audio.currentTime);
    };
    const onDurationChange = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) duration.set(audio.duration);
    };
    const onCanPlay = () => {
      isLoading.set(false);
      onDurationChange();
    };
    const onWaiting = () => isLoading.set(true);
    const onPlaying = () => {
      isLoading.set(false);
      isPlaying.set(true);
    };
    const onPlay = () => isPlaying.set(true);
    const onPause = () => isPlaying.set(false);
    const onEnded = () => isPlaying.set(false);
    const onError = () => {
      error.set('音频加载失败');
      isLoading.set(false);
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
      isLoading.set(false);
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

  inject(DestroyRef).onDestroy(() => {
    cleanup?.();
    cleanup = null;
  });

  const setAudioEl = (el: HTMLAudioElement | null) => {
    audioEl.set(el);
    requestAnimationFrame(() => bindEvents());
  };

  const togglePlay = () => {
    const audio = audioEl();
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const seek = (time: number) => {
    const audio = audioEl();
    if (!audio) return;
    audio.currentTime = time;
    currentTime.set(time);
  };

  const skip = (seconds: number) => {
    const audio = audioEl();
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration || Infinity));
  };

  const setVolume = (vol: number) => {
    const audio = audioEl();
    if (!audio) return;
    const clamped = Math.max(0, Math.min(1, vol));
    audio.volume = clamped;
    volume.set(clamped);
    if (clamped > 0) {
      audio.muted = false;
      isMuted.set(false);
    }
  };

  const toggleMute = () => {
    const audio = audioEl();
    if (!audio) return;
    audio.muted = !audio.muted;
    isMuted.set(audio.muted);
  };

  const toggleLoop = () => {
    const audio = audioEl();
    if (!audio) return;
    const next = !audio.loop;
    audio.loop = next;
    isLoop.set(next);
  };

  return {
    audioEl,
    setAudioEl,
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
    rebind: bindEvents,
  };
}
