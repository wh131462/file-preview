import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioLines, Play, Pause, Volume2, VolumeX, Volume1, SkipBack, SkipForward, Repeat } from 'lucide-react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useTranslator } from '../../i18n/LocaleContext';
import { RendererError } from '../RendererError';
import type { RendererHandle } from '../base.types';

/** 文本溢出时自动横向滚动 */
const MarqueeText: React.FC<{
  text: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ text, className = '', style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [scrollDist, setScrollDist] = useState(0);

  useEffect(() => {
    const check = () => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;
      const cw = container.clientWidth;
      const tw = inner.scrollWidth;
      setOverflow(tw > cw);
      setScrollDist(tw);
    };
    check();
    const observer = new ResizeObserver(check);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text]);

  const gap = 60;
  const totalScroll = scrollDist + gap;
  const dur = totalScroll / 40;

  return (
    <div
      ref={containerRef}
      className={`rfp-overflow-hidden rfp-whitespace-nowrap ${className}`}
      style={style}
    >
      {overflow ? (
        <motion.div
          className="rfp-inline-flex rfp-whitespace-nowrap"
          animate={{ x: [0, -totalScroll] }}
          transition={{ duration: dur, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
        >
          <span>{text}</span>
          <span style={{ width: gap }} className="rfp-inline-block" />
          <span>{text}</span>
        </motion.div>
      ) : null}
      {/* 始终渲染用于测量的隐藏层 */}
      <div
        ref={innerRef}
        className="rfp-whitespace-nowrap"
        style={overflow ? { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' } : undefined}
      >
        {text}
      </div>
    </div>
  );
};

interface AudioRendererProps {
  url: string;
  fileName: string;
}

export const AudioRenderer = forwardRef<RendererHandle, AudioRendererProps>(({ url, fileName }, ref) => {
  const t = useTranslator();
  const {
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
  } = useAudioPlayer({ url });

  const [showVolume, setShowVolume] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const volumeRef = useRef<HTMLDivElement>(null);
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const displayTime = isDragging ? dragTime : currentTime;
  const progress = duration > 0 ? displayTime / duration : 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolume(false);
      }
    };
    if (showVolume) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVolume]);

  const handleVolumeEnter = () => {
    clearTimeout(volumeTimerRef.current);
    setShowVolume(true);
  };

  const handleVolumeLeave = () => {
    volumeTimerRef.current = setTimeout(() => setShowVolume(false), 300);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // 暴露接口给父组件
  useImperativeHandle(ref, () => ({
    getToolbarGroups: () => [],
  }), []);

  if (error) {
    return <RendererError message={error} />;
  }

  return (
    <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-p-4 rfp-select-none rfp-overflow-auto">
      <div
        className="rfp-w-full rfp-max-w-xl rfp-flex-shrink-0 rfp-rounded-lg rfp-border rfp-border-line-weak rfp-bg-surface-1 rfp-p-4"
      >
        <div className="rfp-flex rfp-items-center rfp-gap-3 rfp-mb-4">
          <div
            aria-hidden="true"
            className={`rfp-audio-mark rfp-w-10 rfp-h-10 rfp-flex rfp-items-center rfp-justify-center rfp-rounded-md rfp-flex-shrink-0 ${
              isPlaying ? 'rfp-audio-mark-playing' : ''
            } ${isLoading ? 'rfp-opacity-50' : ''}`}
          >
            <AudioLines className="rfp-w-5 rfp-h-5" />
          </div>
          <div className="rfp-min-w-0 rfp-flex-1">
            <MarqueeText
              text={fileName}
              className="rfp-text-sm rfp-font-medium rfp-text-fg-primary"
            />
          </div>
        </div>

        <div className="rfp-flex rfp-items-center rfp-gap-3 rfp-mb-4">
          <span className="rfp-w-9 rfp-flex-shrink-0 rfp-text-right rfp-text-[11px] rfp-text-fg-tertiary rfp-tabular-nums">
            {formatTime(displayTime)}
          </span>
          <div className="rfp-relative rfp-h-4 rfp-flex rfp-flex-1 rfp-items-center">
            <div className="rfp-absolute rfp-left-[6px] rfp-right-[6px] rfp-h-[3px] rfp-rounded-full rfp-bg-surface-3">
              <div
                className="rfp-h-full rfp-rounded-full rfp-pointer-events-none"
                style={{
                  width: `${progress * 100}%`,
                  background: 'var(--fp-player-progress)',
                  transition: isDragging ? 'none' : 'width 0.1s linear',
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max={duration > 0 ? duration : currentTime || 100}
              step="any"
              value={displayTime}
              onPointerDown={() => {
                setDragTime(currentTime);
                setIsDragging(true);
              }}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (isDragging) {
                  setDragTime(value);
                } else {
                  seek(value);
                }
              }}
              onPointerUp={(e) => {
                const value = parseFloat((e.target as HTMLInputElement).value);
                seek(value);
                setIsDragging(false);
              }}
              onPointerCancel={() => setIsDragging(false)}
              disabled={duration <= 0}
              aria-label={t('audio.aria.progress')}
              className="audio-slider rfp-absolute rfp-w-full"
            />
          </div>
          <span className="rfp-w-9 rfp-flex-shrink-0 rfp-text-[11px] rfp-text-fg-tertiary rfp-tabular-nums">
            {duration > 0 ? formatTime(duration) : '--:--'}
          </span>
        </div>

        <div className="rfp-flex rfp-items-center rfp-gap-1">
          <motion.button
            type="button"
            onClick={togglePlay}
            whileTap={{ scale: 0.97 }}
            title={isPlaying ? t('audio.aria.pause') : t('audio.aria.play')}
            aria-label={isPlaying ? t('audio.aria.pause') : t('audio.aria.play')}
            className="rfp-audio-control rfp-w-10 rfp-h-10 rfp-rounded-md rfp-flex rfp-items-center rfp-justify-center rfp-flex-shrink-0"
            style={{
              background: 'var(--fp-player-progress)',
              color: 'var(--fp-fg-inverse)',
            }}
          >
            {isPlaying ? (
              <Pause className="rfp-w-5 rfp-h-5" />
            ) : (
              <Play className="rfp-w-5 rfp-h-5 rfp-ml-0.5" />
            )}
          </motion.button>

          <motion.button
            type="button"
            onClick={() => skip(-10)}
            whileTap={{ scale: 0.96 }}
            title={t('audio.aria.backward_10')}
            aria-label={t('audio.aria.backward_10')}
            className="rfp-audio-control rfp-w-9 rfp-h-9 rfp-rounded-md rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors rfp-text-fg-secondary hover:rfp-bg-surface-3 rfp-flex-shrink-0"
          >
            <SkipBack className="rfp-w-[18px] rfp-h-[18px]" />
          </motion.button>

          <motion.button
            type="button"
            onClick={() => skip(10)}
            whileTap={{ scale: 0.96 }}
            title={t('audio.aria.forward_10')}
            aria-label={t('audio.aria.forward_10')}
            className="rfp-audio-control rfp-w-9 rfp-h-9 rfp-rounded-md rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors rfp-text-fg-secondary hover:rfp-bg-surface-3 rfp-flex-shrink-0"
          >
            <SkipForward className="rfp-w-[18px] rfp-h-[18px]" />
          </motion.button>

          <div className="rfp-w-px rfp-h-5 rfp-mx-1 rfp-bg-divide" />

          <motion.button
            type="button"
            onClick={toggleLoop}
            whileTap={{ scale: 0.96 }}
            title={isLoop ? t('audio.aria.loop_off') : t('audio.aria.loop_on')}
            aria-label={isLoop ? t('audio.aria.loop_off') : t('audio.aria.loop_on')}
            className={`rfp-audio-control rfp-w-9 rfp-h-9 rfp-rounded-md rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors rfp-flex-shrink-0 ${
              isLoop
                ? 'rfp-bg-surface-3 rfp-text-fg-primary'
                : 'rfp-text-fg-tertiary hover:rfp-bg-surface-3'
            }`}
          >
            <Repeat className="rfp-w-4 rfp-h-4" />
          </motion.button>

          <div className="rfp-flex-1" />

          <div
            ref={volumeRef}
            className="rfp-relative"
            onMouseEnter={handleVolumeEnter}
            onMouseLeave={handleVolumeLeave}
          >
            <motion.button
              type="button"
              onClick={toggleMute}
              whileTap={{ scale: 0.96 }}
              title={isMuted ? t('audio.aria.unmute') : t('audio.aria.mute')}
              aria-label={isMuted ? t('audio.aria.unmute') : t('audio.aria.mute')}
              className={`rfp-audio-control rfp-w-9 rfp-h-9 rfp-rounded-md rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors rfp-flex-shrink-0 ${
                showVolume
                  ? 'rfp-bg-surface-3 rfp-text-fg-primary'
                  : 'rfp-text-fg-secondary hover:rfp-bg-surface-3'
              }`}
            >
              <VolumeIcon className="rfp-w-4 rfp-h-4" />
            </motion.button>

            <AnimatePresence>
              {showVolume && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="rfp-absolute rfp-right-0 rfp-bottom-full rfp-mb-2 rfp-rounded-md rfp-p-3 rfp-border rfp-bg-surface-toolbar rfp-border-line"
                  style={{
                    width: '54px',
                  }}
                  onMouseEnter={handleVolumeEnter}
                  onMouseLeave={handleVolumeLeave}
                >
                  <div className="rfp-flex rfp-flex-col rfp-items-center rfp-gap-2" style={{ height: '100px' }}>
                    <div className="rfp-relative rfp-flex rfp-items-center rfp-justify-center" style={{ width: '24px', height: '80px' }}>
                      <div
                        className="rfp-absolute rfp-rounded-full rfp-bg-surface-2"
                        style={{ width: '3px', height: '100%' }}
                      />
                      <div
                        className="rfp-absolute rfp-bottom-0 rfp-rounded-full rfp-pointer-events-none"
                        style={{
                          width: '3px',
                          height: `${(isMuted ? 0 : volume) * 100}%`,
                          background: 'var(--fp-player-progress)',
                          transition: 'height 0.1s linear',
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        aria-label={t('audio.aria.volume')}
                        className="volume-slider-vertical rfp-absolute"
                        style={{
                          width: '80px',
                          height: '24px',
                          transform: 'rotate(-90deg)',
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>
                    <span className="rfp-text-[10px] rfp-tabular-nums rfp-text-fg-tertiary">
                      {Math.round((isMuted ? 0 : volume) * 100)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={url} className="rfp-hidden" />
    </div>
  );
});
