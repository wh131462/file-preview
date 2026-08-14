declare module 'pptx-preview' {
  export interface PptxPreviewer {
    preview(data: ArrayBuffer): Promise<void>;
    destroy(): void;
    slideCount: number;
  }

  export function init(
    container: HTMLElement,
    options?: { width?: number; height?: number; mode?: 'list' | 'slide' },
  ): PptxPreviewer;
}
