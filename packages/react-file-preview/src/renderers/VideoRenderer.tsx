import { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

type VideoJsPlayer = ReturnType<typeof videojs>;

interface VideoRendererProps {
  url: string;
}

// 根据 URL 获取视频 MIME 类型
const getVideoType = (url: string): string => {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  const typeMap: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    mov: 'video/quicktime', // MOV 使用 QuickTime MIME 类型
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    m4v: 'video/mp4',
    '3gp': 'video/3gpp',
    flv: 'video/x-flv',
  };
  return typeMap[ext] || 'video/mp4';
};

export const VideoRenderer: React.FC<VideoRendererProps> = ({ url }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);

  useEffect(() => {
    // 确保 Video.js 播放器只初始化一次
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-apple');
      videoRef.current.appendChild(videoElement);

      const videoType = getVideoType(url);

      // 为 MOV 格式提供多个 MIME 类型作为备用
      const sources = videoType === 'video/quicktime'
        ? [
          { src: url, type: 'video/quicktime' },
          { src: url, type: 'video/mp4' } // 备用方案
        ]
        : [{ src: url, type: videoType }];

      const player = videojs(videoElement, {
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
            'fullscreenToggle'
          ],
          volumePanel: {
            inline: false
          }
        },
        html5: {
          vhs: {
            overrideNative: true
          },
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false
        },
        sources
      });

      // 确保视频保持比例
      const videoEl = player.el().querySelector('video');
      if (videoEl) {
        (videoEl as HTMLVideoElement).style.objectFit = 'contain';
      }

      // 监听加载完成
      player.on('loadeddata', () => {
        setIsLoading(false);
      });

      player.on('error', () => {
        const error = player.error();
        console.error('Video.js error:', error);
        setError(`视频加载失败: ${error?.message || '未知错误'}`);
        setIsLoading(false);
      });

      playerRef.current = player;
    }
  }, [url]);

  // 清理函数
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-center">
          <div className="rfp-w-16 rfp-h-16 rfp-mx-auto rfp-mb-4 rfp-rounded-full rfp-bg-red-500/10 rfp-flex rfp-items-center rfp-justify-center">
            <svg className="rfp-w-8 rfp-h-8 rfp-text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="rfp-text-lg rfp-font-medium rfp-text-white/90 rfp-mb-2">视频加载失败</p>
          <p className="rfp-text-sm rfp-text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
      <div className="rfp-w-full rfp-h-full rfp-relative">
        {/* 加载状态 */}
        {isLoading && (
          <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-black/20 rfp-backdrop-blur-sm rfp-rounded-2xl rfp-z-10">
            <div className="rfp-text-center">
              <div className="rfp-w-12 rfp-h-12 rfp-mx-auto rfp-mb-3 rfp-border-3 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
              <p className="rfp-text-sm rfp-text-white/70 rfp-font-medium">加载视频中...</p>
            </div>
          </div>
        )}

        {/* 视频播放器容器 */}
        <div
          ref={videoRef}
          className="rfp-overflow-hidden rfp-w-full rfp-h-full [&_video]:rfp-object-contain"
          style={{
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          }}
        />
      </div>
    </div>
  );
};
