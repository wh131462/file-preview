## Why

当前公开 README、VitePress API 文档、OpenSpec 规范与实际导出及运行链路存在多处偏差，部分示例和命令会直接导致用户集成失败。同时，高级图片的 Web Worker 承诺尚未接入实际渲染链路，ESLint 质量门禁也处于不可执行状态。

## What Changes

- 将 HEIC、RAW、PSD 解码接入 React/Vue 图片渲染器的 Web Worker 路径，并保留安全的主线程回退。
- 修复 React/Vue 公共类型导出，使请求与鉴权类型和文档一致。
- 同步根 README、双框架 README、VitePress 文档中的示例、命令、链接、版本说明和能力描述。
- 以当前发布结构为准修订 bundle OpenSpec，移除未实现的 renderer 子路径入口、renderer CSS 分包和过期 wawoff2 要求。
- 新增 ESLint 9 flat config，并增加公开导出、文件类型识别、请求工具及文档一致性的自动化测试。
- 清理重复、冲突或已过期的规范内容，不引入新的运行时依赖。

## Capabilities

### New Capabilities

- `advanced-image-worker-decoding`: 定义高级图片在 Worker 中解码、失败回退和双框架一致性的行为。
- `documentation-code-consistency`: 定义公开文档、包导出、示例命令、链接和自动化一致性检查。
- `quality-gates`: 定义 ESLint、类型构建、测试、文档构建和体积检查的本地质量门禁。

### Modified Capabilities

- `bundle-optimization`: 以当前单一公开入口、统一 CSS 入口和原生 WOFF2 路径替换未实现或过期的发布要求。
- `update-main-readme`: 修正根 README 的自定义渲染器契约、开发命令和文档链接要求。
- `update-react-docs`: 明确 React 文档必须与实际公共导出及当前版本一致。
- `update-vue-docs`: 明确 Vue 文档必须与实际公共导出及当前版本一致。
- `update-vitepress-docs`: 增加 API、能力描述和站内链接与实现保持一致的要求。

## Impact

- 影响 `file-preview-core` 图片 worker、React/Vue Image Renderer 与两个框架包的公共类型入口。
- 影响根 README、框架 README、VitePress 指南/API 文档及相关 OpenSpec。
- 影响根级 ESLint、测试脚本和 CI 可执行检查。
- 不改变现有组件业务 API，不新增运行时依赖，不新增 renderer 子路径导出或 CSS 分包。
