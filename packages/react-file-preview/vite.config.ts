import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
    react(),
    // 复制 PDF.js worker 和 cmaps 文件到构建输出
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
  publicDir: false, // 不复制 public 目录
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ReactFilePreview',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      // 外部化依赖，不打包到库中。
      // 注意：@eternalheart/file-preview-core 未发布到 npm，必须内联打包，故不出现在此列表。
      external: [
        // React 生态
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-pdf',
        'react-markdown',
        // UI / 动画
        'framer-motion',
        'lucide-react',
        // PDF.js 全部子路径
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
        'opentype.js',
        // wawoff2: 含 emscripten 模块 + 600KB wasm base64，
        // 不能让 Rollup tree-shake（会丢掉 decompress 包装层导致挂死），必须 external
        'wawoff2',
        /^wawoff2(\/.*)?$/,
        // Markdown / 数学公式
        'remark-gfm',
        'remark-math',
        'rehype-katex',
        'rehype-raw',
        'katex',
        /^katex(\/.*)?$/,
        // 代码高亮
        'shiki',
        /^shiki(\/.*)?$/,
        // 视频
        'video.js',
        // 电子表格
        'x-data-spreadsheet',
        // 高级图片格式解码库（动态 import，按需加载）
        'heic2any',
        '@jsquash/avif',
        'utif',
        'ag-psd',
        'jpeg2000',
        '@cornerstonejs/codec-openjpeg',
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
            react: 'React',
            'react-dom': 'ReactDOM',
            'react/jsx-runtime': 'jsxRuntime',
          },
          assetFileNames,
        },
      ],
    },
    // 生成源码映射
    sourcemap: true,
    // 清空输出目录
    emptyOutDir: true,
    // 输出到 lib 目录
    outDir: 'lib',
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
});

