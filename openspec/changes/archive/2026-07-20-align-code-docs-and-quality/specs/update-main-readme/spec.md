## ADDED Requirements

### Requirement: 根 README 示例与命令可执行
README.md 与 README.zh-CN.md SHALL 使用当前 `CustomRenderer.render` 契约、完整组件必填参数、实际存在的根级脚本和正确的文档页面路径。

#### Scenario: 校验双语根 README
- **WHEN** 运行文档一致性测试
- **THEN** 两份 README MUST 不包含废弃的 `component` 自定义渲染器字段、不存在的 `pnpm deploy`/`pnpm pub` 或 `supported-formats` 页面

