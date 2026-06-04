## MODIFIED Requirements

### Requirement: 全量产物 gzip 总体积上限

包内 `lib/` 目录下所有 `.mjs` 与 `.css` 产物的 gzip 总和(不含 sourcemap、不含外部化依赖)SHALL 满足:

- `@eternalheart/react-file-preview`:gzip 总和 ≤ 3 MB
- `@eternalheart/vue-file-preview`:gzip 总和 ≤ 3 MB

注:上限由 1.3.x 时的 800 KB / 500 KB 上调到 3 MB,原因是为了实现"用户零配置"目标,把 `wawoff2`(含 wasm base64,~700 KB gzip)、`@kenjiuno/msgreader`(含 iconv-lite 字符编码表,~190 KB gzip)等重型依赖打进 renderer 异步 chunk(详见 [[zero-config-deps]] change)。这些 chunk 仅在用户访问对应文件类型时按需下载,主入口仍保持 < 1 KB gzip。

#### Scenario: React 全量产物达标

- **WHEN** 构建完成后,统计 `packages/react-file-preview/lib/**/*.{mjs,css}` 的 gzip 体积
- **THEN** 总和 ≤ 3 MB

#### Scenario: Vue 全量产物达标

- **WHEN** 构建完成后,统计 `packages/vue-file-preview/lib/**/*.{mjs,css}` 的 gzip 体积
- **THEN** 总和 ≤ 3 MB

### Requirement: 重型依赖外部化

构建配置 SHALL 按产物格式区分"外部化"与"按需 chunk 内联"两类依赖。

**ESM 产物(`lib/index.mjs` 及其 lazy chunk)** 的 rollup `external` 列表:

- **React 包**:`react`、`react-dom`、`react/jsx-runtime`、`react-pdf`、`react-markdown`、`framer-motion`、`lucide-react`、`pdfjs-dist`(含子路径)、`mammoth`、`docx-preview`、`pptx-preview`、`exceljs`(含子路径)、`foliate-js`(含子路径)、`@likecoin/epub-ts`、`jszip`、`remark-gfm`、`remark-math`、`rehype-katex`、`rehype-raw`、`katex`(含子路径)、`shiki`(含子路径)、`video.js`、`x-data-spreadsheet`、`heic2any`、`@jsquash/avif`、`utif`、`ag-psd`
- **Vue 包**:`vue`、`lucide-vue-next`、`markdown-it`、`@traptitech/markdown-it-katex`、`katex`(含子路径)、`shiki`(含子路径)、`pdfjs-dist`(含子路径)、`mammoth`、`pptx-preview`、`exceljs`(含子路径)、`foliate-js`(含子路径)、`@likecoin/epub-ts`、`jszip`、`video.js`、`x-data-spreadsheet`、`heic2any`、`@jsquash/avif`、`utif`、`ag-psd`

ESM 产物 MUST NOT 把以下依赖声明为 external,它们 SHALL 跟随对应 renderer 的动态 `import()` 边界被打入 lazy chunk:

- `@kenjiuno/msgreader`(由 Msg renderer 主线程引用 → 落入 Msg renderer chunk,约 323 KB / gzip 187 KB)
- `opentype.js`(由 Font renderer 主线程引用 → 落入 Font renderer chunk)

`wawoff2` 的处理是特殊情形:主线程并不直接 `import` 它,Font renderer 只通过 Vite 的 `?worker&inline` 后缀(`import Woff2DecompressWorker from './wawoff2.worker.ts?worker&inline'`)把 wawoff2 wasm 和 emscripten 胶水代码完整内联到 Font renderer chunk 的 base64 字符串中。因此 `wawoff2` 既不需要出现在 ESM external 列表,也不需要出现在"chunk 内联"列表 — 它对主 bundle 的 Rollup 解析完全不可见。Worker bundle 通过 `worker.rollupOptions.external = []` 显式清空 external,确保 worker 自身能解析 `wawoff2` 裸说明符并打进 base64。

以下依赖 SHALL NOT 出现在 external 列表中(已被 `@eternalheart/file-preview-core` 通过 `?worker&inline` 完全内联到 jp2Loader chunk 的 base64,主 bundle 与 chunks 中均无引用):

- `jpeg2000`
- `@cornerstonejs/codec-openjpeg`

**CJS 产物(`lib/index.cjs`)** SHALL 维持与 ESM 一致的 external 列表,**额外补充** `@kenjiuno/msgreader`、`opentype.js` 这两项继续 external,以避免 `inlineDynamicImports: true` 下单文件体积进一步膨胀。`wawoff2` 因主线程不直接 import(仅通过 worker `?worker&inline` 间接引用),在 CJS 中无需额外声明 external。

外部化的依赖 SHALL 继续保留在 `package.json#dependencies` 字段(除 `react` / `react-dom` / `vue` 保留在 `peerDependencies`),以保证使用者 `npm install` 时自动拉取,无需任何手动安装步骤。被改为 chunk 内联的依赖(`@kenjiuno/msgreader`、`wawoff2`、`opentype.js`)同样 SHALL 保留在 `dependencies` 字段(构建时被打包工具读取以参与产物生成)。

`@eternalheart/file-preview-core` MUST 继续内联打包(因其未发布到 npm)。

#### Scenario: ESM 外部化依赖不出现在产物中

- **WHEN** 在 `lib/index.mjs` 与 `lib/chunks/*.mjs` 中 grep `from "pdfjs-dist"`、`from "shiki"`、`from "katex"` 等模式
- **THEN** 应能匹配到 `import` 语句,而 MUST NOT 出现这些模块的实现代码

#### Scenario: ESM chunk 内联的依赖实现代码出现在对应 chunk

- **WHEN** 在 `lib/index.mjs` 与 `lib/chunks/*.mjs` 中 grep `from "@kenjiuno/msgreader"`、`from "opentype.js"`
- **THEN** MUST NOT 匹配到这些模块作为外部 import 出现
- **AND** 对应的实现代码 SHALL 出现在 Msg renderer 或 Font renderer 的 chunk 中

#### Scenario: wawoff2 通过 worker base64 内联到 Font chunk

- **WHEN** 在 `lib/index.mjs` 与 `lib/chunks/*.mjs` 中 grep `from "wawoff2"` 或 `require("wawoff2")`
- **THEN** MUST NOT 匹配到任何主 bundle 形式的 import / require(wawoff2 仅以 base64 字符串形式存在于 Font renderer chunk 内部的 worker blob 中)

#### Scenario: jpeg2000 / openjpeg 完全无产物引用

- **WHEN** 在 `lib/**/*.mjs` 与 `lib/index.cjs` 中 grep `jpeg2000` 与 `@cornerstonejs/codec-openjpeg`
- **THEN** MUST NOT 匹配到任何 import / require 语句(仅 `jp2Loader-*.mjs` 的 base64 内部可能含其代码,这是 worker base64 字符串,不是模块引用)

#### Scenario: CJS 产物继续外部化 msgreader 与 opentype.js

- **WHEN** 在 `lib/index.cjs` 中 grep `require("@kenjiuno/msgreader")`、`require("opentype.js")`
- **THEN** 应能匹配到 `require` 语句,而 MUST NOT 出现这些模块的实现代码

#### Scenario: 依赖仍在 dependencies 中

- **WHEN** 检查 `packages/react-file-preview/package.json` 与 `packages/vue-file-preview/package.json`
- **THEN** 上述全部外部化依赖与 chunk 内联依赖均 SHALL 出现在 `dependencies` 字段中
- **AND** 使用者执行 `npm install @eternalheart/react-file-preview`(或对应 vue 包)后,其 `node_modules` 中自动包含全部依赖

#### Scenario: core 包仍内联

- **WHEN** 检查 `lib/index.mjs`
- **THEN** `@eternalheart/file-preview-core` 的代码 SHALL 内联其中
- **AND** `lib/index.mjs` MUST NOT 出现 `from "@eternalheart/file-preview-core"` 的 import 语句

## ADDED Requirements

### Requirement: 使用者零额外配置即可使用全部 renderer

使用者执行 `npm install @eternalheart/react-file-preview`(或 vue 对应包)后,在使用 npm、yarn、pnpm(含严格模式)任一包管理器、配合 Vite / Webpack / Rollup / esbuild 任一打包工具的项目中,SHALL 不需要:

- 修改自己的 `vite.config.ts` / `webpack.config.js` / 其他构建配置
- 在自己的 `package.json` 中手动添加 `wawoff2`、`@kenjiuno/msgreader`、`opentype.js`、`jpeg2000`、`@cornerstonejs/codec-openjpeg`、`stream` 等任何依赖
- 添加任何 `resolve.alias` 来重定向裸模块说明符
- 添加任何 polyfill 或 shim

即可正常使用 `FilePreviewModal` / `FilePreviewEmbed` / `FilePreviewContent` 渲染包括字体、MSG、JP2 在内的全部支持类型。

#### Scenario: pnpm 严格模式下零配置使用 Font renderer

- **WHEN** 一个 Vite + pnpm 严格模式项目 `npm install @eternalheart/vue-file-preview`
- **AND** 在自身代码中 `import { FilePreviewModal } from '@eternalheart/vue-file-preview'` 并预览一个 `.woff2` 文件
- **THEN** 浏览器 SHALL 成功下载 `chunks/Font-*.mjs` 并正确渲染字体预览
- **AND** 用户项目的 `vite.config.ts` MUST NOT 包含针对 `wawoff2` 或 `opentype.js` 的 alias 或 dependency 配置

#### Scenario: pnpm 严格模式下零配置使用 Msg renderer

- **WHEN** 一个 Vite + pnpm 严格模式项目 `npm install @eternalheart/react-file-preview`
- **AND** 在自身代码中预览一个 `.msg` 文件
- **THEN** 浏览器 SHALL 成功下载 `chunks/Msg-*.mjs` 并正确渲染邮件预览
- **AND** Vite dev server 控制台 MUST NOT 输出 "Module 'stream' has been externalized" 警告
- **AND** 用户项目的 `vite.config.ts` MUST NOT 包含针对 `stream` 或 `@kenjiuno/msgreader` 的 alias 配置

#### Scenario: monorepo 内 example 不需要 alias

- **WHEN** 检查 `packages/example/vite.config.ts` 与 `packages/vue-example/vite.config.ts`
- **THEN** `resolve.alias` 中 MUST NOT 出现 `wawoff2`、`@kenjiuno/msgreader`、`opentype.js`、`stream`、`jpeg2000`、`@cornerstonejs/codec-openjpeg` 任一项
- **AND** 仅保留 `@eternalheart/*` 入口 alias(monorepo dev 链接产物所必需)
- **AND** example 端 `src/shims/stream-stub.ts` 文件不存在

### Requirement: 库构建时消除 stream 模块引用

`@eternalheart/react-file-preview` 与 `@eternalheart/vue-file-preview` 的 `vite.config.ts` SHALL 在 `resolve.alias` 中把 Node 内置模块 `stream` 重定向到库内自带的空 stub(`packages/<pkg>/src/shims/stream-stub.ts`)。

stub 文件 SHALL 至少导出 `Transform`、`Readable`、`Writable`、`Duplex`、`PassThrough` 五个具名导出与一个默认导出,且全部为 `undefined` 或空对象,以满足 `iconv-lite` 的 `stream_module.Transform` 访问形式。

#### Scenario: 库产物中无 stream 引用残留

- **WHEN** 在 `lib/index.mjs` 与 `lib/chunks/*.mjs` 中 grep `from ['"]stream['"]` 与 `require\(['"]stream['"]\)`
- **THEN** MUST NOT 匹配到任何一条结果

#### Scenario: 构建过程无 stream externalized 警告

- **WHEN** 执行 `pnpm --filter @eternalheart/react-file-preview build`(或 vue 对应包)
- **THEN** 构建输出 MUST NOT 包含 "Module 'stream' has been externalized for browser compatibility" 字样的警告

### Requirement: tree-shake 副作用保护

ESM 输出的 `rollupOptions.treeshake.moduleSideEffects` SHALL 把 `@kenjiuno/msgreader` 标记为有副作用,防止 Rollup tree-shake 误删关键包装层。`wawoff2` 因主 bundle 不直接 import,其 tree-shake 由 worker bundle 的独立 Rollup pipeline 处理,主 bundle 的 treeshake 配置无需覆盖。

#### Scenario: 字体预览运行时不挂死

- **WHEN** 在使用方应用中预览 `.woff2` 文件
- **THEN** Font renderer SHALL 成功完成 wawoff2 解压并把字形交给 opentype.js 解析
- **AND** 浏览器控制台 MUST NOT 出现因 `wawoff2_compress` / `wawoff2_decompress` 未定义引发的运行时错误
