// 链接对象类型
export interface PreviewFileLink {
  id?: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

// 内部使用的标准化文件类型
export interface PreviewFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
}

// 支持 File 对象、链接对象或 HTTP URL 字符串
export type PreviewFileInput = File | PreviewFileLink | string;

export type FileType =
  | 'image'
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'msg'
  | 'epub'
  | 'mobi'
  | 'video'
  | 'audio'
  | 'markdown'
  | 'json'
  | 'csv'
  | 'xml'
  | 'subtitle'
  | 'zip'
  | 'text'
  | 'unsupported';

export interface PreviewState {
  zoom: number;
  rotation: number;
  currentPage: number;
  totalPages: number;
}

export type Theme = 'auto' | 'dark' | 'light';

// 自定义渲染器事件载荷（框架无关，React / Vue 两端共用）
export interface CustomRendererEventPayload<T = unknown> {
  name: string;
  payload?: T;
  file: PreviewFile;
}

/**
 * 自定义请求处理器：完全接管 URL 的请求过程。
 * 用于鉴权 URL 等场景（注入 Authorization、Cookie、签名头等）。
 * 接收已合并好的 RequestInit，需返回标准 Response。
 */
export type RequestHandler = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

/**
 * RequestInit 工厂：可以是固定对象，也可以根据 url 异步推导。
 * 与库内调用方传入的 init 合并（库内 init 优先，用户 factory 兜底）。
 */
export type RequestInitFactory =
  | RequestInit
  | ((url: string) => RequestInit | Promise<RequestInit>);

/**
 * 顶层请求选项：requestInit 与 requestHandler 同时存在时，handler 接收已合并的 init。
 */
export interface RequestOptions {
  requestInit?: RequestInitFactory;
  requestHandler?: RequestHandler;
}

/**
 * 与原生 fetch 同签名的请求函数。库内所有 fetch 调用经它发出。
 */
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * 是否对该文件先 fetch 成 Blob 再生成 blob: URL 喂给底层渲染器。
 * 命中后所有 src 类（image/video/audio/pdf）都走 fetcher，能复用鉴权头。
 */
export type ShouldFetchAsBlob = (file: PreviewFile) => boolean;
