## Why

项目已完成组件架构重构，包括工具栏事件驱动机制、renderer 懒加载优化、i18n 国际化体系和主题系统等核心改进。现有文档未反映最新实践，导致开发者无法了解当前架构约束和最佳实践。需要全面更新文档，确保内容与代码实现一致。

## What Changes

- 更新主目录 README.md 和 README.zh-CN.md���统一图标风格为 CDN emoji 形式
- 更新 packages/react-file-preview/README.md 和 README.zh-CN.md，补充工具栏事件驱动、懒加载、i18n、主题系统等新架构说明
- ���新 packages/vue-file-preview/README.md 和 README.zh-CN.md，同步 React 版本的架构更新
- 更新 packages/docs 中相关文档（API 文档、指南等），同步架构变更
- 更新 .claude/skills/support-type/SKILL.md，对齐当前 renderer 接入流程（toolbar 伴���配置、lazy 注册、i18n 集成、主题适配等）

## Capabilities

### New Capabilities
- `update-main-readme`: 更新主目录 README 的图标风格和架构描述
- `update-react-docs`: 更新 React 包文档，补充事件驱动工具栏、懒加载、i18n、主���系统等内容
- `update-vue-docs`: 更新 Vue 包文档，同步 React 版本的架构说���
- `update-vitepress-docs`: 更新 VitePress 文档站内容，同步架构变更
- `update-support-type-skill`: 更新 support-type skill，对齐当前 renderer 接入流程

### Modified Capabilities
<!-- 无现有 capability 的 requirement 变更，这是纯文档更新 -->

## Impact

- 影响范围：
  - 主目录 README.md、README.zh-CN.md
  - packages/react-file-preview/README.md、README.zh-CN.md
  - packages/vue-file-preview/README.md、README.zh-CN.md
  - packages/docs/guide/\*\*.md、packages/docs/api/\*\*.md
  - .claude/skills/support-type/SKILL.md
- 不影响代码实现，仅更新文档内容
- 文档更新后，开发者可准确了解当前架构约束和新增 renderer 的标准流程
