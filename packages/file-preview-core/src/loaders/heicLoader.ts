import type { ImageDecoder, DecodeOptions, ImageMetadata } from './types';

/**
 * HEIC/HEIF 图片解码器
 * 基于 heic2any 库，将 HEIC 格式转换为 JPEG
 */
class HeicLoader implements ImageDecoder {
  /**
   * HEIC 格式浏览器均不原生支持，始终需要解码
   */
  async needsDecode(mimeType: string): Promise<boolean> {
    return mimeType === 'image/heic' || mimeType === 'image/heif';
  }

  /**
   * 解码 HEIC 文件为 JPEG Blob
   */
  async decode(file: Blob | ArrayBuffer, options?: DecodeOptions): Promise<Blob> {
    try {
      // 动态加载 heic2any 库（运行时由使用方包（react-/vue-file-preview）提供）
      // @ts-ignore - 无类型声明，仅运行时存在
      const heic2any = await import('heic2any');

      // 确保输入是 Blob
      const blob = file instanceof Blob ? file : new Blob([file], { type: 'image/heic' });

      // 调用 heic2any 进行转换
      const result = await heic2any.default({
        blob,
        toType: options?.outputFormat || 'image/jpeg',
        quality: 0.9,
      });

      // heic2any 可能返回 Blob 或 Blob[]
      if (Array.isArray(result)) {
        return result[0];
      }

      return result as Blob;
    } catch (error: any) {
      // DRM 保护或文件损坏
      if (error?.message?.includes('DRM') || error?.message?.includes('protected')) {
        throw new Error('HEIC 解码失败，文件受 DRM 保护');
      }

      // 其他解码错误
      throw new Error(`HEIC 解码失败，文件可能损坏: ${error?.message || '未知错误'}`);
    }
  }

  /**
   * 获取 HEIC 元数据（当前版本暂不实现，返回空对象）
   */
  async getMetadata(_file: Blob | ArrayBuffer): Promise<ImageMetadata> {
    // TODO: 未来可通过解析 HEIC 容器获取 EXIF 信息
    return {
      format: 'heic',
    };
  }
}

// 导出单例
export default new HeicLoader();
