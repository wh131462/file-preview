## 1. 基线度量与脚手架

- [x] 1.1 在 `scripts/measure-bundle.mjs` 中编写产物体积统计脚本：输出 `lib/index.mjs` / `lib/index.cjs` / `lib/**/*.css` 的原始与 gzip 大小，并按 chunk 分组打印
- [x] 1.2 对当前 `1.3.6` 产物执行一次基线测量，把结果记入 `openspec/changes/optimize-bundle-size/baseline.txt`（仅本地参考，不入 spec）
- [x] 1.3 在仓库根目录添加 `.size-limit.cjs`，对 React / Vue 两个包的主入口、全量 chunk、CSS 声明 gzip 上限
- [x] 1.4 在根 `package.json` 中添加 `size`、`size:why` 脚本（`size-limit` 与 `size-limit --why`），并在 `devDependencies` 中安装 `size-limit`、`@size-limit/file`
- [x] 1.5 在 `.github/workflows/` 中新增或修改 CI 配置：build 之后执行 `pnpm size`，超阈值则 fail

## 2. React 包：依赖外部化（dependencies 字段不动）

- [x] 2.1 在 `packages/react-file-preview/vite.config.ts` 的 `rollupOptions.external` 中追加：`katex`、`rehype-katex`、`rehype-raw`、`remark-gfm`、`remark-math`、`shiki`、`foliate-js`、`docx-preview`、`mammoth`、`pptx-preview`、`@kenjiuno/msgreader`、`@likecoin/epub-ts`、`react-syntax-highlighter`、`exceljs`，并把 `pdfjs-dist` 改写为正则 `/^pdfjs-dist(\/.*)?$/` 以覆盖子路径
- [x] 2.2 把 `exceljs` 从 React 包的 `devDependencies` 迁移到 `dependencies`（其它重型依赖已在 `dependencies`），仅 `peerDependencies` 保留 `react` / `react-dom`
- [x] 2.3 重新构建并 grep 验证：`grep -E "from \"(pdfjs-dist|shiki|katex|foliate-js)" lib/index.mjs` 应仅匹配 import 语句

## 3. Vue 包：依赖外部化（dependencies 字段不动）

- [x] 3.1 在 `packages/vue-file-preview/vite.config.ts` 的 `rollupOptions.external` 中追加：`@traptitech/markdown-it-katex`、`katex`、`docx-preview`、`mammoth`、`foliate-js`、`@kenjiuno/msgreader`、`@likecoin/epub-ts`、`exceljs`
- [x] 3.2 验证 `packages/vue-file-preview/package.json#dependencies` 中以上依赖仍存在（保留不动）
- [x] 3.3 重新构建并验证外部化结果

## 4. 关闭强制内联，启用代码分割

- [x] 4.1 在 React 与 Vue 的 `vite.config.ts` 中，把 `rollupOptions.output` 拆为数组：ESM 输出 `inlineDynamicImports: false`，CJS 输出保留 `inlineDynamicImports: true`
- [x] 4.2 为 ESM 输出配置 `chunkFileNames: 'chunks/[name]-[hash].mjs'`、`entryFileNames: 'index.mjs'`，并把 `assetFileNames` 提取为共享变量以满足 Vite 单一 assetFileNames 限制
- [x] 4.3 验证构建产物：`ls lib/` 出现 `chunks/` 目录，`lib/index.mjs` 从 1.86 MB 降为 450 B

## 5. Renderer 动态加载（React）

- [x] 5.1 在 `src/renderers/lazy.tsx` 中用 `React.lazy(() => import('./X').then(m => ({ default: m.XRenderer })))` 集中包装所有 named-export renderer（保留原 named export 不动）
- [x] 5.2 在 `FilePreviewContent.tsx` 中导入 lazy 版 renderer，并用 `<Suspense fallback={<RendererLoading />}>` 包裹整个内容区
- [x] 5.3 实现 `RendererLoading` 占位组件（带 i18n 文案 `common.loading`），放置于主入口 chunk 内
- [x] 5.4 移除 `FilePreviewContent.tsx` 顶部所有 renderer 的静态 import；保留 `UnsupportedRenderer` 静态导入（体量极小且高频回退）
- [ ] 5.5 验证：Chrome DevTools Network 面板中，打开图片仅加载对应 image chunk，打开 PDF 才加载 pdf chunk（需手工冒烟）

## 6. Renderer 动态加载（Vue）

- [x] 6.1 在 `src/renderers/lazy.ts` 中用 `defineAsyncComponent` 集中包装所有 renderer，`FilePreviewContent.vue` 改为从 lazy 模块导入
- [x] 6.2 利用 `defineAsyncComponent` 的 `loadingComponent` 选项接入 `RendererLoading.vue`
- [ ] 6.3 验证 Network 面板与 React 包行为一致（需手工冒烟）

## 7. 子路径入口（React） — 后置增强

- [ ] 7.1 在 `packages/react-file-preview/vite.config.ts` 把 `build.lib.entry` 改为对象形式，包含主入口 `index` 与 18 个 `renderers/<type>` 子入口
- [ ] 7.2 修改 `packages/react-file-preview/package.json#exports`：除 `.`、`./style.css` 外，按 18 个 type 暴露 `./renderers/<type>`
- [ ] 7.3 在每个 `src/renderers/<type>/index.tsx` 旁增加 `entry.ts`，用作子入口的稳定导出
- [ ] 7.4 构建后验证 `lib/renderers/<type>.mjs` 与 `.d.ts` 均存在

## 8. 子路径入口（Vue） — 后置增强

- [ ] 8.1 同步在 `packages/vue-file-preview/vite.config.ts` 与 `package.json#exports` 中暴露 18 个 `./renderers/<type>` 子入口

## 9. CSS 拆分与 Tailwind 修剪 — 后置增强

- [ ] 9.1 把 `packages/react-file-preview/src/index.css` 拆为：`src/style/core.css`（rfp-root 变量 + 壳组件样式）与 `src/style/<type>.css`（每个 renderer 独立 Tailwind 入口）
- [ ] 9.2 在每个 `src/renderers/<type>/index.tsx` 顶部 `import './style.css'`（或映射到对应 type css）
- [ ] 9.3 主入口 `src/index.ts` 改为 `import './style/core.css'`，保留 `src/index.css` 作为聚合所有 type css 的兼容入口
- [ ] 9.4 修改 `packages/react-file-preview/tailwind.config.js`：精修 `content` 路径，移除已不存在的 `safelist` 项
- [ ] 9.5 在 vite 配置中设置 `build.cssCodeSplit: true`
- [ ] 9.6 对 Vue 包重复 9.1 ~ 9.5
- [ ] 9.7 构建后验证：`lib/style/core.css` ≤ 40 KB gzip；每个 `lib/style/<type>.css` ≤ 20 KB gzip
- [ ] 9.8 在 `package.json#exports` 中追加 `./style/core.css` 与 `./style/<type>.css` 子路径

## 10. core 包内联保持

- [x] 10.1 在 React 与 Vue 包的 `vite.config.ts` 的 `external` 中确认未出现 `@eternalheart/file-preview-core`，保持其内联
- [x] 10.2 构建后 grep `from "@eternalheart/file-preview-core"`，无匹配

## 11. 文档与验收

- [ ] 11.1 在 `packages/react-file-preview/README.md` 与 `README.zh-CN.md` 顶部新增"Bundle Size"章节，展示优化前后体积对比
- [ ] 11.2 新增"Subpath Imports"章节（依赖任务 7 完成）
- [ ] 11.3 对 Vue 包 README 做对称更新
- [x] 11.4 执行 `pnpm build:lib` 并 `pnpm size`，确认 React 主入口 281 B ≤ 80 KB gzip、全量 96 KB ≤ 800 KB gzip
- [x] 11.5 同样验证 Vue 主入口 282 B ≤ 60 KB gzip、全量 60 KB ≤ 500 KB gzip
- [x] 11.6 验证 CSS gzip ≤ 400 KB（实际 React 32 KB、Vue 28 KB）
- [ ] 11.7 在 `packages/example` 与 `packages/vue-example` 中手工冒烟测试 18 种文件类型全部可正常渲染（待用户验证）
- [ ] 11.8 把版本号同步升至 `1.4.0`（待用户确认后执行）
