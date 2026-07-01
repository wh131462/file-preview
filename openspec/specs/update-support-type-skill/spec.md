# update-support-type-skill Specification

## Purpose
TBD - created by archiving change update-docs-after-refactor. Update Purpose after archive.
## Requirements
### Requirement: 补充工具栏配置规范（§ 3.5）
SKILL.md SHALL 在「强制检查清单」后新增 § 3.5「工具栏配置规范」章节，包含：
- 数据驱动 + 伴生 toolbar 配置的架构说明
- 目录约定（`renderers/Xxx/toolbar.tsx|.ts`）
- `ToolbarItem` 类型定义（`ToolbarButtonItem` / `ToolbarTextItem`）
- `RendererHandle` 命名规范（`prevPage` / `nextPage` / `zoomIn` / `zoomOut` / `toggleToc` 等）
- 工具栏配置文件契约（React 和 Vue 并行示例）
- FilePreviewContent 接入"五件事"（Import、Ref + State、Handler、Toolbar 分支、渲染分支）
- Reference 实现表格（按场景推荐参考 renderer）
- 硬性禁止列表

#### Scenario: 开发者理解 toolbar 伴生配置
- **WHEN** 新增 renderer 需要工具栏控制
- **THEN** 能按 § 3.5 约定创建 `toolbar.tsx|.ts` 并返回 `ToolbarGroup[]`

#### Scenario: React 和 Vue handle 方法对齐
- **WHEN** 开发者实现 renderer handle
- **THEN** 两个框架的方法��严格一致（如都用 `prevPage` 而非 React 用 `goPrev` Vue 用 `prevPage`）

#### Scenario: 提供完整示例
- **WHEN** 文档展示 toolbar 接入
- **THEN** 包含 React `toolbar.tsx` 和 Vue `toolbar.ts` 的完整代码示例

### Requirement: 补充 Renderer 懒加载与代码分割（§ 3.6）
SKILL.md SHALL 新增 § 3.6「Renderer 懒加载与代码分割」章节，包含：
- 懒加载强制约束（所有 renderer 必须走 `lazy.{tsx,ts}`，仅 `UnsupportedRenderer` 例外）
- React `lazy.tsx` 注册流程（`import type` + `lazy(() => import(...).then(m => ({ default: m.XxxRenderer })))`）
- Vue `lazy.ts` 注册流程（`wrap(() => import('./Xxx/index.vue'))`）
- `FilePreviewContent` 导入约束（从 `./renderers/lazy` 导入，禁止直接 import renderer 本体）
- 自检步骤（`pnpm build:lib && pnpm size` 验证体积）
- 硬性禁止列表

#### Scenario: 开发者注册新 renderer
- **WHEN** 新增 renderer 完成实现
- **THEN** 能在 `lazy.{tsx,ts}` 中正确注册，避免破坏代码分割

#### Scenario: 自检体积预算
- **WHEN** 完成 renderer 开发
- **THEN** 能运行 `pnpm size` 确认主入口未超阈值（React ≤ 80 KB / Vue ≤ 60 KB）

#### Scenario: 提供注册示例
- **WHEN** 文档展示懒加载注册
- **THEN** 包含 React 和 Vue 的 `lazy.{tsx,ts}` 完整代码片段

### Requirement: 补充 i18n 国际化（§ 3.7）
SKILL.md SHALL 新增 § 3.7「i18n 国际化」章节，包含：
- 字典权威源（`file-preview-core/src/i18n/messages/zh-CN.ts` 和 `en-US.ts`）
- 新增文件类型必做清单（同步更新两个字典文件）
- Key 命名规范（`<scope>.<snake_name>` 扁平化）
- 参数化插值（`{param}` 占位符）
- 不翻译的内容列表（格式标识符、文件名、数字单位等）
- React 和 Vue 的 `useTranslator` 用法差异
- 参考实现表格
- 硬性禁止列表

#### Scenario: 开发者新增 renderer 文案
- **WHEN** 新 renderer 需要显示用户可见文案
- **THEN** 能先在 `zh-CN.ts` 和 `en-US.ts` 补齐 key，再在代码中通过 `t('key')` 使用

#### Scenario: React 和 Vue 用法对齐
- **WHEN** 文档展示 i18n 集成
- **THEN** 明确 React 用 `const t = useTranslator()` / Vue 模板用 `t('key')` 和 script 用 `t.value('key')`

#### Scenario: 提供完整示例
- **WHEN** 文档展示 i18n 用法
- **THEN** 包含字典文件、React renderer、Vue renderer 的完整代码片段

### Requirement: 补充 Light / Dark 主题适配（§ 3.8）
SKILL.md SHALL 新增 § 3.8「Light / Dark 主题适配」章节，包含：
- 设计 token 总表（`text-fg-*` / `bg-surface-*` / `border-line-*` / `bg-code-bg` / `bg-media-bg` 等）
- 主题豁免场景（媒体画布固定黑底，代码块跟随主题）
- 代码语法高亮三方库的主题切换（`useResolvedTheme()` hook/composable）
- Renderer 写法约束（✅ DO / ❌ DON'T 对比示例）
- 旧字面色 → 新 token 映射表
- 必做自检清单（切 Light 主题验证对比度）
- 硬性禁止列表

#### Scenario: 开发者使用语义 token
- **WHEN** 新 renderer 需要设置颜色
- **THEN** 能从 token 总表中选择合适的语义类，避免使用字面色类

#### Scenario: 三方库主题切换
- **WHEN** renderer 依赖 `react-syntax-highlighter` 或 `shiki`
- **THEN** 能通过 `useResolvedTheme()` 获取已解析主题并传给三方库

#### Scenario: Light 主题自检
- **WHEN** 完成 renderer 开发
- **THEN** 能在 example 中切到 Light 主题验证无白底白字和对比度问题

#### Scenario: 提供完整示例
- **WHEN** 文档展示主题适配
- **THEN** 包含 React 和 Vue 的正确 / 错误写法对比代码片段

### Requirement: 补充依赖外部化与体积预算（§ 3.9）
SKILL.md SHALL 新增 § 3.9「依赖外部化与体积预算」章节，包含：
- 核心约束（重型依赖必须放 `dependencies` + `vite.config.ts` external）
- 新增重型依赖的标准流程（4 步：加 dependencies → 加 external → build 验证 → size 验证）
- 已外部化依赖清单（React 和 Vue 分别列出）
- `@eternalheart/file-preview-core` 例外说明（必须内联打包）
- 体积预算表格（React 主入口 ≤ 80 KB / Vue ≤ 60 KB 等）
- 硬性禁止列表

#### Scenario: 开发者新增重型依赖
- **WHEN** 新 renderer 依赖 npm 解析库（如 `xxx-parser`）
- **THEN** 能按标准流程加到 `dependencies` 和 `external`，并验证外部化生效

#### Scenario: 体积预算验证
- **WHEN** 完成 renderer 开发
- **THEN** 能运行 `pnpm size` 确认全部条目未超阈值

#### Scenario: core 包例外处理
- **WHEN** 开发者修改 `vite.config.ts` 的 `external`
- **THEN** 明确 `@eternalheart/file-preview-core` 绝不能加进 external 列表

### Requirement: 更新硬性禁止列表
SKILL.md 底部的「硬性禁止」章节 SHALL 补充以下条目：
- ❌ 禁止在 renderer / toolbar 中硬编码中文或英文文案（§ 3.7 相关）
- ❌ 禁止只验证 dark 主题就交付（§ 3.8 相关）
- ❌ 禁止使用字面色类或硬编码颜色值（§ 3.8 相关）
- ❌ 禁止给 renderer 加 `theme` props 或读 `data-theme` 属性（§ 3.8 相关）
- ❌ 禁止静态 import renderer 本体（§ 3.6 相关）
- ❌ 禁止 renderer 写 `export default`（§ 3.6 相关）
- ❌ 禁止把重型依赖放 `devDependencies`（§ 3.9 相关）
- ❌ 禁止完工不跑 `pnpm size`（§ 3.6 / § 3.9 相关）

#### Scenario: 开发者遵循新约束
- **WHEN** 开发者新增 renderer
- **THEN** 能从硬性禁止列表快速识别所有不允许的操作

### Requirement: 保持原有内容结构
SKILL.md 的原有章节（如「同步新增文件类型支持」、「强制检查清单」§ 1-4、「执行流程」等）SHALL 保持不变，仅在「强制检查清单」和「硬性禁止」之间插入新章节。

#### Scenario: 章节顺序不变
- **WHEN** 文档更新完成
- **THEN** 原有章节顺序保持（强制检查清单 → § 3.5-3.9 → § 4 文档同步 → 执行流程 → 硬性禁止）

