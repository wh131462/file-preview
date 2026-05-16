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

包内 `lib/` 目录下所有 `.mjs` 与 `.css` 产物的 gzip 总和（不含 sourcemap、不含外部化依赖）SHALL 满足：

- `@eternalheart/react-file-preview`：gzip 总和 ≤ 800 KB
- `@eternalheart/vue-file-preview`：gzip 总和 ≤ 500 KB

#### Scenario: React 全量产物达标

- **WHEN** 构建完成后，统计 `packages/react-file-preview/lib/**/*.{mjs,css}` 的 gzip 体积
- **THEN** 总和 ≤ 800 KB

#### Scenario: Vue 全量产物达标

- **WHEN** 构建完成后，统计 `packages/vue-file-preview/lib/**/*.{mjs,css}` 的 gzip 体积
- **THEN** 总和 ≤ 500 KB

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

构建配置 SHALL 将以下依赖声明为 rollup `external`，使其不被打入 `lib/` 任何产物：

- **React 包**：`react`、`react-dom`、`react/jsx-runtime`、`pdfjs-dist`（含子路径）、`react-pdf`、`@videojs-player/react`、`video.js`、`framer-motion`、`lucide-react`、`react-markdown`、`remark-gfm`、`remark-math`、`rehype-katex`、`rehype-raw`、`react-syntax-highlighter`、`katex`、`shiki`、`docx-preview`、`mammoth`、`pptx-preview`、`foliate-js`、`@kenjiuno/msgreader`、`@likecoin/epub-ts`、`jszip`
- **Vue 包**：`vue`、`pdfjs-dist`（含子路径）、`lucide-vue-next`、`markdown-it`、`@traptitech/markdown-it-katex`、`katex`、`shiki`、`docx-preview`、`mammoth`、`pptx-preview`、`foliate-js`、`@kenjiuno/msgreader`、`@likecoin/epub-ts`、`jszip`、`video.js`、`x-data-spreadsheet`

外部化的依赖 SHALL 继续保留在 `package.json#dependencies` 字段（除 `react` / `react-dom` / `vue` 保留在 `peerDependencies`），以保证使用者 `npm install` 时自动拉取，无需任何手动安装步骤。

`@eternalheart/file-preview-core` MUST 继续内联打包（因其未发布到 npm）。

#### Scenario: 外部化依赖不出现在产物中

- **WHEN** 在 `lib/index.mjs` 中 grep `from "pdfjs-dist"`、`from "shiki"`、`from "katex"` 等模式
- **THEN** 应能匹配到 `import` 语句，而 MUST NOT 出现这些模块的实现代码

#### Scenario: 依赖仍在 dependencies 中

- **WHEN** 检查 `packages/react-file-preview/package.json` 与 `packages/vue-file-preview/package.json`
- **THEN** 上述全部外部化依赖 SHALL 出现在 `dependencies` 字段中
- **AND** 使用者执行 `npm install @eternalheart/react-file-preview`（或对应 vue 包）后，其 `node_modules` 中自动包含全部依赖

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

### Requirement: Renderer 子路径入口

包 SHALL 在 `package.json#exports` 中暴露子路径入口，使高级用户能够按需引入单个 renderer：

- `./renderers/<type>` 对应每个支持的文件类型（pdf、docx、pptx、xlsx、epub、mobi、video、audio、image、markdown、text、json、xml、csv、zip、msg、subtitle、unsupported）
- 每个子入口产物 SHALL 同时存在 ESM（`.mjs`）与类型声明（`.d.ts`）

#### Scenario: 子路径入口可导入

- **WHEN** 使用者执行 `import { PdfRenderer } from '@eternalheart/react-file-preview/renderers/pdf'`
- **THEN** TypeScript 类型检查通过
- **AND** 运行时正确返回 PdfRenderer 组件

#### Scenario: 主入口与子路径入口共享同一实现

- **WHEN** 同一页面同时使用主入口的 `FilePreviewModal` 与子入口 `PdfRenderer`
- **THEN** 二者引用同一份 PdfRenderer 实现，MUST NOT 出现重复 chunk

### Requirement: CSS 拆分与按需加载

CSS 产物 SHALL 按以下规则拆分：

- `lib/style/core.css`：主入口必需样式（`.rfp-root` 变量、Modal / Embed / Content 壳组件样式）
- `lib/style/<type>.css`：每个 renderer 独立 CSS，按 renderer chunk 异步加载
- `lib/index.css`：向后兼容的全量入口（聚合所有 CSS），通过 `package.json#exports['./style.css']` 导出

核心 CSS gzip ≤ 40 KB，单个 renderer CSS gzip ≤ 20 KB。

#### Scenario: 核心 CSS 体积达标

- **WHEN** 构建完成
- **THEN** `lib/style/core.css` 的 gzip 体积 ≤ 40 KB

#### Scenario: Renderer CSS 体积达标

- **WHEN** 构建完成
- **THEN** `lib/style/*.css`（除 core.css 与 index.css）中每个文件 gzip 体积 ≤ 20 KB

#### Scenario: 向后兼容全量入口可用

- **WHEN** 用户代码中保留 `import '@eternalheart/react-file-preview/style.css'`
- **THEN** 仍能正常加载，包含全部 renderer 样式

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
