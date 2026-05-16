// 集中的 lazy 装饰：把每个 renderer 转为 React.lazy(import).then(default)，
// 让 rollup 自动按 chunk 分割。
// 显式声明 LazyExoticComponent 以避免 TS4023（要求把内部 Props 类型导入到当前文件作用域）。
import { lazy, type LazyExoticComponent, type ComponentType } from 'react';
import type { ImageRenderer as ImageRendererImpl } from './Image';
import type { PdfRenderer as PdfRendererImpl } from './Pdf';
import type { DocxRenderer as DocxRendererImpl } from './Docx';
import type { XlsxRenderer as XlsxRendererImpl } from './Xlsx';
import type { PptxRenderer as PptxRendererImpl } from './Pptx';
import type { MsgRenderer as MsgRendererImpl } from './Msg';
import type { EpubRenderer as EpubRendererImpl } from './Epub';
import type { MobiRenderer as MobiRendererImpl } from './Mobi';
import type { VideoRenderer as VideoRendererImpl } from './Video';
import type { AudioRenderer as AudioRendererImpl } from './Audio';
import type { MarkdownRenderer as MarkdownRendererImpl } from './Markdown';
import type { JsonRenderer as JsonRendererImpl } from './Json';
import type { CsvRenderer as CsvRendererImpl } from './Csv';
import type { XmlRenderer as XmlRendererImpl } from './Xml';
import type { SubtitleRenderer as SubtitleRendererImpl } from './Subtitle';
import type { ZipRenderer as ZipRendererImpl } from './Zip';
import type { TextRenderer as TextRendererImpl } from './Text';

type Lazy<T> = LazyExoticComponent<T extends ComponentType<infer P> ? ComponentType<P> : never>;

export const ImageRenderer: Lazy<typeof ImageRendererImpl> = lazy(() =>
  import('./Image').then((m) => ({ default: m.ImageRenderer })),
);

export const PdfRenderer: Lazy<typeof PdfRendererImpl> = lazy(() =>
  import('./Pdf').then((m) => ({ default: m.PdfRenderer })),
);

export const DocxRenderer: Lazy<typeof DocxRendererImpl> = lazy(() =>
  import('./Docx').then((m) => ({ default: m.DocxRenderer })),
);

export const XlsxRenderer: Lazy<typeof XlsxRendererImpl> = lazy(() =>
  import('./Xlsx').then((m) => ({ default: m.XlsxRenderer })),
);

export const PptxRenderer: Lazy<typeof PptxRendererImpl> = lazy(() =>
  import('./Pptx').then((m) => ({ default: m.PptxRenderer })),
);

export const MsgRenderer: Lazy<typeof MsgRendererImpl> = lazy(() =>
  import('./Msg').then((m) => ({ default: m.MsgRenderer })),
);

export const EpubRenderer: Lazy<typeof EpubRendererImpl> = lazy(() =>
  import('./Epub').then((m) => ({ default: m.EpubRenderer })),
);

export const MobiRenderer: Lazy<typeof MobiRendererImpl> = lazy(() =>
  import('./Mobi').then((m) => ({ default: m.MobiRenderer })),
);

export const VideoRenderer: Lazy<typeof VideoRendererImpl> = lazy(() =>
  import('./Video').then((m) => ({ default: m.VideoRenderer })),
);

export const AudioRenderer: Lazy<typeof AudioRendererImpl> = lazy(() =>
  import('./Audio').then((m) => ({ default: m.AudioRenderer })),
);

export const MarkdownRenderer: Lazy<typeof MarkdownRendererImpl> = lazy(() =>
  import('./Markdown').then((m) => ({ default: m.MarkdownRenderer })),
);

export const JsonRenderer: Lazy<typeof JsonRendererImpl> = lazy(() =>
  import('./Json').then((m) => ({ default: m.JsonRenderer })),
);

export const CsvRenderer: Lazy<typeof CsvRendererImpl> = lazy(() =>
  import('./Csv').then((m) => ({ default: m.CsvRenderer })),
);

export const XmlRenderer: Lazy<typeof XmlRendererImpl> = lazy(() =>
  import('./Xml').then((m) => ({ default: m.XmlRenderer })),
);

export const SubtitleRenderer: Lazy<typeof SubtitleRendererImpl> = lazy(() =>
  import('./Subtitle').then((m) => ({ default: m.SubtitleRenderer })),
);

export const ZipRenderer: Lazy<typeof ZipRendererImpl> = lazy(() =>
  import('./Zip').then((m) => ({ default: m.ZipRenderer })),
);

export const TextRenderer: Lazy<typeof TextRendererImpl> = lazy(() =>
  import('./Text').then((m) => ({ default: m.TextRenderer })),
);
