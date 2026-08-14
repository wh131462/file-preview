import { defineConfig } from 'vite';
import analog from '@analogjs/vite-plugin-angular';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/file-preview/angular/' : '/',
  plugins: [
    analog({
      ssr: false,
      liveReload: true,
    }),
    viteStaticCopy({
      targets: [
        {
          src: resolve(__dirname, '../angular-file-preview/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
          dest: './pdfjs',
        },
        {
          src: resolve(__dirname, '../angular-file-preview/node_modules/pdfjs-dist/cmaps'),
          dest: './pdfjs',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@eternalheart/angular-file-preview/style.css': resolve(__dirname, '../angular-file-preview/lib/index.css'),
      '@eternalheart/angular-file-preview': resolve(__dirname, '../angular-file-preview/lib/index.mjs'),
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 4803,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
});
