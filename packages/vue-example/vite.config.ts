import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 演示应用构建配置（用于 GitHub Pages）
// 部署到 /file-preview/vue/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/file-preview/vue/' : '/',
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: resolve(__dirname, '../vue-file-preview/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
          dest: './pdfjs',
        },
        {
          src: resolve(__dirname, '../vue-file-preview/node_modules/pdfjs-dist/cmaps'),
          dest: './pdfjs',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@eternalheart/vue-file-preview/style.css': resolve(__dirname, '../vue-file-preview/lib/index.css'),
      '@eternalheart/vue-file-preview': resolve(__dirname, '../vue-file-preview/lib/index.mjs'),
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  server: {
    port: 4802,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
});
