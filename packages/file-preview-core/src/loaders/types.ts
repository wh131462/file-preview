/**
 * 图片解码选项
 */
export interface DecodeOptions {
  /** RAW 格式是否加载完整图像（默认 false，仅提取缩略图） */
  fullQuality?: boolean;
  /** 目标输出格式（默认 'image/png'） */
  outputFormat?: 'image/jpeg' | 'image/png';
  /** 进度回调（0-100） */
  onProgress?: (percent: number) => void;
  /** TIFF 多页格式的页码（从 1 开始，默认 1） */
  page?: number;
}

/**
 * 图片元数据
 */
export interface ImageMetadata {
  /** 图片宽度（像素） */
  width?: number;
  /** 图片高度（像素） */
  height?: number;
  /** 总页数（多页格式如 TIFF） */
  pageCount?: number;
  /** 格式名称 */
  format?: string;
  /** EXIF 信息（可选） */
  exif?: Record<string, unknown>;
}

/**
 * 图片解码器统一接口
 */
export interface ImageDecoder {
  /**
   * 检测该格式是否需要解码（浏览器不原生支持）
   * @param mimeType MIME 类型（如 'image/heic'）
   * @returns 是否需要解码
   */
  needsDecode(mimeType: string): Promise<boolean>;

  /**
   * 解码为浏览器可直接展示的格式
   * @param file 原始文件（Blob 或 ArrayBuffer）
   * @param options 解码选项
   * @returns 解码后的 Blob 或 data URL
   */
  decode(file: Blob | ArrayBuffer, options?: DecodeOptions): Promise<Blob | string>;

  /**
   * 获取元数据（可选）
   * @param file 原始文件
   * @returns 图片元数据
   */
  getMetadata?(file: Blob | ArrayBuffer): Promise<ImageMetadata>;
}

/**
 * Loader 注册表类型（格式 MIME type 到 loader 的映射）
 */
export type LoaderRegistry = Map<string, ImageDecoder>;
