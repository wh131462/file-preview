# update-vitepress-docs Specification

## Purpose
TBD - created by archiving change update-docs-after-refactor. Update Purpose after archive.
## Requirements
### Requirement: 同步架构文档（如存在）
VitePress 文档站中与架构相关的章节（如 `guide/architecture.md`、`api/custom-renderers.md` 等，如存在）SHALL 同步以下内容：
- 工具栏事件驱动机制
- Renderer 懒加载流程
- i18n 集成规范
- 主题适配约束

#### Scenario: 更新架构指南
- **WHEN** `packages/docs/guide/architecture.md` 存在
- **THEN** 补充工具栏、懒加载、i18n、主题四个子章节

#### Scenario: 更新自定义 renderer API 文档
- **WHEN** `packages/docs/api/custom-renderers.md` 存在
- **THEN** 同步 React/Vue 包 README 中新增的四个子章节内容

#### Scenario: 跳过不存在的文档
- **WHEN** 相关架构文档不存在
- **THEN** 本 capability 无需执行任何操作

### Requirement: 更新类型文档（如涉及）
如果 `packages/docs/api/types.md` 中存在与 renderer 相关的类型定义（如 `RendererHandle`、`ToolbarGroup` 等），SHALL 补充新架构引入的类型（如 `ToolbarEventEmitter`）。

#### Scenario: 补充新类型定义
- **WHEN** `types.md` 中包含 renderer 相关类型
- **THEN** 补充 `ToolbarEventEmitter`、`onToolbarChange` 等新类型的说明

#### Scenario: 跳过无关类型文档
- **WHEN** `types.md` 不包含 renderer 相关类型
- **THEN** 本 capability 无需执行任何操作

### Requirement: 保持中英文同步
VitePress 文档站的中英文版本（如 `guide/architecture.md` 和 `guide/architecture.zh-CN.md`）SHALL 内容同步，仅语言不同。

#### Scenario: 双语内容对齐
- **WHEN** 英文版更新
- **THEN** 中文版同步更新对应章节

### Requirement: VitePress 内容与实现一致
VitePress SHALL 删除重复章节、过期版本标签和无法由实现支撑的性能承诺，并 SHALL 准确描述 Worker 回退、公开类型和现有构建结构。

#### Scenario: 构建并检查文档站
- **WHEN** 执行文档一致性测试和 VitePress 构建
- **THEN** API 页面、指南页面和站内链接 MUST 通过检查

