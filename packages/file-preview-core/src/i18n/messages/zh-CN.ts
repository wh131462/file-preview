import type { Messages } from '../types';

/**
 * 内置中文字典（默认 / 兜底语言）
 */
export const zhCN: Messages = {
  // ─────── common ───────
  'common.download': '下载',
  'common.close': '关闭',
  'common.loading': '加载中',
  'common.unknown_error': '未知错误',
  'common.unsupported_preview': '不支持预览此文件类型 ({type})',

  // ─────── toolbar ───────
  'toolbar.zoom_in': '放大',
  'toolbar.zoom_out': '缩小',
  'toolbar.rotate_left': '向左旋转',
  'toolbar.rotate_right': '向右旋转',
  'toolbar.reset': '复原',
  'toolbar.fit_to_window': '适应窗口',
  'toolbar.original_size': '原始尺寸',
  'toolbar.toc': '目录',
  'toolbar.prev_page': '上一页',
  'toolbar.next_page': '下一页',
  'toolbar.full_width': '全屏宽度',
  'toolbar.normal_width': '正常宽度',
  'toolbar.wrap_on': '自动换行',
  'toolbar.wrap_off': '不换行',
  'toolbar.source': '源码',
  'toolbar.preview': '预览',

  // ─────── image ───────
  'image.load_failed': '图片加载失败',

  // ─────── pdf ───────
  'pdf.load_failed': 'PDF 文件加载失败',

  // ─────── docx ───────
  'docx.parse_failed': 'Word 文档解析失败',

  // ─────── xlsx ───────
  'xlsx.loading': '加载 Excel 中...',
  'xlsx.load_failed': 'Excel 加载失败',
  'xlsx.parse_failed': 'Excel 文件解析失败',
  'xlsx.not_found': 'Excel 文件不存在',

  // ─────── pptx ───────
  'pptx.loading': '加载 PPT 中...',
  'pptx.load_failed': 'PPT 加载失败',
  'pptx.parse_failed': 'PPT 文件解析失败',
  'pptx.not_found': 'PPT 文件不存在',
  'pptx.invalid_format': 'PPT 文件格式错误或已损坏',
  'pptx.no_pages': 'PPT 文件无有效页面',
  'pptx.timeout': '加载超时，请检查网络或稍后重试',

  // ─────── msg ───────
  'msg.parse_failed': 'Outlook 邮件解析失败',
  'msg.parse_failed_short': '邮件解析失败',
  'msg.empty_body': '（无邮件正文）',

  // ─────── epub ───────
  'epub.load_failed': 'EPUB 文件加载失败',

  // ─────── mobi ───────
  'mobi.load_failed': '电子书加载失败，文件可能已损坏或带有 DRM 保护',

  // ─────── video ───────
  'video.loading': '加载视频中...',
  'video.load_failed': '视频加载失败',
  'video.load_failed_with_error': '视频加载失败: {error}',

  // ─────── audio (aria-label) ───────
  'audio.aria.play': '播放',
  'audio.aria.pause': '暂停',
  'audio.aria.forward_10': '前进 10 秒',
  'audio.aria.backward_10': '后退 10 秒',
  'audio.aria.mute': '静音',
  'audio.aria.unmute': '取消静音',
  'audio.aria.loop_on': '开启循环',
  'audio.aria.loop_off': '关闭循环',
  'audio.aria.progress': '播放进度',
  'audio.aria.volume': '音量',

  // ─────── markdown ───────
  'markdown.load_failed': 'Markdown 文件加载失败',
  'markdown.copy_code': '复制代码',
  'markdown.copied': '已复制',

  // ─────── json ───────
  'json.load_failed': 'JSON 文件加载失败',
  'json.items': 'items',
  'json.keys': 'keys',

  // ─────── csv ───────
  'csv.load_failed': 'CSV 文件加载失败',
  'csv.parse_failed': 'CSV 解析失败',

  // ─────── xml ───────
  'xml.load_failed': 'XML 文件加载失败',

  // ─────── subtitle / lyric ───────
  'subtitle.load_failed': '字幕文件加载失败',
  'subtitle.parse_failed': '字幕解析失败',
  'subtitle.lines': 'lines',
  'subtitle.cues': 'cues',
  'subtitle.meta.title': '标题',
  'subtitle.meta.artist': '艺术家',
  'subtitle.meta.album': '专辑',
  'subtitle.meta.author': '作者',
  'subtitle.meta.by': '制作',
  'subtitle.meta.length': '时长',
  'subtitle.meta.offset': '偏移',
  'subtitle.meta.editor': '编辑器',
  'subtitle.meta.version': '版本',

  // ─────── zip ───────
  'zip.load_failed': 'ZIP 文件加载失败',
  'zip.parse_failed': 'ZIP 解析失败',

  // ─────── text ───────
  'text.load_failed': '文本文件加载失败',
};
