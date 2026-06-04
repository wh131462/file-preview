## Context

项目目前作为开源的 React/Vue 文件预览组件库托管在 GitHub，但缺少标准化的 Issue 和 PR 模板。维护者每次都需要手动询问关键信息（环境、复现步骤等），新贡献者也不清楚提交规范。

核心挑战：

1. **降低协作摩擦**：通过结构化模板自动引导用户提供必要信息，减少来回沟通。
2. **支持双语**：项目用户包括中英文使用者，模板需要兼顾两种语言。
3. **保持灵活性**：模板要规范但不能过度繁琐，避免劝退用户。
4. **与现有规范一致**：与项目的 ESLint 规则、Conventional Commits 约定保持一致。

约束：

- 仅添加 `.github/` 目录下的配置文件，不修改源码逻辑。
- 模板格式遵循 GitHub 官方标准（YAML Issue Forms + Markdown PR template）。
- 不引入新的 CI/CD 流程（如自动 label 等高级功能留待后续提案）。
- 文档双语支持，主语言为中文，提供英文版本作为补充。

## Goals / Non-Goals

**Goals:**

- 提供 3 种 Issue 模板（Bug 报告、功能请求、疑问讨论），覆盖主要场景。
- 提供统一的 PR 模板，标准化提交信息。
- 提供 CONTRIBUTING.md 引导新贡献者快速上手。
- 使用 GitHub Issue Forms（YAML 格式）提供结构化表单体验。
- 模板支持中英文双语。

**Non-Goals:**

- 不实现自动化 label 分配、自动指派 reviewer 等 GitHub Actions 流程。
- 不修改现有的 CI 配置、构建脚本。
- 不创建 Code of Conduct（行为准则），可在后续单独提案。
- 不创建 SECURITY.md 安全策略，可在后续单独提案。
- 不修改 README 内容（除了添加贡献指南链接）。

## Decisions

### D1: 使用 YAML Issue Forms 而非 Markdown 模板

**选择**：Issue 模板使用 GitHub 官方推荐的 YAML Issue Forms（`.yml` 格式），通过表单字段（input/textarea/dropdown/checkboxes）收集结构化信息。

```yaml
name: 🐛 Bug 报告
description: 提交 Bug 反馈
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: dropdown
    id: package
    attributes:
      label: 受影响的包
      options:
        - "@eternalheart/react-file-preview"
        - "@eternalheart/vue-file-preview"
        - "@eternalheart/file-preview-core"
    validations:
      required: true
  - type: textarea
    id: reproduce
    attributes:
      label: 复现步骤
      description: 请提供清晰的复现步骤
    validations:
      required: true
```

**理由**：

- YAML Forms 比 Markdown 模板更结构化，用户无法跳过必填字段。
- 自动添加 labels（如 `bug`, `triage`），便于维护者分类。
- 字段化数据便于后续脚本处理（如统计 Bug 分布）。
- GitHub UI 上展示更友好（表单式而非自由文本）。

**替代方案**：

- ❌ Markdown 模板（`.md`）：用户可随意修改/删除字段，结构化程度低。

### D2: 双语策略 - 主中文，英文作为独立模板

**选择**：每种 Issue 类型创建两个文件：

- `bug_report.yml`（中文，主要）
- `bug_report_en.yml`（英文）

PR 模板和 CONTRIBUTING.md 同样提供两个文件：

- `pull_request_template.md`（中文，默认）
- `CONTRIBUTING.md`（英文版）
- `CONTRIBUTING.zh-CN.md`（中文版）

**理由**：

- 项目用户群以中文为主，中文模板作为默认体验。
- GitHub Issue Forms 支持多模板共存，用户可在创建 Issue 时选择语言。
- CONTRIBUTING.md 遵循 GitHub 惯例（英文为 `CONTRIBUTING.md`，中文为 `CONTRIBUTING.zh-CN.md`）。

**替代方案**：

- ❌ 单文件混合中英文：界面臃肿，体验差。
- ❌ 仅提供中文：对国际贡献者不友好。

### D3: PR 模板使用 Checklist 形式

**选择**：PR 模板包含以下结构化字段：

```markdown
## 变更类型
- [ ] 🐛 Bug 修复
- [ ] ✨ 新功能
- [ ] 📝 文档更新
- [ ] ♻️ 代码重构
- [ ] 🎨 样式调整
- [ ] ⚡ 性能优化
- [ ] 🔧 构建配置
- [ ] 🧪 测试相关

## 变更描述
<!-- 简要描述本次变更内容 -->

## 关联 Issue
<!-- 例如：Closes #123 -->

## 测试情况
- [ ] 已通过单元测试
- [ ] 已手动测试
- [ ] 已在 React 和 Vue 两个包同步验证

## 检查清单
- [ ] 代码遵循 ESLint 规范（`pnpm lint` 通过）
- [ ] 提交信息遵循 Conventional Commits
- [ ] 已更新相关文档
- [ ] 包含破坏性变更（如有请说明）
```

**理由**：

- Checklist 形式让贡献者明确每一项要求。
- 与项目现有规范（ESLint、Conventional Commits、双框架同步）对齐。
- 维护者 Review 时可快速识别是否满足合并条件。

### D4: config.yml 禁用空白 Issue + 添加外部链接

**选择**：在 `.github/ISSUE_TEMPLATE/config.yml` 中：

```yaml
blank_issues_enabled: false
contact_links:
  - name: 💬 GitHub Discussions
    url: https://github.com/wh131462/file-preview/discussions
    about: 提问、讨论或想法分享
  - name: 📖 文档
    url: https://wh131462.github.io/file-preview
    about: 查看在线文档
```

**理由**：

- 禁用空白 Issue 强制用户使用模板，避免低质量 Issue。
- 引导讨论性问题到 GitHub Discussions，保持 Issue 列表聚焦于 Bug/Feature。
- 提供文档链接，鼓励用户先查文档。

### D5: CONTRIBUTING.md 的内容范围

**选择**：CONTRIBUTING.md 包含：

1. **行为准则**（简短声明，链接到通用准则）
2. **如何提交 Issue**（使用模板、提供必要信息）
3. **如何提交 PR**：
   - Fork 仓库
   - Clone 到本地
   - 安装依赖（`pnpm install`）
   - 创建分支（命名规范：`feat/xxx`, `fix/xxx`, `docs/xxx`）
   - 提交规范（Conventional Commits）
   - 运行测试和 lint
   - 提交 PR
4. **本地开发**：
   - Monorepo 结构说明
   - 常用命令（`pnpm dev`, `pnpm dev:vue`, `pnpm build`, `pnpm lint`）
   - 添加新文件类型的流程（参考 `support-type` 工作流）
5. **代码规范**：
   - ESLint 配置
   - TypeScript 严格模式
   - React/Vue 同步支持要求

**理由**：

- 覆盖新贡献者最常见的 3 类问题：如何提 Issue、如何提 PR、如何本地跑起来。
- 不包含过于详细的架构文档（避免与 README/openspec 重复）。
- 强调项目特殊约束（双框架同步），避免新贡献者只改一边。

## Risks / Trade-offs

### R1: YAML Issue Forms 学习成本

**风险**：YAML 格式相比 Markdown 更严格，编写时容易格式错误。

**缓解**：参考 GitHub 官方示例，使用 VS Code YAML 插件校验。提交前在测试仓库或本地预览验证格式正确性。

### R2: 模板过于繁琐劝退用户

**风险**：必填字段过多可能导致用户放弃提交 Issue。

**缓解**：
- Bug 报告：必填字段控制在 5 个以内（包名、描述、复现步骤、版本、环境）。
- Feature Request：必填字段控制在 3 个以内（场景、期望、价值）。
- Question 模板最简化，仅 1-2 个字段。

### R3: 双语维护成本

**风险**：中英文版本需要同步更新，长期维护成本上升。

**缓解**：在 CONTRIBUTING 中注明"修改模板时需同步更新另一语言版本"。模板变更频率低，维护成本可控。

### R4: 与现有 issue 处理流程冲突

**风险**：已有用户习惯直接创建空白 Issue，禁用后可能不适应。

**缓解**：保留 `contact_links` 指向 Discussions，给用户提供"非结构化讨论"的出口。

## Migration Plan

无迁移需求。本变更纯粹是新增配置文件：

1. 一次性创建 `.github/` 下所有模板文件。
2. 推送到 master 分支后，GitHub 自动识别并启用。
3. 在 README 中添加 CONTRIBUTING.md 链接（用户主动查阅）。
4. 已有 Issue 不受影响，仅新建 Issue 走新模板。

无需数据迁移、无破坏性变更、无版本号变更。

## Open Questions

1. **是否需要添加 SECURITY.md**？当前不在范围内，建议后续单独提案。
2. **是否需要添加 GitHub Actions 自动 label**？当前不在范围内，YAML Forms 的 `labels` 字段已能满足基础需求。
3. **CONTRIBUTING.md 是否需要包含发布流程**？决定：包含简要说明，详细流程留在 `package.json` scripts 中。
