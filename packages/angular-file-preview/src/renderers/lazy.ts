import type { Type } from '@angular/core';

export type LazyRenderer = () => Promise<Type<unknown>>;

export const ImageRenderer: LazyRenderer = () =>
  import('./image/image-renderer.component').then((m) => m.ImageRendererComponent);
export const PdfRenderer: LazyRenderer = () =>
  import('./pdf/pdf-renderer.component').then((m) => m.PdfRendererComponent);
export const DocxRenderer: LazyRenderer = () =>
  import('./docx/docx-renderer.component').then((m) => m.DocxRendererComponent);
export const XlsxRenderer: LazyRenderer = () =>
  import('./xlsx/xlsx-renderer.component').then((m) => m.XlsxRendererComponent);
export const PptxRenderer: LazyRenderer = () =>
  import('./pptx/pptx-renderer.component').then((m) => m.PptxRendererComponent);
export const MsgRenderer: LazyRenderer = () =>
  import('./msg/msg-renderer.component').then((m) => m.MsgRendererComponent);
export const EpubRenderer: LazyRenderer = () =>
  import('./epub/epub-renderer.component').then((m) => m.EpubRendererComponent);
export const MobiRenderer: LazyRenderer = () =>
  import('./mobi/mobi-renderer.component').then((m) => m.MobiRendererComponent);
export const VideoRenderer: LazyRenderer = () =>
  import('./video/video-renderer.component').then((m) => m.VideoRendererComponent);
export const AudioRenderer: LazyRenderer = () =>
  import('./audio/audio-renderer.component').then((m) => m.AudioRendererComponent);
export const MarkdownRenderer: LazyRenderer = () =>
  import('./markdown/markdown-renderer.component').then((m) => m.MarkdownRendererComponent);
export const JsonRenderer: LazyRenderer = () =>
  import('./json/json-renderer.component').then((m) => m.JsonRendererComponent);
export const CsvRenderer: LazyRenderer = () =>
  import('./csv/csv-renderer.component').then((m) => m.CsvRendererComponent);
export const XmlRenderer: LazyRenderer = () =>
  import('./xml/xml-renderer.component').then((m) => m.XmlRendererComponent);
export const SubtitleRenderer: LazyRenderer = () =>
  import('./subtitle/subtitle-renderer.component').then((m) => m.SubtitleRendererComponent);
export const ZipRenderer: LazyRenderer = () =>
  import('./zip/zip-renderer.component').then((m) => m.ZipRendererComponent);
export const TextRenderer: LazyRenderer = () =>
  import('./text/text-renderer.component').then((m) => m.TextRendererComponent);
export const FontRenderer: LazyRenderer = () =>
  import('./font/font-renderer.component').then((m) => m.FontRendererComponent);
export const CadRenderer: LazyRenderer = () =>
  import('./cad/cad-renderer.component').then((m) => m.CadRendererComponent);
