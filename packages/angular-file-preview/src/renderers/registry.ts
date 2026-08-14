import type { Type } from '@angular/core';
import type { FileType, PreviewFile } from '@eternalheart/file-preview-core';
import {
  ImageRenderer,
  PdfRenderer,
  DocxRenderer,
  XlsxRenderer,
  PptxRenderer,
  MsgRenderer,
  EpubRenderer,
  MobiRenderer,
  VideoRenderer,
  AudioRenderer,
  MarkdownRenderer,
  JsonRenderer,
  CsvRenderer,
  XmlRenderer,
  SubtitleRenderer,
  ZipRenderer,
  TextRenderer,
  FontRenderer,
  CadRenderer,
  type LazyRenderer,
} from './lazy';

export interface RendererContext {
  resolvedUrl: string;
  zipNestingDepth: number;
  currentFile: PreviewFile;
}

export interface BuiltinRendererConfig {
  fileType: FileType;
  load: LazyRenderer;
  getProps: (ctx: RendererContext) => Record<string, unknown>;
}

export const BUILTIN_RENDERERS: BuiltinRendererConfig[] = [
  {
    fileType: 'image',
    load: ImageRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileSize: ctx.currentFile.size,
      file: ctx.currentFile,
    }),
  },
  {
    fileType: 'pdf',
    load: PdfRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'docx',
    load: DocxRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'xlsx',
    load: XlsxRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'pptx',
    load: PptxRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'msg',
    load: MsgRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'epub',
    load: EpubRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'mobi',
    load: MobiRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'video',
    load: VideoRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'audio',
    load: AudioRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'markdown',
    load: MarkdownRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'json',
    load: JsonRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'csv',
    load: CsvRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'xml',
    load: XmlRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'subtitle',
    load: SubtitleRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'zip',
    load: ZipRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      nestingDepth: ctx.zipNestingDepth,
    }),
  },
  {
    fileType: 'text',
    load: TextRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'font',
    load: FontRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'cad',
    load: CadRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      file: ctx.currentFile.file,
      fileName: ctx.currentFile.name,
    }),
  },
];

export type LoadedRenderer = Type<unknown>;
