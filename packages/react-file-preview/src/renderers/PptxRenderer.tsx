import { useState, useEffect, useRef, useCallback } from 'react';
import { Presentation } from 'lucide-react';
import { init } from 'pptx-preview';

interface PptxRendererProps {
  url: string;
  /** 是否平铺展示所有页面，默认 true */
  tiled?: boolean;
}

export const PptxRenderer: React.FC<PptxRendererProps> = ({ url, tiled = true }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<ReturnType<typeof init> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const arrayBufferRef = useRef<ArrayBuffer | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);
  const lastDimensionsRef = useRef({ width: 0, height: 0 });

  // 计算容器尺寸，带回退逻辑
  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) return { width: 960, height: 540 };
    const rawWidth = containerRef.current.clientWidth;
    const parentWidth = containerRef.current.parentElement?.clientWidth || 0;
    // 如果容器宽度太小，回退到父容器宽度或默认最小值
    const containerWidth = rawWidth > 100 ? rawWidth : (parentWidth > 100 ? parentWidth : 300);
    // 16:9 比例
    const height = Math.floor(containerWidth * 9 / 16);
    return { width: containerWidth, height };
  }, []);

  // 重新初始化预览器
  const reinitializePreviewer = useCallback(async () => {
    if (!containerRef.current || !arrayBufferRef.current || slideCount === 0) return;

    try {
      // 销毁旧的预览器
      if (previewerRef.current) {
        try {
          previewerRef.current.destroy();
        } catch {
          // 忽略销毁错误
        }
      }

      // 清空容器
      containerRef.current.innerHTML = '';

      // 获取当前容器尺寸
      const currentDimensions = calculateDimensions();

      // 初始化新的预览器，平铺模式下高度按页数计算
      const previewer = init(containerRef.current, {
        width: currentDimensions.width,
        height: tiled ? currentDimensions.height * slideCount : currentDimensions.height,
        mode: tiled ? 'list' : 'slide',
      });
      previewerRef.current = previewer;

      // 重新预览
      await previewer.preview(arrayBufferRef.current);
    } catch {
      // 重新初始化失败，静默处理
    }
  }, [calculateDimensions, tiled, slideCount]);

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    let isInitialRender = true;

    const updateDimensions = () => {
      // 跳过初始渲染时的尺寸检查
      if (isInitialRender) {
        isInitialRender = false;
        lastDimensionsRef.current = calculateDimensions();
        return;
      }

      const newDimensions = calculateDimensions();

      // 检查尺寸是否真正变化（至少变化10px才触发）
      const lastDimensions = lastDimensionsRef.current;
      const widthDiff = Math.abs(lastDimensions.width - newDimensions.width);
      const heightDiff = Math.abs(lastDimensions.height - newDimensions.height);

      if (widthDiff < 10 && heightDiff < 10) {
        return;
      }

      // 更新最后的尺寸
      lastDimensionsRef.current = newDimensions;

      // 清除之前的定时器
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // 防抖：800ms 后重新初始化预览器
      resizeTimeoutRef.current = window.setTimeout(() => {
        if (previewerRef.current && arrayBufferRef.current) {
          reinitializePreviewer();
        }
      }, 800);
    };

    // 创建 ResizeObserver
    resizeObserverRef.current = new ResizeObserver(() => {
      updateDimensions();
    });

    // 开始观察容器
    resizeObserverRef.current.observe(containerRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [calculateDimensions, reinitializePreviewer]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadPptx = async () => {
      if (!containerRef.current) return;

      setLoading(true);
      setError(null);

      // 设置30秒超时
      timeoutId = setTimeout(() => {
        if (isMounted) {
          setError('加载超时，请检查网络或稍后重试');
          setLoading(false);
        }
      }, 30000);

      try {
        // 获取文件，处理 CORS 和重定向
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          redirect: 'follow',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('PPT 文件不存在');
          } else if (response.status === 403) {
            throw new Error('无权限访问此文件');
          } else if (response.status >= 500) {
            throw new Error('服务器错误，请稍后重试');
          } else {
            throw new Error(`文件加载失败 (${response.status})`);
          }
        }

        const arrayBuffer = await response.arrayBuffer();

        // 验证文件大小
        if (arrayBuffer.byteLength === 0) {
          throw new Error('文件为空');
        }

        arrayBufferRef.current = arrayBuffer;

        if (!isMounted) return;

        // 步骤 1: 创建隐藏容器，预处理获取 slideCount
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden';
        document.body.appendChild(hiddenContainer);

        try {
          // 在隐藏容器中初始化临时预览器获取页数
          const tempPreviewer = init(hiddenContainer, {
            width: 100,
            height: 100,
            mode: 'slide',
          });

          try {
            await tempPreviewer.preview(arrayBuffer);
          } catch {
            throw new Error('PPT 文件格式错误或已损坏');
          }

          const count = tempPreviewer.slideCount;

          if (!count || count === 0) {
            throw new Error('PPT 文件无有效页面');
          }

          // 销毁临时预览器
          tempPreviewer.destroy();

          if (!isMounted) return;

          // 保存 slideCount
          setSlideCount(count);

          // 步骤 2: 清空真实容器并初始化
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }

          const currentDimensions = calculateDimensions();

          // 步骤 3: 初始化真实预览器，平铺模式下使用正确的总高度
          const previewer = init(containerRef.current, {
            width: currentDimensions.width,
            height: tiled ? currentDimensions.height * count : currentDimensions.height,
            mode: tiled ? 'list' : 'slide',
          });
          previewerRef.current = previewer;

          // 步骤 4: 预览 PPTX
          await previewer.preview(arrayBuffer);

          // 清除超时定时器
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          if (isMounted) {
            setLoading(false);
          }
        } finally {
          // 移除隐藏容器
          if (document.body.contains(hiddenContainer)) {
            document.body.removeChild(hiddenContainer);
          }
        }
      } catch (err) {
        // 清除超时定时器
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (isMounted) {
          let errorMsg = 'PPT 文件解析失败';
          if (err instanceof Error) {
            errorMsg = err.message;
          } else if (typeof err === 'string') {
            errorMsg = err;
          }
          setError(errorMsg);
          setLoading(false);
        }
      }
    };

    // 延迟执行，使用 requestAnimationFrame 确保 DOM 已准备好
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          loadPptx();
        });
      });
    }, 150);

    // 清理函数
    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      arrayBufferRef.current = null;
      setSlideCount(0);
      if (previewerRef.current) {
        try {
          previewerRef.current.destroy();
        } catch {
          // 忽略销毁错误
        }
      }
      previewerRef.current = null;
    };
  }, [url, calculateDimensions, tiled]);

  return (
    <div className="rfp-relative rfp-flex rfp-flex-col rfp-items-center rfp-w-full rfp-h-full rfp-pt-2 rfp-px-2 md:rfp-px-4">
      {/* 加载状态 - 绝对定位覆盖 */}
      {loading && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-black/50 rfp-backdrop-blur-sm rfp-z-10 rfp-rounded-xl md:rfp-rounded-2xl">
          <div className="rfp-text-center">
            <div className="rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-mx-auto rfp-mb-3 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
            <p className="rfp-text-xs md:rfp-text-sm rfp-text-white/70 rfp-font-medium">加载 PPT 中...</p>
          </div>
        </div>
      )}

      {/* 错误状态 - 绝对定位覆盖 */}
      {error && !loading && (
        <div className="rfp-absolute rfp-inset-0 rfp-flex rfp-items-center rfp-justify-center rfp-bg-black/50 rfp-backdrop-blur-sm rfp-z-10 rfp-rounded-xl md:rfp-rounded-2xl">
          <div className="rfp-text-center rfp-max-w-sm md:rfp-max-w-md rfp-px-4">
            <div className="rfp-w-24 rfp-h-24 md:rfp-w-32 md:rfp-h-32 rfp-mx-auto rfp-mb-4 md:rfp-mb-6 rfp-rounded-2xl md:rfp-rounded-3xl rfp-bg-gradient-to-br rfp-from-orange-500 rfp-via-red-500 rfp-to-pink-500 rfp-flex rfp-items-center rfp-justify-center rfp-shadow-2xl">
              <Presentation className="rfp-w-12 rfp-h-12 md:rfp-w-16 md:rfp-h-16 rfp-text-white" />
            </div>
            <p className="rfp-text-lg md:rfp-text-xl rfp-text-white/90 rfp-mb-2 md:rfp-mb-3 rfp-font-medium">PPT 加载失败</p>
            <p className="rfp-text-xs md:rfp-text-sm rfp-text-white/60 rfp-mb-4 md:rfp-mb-6">
              {error}
            </p>
            <a
              href={url}
              download
              className="rfp-inline-flex rfp-items-center rfp-gap-2 rfp-px-4 rfp-py-2 md:rfp-px-6 md:rfp-py-3 rfp-bg-gradient-to-r rfp-from-purple-500 rfp-to-pink-500 rfp-text-white rfp-text-sm md:rfp-text-base rfp-rounded-lg md:rfp-rounded-xl hover:rfp-scale-105 rfp-transition-all rfp-shadow-lg"
            >
              <svg className="rfp-w-4 rfp-h-4 md:rfp-w-5 md:rfp-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载文件
            </a>
            <p className="rfp-text-xs rfp-text-white/40 rfp-mt-3 md:rfp-mt-4">
              提示：可以使用 Microsoft PowerPoint 或 WPS 打开
            </p>
          </div>
        </div>
      )}

      {/* PPT 容器 - 仅在非错误状态下渲染 */}
      {!error && (
        <div
          ref={containerRef}
          className="pptx-wrapper rfp-w-full rfp-max-w-full md:rfp-max-w-6xl"
          style={{ opacity: loading ? 0 : 1 }}
        />
      )}
    </div>
  );
};
