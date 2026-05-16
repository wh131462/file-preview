// 集中的 Vue 异步装饰：把每个 renderer 转为 defineAsyncComponent，
// 让 rollup 自动按 chunk 分割。
import { defineAsyncComponent, h, type Component } from 'vue';
import RendererLoading from './RendererLoading.vue';

type ComponentModule = { default: Component };

const wrap = (loader: () => Promise<ComponentModule>) =>
  defineAsyncComponent({
    loader,
    loadingComponent: { render: () => h(RendererLoading) },
    delay: 0,
  });

export const ImageRenderer = wrap(() => import('./Image/index.vue'));
export const PdfRenderer = wrap(() => import('./Pdf/index.vue'));
export const DocxRenderer = wrap(() => import('./Docx/index.vue'));
export const XlsxRenderer = wrap(() => import('./Xlsx/index.vue'));
export const PptxRenderer = wrap(() => import('./Pptx/index.vue'));
export const MsgRenderer = wrap(() => import('./Msg/index.vue'));
export const EpubRenderer = wrap(() => import('./Epub/index.vue'));
export const MobiRenderer = wrap(() => import('./Mobi/index.vue'));
export const VideoRenderer = wrap(() => import('./Video/index.vue'));
export const AudioRenderer = wrap(() => import('./Audio/index.vue'));
export const MarkdownRenderer = wrap(() => import('./Markdown/index.vue'));
export const JsonRenderer = wrap(() => import('./Json/index.vue'));
export const CsvRenderer = wrap(() => import('./Csv/index.vue'));
export const XmlRenderer = wrap(() => import('./Xml/index.vue'));
export const SubtitleRenderer = wrap(() => import('./Subtitle/index.vue'));
export const ZipRenderer = wrap(() => import('./Zip/index.vue'));
export const TextRenderer = wrap(() => import('./Text/index.vue'));
