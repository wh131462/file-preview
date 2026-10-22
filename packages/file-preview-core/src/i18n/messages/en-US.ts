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
  'common.retry': 'Retry',
  'common.load_failed': 'Failed to load',
  'request.failed': 'Request failed: {status}',
  'file.forbidden': 'You do not have permission to access this file',
  'file.server_error': 'Server error, please try again later',
  'file.load_failed': 'Failed to load file',
  'file.load_failed_status': 'Failed to load file ({status})',
  'file.empty': 'File is empty',

  'common.unknown_file': 'Unknown file',

  // ─────── accessibility ───────
  'accessibility.previousFile': 'Previous file',
  'accessibility.nextFile': 'Next file',
  'accessibility.closePreview': 'Close preview',
  'accessibility.downloadFile': 'Download file',

  // ─────── toolbar ───────
  'toolbar.zoom_in': 'Zoom in',
  'toolbar.zoom_out': 'Zoom out',
  'toolbar.rotate_left': 'Rotate left',
  'toolbar.rotate_right': 'Rotate right',
  'toolbar.reset': 'Reset',
  'toolbar.fit_to_window': 'Fit to window',
  'toolbar.original_size': 'Original size',
  'toolbar.toc': 'Table of contents',
  'toolbar.outline': 'Outline',
  'toolbar.prev_page': 'Previous page',
  'toolbar.next_page': 'Next page',
  'toolbar.full_width': 'Full width',
  'toolbar.normal_width': 'Normal width',
  'toolbar.wrap_on': 'Word wrap',
  'toolbar.wrap_off': 'No wrap',
  'toolbar.source': 'Source',
  'toolbar.preview': 'Preview',

  // ─────── image ───────
  'image.offscreen_context_failed': 'Unable to create an OffscreenCanvas 2D context',
  'image.offscreen_unsupported': 'OffscreenCanvas is not supported in this Worker',
  'image.canvas_export_failed': 'Failed to convert {format} Canvas to {output}',
  'image.psd_invalid_api': 'Unexpected ag-psd API',
  'image.jp2_invalid_api': 'Unexpected jpeg2000 API: JpxImage is missing',
  'image.openjpeg_invalid_api': 'Unexpected codec-openjpeg API: factory is missing',
  'image.openjpeg_no_decoder': 'codec-openjpeg does not expose J2KDecoder',
  'image.worker_failed': 'Image Worker failed: {error}',
  'image.worker_create_failed': 'Unable to create Worker: {error}',
  'image.worker_crashed': 'Worker crashed: {error}',
  'image.out_of_memory': 'Device is out of memory',
  'image.unsupported_mime': 'Unsupported MIME type: {type}',
  'image.decoder_failed': '{decoder}: {error}',
  'image.decoding': 'Decoding...',
  'image.load_failed': 'Failed to load image',
  'image.decode_failed': 'Failed to decode image',
  'image.page_decode_failed': 'Failed to decode page',
  'image.avif_decode_failed': 'AVIF decode failed: {error}',
  'image.heic_drm': 'HEIC decode failed: file is DRM-protected',
  'image.heic_decode_failed': 'HEIC decode failed, file may be corrupted: {error}',
  'image.jp2_decode_failed': 'JPEG 2000 decode failed: {error}',
  'image.tiff_decode_failed': 'TIFF decode failed: {error}',
  'image.psd_decode_failed': 'PSD decode failed: {error}',
  'image.canvas_context_failed': 'Unable to create a Canvas 2D context',
  'image.tiff_empty': 'TIFF file contains no images',
  'image.psd_no_preview': 'PSD file does not contain a composite preview image',
  'image.raw_no_preview': 'No embedded preview image was found in the RAW file',
  'image.raw_not_implemented': 'Full RAW decoding is not implemented and no embedded preview was found',

  // ─────── pdf ───────
  'pdf.outline_failed': 'Failed to extract PDF outline',
  'pdf.outline_jump_failed': 'Failed to jump to outline target',
  'pdf.outline_target_failed': 'Failed to resolve outline target',
  'pdf.page_render_failed': 'Failed to render page {page}',
  'pdf.load_failed': 'Failed to load PDF',

  // ─────── docx ───────
  'docx.parse_failed': 'Failed to parse Word document',

  // ─────── doc ───────
  'doc.parse_failed': 'Failed to parse legacy Word document',
  'doc.loading': 'Loading Word document...',

  // ─────── ppt ───────
  'ppt.parse_failed': 'Failed to parse legacy PowerPoint',
  'ppt.loading': 'Loading PPT...',

  // ─────── xlsx ───────
  'xlsx.invalid_legacy_data': 'Invalid legacy Excel workbook data',
  'xlsx.invalid_format': 'Excel file format is invalid or corrupted',
  'xlsx.loading': 'Loading Excel...',
  'xlsx.load_failed': 'Failed to load Excel',
  'xlsx.parse_failed': 'Failed to parse Excel file',
  'xlsx.not_found': 'Excel file not found',

  // ─────── xls ───────
  'xls.parse_failed': 'Failed to parse legacy Excel',
  'xls.loading': 'Loading Excel...',

  // ─────── pptx ───────
  'pptx.loading': 'Loading PPT...',
  'pptx.load_failed': 'Failed to load PPT',
  'pptx.parse_failed': 'Failed to parse PPT file',
  'pptx.not_found': 'PPT file not found',
  'pptx.invalid_format': 'PPT file format is invalid or corrupted',
  'pptx.no_pages': 'PPT file has no valid pages',
  'pptx.timeout': 'Loading timed out, please check your network and retry',

  // ─────── msg ───────
  'msg.no_subject': '(No subject)',
  'msg.parse_failed': 'Failed to parse Outlook message',
  'msg.parse_failed_short': 'Failed to parse message',
  'msg.empty_body': '(No message body)',

  // ─────── epub ───────
  'epub.load_failed': 'Failed to load EPUB',

  // ─────── mobi ───────
  'mobi.timeout': 'Initial ebook rendering timed out',
  'mobi.load_failed': 'Failed to load ebook — file may be corrupted or DRM-protected',

  // ─────── video ───────
  'video.loading': 'Loading video...',
  'video.load_failed': 'Failed to load video',
  'video.load_failed_with_error': 'Failed to load video: {error}',
  'video.format_not_supported': 'Browser does not support {format} format. Please convert to MP4/WebM',
  'video.unsupported_title': 'This video format cannot be played in the browser',
  'video.unsupported_detail': '{format} is a container/codec that browsers do not natively support (typical for AVI / WMV / FLV and some MKV files). Please download and play it in a local player, or convert to MP4 (H.264 + AAC).',
  'video.codec_not_supported_detail': 'The video or audio codec ({codecs}) cannot be decoded by the browser. Please convert to MP4 (H.264 + AAC) before previewing.',

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
  'audio.load_failed': 'Failed to load audio',

  // ─────── markdown ───────
  'markdown.load_failed': 'Failed to load Markdown',
  'markdown.copy_code': 'Copy code',
  'markdown.copied': 'Copied',

  // ─────── json ───────
  'json.load_failed': 'Failed to load JSON',
  'json.items': 'items',
  'json.keys': 'keys',

  // ─────── csv ───────
  'csv.loading': 'Loading CSV...',
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
  'zip.entry_read_failed': 'Failed to read archive entry',
  'zip.load_failed': 'Failed to load ZIP',
  'zip.parse_failed': 'Failed to parse ZIP',
  'zip.select_file': 'Select a file from the left to preview',
  'zip.file_tree': 'File tree',

  // ─────── text ───────
  'text.load_failed': 'Failed to load text file',

  // ─────── font ───────
  'font.invalid_data': 'Font data is invalid',
  'font.metadata_skipped': 'WOFF2 metadata parsing is not supported',
  'font.loading': 'Loading font...',
  'font.load_failed': 'Failed to load font',
  'font.parse_failed': 'Failed to parse font',
  'font.metadata_loading': 'Parsing metadata...',
  'font.metadata_unavailable': 'Metadata unavailable',
  'font.meta.family': 'Family',
  'font.meta.subfamily': 'Subfamily',
  'font.meta.version': 'Version',
  'font.meta.designer': 'Designer',
  'font.meta.glyphs': 'Glyphs',
  'font.meta.format': 'Format',
  'font.sample_text_placeholder': 'Type custom text...',
  'font.latin_samples': 'Latin Alphabet',
  'font.chinese_samples': 'Character Samples',
  'font.sample_latin': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 .,;:!?@#$%&*()[]{}',
  'font.sample_chinese': 'Sphinx of black quartz, judge my vow',
  'font.sample_pangram': 'The Quick Brown Fox Jumps Over The Lazy Dog',

  // ─────── cad ───────
  'cad.loading': 'Loading CAD file...',
  'cad.load_failed': 'Failed to load CAD file',
  'cad.parse_failed': 'Failed to parse CAD file',
  'cad.wireframe': 'Wireframe',
  'cad.solid': 'Solid',
  'cad.grid': 'Grid',
  'cad.axes': 'Axes',
};
