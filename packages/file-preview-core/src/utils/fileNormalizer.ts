import { PreviewFile, PreviewFileInput } from '../types';

/**
 * 从 URL 字符串中提取文件名
 */
export function getFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split('/').pop() || 'file';
    return decodeURIComponent(fileName);
  } catch {
    // 如果不是有效的 URL，尝试从路径中提取
    const fileName = url.split('/').pop() || 'file';
    return decodeURIComponent(fileName);
  }
}

/**
 * 从文件名中推断 MIME 类型
 */
export function inferMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const mimeTypes: Record<string, string> = {
    // 图片
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',

    // 视频
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    m4v: 'video/x-m4v',
    '3gp': 'video/3gpp',
    flv: 'video/x-flv',

    // 音频
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    flac: 'audio/flac',

    // 文档
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    msg: 'application/vnd.ms-outlook',
    mobi: 'application/x-mobipocket-ebook',
    azw: 'application/vnd.amazon.ebook',
    azw3: 'application/vnd.amazon.ebook',
    kf8: 'application/vnd.amazon.ebook',

    // 文本
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    ts: 'text/typescript',
    jsx: 'text/javascript',
    tsx: 'text/typescript',
    py: 'text/x-python',
    java: 'text/x-java',
    cpp: 'text/x-c++src',
    c: 'text/x-csrc',
    cs: 'text/x-csharp',
    php: 'text/x-php',
    rb: 'text/x-ruby',
    go: 'text/x-go',
    rs: 'text/x-rust',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    toml: 'text/toml',
    ini: 'text/plain',
    env: 'text/plain',
    diff: 'text/x-diff',
    patch: 'text/x-diff',
    log: 'text/plain',
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
    srt: 'application/x-subrip',
    vtt: 'text/vtt',
    zip: 'application/zip',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 标准化文件输入为 PreviewFile 格式
 * 支持三种输入类型：
 * 1. File 对象（原生浏览器 File）
 * 2. PreviewFileLink 对象（包含 name, url, type 等属性）
 * 3. string（HTTP URL）
 */
export function normalizeFile(input: PreviewFileInput, index: number = 0): PreviewFile {
  // 情况 1: 原生 File 对象
  if (input instanceof File) {
    return {
      id: `file-${Date.now()}-${index}`,
      name: input.name,
      url: URL.createObjectURL(input),
      type: input.type || inferMimeType(input.name),
      size: input.size,
      file: input, // 保留原始 File 对象
    };
  }

  // 情况 2: 字符串 URL
  if (typeof input === 'string') {
    const fileName = getFileNameFromUrl(input);
    return {
      id: `url-${Date.now()}-${index}`,
      name: fileName,
      url: input,
      type: inferMimeType(fileName),
    };
  }

  // 情况 3: PreviewFileLink 对象
  return {
    id: input.id || `link-${Date.now()}-${index}`,
    name: input.name,
    url: input.url,
    type: input.type || inferMimeType(input.name),
    size: input.size,
  };
}

/**
 * 批量标准化文件输入
 */
export function normalizeFiles(inputs: PreviewFileInput[]): PreviewFile[] {
  return inputs.map((input, index) => normalizeFile(input, index));
}
