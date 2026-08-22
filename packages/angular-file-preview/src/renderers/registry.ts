import type { FileType, PreviewFile } from '../fp-core';
import type { RendererLoader } from './lazy';
import {
  loadImageRenderer,
  loadPdfRenderer,
  loadDocxRenderer,
  loadXlsxRenderer,
  loadPptxRenderer,
  loadMsgRenderer,
  loadEpubRenderer,
  loadMobiRenderer,
  loadVideoRenderer,
  loadAudioRenderer,
  loadMarkdownRenderer,
  loadJsonRenderer,
  loadCsvRenderer,
  loadXmlRenderer,
  loadSubtitleRenderer,
  loadZipRenderer,
  loadTextRenderer,
  loadFontRenderer,
  loadCadRenderer,
  loadDocRenderer,
  loadPptRenderer,
} from './lazy';

export interface RendererContext {
  resolvedUrl: string;
  zipNestingDepth: number;
  currentFile: PreviewFile;
}

export interface BuiltinRendererConfig {
  fileType: FileType;
  loader: RendererLoader;
  getProps: (ctx: RendererContext) => Record<string, unknown>;
}

export const BUILTIN_RENDERERS: BuiltinRendererConfig[] = [
  {
    fileType: 'image',
    loader: loadImageRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileSize: ctx.currentFile.size,
      file: ctx.currentFile,
    }),
  },
  {
    fileType: 'pdf',
    loader: loadPdfRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'docx',
    loader: loadDocxRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'doc',
    loader: loadDocRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'xlsx',
    loader: loadXlsxRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'xls',
    loader: loadXlsxRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'pptx',
    loader: loadPptxRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'ppt',
    loader: loadPptRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'msg',
    loader: loadMsgRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'epub',
    loader: loadEpubRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'mobi',
    loader: loadMobiRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'video',
    loader: loadVideoRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'audio',
    loader: loadAudioRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'markdown',
    loader: loadMarkdownRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'json',
    loader: loadJsonRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'csv',
    loader: loadCsvRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'xml',
    loader: loadXmlRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'subtitle',
    loader: loadSubtitleRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'zip',
    loader: loadZipRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      nestingDepth: ctx.zipNestingDepth,
    }),
  },
  {
    fileType: 'text',
    loader: loadTextRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'font',
    loader: loadFontRenderer,
    getProps: (ctx) => ({ url: ctx.resolvedUrl }),
  },
  {
    fileType: 'cad',
    loader: loadCadRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      file: ctx.currentFile.file,
      fileName: ctx.currentFile.name,
    }),
  },
];
