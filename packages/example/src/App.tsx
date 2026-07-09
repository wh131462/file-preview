import { useState, useRef, useCallback } from 'react';
import { FilePreviewModal, FilePreviewEmbed, VERSION, SUPPORTED_FILE_TYPES } from '@eternalheart/react-file-preview';
import type { PreviewFile, PreviewFileInput, Theme, CustomRenderer, CustomRendererEventPayload } from '@eternalheart/react-file-preview';
import type { Locale } from '@eternalheart/react-file-preview';
import '@eternalheart/react-file-preview/style.css';
import { FileText, Image, FileSpreadsheet, Video, Music, Upload, X, Package, BookOpen, Code, Settings, Sparkles, Link as LinkIcon } from 'lucide-react';
import iconSvg from './assets/icon.svg';

// 演示用自定义渲染器：命中文件名以 .demo 结尾的文件
// - 声明自定义工具组（1 个按钮）
// - 按钮点击 ctx.emit('hello', { ok: true })
const demoCustomRenderers: CustomRenderer[] = [
  {
    test: (file) => file.name.toLowerCase().endsWith('.demo'),
    render: (file, ctx) => (
      <div style={{ padding: 24, color: ctx?.theme === 'light' ? '#111' : '#fff' }}>
        <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Custom Renderer Demo</h3>
        <div style={{ fontSize: 13, opacity: 0.7 }}>file: {file.name}</div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>locale: {ctx?.locale} · theme: {ctx?.theme}</div>
        <button
          onClick={() => ctx?.emit('hello', { ok: true })}
          style={{ marginTop: 16, padding: '6px 12px', borderRadius: 6, background: '#2563eb', color: '#fff' }}
        >
          emit('hello', {'{'} ok: true {'}'})
        </button>
      </div>
    ),
    getToolbarGroups: (_file, ctx) => [
      {
        items: [
          {
            type: 'button',
            icon: <Sparkles className="rfp-w-4 rfp-h-4" />,
            tooltip: 'Say Hello',
            action: () => ctx.emit('hello', { ok: true }),
          },
        ],
      },
    ],
    events: ['hello'] as const,
  },
];

const handleCustomEvent = (e: CustomRendererEventPayload) => {
  // eslint-disable-next-line no-console
  console.log('[FilePreview custom-event]', e);
};

// 环境检测：开发环境和生产环境的 URL
const isDev = import.meta.env.DEV;
const DOCS_URL = isDev
  ? 'http://localhost:4801/file-preview/docs/'
  : 'https://wh131462.github.io/file-preview/docs/';
const VUE_EXAMPLE_URL = isDev
  ? 'http://localhost:4802/'
  : 'https://wh131462.github.io/file-preview/vue/';

function App() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [embedIndex, setEmbedIndex] = useState(0);
  const [showEmbed, setShowEmbed] = useState(false); // 默认关闭嵌入模式
  const [uploadedFiles, setUploadedFiles] = useState<PreviewFile[]>([]);
  const [allFiles, setAllFiles] = useState<PreviewFileInput[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  // 每个文件的预览模式：true = File 对象，false = URL
  const [filePreviewModes, setFilePreviewModes] = useState<Map<string, boolean>>(new Map());
  const [theme, setTheme] = useState<Theme>('dark');
  const [headless, setHeadless] = useState(false);
  const [locale, setLocale] = useState<Locale>('zh-CN');
  const [showDownload, setShowDownload] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [ballPos, setBallPos] = useState({ x: 20, y: 200 });
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, bx: 0, by: 0 });
  const hasMoved = useRef(false);
  const BALL_SIZE = 48;
  const PANEL_W = 256;
  const PANEL_H = 160;
  const PANEL_GAP = 8;

  const getPanelPosition = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceRight = vw - (ballPos.x + BALL_SIZE);
    const spaceLeft = ballPos.x;
    const spaceBottom = vh - (ballPos.y + BALL_SIZE);

    let left: number | undefined;
    let right: number | undefined;
    let top: number | undefined;
    let bottom: number | undefined;

    if (spaceRight >= PANEL_W + PANEL_GAP) {
      left = BALL_SIZE + PANEL_GAP;
    } else if (spaceLeft >= PANEL_W + PANEL_GAP) {
      right = BALL_SIZE + PANEL_GAP;
    } else if (spaceBottom >= PANEL_H + PANEL_GAP) {
      top = BALL_SIZE + PANEL_GAP;
      left = Math.min(0, vw - ballPos.x - PANEL_W);
    } else {
      bottom = BALL_SIZE + PANEL_GAP;
      left = Math.min(0, vw - ballPos.x - PANEL_W);
    }

    if (left !== undefined && right === undefined) {
      if (top === undefined && bottom === undefined) {
        top = Math.min(0, vh - ballPos.y - PANEL_H);
      }
    }

    return {
      ...(left !== undefined ? { left } : {}),
      ...(right !== undefined ? { right } : {}),
      ...(top !== undefined ? { top } : {}),
      ...(bottom !== undefined ? { bottom } : {}),
    };
  }, [ballPos]);

  const handleBallPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    hasMoved.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, bx: ballPos.x, by: ballPos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [ballPos]);

  const handleBallPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;
    setBallPos({
      x: Math.max(0, Math.min(window.innerWidth - BALL_SIZE, dragStartRef.current.bx + dx)),
      y: Math.max(0, Math.min(window.innerHeight - BALL_SIZE, dragStartRef.current.by + dy)),
    });
  }, []);

  const handleBallPointerUp = useCallback(() => {
    draggingRef.current = false;
    if (!hasMoved.current) setPanelOpen((v) => !v);
  }, []);

  const handleFileClick = (index: number) => {
    // 重新计算 allFiles，根据预览模式返回 File 或 PreviewFile
    setAllFiles(uploadedFiles.map((f) => getPreviewFile(f)));
    setCurrentFileIndex(index);
    setIsPreviewOpen(true);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-8 h-8" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8" />;
    if (type.includes('spreadsheet')) return <FileSpreadsheet className="w-8 h-8" />;
    if (type.startsWith('video/')) return <Video className="w-8 h-8" />;
    if (type.startsWith('audio/')) return <Music className="w-8 h-8" />;
    return <FileText className="w-8 h-8" />;
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: PreviewFile[] = Array.from(files).map((file, index) => ({
      id: `uploaded-${Date.now()}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type || 'application/octet-stream',
      size: file.size,
      file: file, // ✅ 保留原始 File 对象
    }));

    // 默认使用 File 对象预览
    setFilePreviewModes((prev) => {
      const next = new Map(prev);
      newFiles.forEach((f) => next.set(f.id, true));
      return next;
    });

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setAllFiles((prev) => [...prev, ...newFiles]);
  };

  const addUrlFile = () => {
    const url = urlInput.trim();
    if (!url) return;

    const newFile: PreviewFile = {
      id: `url-${Date.now()}`,
      name: url.split('/').pop() || 'file',
      url,
      type: 'application/octet-stream',
    };

    // URL 文件只能用 URL 预览
    setFilePreviewModes((prev) => {
      const next = new Map(prev);
      next.set(newFile.id, false);
      return next;
    });

    setUploadedFiles((prev) => [...prev, newFile]);
    setAllFiles((prev) => [...prev, newFile]);
    setUrlInput('');
    setShowUrlInput(false);
  };

  const togglePreviewMode = (fileId: string) => {
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (!file || !file.file) return; // 仅 File 对象可切换

    setFilePreviewModes((prev) => {
      const next = new Map(prev);
      const currentMode = prev.get(fileId) ?? true;
      next.set(fileId, !currentMode);
      return next;
    });
  };

  const getPreviewFile = (file: PreviewFile): PreviewFileInput => {
    const useFileObject = filePreviewModes.get(file.id) ?? true;
    if (useFileObject && file.file) {
      return file.file; // 返回 File 对象
    }
    return file; // 返回 PreviewFile（使用 url）
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    processFiles(files);

    // 清空 input 以允许重复上传同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    processFiles(files);
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove && fileToRemove.file) {
        // 释放 blob URL
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter((f) => f.id !== fileId);
    });
    setAllFiles((prev) => prev.filter((f) => {
      if (typeof f === 'string') return true;
      if (f instanceof File) return true;
      return f.id !== fileId;
    }));
    setFilePreviewModes((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeDisplay = (file: PreviewFile) => {
    const typePart = file.type.split('/')[1]?.toUpperCase();
    if (typePart && typePart !== 'OCTET-STREAM') {
      return typePart;
    }
    // 兜底：使用文件扩展名
    const ext = file.name.split('.').pop()?.toUpperCase();
    return ext || 'FILE';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 导航栏 */}
      <nav className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
              <img src={iconSvg} alt="logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0 overflow-hidden">
                <h1 className="text-base sm:text-xl font-bold text-white truncate w-full text-left">React File Preview</h1>
                <p className="text-[10px] sm:text-xs text-gray-400 truncate w-full text-left">
                  @eternalheart/react-file-preview@{VERSION}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0 ml-auto">
              {/* 框架切换器 */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/5 border border-white/10">
                <span className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md">
                  React
                </span>
                <a
                  href={VUE_EXAMPLE_URL}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="切换到 Vue 版本"
                >
                  Vue
                </a>
              </div>

              <a
                href="https://github.com/wh131462/file-preview"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
              >
                <Code className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <a
                href="https://www.npmjs.com/package/@eternalheart/react-file-preview"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
              >
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">npm</span>
              </a>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">API Docs</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-16">
        <div className="max-w-6xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-4">
            文件预览演示
          </h2>
          <p className="text-gray-400 text-sm sm:text-lg">
            支持{' '}
            <a
              href={`${DOCS_URL}guide/supported-types`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-300 inline-block hover:scale-105 transition-all duration-200"
            >
              {SUPPORTED_FILE_TYPES.length}+ 种文件格式
            </a>
            {' '}的现代化预览组件
          </p>
        </div>

        {/* 文件上传区域 */}
        <div className="max-w-6xl mx-auto mb-8 sm:mb-12">
          <div className="relative">
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-8 border-2 border-dashed transition-colors duration-200 ${isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/20 hover:border-white/40'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept="*/*"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <div className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3 sm:mb-4 transition-transform ${isDragging ? 'scale-110' : ''
                  }`}>
                  <Upload className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                </div>
                <h3 className="text-white text-base sm:text-xl font-medium mb-1.5 sm:mb-2">
                  {isDragging ? '松开以上传文件' : '上传本地文件预览'}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 px-2">
                  {isDragging ? '将文件拖放到此处' : '支持图片、PDF、Word、Excel、视频、音频等格式'}
                </p>
                {!isDragging ? (
                  <div className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white text-sm sm:text-base font-medium hover:shadow-lg hover:scale-105 active:scale-95 transition-all">
                    选择文件或拖拽到此处
                  </div>
                ) : (
                  <div className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-200 text-sm sm:text-base font-medium">
                    释放鼠标即可上传
                  </div>
                )}
              </label>
            </div>

            {/* 添加 URL 按钮 */}
            <button
              onClick={() => setShowUrlInput((v) => !v)}
              className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all ${showUrlInput
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white'
                }`}
              title={showUrlInput ? '关闭 URL 输入' : '添加网络 URL'}
            >
              <LinkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* URL 输入区域 */}
          {showUrlInput && (
            <div className="mt-4 flex gap-2 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                type="text"
                placeholder="输入文件 URL（如：https://example.com/file.pdf）"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                onKeyUp={(e) => e.key === 'Enter' && addUrlFile()}
              />
              <button
                onClick={addUrlFile}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white font-medium hover:shadow-lg hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
              >
                添加
              </button>
            </div>
          )}
        </div>

        {/* 已上传的文件列表 */}
        {uploadedFiles.length > 0 && (
          <div className="max-w-6xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">已添加的文件</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {uploadedFiles.map((file, index) => {
                const useFileMode = file.file ? (filePreviewModes.get(file.id) ?? true) : false;
                return (
                  <div
                    key={file.id}
                    className="group relative bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-blue-400/50 transition-all duration-300 overflow-hidden"
                  >
                    {/* 删除按钮（右上角） */}
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* 文件信息区域 */}
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {/* 图标 */}
                        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white flex-shrink-0">
                          {getFileIcon(file.type)}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-medium text-sm truncate text-left flex-1 min-w-0" title={file.name}>
                              {file.name}
                            </h3>
                            {/* 模式标签 */}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium ${
                                file.file
                                  ? (useFileMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300')
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {file.file ? (useFileMode ? 'File' : 'URL') : 'URL'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mt-0.5 text-left">
                            {getFileTypeDisplay(file)}
                            {file.size && <span className="text-gray-500"> {formatFileSize(file.size)}</span>}
                          </p>
                        </div>
                      </div>

                      {/* 操作按钮区域 */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFileClick(index)}
                          className="flex-1 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 text-xs font-medium transition-all"
                        >
                          预览
                        </button>
                        {file.file && (
                          <button
                            onClick={() => togglePreviewMode(file.id)}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white text-xs transition-all"
                            title="切换预览模式"
                          >
                            切换
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 嵌入式预览演示 */}
        {allFiles.length > 0 && showEmbed && (
          <div className="max-w-6xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">嵌入式预览 (FilePreviewEmbed)</h2>
            <p className="text-gray-400 text-sm mb-4 sm:mb-6">
              将预览组件直接嵌入到页面的 div 容器中,无需弹窗。下方容器高度固定为 520px。通过右下角悬浮球控制显示/隐藏。
            </p>
            <div
              className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden"
              style={{ height: 520 }}
            >
              <FilePreviewEmbed
                files={allFiles}
                currentIndex={embedIndex}
                onNavigate={setEmbedIndex}
                theme={theme}
                headless={headless}
                locale={locale}
                showDownload={showDownload}
                customRenderers={demoCustomRenderers}
                onCustomEvent={handleCustomEvent}
              />
            </div>
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="max-w-6xl mx-auto mt-8 sm:mt-12 mb-6 sm:mb-8 px-3 sm:px-4 text-center pb-[env(safe-area-inset-bottom)]">
        <div className="text-gray-400 text-xs sm:text-sm">
          <p className="mb-2">
            Made with ❤️ by{' '}
            <a
              href="https://github.com/wh131462"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              EternalHeart
            </a>
          </p>
          <p className="flex flex-wrap items-center justify-center gap-1">
            <a
              href="https://github.com/wh131462/file-preview/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              MIT License
            </a>
            <span>{' '}</span>
            <a
              href="https://github.com/wh131462/file-preview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              GitHub
            </a>
            <span>{' '}</span>
            <a
              href="https://www.npmjs.com/package/@eternalheart/react-file-preview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              npm
            </a>
            <span>{' '}</span>
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              API Docs
            </a>
          </p>
        </div>
      </footer>

      {/* 悬浮精灵球 + 控制面板 */}
      <div
        className="fixed z-50 select-none"
        style={{ left: ballPos.x, top: ballPos.y }}
      >
        <button
          onPointerDown={handleBallPointerDown}
          onPointerMove={handleBallPointerMove}
          onPointerUp={handleBallPointerUp}
          className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/30 flex items-center justify-center text-white cursor-grab active:cursor-grabbing transition-transform hover:scale-110 ${panelOpen ? 'ring-2 ring-white/30' : ''}`}
        >
          <Settings className={`w-5 h-5 transition-transform duration-300 ${panelOpen ? 'rotate-90' : ''}`} />
        </button>

        {panelOpen && (
          <div
            className="absolute w-64 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-4 space-y-3"
            style={getPanelPosition()}
          >
            <h3 className="text-white text-sm font-medium">预览设置</h3>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-10 flex-shrink-0">主题</span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
                {(['auto', 'dark', 'light'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${theme === t ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {t === 'auto' ? 'Auto' : t === 'dark' ? 'Dark' : 'Light'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-10 flex-shrink-0">无头</span>
              <button
                onClick={() => setHeadless(!headless)}
                className={`relative w-10 h-5 rounded-full transition-colors ${headless ? 'bg-blue-500' : 'bg-white/20'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${headless ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-gray-500 text-xs">{headless ? '开启' : '关闭'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-10 flex-shrink-0">语言</span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
                {([['zh-CN', '中文'], ['en-US', 'EN']] as [Locale, string][]).map(([l, label]) => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${locale === l ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-10 flex-shrink-0">下载</span>
              <button
                onClick={() => setShowDownload(!showDownload)}
                className={`relative w-10 h-5 rounded-full transition-colors ${showDownload ? 'bg-blue-500' : 'bg-white/20'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showDownload ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-gray-500 text-xs">{showDownload ? '显示' : '隐藏'}</span>
            </div>
            {allFiles.length > 0 && (
              <>
                <div className="border-t border-white/10 my-2" />
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-10 flex-shrink-0">嵌入</span>
                  <button
                    onClick={() => setShowEmbed(!showEmbed)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${showEmbed ? 'bg-blue-500' : 'bg-white/20'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showEmbed ? 'translate-x-5' : ''}`} />
                  </button>
                  <span className="text-gray-500 text-xs">{showEmbed ? '显示' : '隐藏'}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <FilePreviewModal
        files={allFiles}
        currentIndex={currentFileIndex}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onNavigate={setCurrentFileIndex}
        theme={theme}
        headless={headless}
        locale={locale}
        showDownload={showDownload}
        customRenderers={demoCustomRenderers}
        onCustomEvent={handleCustomEvent}
      />
    </div>
  );
}

export default App;

