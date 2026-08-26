/**
 * foliate-js 环境类型声明
 *
 * foliate-js 本身没有 TypeScript 类型，这里只声明我们用到的最小表面，
 * 覆盖 `view.js` 暴露的 `<foliate-view>` 自定义元素和核心方法/事件。
 *
 * 参考：https://github.com/johnfactotum/foliate-js (view.js)
 */
declare module 'foliate-js/view.js' {
  export interface TocItem {
    label: string;
    href?: string;
    subitems?: TocItem[];
  }

  export interface BookSection {
    id?: string;
    load?: () => Promise<string | Blob>;
  }

  export interface Book {
    metadata?: Record<string, unknown>;
    sections: BookSection[];
    toc?: TocItem[];
    destroy?: () => void;
  }

  export interface RelocateDetail {
    index: number;
    fraction: number;
    tocItem?: TocItem;
  }

  /**
   * `<foliate-view>` 实例 API（通过 `document.createElement('foliate-view')` 获取）
   */
  export interface FoliateView extends HTMLElement {
    book: Book | null;
    open(target: string | Blob | File | ArrayBuffer): Promise<void>;
    /** target 为数字时表示 section index；字符串时为 CFI 或 href */
    goTo(target: number | string): Promise<void>;
    goLeft(): void;
    goRight(): void;
    prev(distance?: number): Promise<void>;
    next(distance?: number): Promise<void>;
    close?: () => void;
    addEventListener(
      type: 'relocate',
      listener: (e: CustomEvent<RelocateDetail>) => void
    ): void;
    addEventListener(
      type: 'load',
      listener: (e: CustomEvent<{ doc: Document; index: number }>) => void
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  }

  export class View extends HTMLElement {}
  export class ResponseError extends Error {}
  export class NotFoundError extends Error {}
  export class UnsupportedTypeError extends Error {}
  export function makeBook(file: string | Blob | File): Promise<Book>;
}

declare module 'foliate-js/mobi.js' {
  export const isMOBI: (file: Blob | File) => Promise<boolean>;
  export class MOBI {
    constructor(options: { unzlib: (data: Uint8Array) => Uint8Array });
    open(file: Blob | File): Promise<unknown>;
  }
}
