import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const assetFileNames = (assetInfo: { names?: string[] }) => {
  if (assetInfo.names && assetInfo.names[0] === 'style.css') return 'index.css';
  return assetInfo.names?.[0] || 'assets/[name]-[hash][extname]';
};

// 库构建配置（用于 npm 发布）
//
// 双次构建策略（ESM / CJS 分叉，详见 openspec/changes/zero-config-deps）：
//   - `vite build --mode esm`：ESM 产物，重型动态依赖（@kenjiuno/msgreader 等）跟随对应
//     renderer 打成 lazy chunk，使用者侧无需任何额外配置即可正常解析裸模块说明符
//     （解决 pnpm 严格模式 + Vite 解析失败问题）。
//   - `vite build --mode cjs`：CJS 产物，因 `inlineDynamicImports: true` 单文件内联，
//     仍保持原有 external 行为，避免重型依赖被合并进 `lib/index.cjs` 造成体积膨胀。
//   - 第一次构建 (esm) 清空 lib 目录；第二次构建 (cjs) `emptyOutDir: false` 保留 ESM 产物。
export default defineConfig(({ mode }) => {
  const isCjs = mode === 'cjs';
  const isEsm = !isCjs;

  // ESM 时不 external、改为打进对应 renderer 的 lazy chunk 的依赖。
  // CJS 仍 external 这些项（避免 inline 后 lib/index.cjs 体积爆炸）。
  const CHUNK_INLINED_FOR_ESM: (string | RegExp)[] = [
    '@kenjiuno/msgreader',
    'opentype.js',
    'pdfjs-dist',  // ESM 模式下打成 chunk，避免用户侧模块解析问题
    /^pdfjs-dist\//,  // 包括所有 pdfjs-dist 子路径
  ];

  // 完全内联（ESM/CJS 都打包）的依赖：
  // x-data-spreadsheet 在 Next.js 等环境下依赖解析有问题，直接打包避免用户安装
  const ALWAYS_INLINE: (string | RegExp)[] = [
    'x-data-spreadsheet',
  ];

  // 基础 external 列表（ESM/CJS 都 external）。
  const baseExternal: (string | RegExp)[] = [
    // React 生态
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react-pdf',
    'react-markdown',
    // UI / 动画
    'framer-motion',
    'lucide-react',
    // PDF.js 在 ESM 模式会从 baseExternal 中移除，打成 chunk
    // CJS 模式仍然 external
    /^pdfjs-dist(\/.*)?$/,
    // Office / 电子书 / 压缩
    'mammoth',
    'docx-preview',
    'pptx-preview',
    'exceljs',
    /^exceljs(\/.*)?$/,
    'foliate-js',
    /^foliate-js(\/.*)?$/,
    '@likecoin/epub-ts',
    'jszip',
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
    // 高级图片格式解码库（动态 import，按需加载）
    'heic2any',
    '@jsquash/avif',
    'utif',
    'ag-psd',
    // 注意：jpeg2000 与 @cornerstonejs/codec-openjpeg 已经被
    // file-preview-core 通过 `?worker&inline` 完全打进 jp2Loader chunk 的 base64，
    // 主 bundle 与 chunks 中均不再引用，故无需在 external 中列出。
  ];

  // 辅助函数：检查模块 ID 是否匹配规则列表
  const matchesAny = (id: string, patterns: (string | RegExp)[]): boolean => {
    return patterns.some(pattern =>
      typeof pattern === 'string' ? id === pattern : pattern.test(id)
    );
  };

  const external = isEsm
    ? baseExternal.filter(dep => {
        // ESM 模式：移除 CHUNK_INLINED_FOR_ESM 和 ALWAYS_INLINE 中的项
        const depStr = typeof dep === 'string' ? dep : dep.source;
        // 对于正则，检查是否与 CHUNK_INLINED_FOR_ESM 中的模式重叠
        if (typeof dep === 'string') {
          return !matchesAny(dep, [...CHUNK_INLINED_FOR_ESM, ...ALWAYS_INLINE]);
        } else {
          // 如果是正则，检查它是否匹配需要 inline 的模式
          // 例如：/^pdfjs-dist(\/.*)?$/ 应该被移除，因为 pdfjs-dist 在 CHUNK_INLINED_FOR_ESM 中
          return !CHUNK_INLINED_FOR_ESM.some(inline => {
            if (typeof inline === 'string') {
              return dep.test(inline);
            } else {
              // 两个正则：如果 source 相似则认为匹配
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
    : [...baseExternal, ...CHUNK_INLINED_FOR_ESM].filter(dep =>
        {
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
        }
      );

  const esmOutput = {
    format: 'es' as const,
    entryFileNames: 'index.mjs',
    chunkFileNames: 'chunks/[name]-[hash].mjs',
    // ESM 启用代码分割，让重型 renderer 与其依赖按需异步加载
    inlineDynamicImports: false,
    assetFileNames,
  };

  const cjsOutput = {
    format: 'cjs' as const,
    entryFileNames: 'index.cjs',
    // CJS 不支持顶层 await，继续内联以保证兼容性
    inlineDynamicImports: true,
    globals: {
      react: 'React',
      'react-dom': 'ReactDOM',
      'react/jsx-runtime': 'jsxRuntime',
    },
    assetFileNames,
  };

  return {
    plugins: [
      react(),
    ],
    publicDir: false, // 不复制 public 目录
    resolve: {
      alias: {
        // iconv-lite(@kenjiuno/msgreader 的依赖)会 require('stream')。
        // 库构建时把 stream 指向空 stub,使产物中不再残留对 Node 内置 stream 的引用,
        // 避免使用者侧 Vite 出现 "Module 'stream' has been externalized" 警告。
        stream: resolve(__dirname, 'src/shims/stream-stub.ts'),
      },
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'ReactFilePreview',
        formats: isEsm ? ['es'] : ['cjs'],
        fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
      },
      rollupOptions: {
        external,
        output: isEsm ? [esmOutput] : [cjsOutput],
        // ESM:防止 Rollup tree-shake 删除关键副作用 import
        //  1. @kenjiuno/msgreader 的关键包装层
        //  2. foliate-js/view.js (及 paginator.js 等) 通过 `customElements.define`
        //     注册自定义元素; 副作用 import 一旦被摇掉, `document.createElement
        //     ('foliate-view')` 会得到 HTMLUnknownElement, 触发 "r.open is not
        //     a function"
        treeshake: isEsm
          ? {
              moduleSideEffects: (id: string) =>
                /node_modules\/@kenjiuno\/msgreader\//.test(id)
                || /(^|\/)foliate-js\//.test(id),
            }
          : undefined,
      },
      // 生成源码映射
      sourcemap: true,
      // ESM 第一次构建清空 lib;CJS 第二次构建保留 ESM 产物
      emptyOutDir: isEsm,
      // 输出到 lib 目录
      outDir: 'lib',
    },
    optimizeDeps: {
      exclude: ['pdfjs-dist'],
    },
  };
});
