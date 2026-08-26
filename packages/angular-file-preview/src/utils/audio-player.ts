import { signal } from '@angular/core';
import { formatTime } from '../fp-core';

export function createAudioPlayer() {
  const isPlaying = signal(false);
  const isLoading = signal(true);
  const currentTime = signal(0);
  const duration = signal(0);
  const volume = signal(1);
  const isMuted = signal(false);
  const isLoop = signal(false);
  const error = signal<string | null>(null);
  let audio: HTMLAudioElement | null = null;
  let unbind: (() => void) | null = null;

  const bind = (el: HTMLAudioElement | null) => {
    unbind?.();
    unbind = null;
    audio = el;
    if (!el) return;

    isLoading.set(true);
    error.set(null);

    const onTimeUpdate = () => {
      if (!isNaN(el.currentTime)) currentTime.set(el.currentTime);
    };
    const onDurationChange = () => {
      if (!isNaN(el.duration) && isFinite(el.duration)) duration.set(el.duration);
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
      error.set('audio.load_failed');
      isLoading.set(false);
    };

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onDurationChange);
    el.addEventListener('durationchange', onDurationChange);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);

    if (el.readyState >= 3) {
      isLoading.set(false);
      onDurationChange();
    }

    unbind = () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onDurationChange);
      el.removeEventListener('durationchange', onDurationChange);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
    };
  };

  const togglePlay = () => {
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const seek = (time: number) => {
    if (!audio) return;
    audio.currentTime = time;
    currentTime.set(time);
  };

  const skip = (seconds: number) => {
    if (!audio) return;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.currentTime + seconds, audio.duration || Infinity),
    );
    currentTime.set(audio.currentTime);
  };

  const setVolume = (v: number) => {
    volume.set(v);
    if (audio) audio.volume = v;
    if (v > 0 && isMuted()) {
      isMuted.set(false);
      if (audio) audio.muted = false;
    }
  };

  const toggleMute = () => {
    const next = !isMuted();
    isMuted.set(next);
    if (audio) audio.muted = next;
  };

  const toggleLoop = () => {
    const next = !isLoop();
    isLoop.set(next);
    if (audio) audio.loop = next;
  };

  const formattedCurrent = () => formatTime(currentTime());
  const formattedDuration = () => formatTime(duration());

  const destroy = () => {
    unbind?.();
    unbind = null;
    audio = null;
  };

  return {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoop,
    error,
    bind,
    togglePlay,
    seek,
    skip,
    setVolume,
    toggleMute,
    toggleLoop,
    formattedCurrent,
    formattedDuration,
    destroy,
  };
}
