import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const assetFileNames = (assetInfo: { names?: string[] }) => {
  if (assetInfo.names && assetInfo.names[0] === 'style.css') return 'index.css';
  return assetInfo.names?.[0] || 'assets/[name]-[hash][extname]';
};

// 库构建配置（用于 npm 发布）
export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
          dest: './pdfjs',
        },
        {
          src: resolve(__dirname, 'node_modules/pdfjs-dist/cmaps'),
          dest: './pdfjs',
        },
      ],
    }),
  ],
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueFilePreview',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      // 外部化依赖，不打包到库中。
      // 注意：@eternalheart/file-preview-core 未发布到 npm，必须内联打包，故不出现在此列表。
      external: [
        'vue',
        // UI
        'lucide-vue-next',
        // Markdown / 数学公式
        'markdown-it',
        '@traptitech/markdown-it-katex',
        'katex',
        /^katex(\/.*)?$/,
        // 代码高亮
        'shiki',
        /^shiki(\/.*)?$/,
        // PDF.js
        /^pdfjs-dist(\/.*)?$/,
        // Office / 电子书 / 压缩
        'mammoth',
        'docx-preview',
        'pptx-preview',
        'exceljs',
        /^exceljs(\/.*)?$/,
        'foliate-js',
        /^foliate-js(\/.*)?$/,
        '@kenjiuno/msgreader',
        '@likecoin/epub-ts',
        'jszip',
        // 视频
        'video.js',
        // 电子表格
        'x-data-spreadsheet',
      ],
      output: [
        {
          format: 'es',
          entryFileNames: 'index.mjs',
          chunkFileNames: 'chunks/[name]-[hash].mjs',
          // ESM 启用代码分割，让重型 renderer 与其依赖按需异步加载
          inlineDynamicImports: false,
          assetFileNames,
        },
        {
          format: 'cjs',
          entryFileNames: 'index.cjs',
          // CJS 不支持顶层 await，继续内联以保证兼容性
          inlineDynamicImports: true,
          globals: {
            vue: 'Vue',
          },
          assetFileNames,
        },
      ],
    },
    sourcemap: true,
    emptyOutDir: true,
    outDir: 'lib',
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
});
