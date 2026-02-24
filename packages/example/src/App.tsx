import { useState, useRef, useMemo, useEffect } from 'react';
import { FilePreviewModal, VERSION } from '@eternalheart/react-file-preview';
import type { PreviewFile, PreviewFileInput, CustomRenderer } from '@eternalheart/react-file-preview';
import '@eternalheart/react-file-preview/style.css';
import { FileText, Image, FileSpreadsheet, Video, Music, Upload, X, Package, BookOpen, Code } from 'lucide-react';

// 环境检测：开发环境和生产环境的 URL
const isDev = import.meta.env.DEV;
const DOCS_URL = isDev
  ? 'http://localhost:4801/react-file-preview/docs/'
  : 'https://wh131462.github.io/react-file-preview/docs/';

// JSON 查看器组件
function JsonViewer({ url }: { url: string }) {
  const [content, setContent] = useState<string>('加载中...');

  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(text => {
        try {
          const json = JSON.parse(text);
          setContent(JSON.stringify(json, null, 2));
        } catch {
          setContent(text);
        }
      })
      .catch(err => setContent(`加载失败: ${err.message}`));
  }, [url]);

  return <>{content}</>;
}

function App() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<PreviewFile[]>([]);
  const [allFiles, setAllFiles] = useState<PreviewFileInput[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = (index: number) => {
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
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setAllFiles((prev) => [...prev, ...newFiles]);
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
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有当离开整个拖拽区域时才设置为 false
    if (e.currentTarget === e.target) {
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
    setIsDragging(false);

    const files = e.dataTransfer.files;
    processFiles(files);
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove) {
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
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* 导航栏 */}
      <nav className="bg-black/20 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img src="/icon.svg" alt="logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-white truncate">React File Preview</h1>
                <p className="text-[10px] sm:text-xs text-gray-400 truncate max-w-[160px] sm:max-w-none">
                  @eternalheart/react-file-preview@{VERSION}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
              <a
                href="https://github.com/wh131462/react-file-preview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
              >
                <Code className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <a
                href="https://www.npmjs.com/package/@eternalheart/react-file-preview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 text-white transition-all hover:scale-105"
              >
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">npm</span>
              </a>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">API Docs</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-4">
            文件预览演示
          </h2>
          <p className="text-gray-400 text-sm sm:text-lg px-4">
            支持 20+ 种文件格式的现代化预览组件
          </p>
        </div>

        {/* 文件上传区域 */}
        <div className="max-w-6xl mx-auto mb-8 sm:mb-12">
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-8 border-2 border-dashed transition-all ${isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-105'
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
              {!isDragging && (
                <div className="px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white text-sm sm:text-base font-medium hover:shadow-lg hover:scale-105 active:scale-95 transition-all">
                  选择文件或拖拽到此处
                </div>
              )}
            </label>
          </div>
        </div>

        {/* 已上传的文件列表 */}
        {uploadedFiles.length > 0 && (
          <div className="max-w-6xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">已上传的文件</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {uploadedFiles.map((file, index) => {
                return (
                  <div
                    key={file.id}
                    className="group relative bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-white/30 active:bg-white/10 transition-all duration-300"
                  >
                    <button
                      onClick={() => handleFileClick(index)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 text-white group-hover:scale-110 transition-transform flex-shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex-1 min-w-0 pr-6 sm:pr-0">
                          <h3 className="text-white font-medium text-base sm:text-lg mb-1 sm:mb-2 truncate">
                            {file.name}
                          </h3>
                          <p className="text-gray-400 text-xs sm:text-sm truncate">
                            {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                          </p>
                          {file.size && (
                            <p className="text-gray-500 text-xs mt-1">
                              {formatFileSize(file.size)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-4 text-green-400 text-xs sm:text-sm font-medium group-hover:text-green-300">
                        点击预览 →
                      </div>
                    </button>

                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(file.id);
                      }}
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                      title="删除文件"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                );
              })}
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
              href="https://github.com/wh131462/react-file-preview/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              MIT License
            </a>
            <span>{' '} · {' '}</span>
            <a
              href="https://github.com/wh131462/react-file-preview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              GitHub
            </a>
            <span>{' '} · {' '}</span>
            <a
              href="https://www.npmjs.com/package/@eternalheart/react-file-preview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              npm
            </a>
          </p>
        </div>
      </footer>

      <FilePreviewModal
        files={allFiles}
        currentIndex={currentFileIndex}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onNavigate={setCurrentFileIndex}
        customRenderers={useMemo<CustomRenderer[]>(() => [
          // 自定义 JSON 渲染器示例
          {
            test: (file: PreviewFile) => file.name.endsWith('.json'),
            render: (file: PreviewFile) => (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-full overflow-auto">
                  <div className="flex items-center gap-2 mb-4 text-blue-400">
                    <Code className="w-5 h-5" />
                    <h3 className="font-semibold">JSON 文件预览</h3>
                  </div>
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                    {/* 这里会异步加载 JSON 内容 */}
                    <JsonViewer url={file.url} />
                  </pre>
                </div>
              </div>
            ),
          },
        ], [])}
      />
    </div>
  );
}

export default App;

