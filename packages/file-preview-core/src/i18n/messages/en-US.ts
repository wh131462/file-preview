import type { Messages } from '../types';

/**
 * Built-in English (en-US) dictionary
 */
export const enUS: Messages = {
  // ─────── common ───────
  'common.download': 'Download',
  'common.close': 'Close',
  'common.loading': 'Loading',
  'common.unknown_error': 'Unknown error',
  'common.unsupported_preview': 'Preview not supported for this file type ({type})',

  // ─────── toolbar ───────
  'toolbar.zoom_in': 'Zoom in',
  'toolbar.zoom_out': 'Zoom out',
  'toolbar.rotate_left': 'Rotate left',
  'toolbar.rotate_right': 'Rotate right',
  'toolbar.reset': 'Reset',
  'toolbar.fit_to_window': 'Fit to window',
  'toolbar.original_size': 'Original size',
  'toolbar.toc': 'Table of contents',
  'toolbar.prev_page': 'Previous page',
  'toolbar.next_page': 'Next page',
  'toolbar.full_width': 'Full width',
  'toolbar.normal_width': 'Normal width',
  'toolbar.wrap_on': 'Word wrap',
  'toolbar.wrap_off': 'No wrap',
  'toolbar.source': 'Source',
  'toolbar.preview': 'Preview',

  // ─────── image ───────
  'image.load_failed': 'Failed to load image',

  // ─────── pdf ───────
  'pdf.load_failed': 'Failed to load PDF',

  // ─────── docx ───────
  'docx.parse_failed': 'Failed to parse Word document',

  // ─────── xlsx ───────
  'xlsx.loading': 'Loading Excel...',
  'xlsx.load_failed': 'Failed to load Excel',
  'xlsx.parse_failed': 'Failed to parse Excel file',
  'xlsx.not_found': 'Excel file not found',

  // ─────── pptx ───────
  'pptx.loading': 'Loading PPT...',
  'pptx.load_failed': 'Failed to load PPT',
  'pptx.parse_failed': 'Failed to parse PPT file',
  'pptx.not_found': 'PPT file not found',
  'pptx.invalid_format': 'PPT file format is invalid or corrupted',
  'pptx.no_pages': 'PPT file has no valid pages',
  'pptx.timeout': 'Loading timed out, please check your network and retry',

  // ─────── msg ───────
  'msg.parse_failed': 'Failed to parse Outlook message',
  'msg.parse_failed_short': 'Failed to parse message',
  'msg.empty_body': '(No message body)',

  // ─────── epub ───────
  'epub.load_failed': 'Failed to load EPUB',

  // ─────── mobi ───────
  'mobi.load_failed': 'Failed to load ebook — file may be corrupted or DRM-protected',

  // ─────── video ───────
  'video.loading': 'Loading video...',
  'video.load_failed': 'Failed to load video',
  'video.load_failed_with_error': 'Failed to load video: {error}',

  // ─────── audio (aria-label) ───────
  'audio.aria.play': 'Play',
  'audio.aria.pause': 'Pause',
  'audio.aria.forward_10': 'Forward 10 seconds',
  'audio.aria.backward_10': 'Back 10 seconds',
  'audio.aria.mute': 'Mute',
  'audio.aria.unmute': 'Unmute',
  'audio.aria.loop_on': 'Enable loop',
  'audio.aria.loop_off': 'Disable loop',
  'audio.aria.progress': 'Playback progress',
  'audio.aria.volume': 'Volume',

  // ─────── markdown ───────
  'markdown.load_failed': 'Failed to load Markdown',
  'markdown.copy_code': 'Copy code',
  'markdown.copied': 'Copied',

  // ─────── json ───────
  'json.load_failed': 'Failed to load JSON',
  'json.items': 'items',
  'json.keys': 'keys',

  // ─────── csv ───────
  'csv.load_failed': 'Failed to load CSV',
  'csv.parse_failed': 'Failed to parse CSV',

  // ─────── xml ───────
  'xml.load_failed': 'Failed to load XML',

  // ─────── subtitle / lyric ───────
  'subtitle.load_failed': 'Failed to load subtitle',
  'subtitle.parse_failed': 'Failed to parse subtitle',
  'subtitle.lines': 'lines',
  'subtitle.cues': 'cues',
  'subtitle.meta.title': 'Title',
  'subtitle.meta.artist': 'Artist',
  'subtitle.meta.album': 'Album',
  'subtitle.meta.author': 'Author',
  'subtitle.meta.by': 'By',
  'subtitle.meta.length': 'Length',
  'subtitle.meta.offset': 'Offset',
  'subtitle.meta.editor': 'Editor',
  'subtitle.meta.version': 'Version',

  // ─────── zip ───────
  'zip.load_failed': 'Failed to load ZIP',
  'zip.parse_failed': 'Failed to parse ZIP',

  // ─────── text ───────
  'text.load_failed': 'Failed to load text file',
};
