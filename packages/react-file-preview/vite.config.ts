import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      // 外部化依赖，不打包到库中
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'framer-motion',
        'lucide-react',
        'pdfjs-dist',
        'react-pdf',
        'mammoth',
        'docx-preview',
        'pptx-preview',
        'exceljs',
        'react-markdown',
        'remark-gfm',
        'react-syntax-highlighter',
        '@videojs-player/react',
        'video.js',
      ],
      output: {
        // 为外部依赖提供全局变量
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
        // 保留 CSS
        assetFileNames: (assetInfo) => {
          if (assetInfo.names && assetInfo.names[0] === 'style.css') return 'index.css';
          return assetInfo.names?.[0] || 'assets/[name]-[hash][extname]';
        },
      },
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

