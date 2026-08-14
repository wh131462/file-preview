import { defineConfig } from 'vite';
import analog from '@analogjs/vite-plugin-angular';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const assetFileNames = (assetInfo: { names?: string[] }) => {
  if (assetInfo.names && assetInfo.names[0] === 'style.css') return 'index.css';
  return assetInfo.names?.[0] || 'assets/[name]-[hash][extname]';
};

export default defineConfig(({ mode }) => {
  const isCjs = mode === 'cjs';
  const isEsm = !isCjs;

  const CHUNK_INLINED_FOR_ESM: (string | RegExp)[] = [
    '@kenjiuno/msgreader',
    'opentype.js',
    'pdfjs-dist',
    /^pdfjs-dist\//,
  ];

  const ALWAYS_INLINE: (string | RegExp)[] = [
    'x-data-spreadsheet',
  ];

  const baseExternal: (string | RegExp)[] = [
    '@angular/core',
    '@angular/common',
    '@angular/platform-browser',
    'rxjs',
    /^rxjs(\/.*)?$/,
    'lucide-angular',
    'markdown-it',
    '@traptitech/markdown-it-katex',
    'katex',
    /^katex(\/.*)?$/,
    'shiki',
    /^shiki(\/.*)?$/,
    /^pdfjs-dist(\/.*)?$/,
    'mammoth',
    'pptx-preview',
    'exceljs',
    /^exceljs(\/.*)?$/,
    'foliate-js',
    /^foliate-js(\/.*)?$/,
    '@likecoin/epub-ts',
    'jszip',
    'video.js',
    'three',
    /^three(\/.*)?$/,
    'three-dxf-loader',
    'heic2any',
    '@jsquash/avif',
    'utif',
    'ag-psd',
  ];

  const matchesAny = (id: string, patterns: (string | RegExp)[]): boolean => {
    return patterns.some(pattern =>
      typeof pattern === 'string' ? id === pattern : pattern.test(id)
    );
  };

  const external = isEsm
    ? baseExternal.filter(dep => {
        if (typeof dep === 'string') {
          return !matchesAny(dep, [...CHUNK_INLINED_FOR_ESM, ...ALWAYS_INLINE]);
        } else {
          return !CHUNK_INLINED_FOR_ESM.some(inline => {
            if (typeof inline === 'string') {
              return dep.test(inline);
            } else {
              return dep.source === inline.source;
            }
          }) && !ALWAYS_INLINE.some(inline => {
            if (typeof inline === 'string') {
              return dep.test(inline);
            } else {
              return dep.source === inline.source;
            }
          });
        }
      })
    : [...baseExternal, ...CHUNK_INLINED_FOR_ESM].filter(dep => {
        if (typeof dep === 'string') {
          return !matchesAny(dep, ALWAYS_INLINE);
        } else {
          return !ALWAYS_INLINE.some(inline => {
            if (typeof inline === 'string') {
              return dep.test(inline);
            } else {
              return dep.source === inline.source;
            }
          });
        }
      });

  const esmOutput = {
    format: 'es' as const,
    entryFileNames: 'index.mjs',
    chunkFileNames: 'chunks/[name]-[hash].mjs',
    inlineDynamicImports: false,
    assetFileNames,
  };

  const cjsOutput = {
    format: 'cjs' as const,
    entryFileNames: 'index.cjs',
    inlineDynamicImports: true,
    globals: {
      '@angular/core': 'ng.core',
      '@angular/common': 'ng.common',
    },
    assetFileNames,
  };

  return {
    plugins: [
      analog({
        jit: true,
        disableTypeChecking: true,
        tsconfig: resolve(__dirname, 'tsconfig.json'),
      }),
      ...(isEsm
        ? [
            dts({
              tsconfigPath: resolve(__dirname, 'tsconfig.json'),
              outDir: resolve(__dirname, 'lib'),
              entryRoot: resolve(__dirname, 'src'),
              rollupTypes: false,
              insertTypesEntry: true,
            }),
          ]
        : []),
    ],
    publicDir: false,
    resolve: {
      alias: {
        stream: resolve(__dirname, 'src/shims/stream-stub.cjs'),
      },
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'AngularFilePreview',
        formats: isEsm ? ['es'] : ['cjs'],
        fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
      },
      rollupOptions: {
        external,
        output: isEsm ? [esmOutput] : [cjsOutput],
        treeshake: isEsm
          ? {
              moduleSideEffects: (id: string) =>
                /node_modules\/@kenjiuno\/msgreader\//.test(id)
                || /(^|\/)foliate-js\//.test(id),
            }
          : undefined,
      },
      sourcemap: true,
      emptyOutDir: isEsm,
      outDir: 'lib',
    },
    optimizeDeps: {
      exclude: ['pdfjs-dist'],
    },
  };
});
