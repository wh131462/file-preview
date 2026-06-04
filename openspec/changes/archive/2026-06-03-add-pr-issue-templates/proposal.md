## Why

当前项目缺少 GitHub PR 和 Issue 的标准化模板，导致以下问题：

1. **Issue 质量参差不齐**：用户提交的 Bug 报告经常缺少关键信息（复现步骤、环境信息、预期/实际行为），维护者需反复询问才能定位问题，增加沟通成本。
2. **Feature Request 不够结构化**：功能请求缺少场景描述、价值说明、替代方案等关键信息，难以评估优先级。
3. **PR 缺乏上下文**：贡献者提交的 PR 经常缺少变更说明、测试情况、关联 Issue，Code Review 效率低。
4. **贡献门槛高**：新贡献者不清楚需要提供哪些信息，降低参与意愿。

本提案通过添加 GitHub 官方模板（Issue Templates + PR Template），规范协作流程，提升项目维护效率。

## What Changes

- **新增 Issue 模板**（`.github/ISSUE_TEMPLATE/`）：
  - `bug_report.yml`：Bug 报告表单，包含环境信息、复现步骤、预期/实际行为、截图/日志等结构化字段
  - `feature_request.yml`：功能请求表单，包含使用场景、期望行为、替代方案、优先级等字段
  - `question.yml`：疑问讨论模板，简化提问流程
  - `config.yml`：模板配置文件，设置空白 Issue、外部链接（如 Discord/讨论区）
- **新增 PR 模板**（`.github/pull_request_template.md`）：
  - 变更类型（Feature/Bugfix/Refactor/Docs/Chore）
  - 变更描述和动机
  - 关联 Issue（`Closes #xxx`）
  - 测试情况（单元测试、手动测试）
  - 破坏性变更声明
  - Checklist（代码规范、文档更新、测试通过）
- **新增贡献指南**（`.github/CONTRIBUTING.md`）：
  - 提交 Issue 的指引
  - 提交 PR 的流程（fork → branch → commit → test → PR）
  - 代码规范（ESLint、Conventional Commits）
  - 本地开发环境搭建
- **支持双语**：所有模板提供中文和英文版本（中文优先，英文作为 `_en.md` 后缀备选）

## Capabilities

### New Capabilities
- `github-templates`: 为 GitHub 协作提供标准化模板，包括 Issue 表单（Bug/Feature/Question）、PR 模板、贡献指南

### Modified Capabilities
<!-- 无修改已有能力 -->

## Impact

- **代码影响**：
  - 新增 `.github/ISSUE_TEMPLATE/` 目录及 4 个文件（bug_report.yml、feature_request.yml、question.yml、config.yml）
  - 新增 `.github/pull_request_template.md`
  - 新增 `.github/CONTRIBUTING.md` 和 `.github/CONTRIBUTING.zh-CN.md`
  - 无代码逻辑变更
- **协作影响**：
  - 用户创建 Issue 时自动引导使用结构化表单
  - 贡献者创建 PR 时自动填充模板内容
  - 新贡献者通过 CONTRIBUTING.md 快速了解规范
- **维护影响**：
  - 减少信息不完整导致的反复沟通
  - 提高 Issue 分类和优先级判断效率
  - 降低 Code Review 沟通成本
- **文档影响**：
  - README 新增"贡献指南"链接，指向 `.github/CONTRIBUTING.md`
- **无 BREAKING**：已有工作流程完全兼容，仅增量优化协作体验
