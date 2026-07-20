# bundle-optimization Specification

## Purpose

定义 `@eternalheart/react-file-preview` 与 `@eternalheart/vue-file-preview` 两个发布包的产物体积治理、按需加载、依赖外部化、子路径入口、CSS 拆分、CI 体积预算与 CJS 兼容等约束，以保证使用者获得最小、按需、零 BREAKING 的安装与运行体验。
## Requirements
### Requirement: 主入口产物体积上限

发布到 npm 的两个包，其主入口 ESM 产物（`lib/index.mjs`，不含动态 chunk 与外部化依赖）的体积 SHALL 满足以下 gzip 上限：

- `@eternalheart/react-file-preview/lib/index.mjs`：gzip ≤ 80 KB
- `@eternalheart/vue-file-preview/lib/index.mjs`：gzip ≤ 60 KB

主入口仅包含 `FilePreviewModal` / `FilePreviewEmbed` / `FilePreviewContent` 三个壳组件、类型工具、`normalizeFile` 等核心导出，以及对各 renderer 的动态 import 引用桩。

#### Scenario: React 主入口体积达标

- **WHEN** 执行 `pnpm --filter @eternalheart/react-file-preview build`
- **THEN** 产物 `packages/react-file-preview/lib/index.mjs` 经 gzip 压缩后体积 ≤ 80 KB
- **AND** `pnpm size` 命令在该产物上输出 PASS

#### Scenario: Vue 主入口体积达标

- **WHEN** 执行 `pnpm --filter @eternalheart/vue-file-preview build`
- **THEN** 产物 `packages/vue-file-preview/lib/index.mjs` 经 gzip 压缩后体积 ≤ 60 KB
- **AND** `pnpm size` 命令在该产物上输出 PASS

#### Scenario: 主入口不内联重型依赖

- **WHEN** 检查 `lib/index.mjs` 的源码
- **THEN** 文件中 MUST NOT 出现 `pdfjs-dist`、`foliate-js`、`pptx-preview`、`docx-preview`、`mammoth`、`shiki`、`video.js`、`katex` 等重型依赖的实现代码
- **AND** 仅保留对它们的 `import()` 动态引用占位

### Requirement: 全量产物 gzip 总体积上限

包内 `lib/` 目录下所有 `.mjs` 与 `.css` 产物的 gzip 总和(不含 sourcemap、不含外部化依赖)SHALL 满足:

- `@eternalheart/react-file-preview`:gzip 总和 ≤ 3 MB
- `@eternalheart/vue-file-preview`:gzip 总和 ≤ 3 MB

3 MB 上限覆盖按需加载的 renderer、PDF/图片 Worker 及其解码依赖；这些内容仅在对应文件类型首次预览时下载，主入口保持轻量。

#### Scenario: React 全量产物达标

- **WHEN** 构建完成后,统计 `packages/react-file-preview/lib/**/*.{mjs,css}` 的 gzip 体积
- **THEN** 总和 ≤ 3 MB

#### Scenario: Vue 全量产物达标

- **WHEN** 构建完成后,统计 `packages/vue-file-preview/lib/**/*.{mjs,css}` 的 gzip 体积
- **THEN** 总和 ≤ 3 MB

### Requirement: Renderer 按需动态加载

`FilePreviewContent` 渲染入口在解析出 `fileType` 之后，SHALL 通过动态 `import()` 加载对应 renderer 模块；MUST NOT 在主入口模块顶部静态 import 任何 renderer 实现。

#### Scenario: 打开 PDF 时按需加载

- **WHEN** 用户首次在 `FilePreviewModal` 中打开 PDF 文件
- **THEN** 浏览器发起对 `chunks/pdf-*.mjs` 的网络请求
- **AND** 在打开图片之前，浏览器 MUST NOT 加载 PDF chunk

#### Scenario: 仅渲染图片时不下载 PDF chunk

- **WHEN** 用户只渲染图片类型文件
- **THEN** 浏览器的 Network 面板中 MUST NOT 出现包含 `pdfjs-dist`、`react-pdf`、`pptx-preview`、`docx-preview` 的 chunk 请求

#### Scenario: Renderer 加载中显示占位

- **WHEN** 异步 chunk 正在加载且尚未完成
- **THEN** UI 中 SHALL 显示统一的加载占位（带 i18n 文本）
- **AND** 占位组件本身 MUST 位于主入口 chunk 中

### Requirement: 重型依赖外部化

构建配置 SHALL 按产物格式区分"外部化"与"按需 chunk 内联"两类依赖。

**ESM 产物(`lib/index.mjs` 及其 lazy chunk)** 的 rollup `external` 列表:

- **React 包**:`react`、`react-dom`、`react/jsx-runtime`、`react-pdf`、`react-markdown`、`framer-motion`、`lucide-react`、`pdfjs-dist`(含子路径)、`mammoth`、`docx-preview`、`pptx-preview`、`exceljs`(含子路径)、`foliate-js`(含子路径)、`@likecoin/epub-ts`、`jszip`、`remark-gfm`、`remark-math`、`rehype-katex`、`rehype-raw`、`katex`(含子路径)、`shiki`(含子路径)、`video.js`、`x-data-spreadsheet`、`heic2any`、`@jsquash/avif`、`utif`、`ag-psd`
- **Vue 包**:`vue`、`lucide-vue-next`、`markdown-it`、`@traptitech/markdown-it-katex`、`katex`(含子路径)、`shiki`(含子路径)、`pdfjs-dist`(含子路径)、`mammoth`、`pptx-preview`、`exceljs`(含子路径)、`foliate-js`(含子路径)、`@likecoin/epub-ts`、`jszip`、`video.js`、`x-data-spreadsheet`、`heic2any`、`@jsquash/avif`、`utif`、`ag-psd`

ESM 产物 MUST NOT 把以下依赖声明为 external,它们 SHALL 跟随对应 renderer 的动态 `import()` 边界被打入 lazy chunk:

- `@kenjiuno/msgreader`(由 Msg renderer 主线程引用 → 落入 Msg renderer chunk,约 323 KB / gzip 187 KB)
- `opentype.js`(由 Font renderer 主线程引用 → 落入 Font renderer chunk)

以下依赖 SHALL NOT 出现在 external 列表中(已被 `@eternalheart/file-preview-core` 通过 `?worker&inline` 完全内联到 jp2Loader chunk 的 base64,主 bundle 与 chunks 中均无引用):

- `jpeg2000`
- `@cornerstonejs/codec-openjpeg`

**CJS 产物(`lib/index.cjs`)** SHALL 维持与 ESM 一致的 external 列表,**额外补充** `@kenjiuno/msgreader`、`opentype.js` 这两项继续 external,以避免 `inlineDynamicImports: true` 下单文件体积进一步膨胀。

外部化的依赖 SHALL 继续保留在 `package.json#dependencies` 字段(除 `react` / `react-dom` / `vue` 保留在 `peerDependencies`),以保证使用者 `npm install` 时自动拉取,无需任何手动安装步骤。被改为 chunk 内联的依赖(`@kenjiuno/msgreader`、`opentype.js`)同样 SHALL 保留在 `dependencies` 字段。

`@eternalheart/file-preview-core` MUST 继续内联打包(因其未发布到 npm)。

#### Scenario: ESM 外部化依赖不出现在产物中

- **WHEN** 在 `lib/index.mjs` 与 `lib/chunks/*.mjs` 中 grep `from "pdfjs-dist"`、`from "shiki"`、`from "katex"` 等模式
- **THEN** 应能匹配到 `import` 语句,而 MUST NOT 出现这些模块的实现代码

#### Scenario: ESM chunk 内联的依赖实现代码出现在对应 chunk

- **WHEN** 在 `lib/index.mjs` 与 `lib/chunks/*.mjs` 中 grep `from "@kenjiuno/msgreader"`、`from "opentype.js"`
- **THEN** MUST NOT 匹配到这些模块作为外部 import 出现
- **AND** 对应的实现代码 SHALL 出现在 Msg renderer 或 Font renderer 的 chunk 中

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

### Requirement: 升级零 BREAKING

使用者从前一版本（1.3.x）升级到本次发布版本（1.4.0）时，SHALL 不需要修改任何业务代码、不需要手动安装任何新的 npm 包。主入口的所有现有导出（`FilePreviewModal`、`FilePreviewEmbed`、`FilePreviewContent`、`normalizeFile`、`normalizeFiles`、`configurePdfjs`、`pdfjs`、`VERSION`、`LocaleProvider`、`useTranslator`、`useLocale` 等）SHALL 保持完全一致的签名与运行时行为。

#### Scenario: 旧代码无需改动

- **WHEN** 使用者把 `@eternalheart/react-file-preview` 从 `1.3.x` 升级到 `1.4.0`
- **AND** 仅执行 `pnpm install` 而不修改任何源码
- **THEN** 应用应能正常构建与运行，全部 18 种文件类型仍可正常渲染

#### Scenario: 公共 API 兼容

- **WHEN** 对比 `1.3.x` 与 `1.4.0` 的 `lib/index.d.ts`
- **THEN** 所有公共导出名与类型 SHALL 一致或为兼容超集（不允许移除、不允许收窄类型）

### Requirement: React 与 Vue 包构建策略一致

两个包的 vite 配置 SHALL 采用一致的构建策略：相同的 chunk 命名规则、相同的 external 治理标准、相同的 CSS 拆分规则、相同的 `peerDependencies` / `optionalDependencies` 治理思路。差异仅限于框架专用依赖（react vs vue）。

#### Scenario: 构建配置对齐审查

- **WHEN** 对比 `packages/react-file-preview/vite.config.ts` 与 `packages/vue-file-preview/vite.config.ts`
- **THEN** 二者 `cssCodeSplit`、`inlineDynamicImports`、entry 拆分逻辑、chunk 命名规则、external 模式 SHALL 一致或镜像对应

### Requirement: 体积预算 CI 拦截

仓库 SHALL 接入 `size-limit`（或等价工具），在 `package.json` 中声明 `pnpm size` 脚本，并在 GitHub Actions / 等价 CI 中执行；当任一产物超过其声明的 gzip 上限时，CI MUST 失败，阻止 PR 合并。

#### Scenario: 超阈值 PR 被拦截

- **WHEN** 一个 PR 引入新依赖导致 `lib/index.mjs` gzip 超过 80 KB
- **THEN** CI 中 `pnpm size` 步骤失败
- **AND** PR 在该 check 上标记为红色，无法合并

#### Scenario: 阈值调整需显式审计

- **WHEN** PR 修改 `.size-limit.cjs` 中的阈值
- **THEN** 该 PR 的 diff 中 SHALL 显式可见阈值变化，便于 reviewer 审计

### Requirement: CJS 兼容保留

为兼容旧 Node 工具链与 Jest，每个包 SHALL 继续产出 `lib/index.cjs`。允许 CJS 产物因不支持顶层 await 而采用单文件内联（`inlineDynamicImports: true`），但 ESM 产物 MUST 保持代码分割。`package.json#exports` SHALL 同时声明 import / require 两条路径。

#### Scenario: CJS 仍可导入

- **WHEN** Node CommonJS 工程执行 `const { FilePreviewModal } = require('@eternalheart/react-file-preview')`
- **THEN** 能正确获得组件（不要求体积达 ESM 标准）

#### Scenario: ESM 保持分割

- **WHEN** 现代打包器以 ESM 解析包
- **THEN** 主入口 `lib/index.mjs` SHALL 是分割后的壳，而非单文件内联

### Requirement: 使用者零额外配置即可使用全部 renderer
使用者执行 `npm install @eternalheart/react-file-preview`（或 Vue 对应包）后 SHALL 能使用全部 renderer，无需安装框架包 `dependencies` 已声明的额外依赖；WOFF2 SHALL 使用浏览器原生 FontFace 路径，不依赖 `wawoff2`。

#### Scenario: pnpm 严格模式下零配置使用 Font renderer
- **WHEN** 使用者在 pnpm 严格模式项目中预览 WOFF2 字体
- **THEN** 浏览器 MUST 通过原生 FontFace 完成预览
- **AND** 用户项目 MUST NOT 安装或配置 `wawoff2`

#### Scenario: pnpm 严格模式下零配置使用 Msg renderer
- **WHEN** 使用者在 pnpm 严格模式项目中预览 MSG 文件
- **THEN** Msg renderer MUST 能解析并展示文件
- **AND** 用户项目 MUST NOT 手动配置 `stream` 或 `@kenjiuno/msgreader`

#### Scenario: monorepo 示例不需要依赖别名
- **WHEN** 检查 React 与 Vue 示例的 Vite 配置
- **THEN** `resolve.alias` MUST NOT 包含 renderer 依赖的补丁别名

### Requirement: 库构建时消除 stream 模块引用

`@eternalheart/react-file-preview` 与 `@eternalheart/vue-file-preview` 的 `vite.config.ts` SHALL 在 `resolve.alias` 中把 Node 内置模块 `stream` 重定向到库内自带的空 stub(`packages/<pkg>/src/shims/stream-stub.ts`)。

stub 文件 SHALL 至少导出 `Transform`、`Readable`、`Writable`、`Duplex`、`PassThrough` 五个具名导出与一个默认导出,且全部为 `undefined` 或空对象,以满足 `iconv-lite` 的 `stream_module.Transform` 访问形式。

#### Scenario: 库产物中无 stream 引用残留

- **WHEN** 在 `lib/index.mjs` 与 `lib/chunks/*.mjs` 中 grep `from ['"]stream['"]` 与 `require\(['"]stream['"]\)`
- **THEN** MUST NOT 匹配到任何一条结果

#### Scenario: 构建过程无 stream externalized 警告

- **WHEN** 执行 `pnpm --filter @eternalheart/react-file-preview build`(或 vue 对应包)
- **THEN** 构建输出 MUST NOT 包含 "Module 'stream' has been externalized for browser compatibility" 字样的警告
