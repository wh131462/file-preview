import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // Worker 独立 bundle（与主 bundle 分开 rollup）。
  // 主 bundle external 了 jpeg2000 / @cornerstonejs/codec-openjpeg；
  // Worker bundle 默认不继承 build.rollupOptions.external，所以这两个包会被打进 worker，
  // 与 `?worker&inline` 配合后，worker 作为 base64 自包含字符串嵌入 jp2Loader chunk。
  worker: {
    format: 'es',
    rollupOptions: {
      // 关键：禁止 worker bundle 拆 chunk，让 jpeg2000 / openjpeg 与 worker 主体一起
      // inline 进 base64 字符串。否则 Blob URL worker 无法解析相对路径的 chunk。
      output: {
        inlineDynamicImports: true,
      },
      onwarn(warning, defaultHandler) {
        // emscripten 输出含 Node `fs` / `path` 引用，在浏览器路径下不执行；过滤这类无害警告
        if (
          warning.code === 'UNRESOLVED_IMPORT' &&
          (warning.exporter === 'fs' || warning.exporter === 'path')
        ) {
          return;
        }
        if (
          typeof warning.message === 'string' &&
          warning.message.includes('has been externalized for browser compatibility')
        ) {
          return;
        }
        defaultHandler(warning);
      },
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FilePreviewCore',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'exceljs',
        'jszip',
        // 图片解码库（动态 import，运行时由使用方包提供）
        'heic2any',
        '@jsquash/avif',
        'utif',
        'ag-psd',
        'jpeg2000',
        '@cornerstonejs/codec-openjpeg',
      ],
      onwarn(warning, defaultHandler) {
        // openjpeg WASM 胶水代码包含 Node 的 fs / path import，浏览器路径下不执行，可忽略
        if (
          warning.code === 'UNRESOLVED_IMPORT' &&
          (warning.exporter === 'fs' || warning.exporter === 'path')
        ) {
          return;
        }
        if (
          typeof warning.message === 'string' &&
          warning.message.includes('has been externalized for browser compatibility')
        ) {
          return;
        }
        defaultHandler(warning);
      },
    },
    sourcemap: true,
    // 改为 false 避免 watch / 并发 build 场景下短暂清空 lib 触发下游 `ENOENT` 报错。
    // 代价：lib 内会累积旧 chunk hash 文件。发布前用 `rm -rf lib && pnpm build` 干净构建。
    emptyOutDir: false,
    outDir: 'lib',
  },
});
