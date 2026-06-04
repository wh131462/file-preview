## Context

`FontRenderer`（[packages/react-file-preview/src/renderers/Font/index.tsx](packages/react-file-preview/src/renderers/Font/index.tsx) 与 [packages/vue-file-preview/src/renderers/Font/index.vue](packages/vue-file-preview/src/renderers/Font/index.vue)）用于预览 TTF / OTF / WOFF / WOFF2 字体。原实现对 WOFF2 走 `wawoff2 → decompress(Brotli) → opentype.parse` 的链路，目标是在 FontFace 原生渲染之外再额外提供 family / glyphCount / version / designer 等元数据。

实际线上 WOFF2 一直停留在 loading 状态。期间尝试了两轮修复，最终回退为最简方案。

### 失败方案一：直接动态 import wawoff2

原代码：
```ts
const pkg = 'wawoff2';
const wawoff2 = await import(/* @vite-ignore */ pkg);
const ttf = await wawoff2.decompress(new Uint8Array(arrayBuffer));
```
- 主线程串行 `await decompress(...)`。
- wawoff2 内部：`runtimeInit = new Promise(r => em_module.onRuntimeInitialized = r)`，等待 emscripten 运行时初始化回调；一旦失败便永久挂起，FontFace 路径也被阻塞，UI 永远 loading。

### 失败方案二：Worker + 超时兜底 + emscripten shim

把 wawoff2 隔离到 `?worker&inline` 的 Web Worker、并对主线程加 8s 硬性超时与 terminate，期望挂死时至少不影响 UI。结果：
1. Vite `worker.format: 'es'` 下生成 ES module worker。
2. wawoff2 的 emscripten 自动初始化模块通过 `typeof window === 'object'` / `typeof importScripts === 'function'` / `typeof process === 'object'` 三段检测决定环境分支。
3. ES module worker 里：
   - `window` 不存在 → `ENVIRONMENT_IS_WEB = false`
   - `importScripts` 不存在 → `ENVIRONMENT_IS_WORKER = false`
   - `process` 不存在 → `ENVIRONMENT_IS_NODE = false`
4. 三个 ENVIRONMENT 全 false → emscripten 不走任何环境分支，`read_/readAsync` 等内部函数没赋值，wasm 初始化链路在某一步静默失败，`onRuntimeInitialized` 永不触发。
5. 主线程恰在 8s 超时被 terminate，元数据降级为 unavailable，FontFace 此时已经原生渲染好字体 → 用户看到的现象是 “等待约 8 秒后正常显示”。

进一步给 worker 注入 `globalThis.importScripts` stub，让 `ENVIRONMENT_IS_WORKER = true`：构建产物里 shim 顺序确认正确（shim 在 emscripten 环境检测之前执行），但 wasm 初始化仍然挂死、表现完全一致。说明 emscripten 内部的 wasm 加载路径（在 ES module worker 上下文中）还有其他不兼容点（推测与 `instantiateAsync` / `getBinaryPromise` 在 data: URI + worker 上下文的分支组合有关）。

### 收益评估

继续投入修复 wawoff2 在 ES module worker 中的兼容性，性价比极低：

- 浏览器对 WOFF2 的原生 FontFace 渲染本身就是稳定路径，渲染（用户最关心）从来不依赖 wawoff2。
- 引入 wawoff2 唯一收益是元数据 family / glyph 数等字段，可被 “元数据不可用” 占位文案替代。
- wawoff2 emscripten + wasm base64 体积约 1.3MB，对 Font lazy chunk 体积是巨额负担。
- 没有现成纯浏览器原生的 WOFF2 解压方案足以替代 wawoff2 且回报与代价匹配。

结论：放弃 WOFF2 元数据提取，全面移除 wawoff2 依赖。

## Goals / Non-Goals

**Goals:**
- WOFF2 字体预览不再出现 “一直 loading” 或 “等 8 秒后才显示” 的现象；FontFace 完成后立即解除 loading。
- TTF / OTF / WOFF 三种格式的元数据展示行为不变。
- React 与 Vue 渲染器同构、状态机一致。
- 包体瘦身：主 bundle 与 Font lazy chunk 不再包含 wawoff2 / emscripten / wasm base64。

**Non-Goals:**
- 不为 WOFF2 提供元数据展示（family / version / glyphCount 显示 “元数据不可用”）。
- 不引入新的 Brotli 解压库或字体解析库替代 wawoff2。
- 不调整 FontRenderer 对外 props 或 i18n key 契约（仅新增 2 个占位文案 key）。

## Decisions

### Decision 1: 彻底移除 wawoff2
- **选择**：删除两个包的 `wawoff2 ^2.0.1` 依赖，删除主线程 `await import('wawoff2')` 调用，删除所有相关 Worker / shim 文件。
- **理由**：ES module worker 环境与 wawoff2 emscripten 模块不兼容，且 wawoff2 仅服务于 WOFF2 元数据这种非核心需求。删除即一劳永逸。
- **替代方案**：
  - 继续修 ES module worker 兼容性 → 收益不匹配。
  - 换为 classic worker (iife) → 影响其他 worker，且不解决 wasm 初始化失败的真实根因。
  - 用纯 JS Brotli 解码器（`brotli-dec-wasm` / `brotli-decode`) → 引入新依赖，性能差，与既定 “尽量不引入业务依赖” 冲突。

### Decision 2: FontFace 与 opentype 解析并行 + WOFF2 直接跳过 opentype
- **选择**：拿到 `arrayBuffer` 后立即并行启动：
  - 任务 A：`new FontFace('PreviewFont', faceBuffer).load()`，成功 / 确定失败即解除 loading。
  - 任务 B：opentype 元数据解析；WOFF2 在任务入口直接 throw 一个 “按设计跳过” 的错误，落入 `metadataStatus = 'unavailable'` 分支。
- **理由**：用户首要诉求是看到字体，元数据是渐进增强；TTF/OTF/WOFF 仍能获取真实元数据。
- **替代方案**：保持原串行链路（即便 WOFF2 已无解压）— 没必要，并行更稳。

### Decision 3: UI 用 `metadataStatus` 状态机表达 loading / ready / unavailable
- **选择**：
  - `loading`：等待 opentype 解析（FontFace 已 loading 完毕但元数据还没就绪时，渲染样张可见，元数据栏占位 `font.metadata_loading`）。
  - `ready`：元数据已就绪，展示真实字段。
  - `unavailable`：解析失败或 WOFF2 故意跳过，元数据栏占位 `font.metadata_unavailable`。
- **理由**：让 “元数据未就绪” 与 “元数据不可用” 在 UI 上明确区分，不让 family / glyphCount 字段在等待时显示 “Unknown / 0” 误导用户。

### Decision 4: 保留 opentype.js 依赖 + 仍用 FontFace 兜底 Canvas 模式
- **选择**：TTF / OTF / WOFF 路径继续用 opentype.js；FontFace 失败时切回 Canvas 软渲染（依赖 opentype 已解析的 font 对象）。
- **理由**：opentype 在 WOFF/OTF/TTF 上稳定，且 Canvas fallback 在浏览器拒绝异常字体时是兜底渲染手段。WOFF2 没有 font 对象时，只能保留 FontFace（即便宣告 fontface 失败，Canvas 因为没有 font 也无法工作，组件最终保留 FontFace 渲染样张）。

### Decision 5: 不破坏对外 props 与现有 i18n key 契约
- **选择**：FontRenderer props 不变；只新增 `font.metadata_loading` / `font.metadata_unavailable` 两个 i18n key（zh-CN / en-US），其余 key 含义不变。
- **理由**：避免对宿主应用产生迁移负担。

## Risks / Trade-offs

- **WOFF2 字体元数据无法展示** → Mitigation：用 `font.metadata_unavailable` 文案明确告知；用户更关心的样张渲染不受影响。后续若有强需求可再评估纯 JS Brotli 方案。
- **TTF/OTF/WOFF 仍可能因 FontFace 失败走 Canvas** → 保留原 Canvas fallback 路径；WOFF2 因没有 font 对象无 Canvas 兜底，会维持 FontFace 渲染。
- **opentype.js 仍在 ESM 产物中被打入 Font lazy chunk** → 这是当前 ESM 双构建策略的产物，体积可接受（约 280KB gzipped），如需进一步瘦身可在后续 change 中处理。

## Migration Plan

1. 实现：删除 wawoff2 链路，改造 React 与 Vue 渲染器同步，新增 i18n key。
2. 清理：删除 worker / shim / wawoff2 类型声明文件，清理两个 lib 与两个 example 的 vite.config.ts 中 `wawoff2` 相关配置，移除两个 package.json 的 `wawoff2` 依赖。
3. 构建验证：`pnpm --filter @eternalheart/react-file-preview build` 与 `pnpm --filter @eternalheart/vue-file-preview build`，确认主 bundle 与 Font chunk 中 `wawoff2` / `decompress_binding` / `onRuntimeInitialized` 命中数为 0。
4. 端到端验证：用 example 跑 TTF / OTF / WOFF / WOFF2 四类文件回归；WOFF2 应秒开、元数据栏占位 “元数据不可用”。
5. 回滚策略：保留 git history，需回滚时 revert 对应提交即可。

## Open Questions

- 未来是否值得引入纯 JS Brotli 解码器仅为补回 WOFF2 元数据？— 当前判断不值得，留作后续观察用户反馈。
