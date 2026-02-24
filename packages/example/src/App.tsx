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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/icon.svg" alt="logo" className="w-10 h-10 rounded-xl" />
              <div className="flex flex-col items-start">
                <h1 className="text-xl font-bold text-white">React File Preview</h1>
                <p className="text-xs text-gray-400">
                  @eternalheart/react-file-preview@{VERSION}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://github.com/wh131462/react-file-preview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105"
              >
                <Code className="w-5 h-5" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <a
                href="https://www.npmjs.com/package/@eternalheart/react-file-preview"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105"
              >
                <Package className="w-5 h-5" />
                <span className="hidden sm:inline">npm</span>
              </a>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all hover:scale-105 hover:shadow-lg"
              >
                <BookOpen className="w-5 h-5" />
                <span className="hidden sm:inline">API Docs</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            文件预览演示
          </h2>
          <p className="text-gray-400 text-lg">
            支持 20+ 种文件格式的现代化预览组件
          </p>
        </div>

        {/* 文件上传区域 */}
        <div className="max-w-6xl mx-auto mb-12">
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`bg-white/5 backdrop-blur-sm rounded-2xl p-8 border-2 border-dashed transition-all ${isDragging
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
              accept="image/*,video/*,audio/*,.pdf,.docx,.xlsx,.pptx,.ppt,.msg,.md,.txt,.js,.jsx,.ts,.tsx,.json,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.html,.css,.xml,.yaml,.yml,.mp4,.webm,.ogg,.ogv,.mov,.avi,.mkv,.m4v,.3gp,.flv"
            />
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 transition-transform ${isDragging ? 'scale-110' : ''
                }`}>
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-white text-xl font-medium mb-2">
                {isDragging ? '松开以上传文件' : '上传本地文件预览'}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {isDragging ? '将文件拖放到此处' : '支持图片、PDF、Word、Excel、视频、音频等格式'}
              </p>
              {!isDragging && (
                <div className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white font-medium hover:shadow-lg hover:scale-105 transition-all">
                  选择文件或拖拽到此处
                </div>
              )}
            </label>
          </div>
        </div>

        {/* 已上传的文件列表 */}
        {uploadedFiles.length > 0 && (
          <div className="max-w-6xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">已上传的文件</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {uploadedFiles.map((file, index) => {
                return (
                  <div
                    key={file.id}
                    className="group relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/30 transition-all duration-300"
                  >
                    <button
                      onClick={() => handleFileClick(index)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 text-white group-hover:scale-110 transition-transform">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-lg mb-2 truncate">
                            {file.name}
                          </h3>
                          <p className="text-gray-400 text-sm truncate">
                            {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                          </p>
                          {file.size && (
                            <p className="text-gray-500 text-xs mt-1">
                              {formatFileSize(file.size)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 text-green-400 text-sm font-medium group-hover:text-green-300">
                        点击预览 →
                      </div>
                    </button>

                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(file.id);
                      }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"
                      title="删除文件"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 页脚 */}
      <footer className="max-w-6xl mx-auto mt-12 mb-8 text-center">
        <div className="text-gray-400 text-sm">
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
          <p>
            <a
              href="https://github.com/wh131462/react-file-preview/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              MIT License
            </a>
            {' '} · {' '}
            <a
              href="https://github.com/wh131462/react-file-preview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 transition-colors"
            >
              GitHub
            </a>
            {' '} · {' '}
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

