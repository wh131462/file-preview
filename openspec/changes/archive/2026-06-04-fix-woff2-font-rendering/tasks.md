## 1. 实现 FontFace-only 的 WOFF2 路径

- [x] 1.1 在 [packages/react-file-preview/src/renderers/Font/index.tsx](packages/react-file-preview/src/renderers/Font/index.tsx) 中删除所有 wawoff2 / worker 相关 import 与 `decompressWoff2InWorker` 工具，重写 `loadMetadata`：`magic === 'woff2'` 即直接 throw `'WOFF2 metadata parsing intentionally skipped'`
- [x] 1.2 引入 `metadataStatus: 'loading' | 'ready' | 'unavailable'` 状态机；FontFace 完成或确定失败时 `setLoading(false)`；WOFF2 与解析失败均进入 unavailable
- [x] 1.3 元数据区按状态渲染：loading → `font.metadata_loading`、unavailable → `font.metadata_unavailable`、ready → 真实字段
- [x] 1.4 同步改造 [packages/vue-file-preview/src/renderers/Font/index.vue](packages/vue-file-preview/src/renderers/Font/index.vue) 与 [FontPreviewLine.vue](packages/vue-file-preview/src/renderers/Font/FontPreviewLine.vue)（`font` 接受 null），逻辑与 React 同构

## 2. 删除 wawoff2 相关文件与配置

- [x] 2.1 删除 `packages/react-file-preview/src/renderers/Font/wawoff2.worker.ts`
- [x] 2.2 删除 `packages/react-file-preview/src/renderers/Font/emscriptenEnvShim.ts`
- [x] 2.3 删除 `packages/react-file-preview/src/types/wawoff2.d.ts`
- [x] 2.4 删除 `packages/vue-file-preview/src/renderers/Font/wawoff2.worker.ts`
- [x] 2.5 删除 `packages/vue-file-preview/src/renderers/Font/emscriptenEnvShim.ts`
- [x] 2.6 删除 `packages/vue-file-preview/src/renderers/Font/wawoff2.d.ts`

## 3. 清理 Vite 与依赖配置

- [x] 3.1 [packages/react-file-preview/vite.config.ts](packages/react-file-preview/vite.config.ts)：移除 `CHUNK_INLINED_FOR_ESM` 中的 `wawoff2` 与 `/^wawoff2(\/.*)?$/`；treeshake `moduleSideEffects` 移除 wawoff2 分支；删除 `onwarn` 中针对 wawoff2 的 fs/path 警告抑制；整段 `worker:` 配置移除
- [x] 3.2 [packages/vue-file-preview/vite.config.ts](packages/vue-file-preview/vite.config.ts)：与 React 包同步处理
- [x] 3.3 example / vue-example 的 vite.config.ts 中无 wawoff2 alias 残留（已确认）
- [x] 3.4 [packages/react-file-preview/package.json](packages/react-file-preview/package.json) 与 [packages/vue-file-preview/package.json](packages/vue-file-preview/package.json) 移除 `wawoff2 ^2.0.1` 依赖
- [x] 3.5 执行 `pnpm install` 刷新 lockfile

## 4. i18n 新增占位文案

- [x] 4.1 [packages/file-preview-core/src/i18n/messages/zh-CN.ts](packages/file-preview-core/src/i18n/messages/zh-CN.ts) 新增 `font.metadata_loading: '解析元数据中...'`、`font.metadata_unavailable: '元数据不可用'`
- [x] 4.2 [packages/file-preview-core/src/i18n/messages/en-US.ts](packages/file-preview-core/src/i18n/messages/en-US.ts) 新增 `font.metadata_loading: 'Parsing metadata...'`、`font.metadata_unavailable: 'Metadata unavailable'`
- [x] 4.3 保持其他既有 key（`font.loading` / `font.parse_failed` / `font.meta.*`）含义不变

## 5. 构建与回归验证

- [x] 5.1 `pnpm --filter @eternalheart/react-file-preview build` 通过；`lib/index.cjs` 从 4,520 KB 降至 2,846 KB
- [x] 5.2 `pnpm --filter @eternalheart/vue-file-preview build` 通过；`lib/index.cjs` 从 4,536 KB 降至 2,861 KB
- [x] 5.3 verify：主 bundle 与所有 Font lazy chunk 中 `wawoff2` / `decompress_binding` / `onRuntimeInitialized` 命中数均为 0
- [x] 5.4 verify：构建过程不再出现 `Module "fs" / "path" has been externalized` warning
- [ ] 5.5 example 端手工回归：TTF / OTF / WOFF / WOFF2 四种文件预览正常，WOFF2 元数据栏显示 “元数据不可用”

## 6. 文档与归档

- [ ] 6.1 PR / CHANGELOG 中说明 wawoff2 依赖移除、WOFF2 元数据展示策略变化、新增 i18n key
- [x] 6.2 运行 `openspec validate fix-woff2-font-rendering` 通过
