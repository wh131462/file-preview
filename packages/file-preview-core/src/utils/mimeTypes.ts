/**
 * 文件扩展名到 MIME 类型的映射表
 * 包含标准格式和高级图片格式（HEIC/AVIF/TIFF/RAW/PSD等）
 */
export const EXTENSION_TO_MIME: Record<string, string> = {
  // 标准图片格式
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',

  // 高级图片格式
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  tif: 'image/tiff',
  tiff: 'image/tiff',

  // RAW 格式
  cr2: 'image/x-canon-cr2',
  nef: 'image/x-nikon-nef',
  arw: 'image/x-sony-arw',
  dng: 'image/x-adobe-dng',
  raf: 'image/x-fuji-raf',
  orf: 'image/x-olympus-orf',

  // 其他专业格式
  psd: 'image/vnd.adobe.photoshop',
  jp2: 'image/jp2',
  jpx: 'image/jpx',
  j2k: 'image/jp2',

  // 文档格式
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',

  // 其他
  msg: 'application/vnd.ms-outlook',
  epub: 'application/epub+zip',
  mobi: 'application/x-mobipocket-ebook',
  azw: 'application/vnd.amazon.ebook',
  azw3: 'application/vnd.amazon.ebook',
  kf8: 'application/vnd.amazon.ebook',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  xml: 'application/xml',
  json: 'application/json',
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
  zip: 'application/zip',

  // 字体
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',

  // 视频
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

  // 音频
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  aac: 'audio/aac',

  // 字幕
  srt: 'application/x-subrip',
  vtt: 'text/vtt',
  lrc: 'application/x-lrc',
  elrc: 'application/x-lrc',
  ass: 'text/x-ssa',
  ssa: 'text/x-ssa',
  ttml: 'application/ttml+xml',
  dfxp: 'application/ttml+xml',

  // CAD / 3D
  dxf: 'application/dxf',
  stl: 'model/stl',
  obj: 'model/obj',
  gltf: 'model/gltf+json',
  glb: 'model/gltf-binary',
};

/**
 * 根据文件扩展名获取 MIME 类型
 * @param extension 文件扩展名（不含点号）
 * @returns MIME 类型字符串，未知时返回 'application/octet-stream'
 */
export function getMimeTypeFromExtension(extension: string): string {
  const ext = extension.toLowerCase();
  return EXTENSION_TO_MIME[ext] || 'application/octet-stream';
}

/**
 * 根据文件名获取 MIME 类型
 * @param fileName 文件名
 * @returns MIME 类型字符串
 */
export function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return getMimeTypeFromExtension(ext);
}

/**
 * 检测是否为高级图片格式（需要额外解码）
 * @param mimeType MIME 类型
 * @returns 是否为高级图片格式
 */
export function isAdvancedImageFormat(mimeType: string): boolean {
  const advancedFormats = [
    'image/heic',
    'image/heif',
    'image/avif',
    'image/tiff',
    'image/x-canon-cr2',
    'image/x-nikon-nef',
    'image/x-sony-arw',
    'image/x-adobe-dng',
    'image/x-fuji-raf',
    'image/x-olympus-orf',
    'image/vnd.adobe.photoshop',
    'image/jp2',
    'image/jpx',
  ];
  return advancedFormats.includes(mimeType);
}

/**
 * 检测是否为 RAW 格式
 * @param mimeType MIME 类型
 * @returns 是否为 RAW 格式
 */
export function isRawFormat(mimeType: string): boolean {
  return mimeType.startsWith('image/x-') &&
    ['cr2', 'nef', 'arw', 'dng', 'raf', 'orf'].some(ext => mimeType.includes(ext));
}
