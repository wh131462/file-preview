## Why

WOFF2 字体预览在生产环境下持续停留在 “loading font” 状态。曾尝试通过独立 Web Worker 隔离 wawoff2（emscripten + wasm）解压，但实测在 Vite `worker.format: 'es'` 下，ES module worker 既没有 `importScripts` 也没有 `window`，wawoff2 的旧式 emscripten 自动初始化模块判定不出任何环境分支，`onRuntimeInitialized` 永不触发；即便用 shim 注入 `importScripts`，wasm 实际初始化仍然挂死。鉴于浏览器 FontFace API 原生支持 WOFF2 渲染、解压只为了 opentype.js 提取元数据，性价比极低，最终决定彻底放弃 wawoff2 链路。

## What Changes

- **彻底移除 wawoff2 依赖**：删除两个包的 `wawoff2 ^2.0.1` 依赖、删除主线程内联解压调用、删除 Worker 与 emscripten shim。
- WOFF2 加载路径简化为：`fetch → ArrayBuffer → 并行 FontFace.load() + opentype 跳过 → setLoading(false)`。
  - 浏览器原生 FontFace API 直接渲染 WOFF2，性能优于任何 JS/wasm 解压方案。
  - 元数据栏的 family / glyphCount 显示 `font.metadata_unavailable` 占位，format 字段仍标注 “Web Open Font Format 2 (WOFF2)”，version / designer / subfamily 缺省时隐藏（保持既有显示规则）。
- TTF / OTF / WOFF 路径不变：仍用 opentype.js 解析元数据，FontFace 渲染样张。
- 引入 `metadataStatus: 'loading' | 'ready' | 'unavailable'` 状态机，区分 “解析中” 与 “不可用” 占位。
- 新增 i18n key：`font.metadata_loading`、`font.metadata_unavailable`（在 `file-preview-core` 共享 messages 中补全 zh-CN / en-US）。
- 删除两个包 `vite.config.ts` 中 `wawoff2` 相关的所有 external / treeshake / onwarn / `worker.rollupOptions.external` 兜底，整段 `worker:` 配置一并移除。
- 删除 example 端 `vite.config.ts` 中 `wawoff2` 的 alias 与 `worker: { format: 'es' }` 配置（已不需要）。

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
- `custom-renderer`: 新增 Font Renderer 的 WOFF2 加载要求（FontFace 原生渲染、跳过元数据解析、metadataStatus 状态机、React/Vue 同构），以 ADDED Requirements 形式写入 `custom-renderer` 的 delta spec。

## Impact

- 代码：
  - [packages/react-file-preview/src/renderers/Font/index.tsx](packages/react-file-preview/src/renderers/Font/index.tsx)
  - [packages/vue-file-preview/src/renderers/Font/index.vue](packages/vue-file-preview/src/renderers/Font/index.vue)
  - [packages/vue-file-preview/src/renderers/Font/FontPreviewLine.vue](packages/vue-file-preview/src/renderers/Font/FontPreviewLine.vue)（`font` 改为可空）
  - 删除：`packages/react-file-preview/src/renderers/Font/wawoff2.worker.ts`、`emscriptenEnvShim.ts`、`src/types/wawoff2.d.ts`、对应的 Vue 包文件。
- 配置：
  - [packages/react-file-preview/vite.config.ts](packages/react-file-preview/vite.config.ts)、[packages/vue-file-preview/vite.config.ts](packages/vue-file-preview/vite.config.ts)
  - [packages/react-file-preview/package.json](packages/react-file-preview/package.json)、[packages/vue-file-preview/package.json](packages/vue-file-preview/package.json)：移除 `wawoff2` 依赖。
- i18n：[packages/file-preview-core/src/i18n/messages/zh-CN.ts](packages/file-preview-core/src/i18n/messages/zh-CN.ts)、[packages/file-preview-core/src/i18n/messages/en-US.ts](packages/file-preview-core/src/i18n/messages/en-US.ts)
- 体积：React `lib/index.cjs` 4,520 KB → 2,846 KB；Vue `lib/index.cjs` 4,536 KB → 2,861 KB；Font lazy chunk 1,686 KB → 364 KB（移除 wawoff2 emscripten + wasm base64）。
- 行为：WOFF2 现在秒开，元数据栏家族名 / 字形数显示 “元数据不可用”；TTF/OTF/WOFF 保持原行为。
- 风险：WOFF2 元数据无法展示是有意为之；如未来确有强需求，可在 worker 中改用纯 JS 的 Brotli 解码器（如 `brotli-dec-wasm` 或纯 JS Brotli 实现）补回元数据，但需评估额外包体。
