import type { PreviewFile, FileType } from '../types';

/**
 * 根据 PreviewFile 的 mime 类型和文件名后缀推断文件类型
 */
export function getFileType(file: PreviewFile): FileType {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type.toLowerCase();

  if (
    mimeType.startsWith('image/') ||
    [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
      // 高级图片格式
      'heic', 'heif', 'avif', 'tif', 'tiff',
      // RAW 格式
      'cr2', 'nef', 'arw', 'dng', 'raf', 'orf',
      // 其他专业格式
      'psd', 'jp2', 'jpx', 'j2k',
    ].includes(ext)
  ) {
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
  if (mimeType.includes('epub') || ext === 'epub') {
    return 'epub';
  }
  if (
    ['mobi', 'azw', 'azw3', 'kf8'].includes(ext) ||
    mimeType === 'application/x-mobipocket-ebook' ||
    mimeType === 'application/vnd.amazon.ebook'
  ) {
    return 'mobi';
  }
  if (['csv', 'tsv'].includes(ext) || mimeType === 'text/csv' || mimeType === 'text/tab-separated-values') {
    return 'csv';
  }
  if (ext === 'xml' || mimeType === 'application/xml' || mimeType === 'text/xml') {
    return 'xml';
  }
  if (
    ['srt', 'vtt', 'lrc', 'elrc', 'ass', 'ssa', 'ttml', 'dfxp'].includes(ext) ||
    mimeType === 'text/vtt' ||
    mimeType === 'application/x-subrip' ||
    mimeType === 'application/ttml+xml'
  ) {
    return 'subtitle';
  }
  if (ext === 'zip' || mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') {
    return 'zip';
  }
  if (
    ['ttf', 'otf', 'woff', 'woff2'].includes(ext) ||
    mimeType.startsWith('font/') ||
    mimeType === 'application/font-woff' ||
    mimeType === 'application/font-woff2' ||
    mimeType === 'application/x-font-ttf' ||
    mimeType === 'application/x-font-otf' ||
    mimeType === 'application/font-sfnt'
  ) {
    return 'font';
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
  if (mimeType === 'application/json' || ext === 'json' || ext === 'jsonc') {
    return 'json';
  }
  const textExtensions = [
    'txt', 'log', 'lock',
    'js', 'jsx', 'ts', 'tsx',
    'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'mod', 'rs', 'swift', 'kt', 'lua', 'vim',
    'html', 'css', 'scss', 'sass', 'less',
    'yaml', 'yml', 'toml', 'ini', 'conf', 'env',
    'diff', 'patch',
    'sh', 'bash', 'zsh', 'sql',
  ];
  if (mimeType.startsWith('text/') || textExtensions.includes(ext)) {
    return 'text';
  }
  // 识别以 . 开头的配置文件（如 .gitignore, .prettierrc, .zshrc 等）
  if (file.name.startsWith('.') && !file.name.includes('/')) {
    return 'text';
  }
  return 'unsupported';
}

/**
 * 根据文件名后缀推断代码高亮语言
 */
export function getLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    mod: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    lua: 'lua',
    vim: 'vim',
    scala: 'scala',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    json: 'json',
    jsonc: 'json',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    env: 'bash',
    conf: 'nginx',
    diff: 'diff',
    patch: 'diff',
    log: 'log',
    md: 'markdown',
    txt: 'text',
  };

  // 优先使用扩展名映射
  if (languageMap[ext]) {
    return languageMap[ext];
  }

  // 处理以 . 开头的配置文件（无扩展名或特殊命名）
  if (fileName.startsWith('.')) {
    const fullName = fileName.toLowerCase();
    const configFileMap: Record<string, string> = {
      // Git 相关
      '.gitignore': 'ini',
      '.gitattributes': 'ini',
      '.gitmodules': 'ini',
      '.gitkeep': 'text',
      // 编辑器配置
      '.editorconfig': 'ini',
      '.prettierrc': 'json',
      '.prettierignore': 'ini',
      '.eslintrc': 'json',
      '.eslintignore': 'ini',
      '.stylelintrc': 'json',
      // Shell 配置
      '.bashrc': 'bash',
      '.zshrc': 'bash',
      '.bash_profile': 'bash',
      '.zprofile': 'bash',
      '.profile': 'bash',
      '.vimrc': 'vim',
      // 环境变量
      '.env': 'bash',
      '.env.local': 'bash',
      '.env.development': 'bash',
      '.env.production': 'bash',
      '.env.test': 'bash',
      // 其他配置
      '.npmrc': 'ini',
      '.yarnrc': 'ini',
      '.nvmrc': 'text',
      '.dockerignore': 'ini',
    };

    if (configFileMap[fullName]) {
      return configFileMap[fullName];
    }

    // 匹配 .env.* 开头的环境变量文件
    if (fullName.startsWith('.env')) {
      return 'bash';
    }

    // 其他以 rc 结尾的配置文件
    if (fullName.endsWith('rc')) {
      return 'json';
    }

    // 其他以 ignore 结尾的忽略文件
    if (fullName.endsWith('ignore')) {
      return 'ini';
    }
  }

  return 'text';
}

/**
 * 根据视频文件 URL 推断 MIME 类型（用于 video.js sources）
 */
export function getVideoMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
  const typeMap: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    m4v: 'video/mp4',
    '3gp': 'video/3gpp',
    flv: 'video/x-flv',
  };
  return typeMap[ext] || 'video/mp4';
}

/**
 * 格式化文件大小为人类可读格式
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 格式化时长 (秒) 为 mm:ss
 */
export function formatTime(time: number): string {
  if (!isFinite(time) || isNaN(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
