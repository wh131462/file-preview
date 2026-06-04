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
      // 库内通过动态 import 引用，但 example 自身无直接依赖；
      // 这里把它们指向 vue-file-preview 的 node_modules，避免 vite 在 example 端解析失败
      jpeg2000: resolve(__dirname, '../vue-file-preview/node_modules/jpeg2000/src/index.js'),
      '@cornerstonejs/codec-openjpeg': resolve(
        __dirname,
        '../vue-file-preview/node_modules/@cornerstonejs/codec-openjpeg/dist/openjpegjs.js'
      ),
      // wawoff2: lib 已 external，example 端需要走 vue-file-preview 的 node_modules 解析
      wawoff2: resolve(__dirname, '../vue-file-preview/node_modules/wawoff2/index.js'),
      // iconv-lite(msgreader 的依赖) 会尝试 require('stream') 并访问 stream.Transform
      // Vite 在浏览器中会把内置 `stream` externalize 后触发警告。此处给一个空 stub 即可
      stream: resolve(__dirname, 'src/shims/stream-stub.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  worker: {
    format: 'es'
  },
  server: {
    port: 4802,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
});
