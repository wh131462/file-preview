# advanced-image-worker-decoding Specification

## Purpose
TBD - created by archiving change align-code-docs-and-quality. Update Purpose after archive.
## Requirements
### Requirement: 耗时高级图片优先在 Worker 解码
React 与 Vue 图片渲染器对 HEIC、HEIF、RAW 和 PSD 文件 SHALL 优先调用共享 Worker 客户端完成解码，主线程不得直接执行首次解码尝试。

#### Scenario: Worker 支持类型的首次解码
- **WHEN** 用户打开 HEIC、HEIF、RAW 或 PSD 文件
- **THEN** 对应框架的图片渲染器 MUST 把原始 ArrayBuffer 传给 `decodeInWorker`

### Requirement: Worker 失败时安全回退
Worker 创建失败、执行失败或第三方解码器不兼容 Worker 环境时，图片渲染器 SHALL 使用相同 loader 在主线程重试一次，并继续使用统一错误展示。

#### Scenario: Worker 解码失败
- **WHEN** `decodeInWorker` 抛出错误
- **THEN** 图片渲染器 MUST 调用 loader 的 `decode` 完成回退

### Requirement: 双框架解码策略一致
React 与 Vue 图片渲染器 SHALL 使用相同的 Worker 类型判定、回退条件和对象 URL 生命周期策略。

#### Scenario: 相同文件在双框架打开
- **WHEN** React 与 Vue 分别打开相同的 Worker 支持文件
- **THEN** 两端 MUST 采用等价的 Worker 优先和主线程回退流程

