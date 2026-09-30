import { defineConfig, normalizePath } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const angularNm = normalizePath(resolve(__dirname, '../angular-file-preview/node_modules'));
const angularFesm = normalizePath(resolve(
  __dirname,
  '../angular-file-preview/lib/fesm2022/eternalheart-angular-file-preview.mjs',
));

async function waitForAngularFesm() {
  const { access, stat } = await import('node:fs/promises');
  const { constants } = await import('node:fs');
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      await access(angularFesm, constants.R_OK);
      const info = await stat(angularFesm);
      if (info.size > 0) return;
    } catch {
      // ng-packagr --watch may still be rewriting lib/
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Angular FESM not found:\n  ${angularFesm}`);
}

function linkAngularPartialLibrary() {
  const { JavaScriptTransformer } = require('@angular/build/private');
  const transformer = new JavaScriptTransformer({ sourcemap: true, jit: false }, 1);
  return {
    name: 'link-angular-partial-library',
    enforce: 'pre',
    async transform(code, id) {
      const file = normalizePath(id.split('?')[0]);
      if (!file.includes('/angular-file-preview/lib/fesm2022/') || !file.endsWith('.mjs')) {
        return null;
      }
      if (!code.includes('ɵɵngDeclare')) {
        return null;
      }
      const result = await transformer.transformFile(file, false);
      return {
        code: Buffer.from(result).toString('utf8'),
        map: null,
      };
    },
    async closeBundle() {
      await transformer.close();
    },
  };
}

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/file-preview/angular/' : '/',
  plugins: [
    {
      name: 'wait-angular-fesm',
      async config() {
        await waitForAngularFesm();
      },
    },
    linkAngularPartialLibrary(),
    angular({
      tsconfig: resolve(__dirname, './tsconfig.app.json'),
      workspaceRoot: __dirname,
      transformFilter: (_code, id) => !id.includes('/angular-file-preview/lib/'),
    }),
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(resolve(__dirname, '../angular-file-preview/node_modules/pdfjs-dist/build/pdf.worker.mjs')),
          dest: './pdfjs',
        },
        {
          src: normalizePath(resolve(__dirname, '../angular-file-preview/node_modules/pdfjs-dist/cmaps')),
          dest: './pdfjs',
        },
        {
          src: normalizePath(resolve(__dirname, '../angular-file-preview/node_modules/pdfjs-dist/wasm')),
          dest: './pdfjs',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@eternalheart/angular-file-preview/style.css': normalizePath(resolve(__dirname, '../angular-file-preview/lib/index.css')),
      '@eternalheart/angular-file-preview': angularFesm,
      '@eternalheart/file-preview-core': normalizePath(resolve(__dirname, '../file-preview-core/lib/index.mjs')),
      'utif': resolve(angularNm, 'utif'),
      'heic2any': resolve(angularNm, 'heic2any'),
      'ag-psd': resolve(angularNm, 'ag-psd'),
      '@jsquash/avif': resolve(angularNm, '@jsquash/avif'),
      'x-data-spreadsheet': resolve(angularNm, 'x-data-spreadsheet'),
    },
  },
  optimizeDeps: {
    // 库从自动扫描中排除，但其懒加载渲染器仍依赖预构建。
    // 显式扫描库入口及其动态导入，在启动时发现全部渲染器依赖。
    entries: [resolve(__dirname, 'index.html'), angularFesm],
    exclude: ['pdfjs-dist', '@eternalheart/angular-file-preview'],
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
