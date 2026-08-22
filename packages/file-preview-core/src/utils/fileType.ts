import type { PreviewFile, FileType } from '../types';

const specialCodeFileLanguages: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
};

function fileExtension(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() || '';
  const clean = base.split('?')[0].split('#')[0];
  return clean.split('.').pop()?.toLowerCase() || '';
}

function baseMime(mimeType: string): string {
  return mimeType.split(';')[0].trim().toLowerCase();
}

/**
 * 根据 PreviewFile 的 mime 类型和文件名后缀推断文件类型
 */
export function getFileType(file: PreviewFile): FileType {
  const ext = fileExtension(file.name);
  const lowerFileName = file.name.toLowerCase();
  const lowerBaseName = lowerFileName.split(/[\\/]/).pop() || '';
  const mimeType = baseMime(file.type);

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
  if (
    ext === 'doc' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.ms-word'
  ) {
    return 'doc';
  }
  if (mimeType.includes('spreadsheetml') || ext === 'xlsx') {
    return 'xlsx';
  }
  if (
    ext === 'xls' ||
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/excel' ||
    mimeType === 'application/x-excel' ||
    mimeType === 'application/x-msexcel'
  ) {
    // Route legacy BIFF through the existing Xlsx renderer (isLegacyXls).
    return 'xlsx';
  }
  if (mimeType.includes('presentationml') || ext === 'pptx') {
    return 'pptx';
  }
  if (
    ext === 'ppt' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/mspowerpoint'
  ) {
    return 'ppt';
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
  if (
    ['dxf', 'stl', 'obj', 'gltf', 'glb'].includes(ext) ||
    mimeType === 'application/dxf' ||
    mimeType === 'application/vnd.ms-pki.stl' ||
    mimeType === 'model/stl' ||
    mimeType === 'model/obj' ||
    mimeType === 'model/gltf+json' ||
    mimeType === 'model/gltf-binary'
  ) {
    return 'cad';
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
    'js', 'jsx', 'ts', 'tsx', 'cjs', 'mjs', 'cts', 'mts',
    'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'mod', 'rs', 'swift', 'kt', 'scala', 'lua', 'vim',
    'html', 'vue', 'svelte', 'astro', 'css', 'scss', 'sass', 'less',
    'dart', 'graphql', 'gql', 'proto', 'prisma',
    'yaml', 'yml', 'toml', 'ini', 'conf', 'env',
    'tf', 'tfvars',
    'diff', 'patch',
    'sh', 'bash', 'zsh', 'ps1', 'sql',
  ];
  if (
    mimeType.startsWith('text/') ||
    textExtensions.includes(ext) ||
    specialCodeFileLanguages[lowerBaseName]
  ) {
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
  const lowerFileName = fileName.toLowerCase();
  const ext = lowerFileName.split('.').pop() || '';
  const lowerBaseName = lowerFileName.split(/[\\/]/).pop() || '';
  const specialLanguage = specialCodeFileLanguages[lowerBaseName];
  if (specialLanguage) {
    return specialLanguage;
  }

  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    cjs: 'javascript',
    mjs: 'javascript',
    cts: 'typescript',
    mts: 'typescript',
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
    scala: 'scala',
    lua: 'lua',
    vim: 'vim',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    json: 'json',
    jsonc: 'json',
    xml: 'xml',
    html: 'html',
    vue: 'vue',
    svelte: 'svelte',
    astro: 'astro',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    dart: 'dart',
    graphql: 'graphql',
    gql: 'graphql',
    proto: 'proto',
    prisma: 'prisma',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    env: 'bash',
    conf: 'nginx',
    tf: 'terraform',
    tfvars: 'terraform',
    diff: 'diff',
    patch: 'diff',
    ps1: 'powershell',
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
    const fullName = lowerFileName;
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
