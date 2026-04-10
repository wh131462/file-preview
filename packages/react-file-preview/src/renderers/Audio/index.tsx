import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Volume1, SkipBack, SkipForward, Repeat } from 'lucide-react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

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

/** SVG 唱臂组件 */
const Tonearm: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => (
  <motion.div
    className="rfp-absolute"
    style={{
      top: '-6px',
      right: '2px',
      width: '100px',
      height: '120px',
      transformOrigin: '76px 16px',
      zIndex: 5,
    }}
    animate={{ rotate: isPlaying ? 16 : 0 }}
    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
  >
    <svg
      width="100"
      height="120"
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 底座阴影 */}
      <circle cx="76" cy="16" r="13" fill="rgba(0,0,0,0.3)" />
      {/* 底座外圈 */}
      <circle cx="76" cy="16" r="11" fill="url(#baseGrad)" />
      {/* 底座内圈 */}
      <circle cx="76" cy="16" r="6" fill="url(#baseInnerGrad)" />
      {/* 底座中心轴 */}
      <circle cx="76" cy="16" r="2.5" fill="#222" stroke="#555" strokeWidth="0.5" />

      {/* 臂杆 */}
      <path
        d="M74 22 L56 88"
        stroke="url(#armGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* 臂杆高光 */}
      <path
        d="M74.8 22 L56.8 88"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* 唱头座 (Headshell) */}
      <rect x="50" y="86" width="12" height="7" rx="1.5" fill="url(#headGrad)" />
      {/* 唱头 (Cartridge) */}
      <rect x="52.5" y="92" width="7" height="9" rx="1" fill="url(#cartridgeGrad)" />
      {/* 唱针 (Stylus) */}
      <line x1="56" y1="101" x2="56" y2="105" stroke="#bbb" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="56" cy="105.5" r="0.8" fill="#ddd" />

      {/* 渐变定义 */}
      <defs>
        <radialGradient id="baseGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#555" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </radialGradient>
        <radialGradient id="baseInnerGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#666" />
          <stop offset="100%" stopColor="#333" />
        </radialGradient>
        <linearGradient id="armGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#555" />
          <stop offset="50%" stopColor="#444" />
          <stop offset="100%" stopColor="#333" />
        </linearGradient>
        <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#555" />
          <stop offset="100%" stopColor="#333" />
        </linearGradient>
        <linearGradient id="cartridgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#444" />
          <stop offset="100%" stopColor="#222" />
        </linearGradient>
      </defs>
    </svg>
  </motion.div>
);

interface AudioRendererProps {
  url: string;
  fileName: string;
}

export const AudioRenderer: React.FC<AudioRendererProps> = ({ url, fileName }) => {
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
  const volumeRef = useRef<HTMLDivElement>(null);
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const progress = duration > 0 ? currentTime / duration : 0;

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

  if (error) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-white/70 rfp-text-center">
          <p className="rfp-text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rfp-flex rfp-flex-col rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-p-4 md:rfp-p-8 rfp-gap-5 md:rfp-gap-8 rfp-select-none">
      {/* 唱片机整体 */}
      <div className="rfp-relative" style={{ width: '260px', height: '240px' }}>
        {/* 外圈光晕 */}
        <motion.div
          className="rfp-absolute rfp-rounded-full"
          style={{
            width: '220px',
            height: '220px',
            top: '18px',
            left: '8px',
            background: 'radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)',
          }}
          animate={isPlaying ? { scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 0.2 }}
          transition={isPlaying ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.5 }}
        />

        {/* 唱片主体 */}
        <div
          className="rfp-absolute rfp-rounded-full rfp-overflow-hidden"
          style={{
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
            animation: 'rfp-vinyl-spin 8s linear infinite',
            animationPlayState: isPlaying ? 'running' : 'paused',
          }}
        >
          {/* 中心标签 */}
          <div
            className="rfp-absolute rfp-rounded-full"
            style={{
              width: '34%',
              height: '34%',
              top: '33%',
              left: '33%',
              background: 'radial-gradient(circle at 40% 38%, #818cf8, #6366f1, #4f46e5, #4338ca)',
              boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.25), inset 0 -1px 3px rgba(0,0,0,0.3), 0 0 8px rgba(0,0,0,0.3)',
            }}
          >
            <div
              className="rfp-absolute rfp-inset-0 rfp-rounded-full rfp-opacity-20"
              style={{
                background: `
                  radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.3) 31%, transparent 32%),
                  radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.2) 51%, transparent 52%),
                  radial-gradient(circle at center, transparent 70%, rgba(0,0,0,0.3) 71%, transparent 72%),
                  radial-gradient(circle at center, transparent 88%, rgba(0,0,0,0.2) 89%, transparent 90%)
                `,
              }}
            />
            <div
              className="rfp-absolute rfp-rounded-full"
              style={{
                width: '14%',
                height: '14%',
                top: '43%',
                left: '43%',
                background: 'radial-gradient(circle at 40% 40%, #333, #0d0d0d)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.5)',
              }}
            />
          </div>

          {isLoading && (
            <motion.div
              className="rfp-absolute rfp-inset-0 rfp-rounded-full"
              style={{ border: '2px solid rgba(129,140,248,0.3)' }}
              animate={{ scale: [1, 1.02, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        {/* 唱臂 */}
        <Tonearm isPlaying={isPlaying} />
      </div>

      {/* 文件名 */}
      <div className="rfp-text-center rfp-max-w-sm md:rfp-max-w-md rfp-px-4">
        <MarqueeText text={fileName} className="rfp-text-lg md:rfp-text-xl rfp-font-medium rfp-mb-1" style={{ color: '#e0dff0' }} />
        <p className="rfp-text-xs rfp-tracking-widest rfp-uppercase" style={{ color: 'rgba(129,140,248,0.5)' }}>
          Audio
        </p>
      </div>

      {/* 控制面板 */}
      <div
        className="rfp-w-full rfp-max-w-sm md:rfp-max-w-md rfp-rounded-2xl rfp-p-4 md:rfp-p-6 rfp-border"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(129,140,248,0.12)',
        }}
      >
        {/* 进度条 */}
        <div className="rfp-mb-5">
          <div className="rfp-relative rfp-h-4 rfp-flex rfp-items-center">
            <div className="rfp-absolute rfp-w-full rfp-h-[5px] rfp-rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div
              className="rfp-absolute rfp-h-[5px] rfp-rounded-full rfp-pointer-events-none"
              style={{
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                boxShadow: isPlaying ? '0 0 8px rgba(129,140,248,0.4)' : 'none',
                transition: 'width 0.1s linear',
              }}
            />
            <input
              type="range"
              min="0"
              max={duration > 0 ? duration : currentTime || 100}
              step="any"
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              disabled={duration <= 0}
              aria-label="播放进度"
              className="audio-slider rfp-absolute rfp-w-full"
            />
          </div>
          <div className="rfp-flex rfp-justify-between rfp-text-xs rfp-mt-2.5" style={{ color: 'rgba(129,140,248,0.5)' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(currentTime)}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="rfp-flex rfp-items-center rfp-justify-center rfp-gap-3">
          {/* 循环 */}
          <motion.button
            onClick={toggleLoop}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            aria-label={isLoop ? '关闭循环' : '开启循环'}
            className="rfp-w-9 rfp-h-9 rfp-rounded-full rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors"
            style={{
              background: isLoop ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.06)',
              color: isLoop ? '#818cf8' : 'rgba(224,223,240,0.4)',
            }}
          >
            <Repeat className="rfp-w-4 rfp-h-4" />
          </motion.button>

          {/* 后退 */}
          <motion.button
            onClick={() => skip(-10)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            aria-label="后退10秒"
            className="rfp-w-10 rfp-h-10 rfp-rounded-full rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(224,223,240,0.7)' }}
          >
            <SkipBack className="rfp-w-[18px] rfp-h-[18px]" />
          </motion.button>

          {/* 播放/暂停 */}
          <motion.button
            onClick={togglePlay}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            aria-label={isPlaying ? '暂停' : '播放'}
            className="rfp-w-14 rfp-h-14 rfp-rounded-full rfp-flex rfp-items-center rfp-justify-center"
            style={{
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
            }}
          >
            {isPlaying ? (
              <Pause className="rfp-w-6 rfp-h-6" />
            ) : (
              <Play className="rfp-w-6 rfp-h-6 rfp-ml-0.5" />
            )}
          </motion.button>

          {/* 前进 */}
          <motion.button
            onClick={() => skip(10)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            aria-label="前进10秒"
            className="rfp-w-10 rfp-h-10 rfp-rounded-full rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(224,223,240,0.7)' }}
          >
            <SkipForward className="rfp-w-[18px] rfp-h-[18px]" />
          </motion.button>

          {/* 音量 */}
          <div
            ref={volumeRef}
            className="rfp-relative"
            onMouseEnter={handleVolumeEnter}
            onMouseLeave={handleVolumeLeave}
          >
            <motion.button
              onClick={toggleMute}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              aria-label={isMuted ? '取消静音' : '静音'}
              className="rfp-w-9 rfp-h-9 rfp-rounded-full rfp-flex rfp-items-center rfp-justify-center rfp-transition-colors"
              style={{
                background: showVolume ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.06)',
                color: 'rgba(129,140,248,0.6)',
              }}
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
                  className="rfp-absolute rfp-bottom-full rfp-mb-2 rfp-rounded-xl rfp-p-3 rfp-border"
                  style={{
                    left: '50%',
                    marginLeft: '-27px',
                    background: 'rgba(20,20,20,0.95)',
                    backdropFilter: 'blur(16px)',
                    borderColor: 'rgba(129,140,248,0.15)',
                  }}
                  onMouseEnter={handleVolumeEnter}
                  onMouseLeave={handleVolumeLeave}
                >
                  <div className="rfp-flex rfp-flex-col rfp-items-center rfp-gap-2" style={{ height: '100px' }}>
                    <div className="rfp-relative rfp-flex rfp-items-center rfp-justify-center" style={{ width: '24px', height: '80px' }}>
                      <div
                        className="rfp-absolute rfp-rounded-full"
                        style={{ width: '3px', height: '100%', background: 'rgba(255,255,255,0.1)' }}
                      />
                      <div
                        className="rfp-absolute rfp-bottom-0 rfp-rounded-full rfp-pointer-events-none"
                        style={{
                          width: '3px',
                          height: `${(isMuted ? 0 : volume) * 100}%`,
                          background: '#818cf8',
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
                        aria-label="音量"
                        className="volume-slider-vertical rfp-absolute"
                        style={{
                          width: '80px',
                          height: '24px',
                          transform: 'rotate(-90deg)',
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>
                    <span className="rfp-text-[10px] rfp-tabular-nums" style={{ color: 'rgba(129,140,248,0.5)' }}>
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
};
