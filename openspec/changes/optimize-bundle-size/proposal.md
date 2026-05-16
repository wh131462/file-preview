## Why

当前发布到 npm 的 `@eternalheart/react-file-preview` 产物 `lib/index.mjs` 高达 **11.88 MB**（gzip 2.27 MB），`lib/index.css` 高达 **1.6 MB**（gzip 978 KB）；`@eternalheart/vue-file-preview` 产物 2.25 MB（gzip 521 KB），CSS 同样高达 1.6 MB。体积严重超过同类预览库（一般 < 500 KB gzip），主要原因：

1. 入口一次性导入全部 18 种文件类型的 renderer，未做按需加载/动态分包。
2. `inlineDynamicImports: true` 强制把 `foliate-js`、`pdfjs-dist`、`pptx-preview`、`shiki`、`mammoth`、`docx-preview`、`video.js` 等重型依赖全部打进单一 chunk。
3. React 包 `external` 列表不完整：`katex`、`rehype-katex`、`rehype-raw`、`remark-gfm`、`remark-math`、`shiki`、`foliate-js`、`docx-preview` 等仍被内联。
4. Tailwind CSS 全量产出 + 作用域前缀复制，导致 CSS 1.6 MB 且 18 个 renderer 的样式无法 tree-shake。

体积是当前使用者反馈最强烈的痛点，影响首屏加载、SSR 启动与浏览器解析时间，必须优化。本提案采取**零 BREAKING** 路线：依赖仍声明在 `dependencies` 中，pnpm/npm 安装时自动拉取，使用者代码与升级路径完全不变；优化全部来自构建产物的"不内联 + 按需异步加载 + CSS 拆分"。

## What Changes

- **入口拆包**：在 `package.json#exports` 中暴露子路径入口，按 renderer 类型与场景额外暴露子入口：
  - `./renderers/<type>`（按文件类型独立子入口，至少覆盖 pdf/docx/pptx/xlsx/epub/mobi/video/audio/image/markdown/text/json/xml/csv/zip/msg/subtitle/unsupported）
  - `./style.css` 保持全量；新增 `./style/core.css`、`./style/<type>.css`（拆分样式）
  - 主入口 `.` 的所有原导出保持不变，向后兼容。
- **动态加载（默认行为）**：`FilePreviewContent` 内部按 `fileType` 动态 `import()` 对应 renderer 与其重依赖（pdfjs-dist、foliate-js、pptx-preview、docx-preview、mammoth、video.js、shiki、katex 等），关闭 ESM 输出的 `inlineDynamicImports`，让 rollup 自然 code-splitting。运行时按需异步下载对应 chunk；现代打包器（Vite / webpack 5 / esbuild / rspack）自动处理。
- **依赖外部化扩张**：将所有重型 npm 依赖全部声明为 rollup `external`（含 `katex`、`rehype-*`、`remark-*`、`shiki`、`foliate-js`、`docx-preview`、`mammoth`、`pptx-preview`、`video.js`、`@videojs-player/react` 等），打包产物只保留组件源码 + 类型。**关键**：这些依赖**仍然保留在 `dependencies` 字段中**，npm/pnpm install 时会自动拉取，使用者无需手动安装任何新包。
- **CSS 拆分与按需引入**：
  - 启用 Vite 的 `cssCodeSplit: true`，让各 renderer 异步 chunk 产出独立 CSS。
  - 拆出 `style/core.css`（必需）与 `style/<type>.css`（按 renderer 独立）。
  - 优化 Tailwind 安全列表（`safelist`）与 `content`，剔除不存在的样式，预计 CSS 减少 60% 以上。
- **预算与回归保护**：在 CI 与本地 build 中引入 `size-limit`，对 `lib/index.mjs`、`lib/index.css`、各子入口设置 gzip 上限并在 PR 中失败拦截。
- **文档**：更新 README / 文档站点，给出"最小集 import"与"全功能 import"两套示例，宣传体积收益（不涉及破坏性变更说明）。

## Capabilities

### New Capabilities
- `bundle-optimization`: 库构建产物的体积治理能力，包括入口拆分、按需动态加载、依赖外部化策略、CSS 拆分、体积预算与 CI 拦截。

### Modified Capabilities
<!-- 暂无已有 spec 的修改：openspec/specs/ 仅有 custom-renderer，不直接涉及打包行为 -->

## Impact

- **代码影响**：
  - `packages/react-file-preview/vite.config.ts`、`packages/vue-file-preview/vite.config.ts`：ESM 输出移除 `inlineDynamicImports`，开启 `cssCodeSplit`，扩展 `external`，新增多入口配置。
  - `packages/react-file-preview/src/index.ts`、`packages/vue-file-preview/src/index.ts`：在 `package.json#exports` 暴露子路径入口，但主入口导出 100% 不变。
  - `packages/*/src/FilePreviewContent.*`：renderer 注册由静态 import 改为 `React.lazy` / `defineAsyncComponent`，并提供 `loading` 占位。
  - `packages/*/src/renderers/**/index.*`：保持文件结构；为支持子入口构建，每个 renderer 旁新增 `entry.ts` 稳定导出。
  - `packages/*/src/index.css` 与 `tailwind.config.js`：拆分样式、调整 safelist/content。
- **依赖影响**：
  - `dependencies` 字段**保持不变**（仍包含重型依赖），仅 vite 的 `external` 配置扩展。
  - `peerDependencies` 维持 react/react-dom 或 vue。
  - 无新增 runtime 依赖；新增 `size-limit` 等 dev 依赖。
- **API 影响**：
  - 主入口导出完全兼容（`FilePreviewModal`/`Embed`/`Content`、`normalizeFile` 等）。
  - 新增子入口属于增量，不破坏现有用法。
  - **无 BREAKING**：使用者从 1.3.6 升级到 1.4.0 不需要改任何代码，不需要安装任何新包。
- **构建/CI 影响**：新增体积预算脚本与 CI 检查，build 产物结构发生变化（多文件 + chunk 目录），发布脚本需同步。
- **文档影响**：README、docs 站点新增"按需引入"与"体积收益"章节。
