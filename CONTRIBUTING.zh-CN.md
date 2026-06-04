# 贡献指南

[English](./CONTRIBUTING.md) | 简体中文

感谢你对 File Preview 项目的关注！本文档提供了贡献代码的指南和说明。

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4d6.svg" width="20" height="20" alt="📖" /> 目录

- [行为准则](#行为准则)
- [开始贡献](#开始贡献)
- [开发流程](#开发流程)
- [项目结构](#项目结构)
- [编码规范](#编码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [测试](#测试)
- [文档](#文档)

---

## 行为准则

本项目遵循行为准则，参与者应该：

- 尊重和包容他人
- 优雅地接受建设性批评
- 关注社区的最佳利益
- 对其他社区成员表现出同理心

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f680.svg" width="20" height="20" alt="🚀" /> 开始贡献

### 环境要求

- Node.js >= 18
- pnpm >= 8

### Fork 和克隆

1. 在 GitHub 上 Fork 本仓库
2. 克隆你的 Fork 到本地：

```bash
git clone https://github.com/YOUR_USERNAME/file-preview.git
cd file-preview
```

3. 添加上游仓库：

```bash
git remote add upstream https://github.com/wh131462/file-preview.git
```

### 安装依赖

```bash
pnpm install
```

### 验证环境

```bash
# 启动 React 示例
pnpm dev

# 启动 Vue 示例
pnpm dev:vue

# 启动文档站
pnpm dev:docs
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f6e0.svg" width="20" height="20" alt="🛠️" /> 开发流程

### 创建功能分支

```bash
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

### 进行修改

1. 在相应的包中编辑文件
2. 在本地测试你的修改
3. 如有必要，添加测试
4. 如有需要，更新文档

### 构建和测试

```bash
# 构建所有包
pnpm build

# 仅构建库
pnpm build:lib

# 运行代码检查
pnpm lint

# 运行类型检查
pnpm type-check
```

### 保持分支更新

```bash
git fetch upstream
git rebase upstream/master
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c1.svg" width="20" height="20" alt="📁" /> 项目结构

```
file-preview/
├── packages/
│   ├── file-preview-core/        # 框架无关核心
│   │   ├── src/
│   │   │   ├── types/            # TypeScript 类型定义
│   │   │   ├── utils/            # 工具函数
│   │   │   └── loaders/          # 文件加载器和解析器
│   │   └── package.json
│   │
│   ├── react-file-preview/       # React 绑定
│   │   ├── src/
│   │   │   ├── components/       # React 组件
│   │   │   ├── renderers/        # 文件类型渲染器
│   │   │   └── hooks/            # 自定义 React hooks
│   │   └── package.json
│   │
│   ├── vue-file-preview/         # Vue 绑定
│   │   ├── src/
│   │   │   ├── components/       # Vue 组件
│   │   │   └── composables/      # Vue 组合式函数
│   │   └── package.json
│   │
│   ├── example/                  # React 示例应用
│   ├── vue-example/              # Vue 示例应用
│   └── docs/                     # VitePress 文档
│
├── openspec/                     # OpenSpec 变更记录
└── pnpm-workspace.yaml
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2728.svg" width="20" height="20" alt="✨" /> 编码规范

### TypeScript

- 所有新代码使用 TypeScript
- 定义适当的类型，避免 `any`
- 从包入口导出公共类型

### 代码风格

- 遵循现有代码风格
- 使用项目提供的 ESLint 配置
- 提交前运行 `pnpm lint`

### 命名约定

- **组件**：PascalCase（例如：`FilePreviewModal`）
- **文件**：组件用 PascalCase，工具函数用 camelCase
- **变量/函数**：camelCase
- **常量**：UPPER_SNAKE_CASE
- **类型/接口**：PascalCase

### 最佳实践

- 保持组件专注和单一职责
- 将可重用逻辑提取到 hooks/composables
- 编写自解释的代码，使用清晰的命名
- 为复杂逻辑添加注释
- 避免深层嵌套（最多 3 层）

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4dd.svg" width="20" height="20" alt="📝" /> 提交规范

### 提交信息格式

遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/) 规范：

```
<类型>(<范围>): <主题>

<正文>

<脚注>
```

### 类型

- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档变更
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构（既不是新增功能，也不是修复 bug 的代码变动）
- `perf`: 性能优化
- `test`: 增加或修改测试
- `chore`: 构建过程或辅助工具的变动
- `ci`: CI 配置变更

### 范围

- `core`: file-preview-core 的变更
- `react`: react-file-preview 的变更
- `vue`: vue-file-preview 的变更
- `docs`: 文档的变更
- `example`: 示例应用的变更

### 示例

```bash
feat(react): 添加 HEIC 图片格式支持
fix(core): 修正 AVIF 文件的 MIME 类型检测
docs: 更新快速开始指南
refactor(vue): 简化 FilePreviewEmbed 组件 props
perf(react): 优化图片渲染性能
chore(deps): 升级 pdfjs-dist 到 4.0.0
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f504.svg" width="20" height="20" alt="🔄" /> Pull Request 流程

### 提交前检查

1. <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2705.svg" width="16" height="16" alt="✅" style="vertical-align: middle;" /> 确保所有测试通过
2. <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2705.svg" width="16" height="16" alt="✅" style="vertical-align: middle;" /> 运行代码检查并修复问题
3. <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2705.svg" width="16" height="16" alt="✅" style="vertical-align: middle;" /> 如有需要，更新文档
4. <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2705.svg" width="16" height="16" alt="✅" style="vertical-align: middle;" /> Rebase 到最新的 upstream/master

### PR 标题

使用与提交信息相同的格式：

```
feat(react): 为图片查看器添加缩放控件
```

### PR 描述模板

```markdown
## 描述
简要描述此 PR 的作用。

## 变更类型
- [ ] Bug 修复（不破坏现有功能的非破坏性变更）
- [ ] 新功能（不破坏现有功能的非破坏性变更）
- [ ] 破坏性变更（会导致现有功能无法按预期工作的修复或功能）
- [ ] 文档更新

## 相关 Issue
Closes #123

## 截图（如适用）
添加展示变更的截图或 GIF。

## 检查清单
- [ ] 我的代码遵循项目的代码风格
- [ ] 我已对代码进行了自我审查
- [ ] 我已为难以理解的地方添加了注释
- [ ] 我已相应地更新了文档
- [ ] 我的更改不会产生新的警告
- [ ] 我已添加证明修复有效或功能正常的测试
```

### 审查流程

1. 维护者将审查你的 PR
2. 根据反馈或请求进行修改
3. 一旦批准，维护者将合并你的 PR

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f9ea.svg" width="20" height="20" alt="🧪" /> 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监视模式运行测试
pnpm test:watch

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

### 编写测试

- 为新的工具函数和逻辑添加单元测试
- 为新组件添加组件测试
- 确保覆盖边界情况

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4da.svg" width="20" height="20" alt="📚" /> 文档

### 何时更新文档

- 添加新功能
- 更改公共 API
- 添加新支持的文件格式
- 修复影响已记录行为的 bug

### 文档位置

- **README 文件**：快速开始和基本使用
- **VitePress 文档**（`packages/docs/`）：全面的指南和 API 参考
- **代码注释**：为导出的函数和类型添加 TSDoc 注释

### 文档风格

- 清晰简洁
- 包含代码示例
- 使用适当的格式（代码块、表格、列表）
- 保持中英文版本同步

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e2.svg" width="20" height="20" alt="📢" /> 添加新文件格式支持

### 流程

1. **添加类型检测** 在 `packages/file-preview-core/src/utils/mimeTypes.ts`
2. **创建渲染器组件** 在 `packages/react-file-preview/src/renderers/`（以及 Vue 对应版本）
3. **添加加载器逻辑** 在 `packages/file-preview-core/src/loaders/`（如需要）
4. **更新文档** 在支持格式列表中
5. **添加示例** 到演示应用
6. **更新 OpenSpec** 添加变更记录

### 示例

参考现有的渲染器如 `Image`、`Video` 或 `PDF` 作为模板。

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2753.svg" width="20" height="20" alt="❓" /> 有疑问？

- 提交 [Issue](https://github.com/wh131462/file-preview/issues) 报告 bug 或请求新功能
- 在 [GitHub Discussions](https://github.com/wh131462/file-preview/discussions) 参与讨论
- 在创建新 issue 或 PR 前检查现有的内容

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f64f.svg" width="20" height="20" alt="🙏" /> 感谢！

你的贡献让这个项目变得更好。我们感谢你的时间和努力！

---

## 许可证

通过向 File Preview 贡献代码，你同意你的贡献将在 MIT 许可证下授权。
