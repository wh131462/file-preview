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
