import type { Type } from '@angular/core';

export type RendererLoader = () => Promise<Type<unknown>>;

export const loadImageRenderer: RendererLoader = () =>
  import('./Image/index').then((m) => m.ImageRenderer);
export const loadPdfRenderer: RendererLoader = () =>
  import('./Pdf/index').then((m) => m.PdfRenderer);
export const loadDocxRenderer: RendererLoader = () =>
  import('./Docx/index').then((m) => m.DocxRenderer);
export const loadXlsxRenderer: RendererLoader = () =>
  import('./Xlsx/index').then((m) => m.XlsxRenderer);
export const loadPptxRenderer: RendererLoader = () =>
  import('./Pptx/index').then((m) => m.PptxRenderer);
export const loadMsgRenderer: RendererLoader = () =>
  import('./Msg/index').then((m) => m.MsgRenderer);
export const loadEpubRenderer: RendererLoader = () =>
  import('./Epub/index').then((m) => m.EpubRenderer);
export const loadMobiRenderer: RendererLoader = () =>
  import('./Mobi/index').then((m) => m.MobiRenderer);
export const loadVideoRenderer: RendererLoader = () =>
  import('./Video/index').then((m) => m.VideoRenderer);
export const loadAudioRenderer: RendererLoader = () =>
  import('./Audio/index').then((m) => m.AudioRenderer);
export const loadMarkdownRenderer: RendererLoader = () =>
  import('./Markdown/index').then((m) => m.MarkdownRenderer);
export const loadJsonRenderer: RendererLoader = () =>
  import('./Json/index').then((m) => m.JsonRenderer);
export const loadCsvRenderer: RendererLoader = () =>
  import('./Csv/index').then((m) => m.CsvRenderer);
export const loadXmlRenderer: RendererLoader = () =>
  import('./Xml/index').then((m) => m.XmlRenderer);
export const loadSubtitleRenderer: RendererLoader = () =>
  import('./Subtitle/index').then((m) => m.SubtitleRenderer);
export const loadZipRenderer: RendererLoader = () =>
  import('./Zip/index').then((m) => m.ZipRenderer);
export const loadTextRenderer: RendererLoader = () =>
  import('./Text/index').then((m) => m.TextRenderer);
export const loadFontRenderer: RendererLoader = () =>
  import('./Font/index').then((m) => m.FontRenderer);
export const loadCadRenderer: RendererLoader = () =>
  import('./Cad/index').then((m) => m.CadRenderer);
export const loadDocRenderer: RendererLoader = () =>
  import('./Doc/index').then((m) => m.DocRenderer);
export const loadPptRenderer: RendererLoader = () =>
  import('./Ppt/index').then((m) => m.PptRenderer);
