import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  Scan,
  RefreshCw,
} from 'lucide-react';

const OriginalSizeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <text x="12" y="17.5" textAnchor="middle" fontSize="20" fontWeight="bold" fill="currentColor" stroke="none">
      1:1
    </text>
  </svg>
);
import { PreviewFile, PreviewFileInput, FileType, CustomRenderer } from './types';
import { normalizeFiles } from './utils/fileNormalizer';
import { ImageRenderer } from './renderers/ImageRenderer';
import { PdfRenderer } from './renderers/PdfRenderer';
import { DocxRenderer } from './renderers/DocxRenderer';
import { XlsxRenderer } from './renderers/XlsxRenderer';
import { PptxRenderer } from './renderers/PptxRenderer';
import { MsgRenderer } from './renderers/MsgRenderer';
import { VideoRenderer } from './renderers/VideoRenderer';
import { AudioRenderer } from './renderers/AudioRenderer';
import { MarkdownRenderer } from './renderers/MarkdownRenderer';
import { TextRenderer } from './renderers/TextRenderer';
import { UnsupportedRenderer } from './renderers/UnsupportedRenderer';

interface FilePreviewModalProps {
  files: PreviewFileInput[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
  customRenderers?: CustomRenderer[];
}

const getFileType = (file: PreviewFile): FileType => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type.toLowerCase();

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image';
  }
  if (mimeType.includes('pdf') || ext === 'pdf') {
    return 'pdf';
  }
  if (mimeType.includes('wordprocessingml') || ext === 'docx') {
    return 'docx';
  }
  if (mimeType.includes('spreadsheetml') || ext === 'xlsx') {
    return 'xlsx';
  }
  if (mimeType.includes('presentationml') || ext === 'pptx' || ext === 'ppt') {
    return 'pptx';
  }
  if (mimeType.includes('ms-outlook') || ext === 'msg') {
    return 'msg';
  }
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'avi', 'mkv', 'm4v', '3gp', 'flv'].includes(ext)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    return 'audio';
  }
  if (ext === 'md' || ext === 'markdown') {
    return 'markdown';
  }
  // 文本文件和代码文件
  const textExtensions = [
    'txt', 'log', 'csv',
    'js', 'jsx', 'ts', 'tsx', 'json',
    'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt',
    'html', 'css', 'scss', 'sass', 'less',
    'xml', 'yaml', 'yml', 'toml', 'ini', 'conf',
    'sh', 'bash', 'zsh', 'sql',
  ];
  if (mimeType.startsWith('text/') || textExtensions.includes(ext)) {
    return 'text';
  }
  return 'unsupported';
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  files,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  customRenderers = [],
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [, setTotalPages] = useState(1); // PDF 总页数,由 PdfRenderer 更新
  const [contentNaturalWidth, setContentNaturalWidth] = useState(0); // 内容原始宽度
  const [contentNaturalHeight, setContentNaturalHeight] = useState(0); // 内容原始高度
  const contentRef = useRef<HTMLDivElement>(null);

  // 导航箭头自动隐藏
  const [navVisible, setNavVisible] = useState(true);
  const navHideTimerRef = useRef<number | null>(null);
  const NAV_HIDE_DELAY = 2000;

  const resetNavTimer = useCallback(() => {
    setNavVisible(true);
    if (navHideTimerRef.current) {
      clearTimeout(navHideTimerRef.current);
    }
    navHideTimerRef.current = window.setTimeout(() => {
      setNavVisible(false);
    }, NAV_HIDE_DELAY);
  }, []);

  const handleMouseMove = useCallback(() => {
    resetNavTimer();
  }, [resetNavTimer]);

  // 标准化文件输入
  const normalizedFiles = useMemo(() => normalizeFiles(files), [files]);

  const currentFile = normalizedFiles[currentIndex];

  // 检查是否有自定义渲染器匹配当前文件
  const customRenderer = useMemo(() => {
    if (!currentFile) return null;
    return customRenderers.find(renderer => renderer.test(currentFile));
  }, [currentFile, customRenderers]);

  const fileType = currentFile ? getFileType(currentFile) : 'unsupported';

  // 重置状态当文件改变时
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setCurrentPage(1);
    setTotalPages(1);
    setContentNaturalWidth(0);
    setContentNaturalHeight(0);
    setNavVisible(true);
    if (navHideTimerRef.current) {
      clearTimeout(navHideTimerRef.current);
    }
  }, [currentIndex]);

  // 导航箭头自动隐藏计时器启动 & 清理
  useEffect(() => {
    if (isOpen && normalizedFiles.length > 1) {
      resetNavTimer();
    }
    return () => {
      if (navHideTimerRef.current) {
        clearTimeout(navHideTimerRef.current);
      }
    };
  }, [isOpen, normalizedFiles.length, resetNavTimer]);

  // 键盘导航
  // 锁定 body 滚动
  useEffect(() => {
    if (isOpen) {
      // 保存原始的 overflow 值
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      // 获取滚动条宽度
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // 锁定滚动并补偿滚动条宽度
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        // 恢复原始值
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate?.(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < normalizedFiles.length - 1) {
        onNavigate?.(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, normalizedFiles.length, onClose, onNavigate]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.01));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const handleFitToWidth = useCallback(() => {
    if (contentRef.current && contentNaturalWidth > 0 && contentNaturalHeight > 0) {
      const containerWidth = contentRef.current.clientWidth;
      const containerHeight = contentRef.current.clientHeight;
      const scaleX = containerWidth / contentNaturalWidth;
      const scaleY = containerHeight / contentNaturalHeight;
      const newZoom = Math.min(scaleX, scaleY);
      setZoom(Math.max(0.01, Math.min(10, newZoom)));
    } else {
      setZoom(1);
    }
    setRotation(0);
  }, [contentNaturalWidth, contentNaturalHeight]);

  const handleOriginalSize = useCallback(() => {
    setZoom(1);
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setRotation(0);
  }, []);

  const handleDownload = useCallback(() => {
    if (!currentFile) return;
    const link = document.createElement('a');
    link.href = currentFile.url;
    link.download = currentFile.name;
    link.click();
  }, [currentFile]);

  if (!isOpen || !currentFile) return null;

  const showZoomControls = fileType === 'image' || fileType === 'pdf';
  const showRotateControl = fileType === 'image';

  const modalContent = (
    <div className="rfp-root">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rfp-fixed rfp-inset-0 rfp-z-[9999] rfp-flex rfp-items-center rfp-justify-center rfp-bg-black/80 rfp-backdrop-blur-md rfp-overflow-hidden"
            onClick={onClose}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* 主内容区域 */}
            <div
              className="rfp-relative rfp-w-full rfp-h-full rfp-flex rfp-flex-col rfp-overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 顶部工具栏 - 全屏融合式 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rfp-flex-shrink-0 rfp-z-10 rfp-bg-black/50 rfp-backdrop-blur-md rfp-border-b rfp-border-white/10"
                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
              >
                {/* 第一行：文件名 + 分页 + 关闭/下载（移动端右侧）/ 全部按钮（桌面端） */}
                <div className="rfp-flex rfp-items-center rfp-justify-between rfp-px-3 md:rfp-px-5 rfp-py-1.5 md:rfp-py-2.5">
                  {/* 左侧：文件名 + 分页 */}
                  <div className="rfp-flex rfp-items-center rfp-flex-1 rfp-min-w-0 rfp-mr-2 md:rfp-mr-3">
                    <h2 className="rfp-text-white/90 rfp-font-medium rfp-text-xs md:rfp-text-sm rfp-truncate">
                      {currentFile.name}
                    </h2>
                    <span className="rfp-text-white/40 rfp-text-xs rfp-ml-2 rfp-flex-shrink-0">
                      {currentIndex + 1}/{normalizedFiles.length}
                    </span>
                  </div>

                  {/* 移动端：仅显示下载+关闭 */}
                  <div className="rfp-flex rfp-items-center rfp-gap-1 md:rfp-hidden rfp-flex-shrink-0">
                    <ToolbarButton
                      icon={<Download className="rfp-w-4 rfp-h-4" />}
                      label="下载"
                      onClick={handleDownload}
                    />
                    <ToolbarButton
                      icon={<X className="rfp-w-4 rfp-h-4" />}
                      label="关闭"
                      onClick={onClose}
                    />
                  </div>

                  {/* 桌面端：所有工具按钮 */}
                  <div className="rfp-hidden md:rfp-flex rfp-items-center rfp-gap-1 rfp-flex-shrink-0">
                    {showZoomControls && (
                      <>
                        <ToolbarButton
                          icon={<ZoomOut className="rfp-w-4 rfp-h-4" />}
                          label="缩小"
                          onClick={handleZoomOut}
                          disabled={zoom <= 0.01}
                        />
                        <span className="rfp-text-white/60 rfp-text-xs rfp-min-w-[3rem] rfp-text-center rfp-font-medium rfp-tabular-nums">
                          {Math.round(zoom * 100)}%
                        </span>
                        <ToolbarButton
                          icon={<ZoomIn className="rfp-w-4 rfp-h-4" />}
                          label="放大"
                          onClick={handleZoomIn}
                          disabled={zoom >= 10}
                        />
                        <div className="rfp-w-px rfp-h-4 rfp-bg-white/10 rfp-mx-1" />
                        {fileType === 'image' && (
                          <>
                            <ToolbarButton
                              icon={<Scan className="rfp-w-4 rfp-h-4" />}
                              label="适应窗口"
                              onClick={handleFitToWidth}
                            />
                            <ToolbarButton
                              icon={<OriginalSizeIcon className="rfp-w-4 rfp-h-4" />}
                              label="原始尺寸"
                              onClick={handleOriginalSize}
                            />
                            <div className="rfp-w-px rfp-h-4 rfp-bg-white/10 rfp-mx-1" />
                          </>
                        )}
                      </>
                    )}

                    {showRotateControl && (
                      <>
                        <ToolbarButton
                          icon={<RotateCcw className="rfp-w-4 rfp-h-4" />}
                          label="向左旋转"
                          onClick={handleRotateLeft}
                        />
                        <ToolbarButton
                          icon={<RotateCw className="rfp-w-4 rfp-h-4" />}
                          label="向右旋转"
                          onClick={handleRotate}
                        />
                        <div className="rfp-w-px rfp-h-4 rfp-bg-white/10 rfp-mx-1" />
                      </>
                    )}

                    {(showZoomControls || showRotateControl) && (
                      <>
                        <ToolbarButton
                          icon={<RefreshCw className="rfp-w-4 rfp-h-4" />}
                          label="复原"
                          onClick={handleReset}
                        />
                        <div className="rfp-w-px rfp-h-4 rfp-bg-white/10 rfp-mx-1" />
                      </>
                    )}

                    <ToolbarButton
                      icon={<Download className="rfp-w-4 rfp-h-4" />}
                      label="下载"
                      onClick={handleDownload}
                    />
                    <ToolbarButton
                      icon={<X className="rfp-w-4 rfp-h-4" />}
                      label="关闭"
                      onClick={onClose}
                    />
                  </div>
                </div>

                {/* 第二行：移动端工具按钮（仅 image/pdf 显示） */}
                {(showZoomControls || showRotateControl) && (
                  <div className="rfp-flex rfp-items-center rfp-gap-1 rfp-px-3 rfp-pb-1.5 rfp-overflow-x-auto scrollbar-hide md:rfp-hidden">
                    {showZoomControls && (
                      <>
                        <ToolbarButton
                          icon={<ZoomOut className="rfp-w-4 rfp-h-4" />}
                          label="缩小"
                          onClick={handleZoomOut}
                          disabled={zoom <= 0.01}
                        />
                        <span className="rfp-text-white/60 rfp-text-xs rfp-min-w-[3rem] rfp-text-center rfp-font-medium rfp-tabular-nums">
                          {Math.round(zoom * 100)}%
                        </span>
                        <ToolbarButton
                          icon={<ZoomIn className="rfp-w-4 rfp-h-4" />}
                          label="放大"
                          onClick={handleZoomIn}
                          disabled={zoom >= 10}
                        />
                        <div className="rfp-w-px rfp-h-4 rfp-bg-white/10 rfp-mx-0.5" />
                        {fileType === 'image' && (
                          <>
                            <ToolbarButton
                              icon={<Scan className="rfp-w-4 rfp-h-4" />}
                              label="适应窗口"
                              onClick={handleFitToWidth}
                            />
                            <ToolbarButton
                              icon={<OriginalSizeIcon className="rfp-w-4 rfp-h-4" />}
                              label="原始尺寸"
                              onClick={handleOriginalSize}
                            />
                            <div className="rfp-w-px rfp-h-4 rfp-bg-white/10 rfp-mx-0.5" />
                          </>
                        )}
                      </>
                    )}

                    {showRotateControl && (
                      <>
                        <ToolbarButton
                          icon={<RotateCcw className="rfp-w-4 rfp-h-4" />}
                          label="向左旋转"
                          onClick={handleRotateLeft}
                        />
                        <ToolbarButton
                          icon={<RotateCw className="rfp-w-4 rfp-h-4" />}
                          label="向右旋转"
                          onClick={handleRotate}
                        />
                        <div className="rfp-w-px rfp-h-4 rfp-bg-white/10 rfp-mx-0.5" />
                      </>
                    )}

                    <ToolbarButton
                      icon={<RefreshCw className="rfp-w-4 rfp-h-4" />}
                      label="复原"
                      onClick={handleReset}
                    />
                  </div>
                )}
              </motion.div>

              {/* 内容区域 */}
              <div
                ref={contentRef}
                className="rfp-flex-1 rfp-flex rfp-items-center rfp-justify-center rfp-overflow-auto"
                onMouseMove={handleMouseMove}
              >
                {customRenderer ? (
                  // 使用自定义渲染器
                  customRenderer.render(currentFile)
                ) : (
                  <>
                    {fileType === 'image' && (
                      <ImageRenderer
                        url={currentFile.url}
                        zoom={zoom}
                        rotation={rotation}
                        onZoomChange={handleZoomChange}
                        onNaturalWidthChange={setContentNaturalWidth}
                        onNaturalHeightChange={setContentNaturalHeight}
                      />
                    )}
                    {fileType === 'pdf' && (
                      <PdfRenderer
                        url={currentFile.url}
                        zoom={zoom}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                        onTotalPagesChange={setTotalPages}
                        onPageWidthChange={setContentNaturalWidth}
                      />
                    )}
                    {fileType === 'docx' && <DocxRenderer url={currentFile.url} />}
                    {fileType === 'xlsx' && <XlsxRenderer url={currentFile.url} />}
                    {fileType === 'pptx' && <PptxRenderer url={currentFile.url} />}
                    {fileType === 'msg' && <MsgRenderer url={currentFile.url} />}
                    {fileType === 'video' && <VideoRenderer url={currentFile.url} />}
                    {fileType === 'audio' && (
                      <AudioRenderer url={currentFile.url} fileName={currentFile.name} />
                    )}
                    {fileType === 'markdown' && <MarkdownRenderer url={currentFile.url} />}
                    {fileType === 'text' && (
                      <TextRenderer url={currentFile.url} fileName={currentFile.name} />
                    )}
                    {fileType === 'unsupported' && (
                      <UnsupportedRenderer
                        fileName={currentFile.name}
                        fileType={currentFile.type}
                        onDownload={handleDownload}
                      />
                    )}
                  </>
                )}
              </div>

              {/* 左右导航箭头 - 自动隐藏 */}
              {normalizedFiles.length > 1 && (
                <>
                  {currentIndex > 0 && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: navVisible ? 1 : 0, x: navVisible ? 0 : -20 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => onNavigate?.(currentIndex - 1)}
                      onMouseEnter={() => setNavVisible(true)}
                      style={{ pointerEvents: navVisible ? 'auto' : 'none' }}
                      className="rfp-absolute rfp-z-20 rfp-left-2 md:rfp-left-4 rfp-top-1/2 -rfp-translate-y-1/2 rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-rounded-full rfp-bg-black/40 rfp-backdrop-blur-xl rfp-border rfp-border-white/10 rfp-flex rfp-items-center rfp-justify-center rfp-text-white hover:rfp-bg-black/60 rfp-transition-colors rfp-shadow-2xl"
                    >
                      <ChevronLeft className="rfp-w-5 rfp-h-5 md:rfp-w-6 md:rfp-h-6" />
                    </motion.button>
                  )}

                  {currentIndex < normalizedFiles.length - 1 && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: navVisible ? 1 : 0, x: navVisible ? 0 : 20 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => onNavigate?.(currentIndex + 1)}
                      onMouseEnter={() => setNavVisible(true)}
                      style={{ pointerEvents: navVisible ? 'auto' : 'none' }}
                      className="rfp-absolute rfp-z-20 rfp-right-2 md:rfp-right-4 rfp-top-1/2 -rfp-translate-y-1/2 rfp-w-10 rfp-h-10 md:rfp-w-12 md:rfp-h-12 rfp-rounded-full rfp-bg-black/40 rfp-backdrop-blur-xl rfp-border rfp-border-white/10 rfp-flex rfp-items-center rfp-justify-center rfp-text-white hover:rfp-bg-black/60 rfp-transition-colors rfp-shadow-2xl"
                    >
                      <ChevronRight className="rfp-w-5 rfp-h-5 md:rfp-w-6 md:rfp-h-6" />
                    </motion.button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // 使用 Portal 将模态框渲染到 document.body
  return createPortal(modalContent, document.body);
};

// 工具栏按钮组件
interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`rfp-p-2 md:rfp-p-1.5 rfp-rounded-md rfp-transition-all ${disabled
        ? 'rfp-text-white/30 rfp-cursor-not-allowed'
        : 'rfp-text-white hover:rfp-bg-white/10 active:rfp-bg-white/20'
        }`}
    >
      {icon}
    </button>
  );
};
