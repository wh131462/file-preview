## Context

`file-preview` 是一个跨 React / Vue 的文件预览组件库，支持 18 种文件类型（PDF、Office、EPUB、MOBI、视频、音频、图片、Markdown、代码等）。当前发布的 `1.3.6` 版本存在严重的包体积问题：

| 包 | `lib/index.mjs` | gzip | `lib/index.css` | gzip |
|---|---|---|---|---|
| `@eternalheart/react-file-preview` | **11.88 MB** | **2.27 MB** | 1.63 MB | 978 KB |
| `@eternalheart/vue-file-preview` | 2.26 MB | 521 KB | 1.60 MB | 975 KB |

经分析，问题根因有四条：

1. **强制单 chunk 内联**：[packages/react-file-preview/vite.config.ts](packages/react-file-preview/vite.config.ts) 与 [packages/vue-file-preview/vite.config.ts](packages/vue-file-preview/vite.config.ts) 均设置了 `inlineDynamicImports: true`，把 `foliate-js`、`pdfjs-dist`、`pptx-preview`、`shiki`、`docx-preview`、`mammoth`、`video.js` 等全部内联。
2. **静态全量注册**：[FilePreviewContent.tsx](packages/react-file-preview/src/FilePreviewContent.tsx) 与 [FilePreviewContent.vue](packages/vue-file-preview/src/FilePreviewContent.vue) 在文件顶部静态 import 全部 18 个 renderer，rollup 无法 tree-shake。
3. **依赖外部化不完整**：React 包 `external` 漏掉 `katex`、`rehype-*`、`remark-*`、`shiki`、`foliate-js`、`docx-preview`、`mammoth` 等，被全部打入 `index.mjs`。
4. **CSS 全量产出**：Tailwind 在作用域内全量生成变量与 utility，单 CSS 1.6 MB 且无法拆分；renderer 专属样式无法按需加载。

约束：

- 必须保持主入口 (`FilePreviewModal` / `FilePreviewEmbed` / `FilePreviewContent` / `normalizeFile` 等) 的 JS API 向后兼容（仅运行时行为可变）。
- 必须同步覆盖 React 与 Vue 两个包（依据 `support-type` skill 的约定）。
- 不引入新业务逻辑，仅做构建与依赖治理。
- 不能破坏 `@eternalheart/file-preview-core` 的内联策略（它必须保持内联打包，因为未发布 npm）。

## Goals / Non-Goals

**Goals:**

- 主入口 `index.mjs`（不含动态 chunk）gzip 体积 **≤ 80 KB**（React）/ **≤ 60 KB**（Vue），即"只渲染图片/文本"的最小场景。
- 全部 chunk 合计 gzip **≤ 800 KB**（React）/ **≤ 500 KB**（Vue），不包含被声明为 peer 的外部依赖。
- `index.css` 主样式 gzip **≤ 40 KB**；每个 renderer 专属 CSS gzip **≤ 20 KB**。
- 提供 `./renderers/<type>` 子路径入口，允许使用者只引入自己需要的 renderer。
- 提供静态 CI 体积预算，PR 中超阈值时构建失败。
- React 与 Vue 包构建配置与依赖策略对齐。

**Non-Goals:**

- 不改写 renderer 业务逻辑或视觉表现。
- 不替换核心依赖（如 `pdfjs-dist` → `mupdf-js`），仅做加载策略调整。
- 不引入 SSR 专用方案；保持当前 CSR-only 的预设。
- 不重写 `@eternalheart/file-preview-core`，仅在必要时调整其导出粒度。
- 不优化 `react-file-preview-docs` 和示例工程的体积。

## Decisions

### D1: 采用"主入口壳 + 动态 renderer chunk"双层结构（而非纯多入口）

**选择**：保持单一主入口 `import { FilePreviewModal } from '@eternalheart/react-file-preview'`，在 `FilePreviewContent` 内部用 `React.lazy` / `defineAsyncComponent` 按 `fileType` 动态 import renderer。**同时**额外暴露子路径入口 `./renderers/<type>` 给高级用户。

**理由**：

- 99% 使用者只用主入口，动态 import 是对他们最透明的优化，无需改代码即可获得收益。
- 子路径入口给"我只用图片预览"的垂直用户提供进一步收缩首屏的可能。
- Rollup 的代码分割对 ESM 子目录 `import()` 是天然友好的，无需 webpack 特定配置。

**替代方案**：

- ❌ 纯多入口（强制使用者 `import {FilePreviewModal} from '@eternalheart/react-file-preview/modal'`）：BREAKING 太大，社区接受度低。
- ❌ 全运行时按需 fetch CDN：体积最小但 offline 与企业内网不可用。

### D2: `inlineDynamicImports: false` + `output.format: 'es'` 启用代码分割

**选择**：移除 `inlineDynamicImports`，改为标准 rollup chunk 策略；ESM 产物保留 chunk 目录 `lib/chunks/*.mjs`；CJS 产物因不支持顶层 await，针对 CJS 单独配置 `inlineDynamicImports: true` 并在 README 中标注 "CJS 单文件巨大、推荐 ESM"。

**理由**：

- 现代打包器（Vite、webpack 5、esbuild、rspack）都能正确处理 ESM chunk 目录，使用者无需任何额外配置。
- 保留 CJS 内联是为兼容 Jest / 老旧 Node 工具，但属于 fallback。

**替代方案**：

- ❌ 同时拆分 CJS：会导致 require() 找不到 chunk 的运行时错误，工程性风险大。
- ❌ 只发 ESM：会破坏部分使用者（包括我们自己的 vue-tsc 旧版本）。

### D3: 重型依赖一律外部化，但仍保留在 `dependencies`

**选择**：把以下依赖全部移入 vite 的 `rollupOptions.external` 列表，但**保留它们在 `package.json#dependencies` 中的位置**：

- React 包：`katex`、`rehype-katex`、`rehype-raw`、`remark-gfm`、`remark-math`、`shiki`、`foliate-js`、`docx-preview`、`mammoth`、`pptx-preview`、`@kenjiuno/msgreader`、`@likecoin/epub-ts`、`@videojs-player/react`、`video.js`、`react-markdown`、`react-pdf`、`react-syntax-highlighter`、`framer-motion`、`lucide-react`、`jszip`、`pdfjs-dist`。
- Vue 包：同上对应的 Vue 生态（`lucide-vue-next`、`markdown-it` 等）。

**理由**：

- 体积最大的收益来自"不打包"——`external` 让产物不内联重型库的实现代码。
- 保留 `dependencies` 让 npm/pnpm install 时自动拉取这些库，使用者**完全无需手动安装任何新包**，零 BREAKING。
- 重复打包问题（如 React 多实例）由 `react` / `react-dom` / `vue` 的 `peerDependencies` 保证，其他重型库本身通常是单实例无害。
- 现代打包器（Vite / webpack 5 / esbuild / rspack）会从使用者工程的 `node_modules` 中自动解析这些 external 依赖。

**替代方案**：

- ❌ 把重型库迁到 `optionalDependencies` / `peerDependencies(optional)`：体积收益相同，但会 BREAKING——使用者必须手动安装。先排除此方案，保留为未来可选优化路径。
- ❌ 仅外部化 react / vue：现状就是如此，问题未解。
- ❌ 提供 "bundled" 与 "lite" 两套发布包：维护成本翻倍。

### D4: CSS 拆分 + Tailwind safelist 精修

**选择**：

- 启用 `build.cssCodeSplit: true`（默认 `lib` 模式被关闭，需要显式打开）。
- 把 `index.css` 拆为：
  - `style/core.css`：rfp-root 变量声明 + base + Modal/Embed/Content 三个壳组件样式。
  - `style/<type>.css`：每个 renderer 单独的 Tailwind 入口（仅 import 该 renderer 用到的 utility）。
- 修剪 [tailwind.config.js](packages/react-file-preview/tailwind.config.js) 的 `content` 路径与 `safelist`，移除已不存在的 class。
- 主入口 `index.ts` 仅 `import './style/core.css'`；每个 renderer 子模块在自己的 entry 中 `import './style.css'`，由 rollup 自动产出对应 chunk 的 CSS。

**理由**：

- 当前 1.6 MB CSS 中 95% 是 Tailwind 兜底变量与未使用的 utility。
- 拆 CSS 是用户感知最强的优化（DOM ready 前不阻塞 1.6 MB 下载）。

**替代方案**：

- ❌ 改用纯 CSS：工作量过大，且 Tailwind 维护体验更好。
- ❌ 改用 CSS-in-JS：引入新运行时开销。

### D5: 引入 `size-limit` + CI 拦截

**选择**：在仓库根目录 `.size-limit.cjs` 中声明各产物 gzip 上限；`package.json` 新增 `size` 脚本；GitHub Actions 中 build 后执行 `pnpm size`，超阈值则失败。

**理由**：体积优化需要长期防回归，否则下一个 PR 加一个新依赖体积又会反弹。

**替代方案**：自实现脚本（成本相当，工具不如 `size-limit` 成熟）。

## Risks / Trade-offs

- [一些使用者 webpack 4 项目无法解析 ESM chunk 目录] → 在 README 加显著说明、保留 CJS 单文件 fallback、并提供 `legacy/` 子入口（必要时）。
- [运行时缺失 optionalDependency 会导致渲染失败] → 实现统一的"缺失依赖友好错误页"组件，提示用户安装对应包；在 console 输出 `pnpm add <pkg>` 提示；docs 中给出依赖对照表。
- [React 多实例风险（peer 列表过长）] → `peerDependenciesMeta.optional` + 不强制版本范围 (`*`)，并在文档说明使用者应保证全局唯一实例。
- [CSS 拆分后 SSR 注入麻烦] → 当前库不支持 SSR，影响有限；后续若做 SSR 再单独提供 manifest。
- [BREAKING 引起 npm install 报错] → 通过 `optionalDependencies` 而非 `peerDependencies` 单独存在，使 install 不会失败；同时发 minor (1.4.0) 并在 CHANGELOG 显著标注。
- [体积预算阈值定得过紧会拖累功能开发] → 初始阈值按本次优化后实测 +15% 设定，预留缓冲；新增大特性时允许 PR 中显式调整阈值。

## Migration Plan

1. **里程碑 A（不发布）**：完成 vite 配置、入口拆分、CSS 拆分、依赖外部化；本地 `pnpm build` 输出多 chunk，通过手工冒烟测试覆盖 18 种文件类型。
2. **里程碑 B（不发布）**：接入 `size-limit` 与 CI 检查；更新 README、docs 站点；补"缺失依赖友好错误"组件。
3. **里程碑 C（pre-release）**：发布 `1.4.0-beta.x` 到 npm dist-tag `next`，邀请 example / docs / 已知使用者验证。
4. **里程碑 D（正式）**：发布 `1.4.0`，CHANGELOG 顶部列出 BREAKING 与迁移示例；保留 `1.3.x` 分支接受紧急 bugfix 至少 1 个月。

**回滚策略**：保留 `1.3.6` tag；若 `1.4.0` 出现严重兼容问题，立即 npm unpublish `1.4.0`（24 小时内）或 deprecate，并发布 `1.4.1` 修正。

## Open Questions

- 是否需要把 `@eternalheart/file-preview-core` 单独发布到 npm，从 react/vue 包中 external 掉？（短期否，长期建议）
- 是否提供 `react-file-preview/lite` 入口（只含 image/video/audio/markdown/text），开箱即用最小集？（待 beta 反馈定）
- 是否对 `pdfjs-dist` 的 worker / cmaps 静态资源改为 CDN 方案？（影响离线使用，需用户调研）
