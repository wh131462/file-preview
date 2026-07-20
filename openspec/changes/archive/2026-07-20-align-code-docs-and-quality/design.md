## Context

高级图片 loader 和 Worker 基础设施已经存在，但 React/Vue Image Renderer 当前直接调用 loader，导致 HEIC、RAW、PSD 仍在主线程执行。公开文档还存在错误示例、缺失导出、失效命令和链接；现有 OpenSpec 同时包含当前实现与已放弃设计；ESLint 9 缺少 flat config，仓库没有自动化测试入口。

## Goals / Non-Goals

**Goals:**

- 让 HEIC、RAW、PSD 的实际解码优先运行于 Worker，并在 Worker 不可用或解码失败时回退主线程。
- 保持 React/Vue 行为一致，不改变组件业务接口。
- 让公开入口、README、VitePress、OpenSpec 和实际构建结构一致。
- 建立可重复执行的 lint、test、build、docs 和 size 验证链路。

**Non-Goals:**

- 不增加 renderer 子路径导出。
- 不拆分 renderer CSS。
- 不重新设计图片 loader 或引入新的图片解码依赖。
- 不承诺通过静态测试验证真实浏览器性能数字。

## Decisions

1. Worker 接入放在 Image Renderer 与 loader 之间。Renderer 已持有原始 Blob、MIME 和取消状态，能决定 Worker 路径并管理回退；loader 保持框架无关。
2. Worker 仅覆盖 `workerClient.shouldUseWorker()` 中声明的 HEIC、RAW、PSD。TIFF、AVIF 继续主线程，JP2 保持其专用 Worker 实现。
3. Worker 创建或执行失败时回退同一 loader 的主线程 `decode()`，避免 CSP、旧浏览器或打包器环境直接失去预览能力。
4. 请求类型从 React/Vue 根入口补齐类型导出，不增加运行时代码。
5. 测试使用 Node 内置测试运行器结合 TypeScript 编译后的 core 产物和静态契约检查，避免新增测试框架依赖。
6. ESLint 使用 ESLint 9 flat config，覆盖 TS/TSX/Vue 脚本可静态处理的范围，并延续现有 TypeScript/React Hooks 规则。
7. OpenSpec 删除未实施的子路径入口和 CSS 分包要求；统一 CSS 与动态 JS renderer chunk 作为当前发布契约。

## Risks / Trade-offs

- [Worker 中的第三方库依赖 DOM API] → Worker 失败时自动回退主线程，并用测试覆盖回退分支。
- [把 `.ts` Worker URL 打进库产物时不同打包器行为不一致] → 延续当前 Vite/webpack 5 URL 语法并通过 ESM/CJS 构建检查产物。
- [静态文档检查不能验证所有语义] → 覆盖高风险的导出名、脚本名、页面路径和废弃字段，并保留人工审查。
- [Lint 首次启用会暴露既有问题] → 只配置项目当前可满足的规则，所有 warning 仍按根脚本作为失败处理。

