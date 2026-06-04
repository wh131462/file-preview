import { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { useTranslator } from '../../i18n/LocaleContext';
import { RendererError } from '../RendererError';

type VideoJsPlayer = ReturnType<typeof videojs>;

interface VideoRendererProps {
  url: string;
  fileName?: string;
}

// 浏览器原生不支持的视频容器（无论编码，<video> 都无法播放）
// — 这些扩展名直接短路 videojs 初始化，给出明确提示
const BROWSER_UNSUPPORTED_EXTS = new Set(['avi', 'wmv', 'flv']);

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

// 获取视频文件扩展名（优先用文件名，blob/HTTP URL 都拿不到真扩展名）
const getVideoExt = (url: string, fileName?: string): string => {
  const source = fileName || url;
  return source.split('.').pop()?.toLowerCase().split('?')[0] || '';
};

interface ErrorState {
  title: string;
  detail: string;
}

export const VideoRenderer: React.FC<VideoRendererProps> = ({ url, fileName }) => {
  const t = useTranslator();
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VideoJsPlayer | null>(null);

  useEffect(() => {
    const videoExt = getVideoExt(url, fileName);

    // 已知浏览器不支持的容器：跳过 videojs 初始化，直接展示友好提示
    if (BROWSER_UNSUPPORTED_EXTS.has(videoExt)) {
      setError({
        title: t('video.unsupported_title'),
        detail: t('video.unsupported_detail', { format: videoExt.toUpperCase() }),
      });
      setIsLoading(false);
      return;
    }

    // 确保 Video.js 播放器只初始化一次
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-apple');
      videoRef.current.appendChild(videoElement);

      const videoType = getVideoType(url);

      // 为特定格式提供多个 MIME 类型作为备用
      let sources: Array<{ src: string; type: string }>;

      if (videoType === 'video/quicktime') {
        // MOV 格式 fallback
        sources = [
          { src: url, type: 'video/quicktime' },
          { src: url, type: 'video/mp4' }
        ];
      } else {
        sources = [{ src: url, type: videoType }];
      }

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
        const err = player.error();
        // 视频加载错误是正常情况（格式不支持、编解码器缺失等），用 warn 级别记录
        console.warn('[VideoRenderer] Video playback error:', err?.message || 'Unknown error');

        // MEDIA_ERR_SRC_NOT_SUPPORTED（code=4）：编码或容器层面浏览器解不了
        if (err?.code === 4) {
          setError({
            title: t('video.unsupported_title'),
            detail: t('video.unsupported_detail', {
              format: videoExt ? videoExt.toUpperCase() : t('common.unknown_error'),
            }),
          });
        } else {
          setError({
            title: t('video.load_failed'),
            detail: err?.message || t('common.unknown_error'),
          });
        }
        setIsLoading(false);
      });

      playerRef.current = player;
    }
  }, [url, fileName, t]);

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
    return <RendererError message={error.title} detail={error.detail} />;
  }

  return (
    <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
      <div className="rfp-w-full rfp-h-full rfp-relative">
        {/* 加载状态 */}
        {isLoading && (
          <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-surface-3 rfp-backdrop-blur-sm rfp-z-10">
            <div className="rfp-text-center">
              <div className="rfp-w-12 rfp-h-12 rfp-mx-auto rfp-mb-3 rfp-border-3 rfp-border-line-strong rfp-border-t-spinner-head rfp-rounded-full rfp-animate-spin" />
              <p className="rfp-text-sm rfp-text-fg-secondary rfp-font-medium">{t('video.loading')}</p>
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
