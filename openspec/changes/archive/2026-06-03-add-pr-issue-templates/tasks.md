## 里程碑 M1：Issue 模板

### 任务 1.1：创建 Issue 模板配置
**估时**：15min
**文件**：`.github/ISSUE_TEMPLATE/config.yml`

- [x] 创建 `.github/ISSUE_TEMPLATE/` 目录
- [x] 创建 `config.yml`：
  - `blank_issues_enabled: false` 禁用空白 Issue
  - 添加 `contact_links` 指向 GitHub Discussions、在线文档、npm 包页面
- [x] 验证：本地 YAML 解析通过

---

### 任务 1.2：创建中文 Bug 报告模板
**估时**：30min
**文件**：`.github/ISSUE_TEMPLATE/bug_report.yml`

- [x] 创建 YAML Issue Form：
  - `name: 🐛 Bug 报告`
  - `description: 提交 Bug 反馈`
  - `title: "[Bug]: "`
  - `labels: ["bug", "triage"]`
- [x] 字段设计：
  - `dropdown` - 受影响的包（react-file-preview / vue-file-preview / file-preview-core）
  - `input` - 版本号（必填）
  - `textarea` - Bug 描述（必填）
  - `textarea` - 复现步骤（必填）
  - `textarea` - 预期行为（必填）
  - `textarea` - 实际行为
  - `dropdown` - 浏览器（多选）
  - `input` - 操作系统
  - `input` - 框架版本
  - `textarea` - 文件信息、截图、补充信息
  - `checkboxes` - 提交前确认事项

---

### 任务 1.3：创建英文 Bug 报告模板
**估时**：20min
**文件**：`.github/ISSUE_TEMPLATE/bug_report_en.yml`

- [x] 翻译任务 1.2 的字段为英文
- [x] 保持字段结构与中文版一致
- [x] `labels: ["bug", "triage"]`

---

### 任务 1.4：创建中文功能请求模板
**估时**：20min
**文件**：`.github/ISSUE_TEMPLATE/feature_request.yml`

- [x] 创建 YAML Issue Form：
  - `name: ✨ 功能请求`
  - `title: "[Feature]: "`
  - `labels: ["enhancement"]`
- [x] 字段设计：
  - `dropdown` - 影响包范围（多选）
  - `textarea` - 使用场景（必填）
  - `textarea` - 期望功能（必填）
  - `textarea` - 替代方案（可选）
  - `textarea` - API 设计示例（可选）
  - `dropdown` - 优先级（低/中/高）
  - `checkboxes` - 贡献意愿、提交前确认

---

### 任务 1.5：创建英文功能请求模板
**估时**：15min
**文件**：`.github/ISSUE_TEMPLATE/feature_request_en.yml`

- [x] 翻译任务 1.4 的字段为英文
- [x] 保持字段结构与中文版一致

---

### 任务 1.6：创建疑问讨论模板（中英文）
**估时**：20min
**文件**：`.github/ISSUE_TEMPLATE/question.yml`、`.github/ISSUE_TEMPLATE/question_en.yml`

- [x] 中文版字段：
  - `dropdown` - 相关包
  - `textarea` - 你的问题（必填）
  - `textarea` - 已尝试的方法
  - `checkboxes` - 已查阅文档/已搜索 Issue
- [x] 英文版同步翻译
- [x] `labels: ["question"]`

---

## 里程碑 M2：PR 模板

### 任务 2.1：创建 PR 模板
**估时**：30min
**文件**：`.github/pull_request_template.md`

- [x] 模板内容包含：
  - 变更类型（Checkbox 列表）：Bug 修复 / 新功能 / 文档更新 / 重构 / 样式 / 性能 / 构建 / 测试 / 破坏性变更
  - 变更描述（自由文本）
  - 关联 Issue（`Closes #xxx` 格式说明）
  - 影响包范围 Checkbox
  - 测试情况（Checkbox）：本地构建 / lint / React+Vue 双框架同步验证
  - 测试方法说明区块
  - 截图 / 录屏区块
  - 破坏性变更说明区块
  - 检查清单（ESLint / Conventional Commits / 文档更新 / 自测）
- [x] 模板采用中英文双语对照（中文为主，英文并列）

---

## 里程碑 M3：贡献指南

> 注：CONTRIBUTING 文件已存在于仓库根目录（与 README 同级），GitHub 自动识别此位置。无需重复创建到 `.github/`。

### 任务 3.1：英文贡献指南
**文件**：`CONTRIBUTING.md`（仓库根目录）

- [x] 文件已存在，包含完整章节结构（Code of Conduct / Getting Started / Development Workflow / Project Structure / Coding Standards / Commit Guidelines / PR Process / Testing / Documentation）
- [x] 已添加语言切换链接指向中文版

---

### 任务 3.2：中文贡献指南
**文件**：`CONTRIBUTING.zh-CN.md`（仓库根目录）

- [x] 文件已存在，章节结构与英文版一致
- [x] 已添加语言切换链接指向英文版

---

## 里程碑 M4：文档集成

### 任务 4.1：README 添加贡献链接
**文件**：`README.md`、`README.zh-CN.md`

- [x] README.md 中已存在 "Contributing Guide" 链接指向 `./CONTRIBUTING.md`
- [x] README.zh-CN.md 中已存在 "贡献指南" 链接指向 `CONTRIBUTING.md`
- [x] 仅链接引用，未重复内容

---

## 里程碑 M5：验证

### 任务 5.1：本地验证 YAML 格式
**估时**：20min

- [x] 使用 Python YAML 解析器对 7 个 `.yml` 文件进行 `yaml.safe_load` 校验，全部通过
- [x] 检查字段缩进、引号、特殊字符（emoji、HTML 实体）渲染无误
- [x] `labels`、`name`、`description`、`type` 等关键字段正确

---

### 任务 5.2：GitHub 上预览验证
**估时**：15min（推送后由维护者执行）

- [ ] 推送到 master 分支
- [ ] 访问 GitHub Issues 页面，确认模板列表显示正确（6 个模板 + 4 个 contact_links）
- [ ] 创建测试 Issue 确认字段渲染正确
- [ ] 创建测试 PR 确认 PR 模板自动填充
- [ ] 验证 Discussions 链接、文档链接可访问

---

### 任务 5.3：清理与归档
**估时**：10min

- [ ] （如有）删除测试 Issue/PR
- [ ] 执行 `/opsx:archive` 归档本变更
- [ ] 提交信息遵循 Conventional Commits：`chore: add PR and Issue templates`

---

## 总估时

- M1（Issue 模板）：2h ✓
- M2（PR 模板）：30min ✓
- M3（贡献指南）：已预先完成 ✓
- M4（文档集成）：已预先完成 ✓
- M5（验证）：YAML 校验完成，GitHub 预览待推送验证

**实际完成**：M1 + M2 + 验证 ≈ 2.5h
