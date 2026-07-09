import type { LazyExoticComponent, ComponentType } from 'react';
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
} from './lazy';

/**
 * 渲染器上下文：主组件传递给 getProps 的环境信息
 */
export interface RendererContext {
  /** 解析后的 URL（可能是 blob URL） */
  resolvedUrl: string;
  /** ZIP 嵌套深度 */
  zipNestingDepth: number;
  /** 当前文件对象 */
  currentFile: PreviewFile;
}

/**
 * 内置渲染器配置
 */
export interface BuiltinRendererConfig {
  /** 匹配的文件类型 */
  fileType: FileType;
  /** 渲染器组件（懒加载） */
  component: LazyExoticComponent<ComponentType<any>>;
  /** 计算传给组件的 props */
  getProps: (ctx: RendererContext) => Record<string, any>;
}

/**
 * 内置渲染器注册表
 *
 * 新增渲染器：
 * 1. 在 src/renderers/<Type>/index.tsx 创建渲染器
 * 2. 在 src/renderers/lazy.tsx 添加懒加载导出
 * 3. 在此注册表添加配置
 *
 * 主组件 FilePreviewContent.tsx 无需修改
 */
export const BUILTIN_RENDERERS: BuiltinRendererConfig[] = [
  {
    fileType: 'image',
    component: ImageRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileSize: ctx.currentFile.size,
      file: ctx.currentFile,
    }),
  },
  {
    fileType: 'pdf',
    component: PdfRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
    }),
  },
  {
    fileType: 'docx',
    component: DocxRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
    }),
  },
  {
    fileType: 'xlsx',
    component: XlsxRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
    }),
  },
  {
    fileType: 'pptx',
    component: PptxRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
    }),
  },
  {
    fileType: 'msg',
    component: MsgRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
    }),
  },
  {
    fileType: 'epub',
    component: EpubRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
    }),
  },
  {
    fileType: 'mobi',
    component: MobiRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
    }),
  },
  {
    fileType: 'video',
    component: VideoRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'audio',
    component: AudioRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'markdown',
    component: MarkdownRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
    }),
  },
  {
    fileType: 'json',
    component: JsonRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'csv',
    component: CsvRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'xml',
    component: XmlRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'subtitle',
    component: SubtitleRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'zip',
    component: ZipRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      nestingDepth: ctx.zipNestingDepth,
    }),
  },
  {
    fileType: 'text',
    component: TextRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      fileName: ctx.currentFile.name,
    }),
  },
  {
    fileType: 'font',
    component: FontRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
    }),
  },
  {
    fileType: 'cad',
    component: CadRenderer,
    getProps: (ctx) => ({
      url: ctx.resolvedUrl,
      file: ctx.currentFile.file, // 传递原始 File 对象（如果有）
      fileName: ctx.currentFile.name, // 传递原始文件名用于识别扩展名
    }),
  },
];
