# update-vue-docs Specification

## Purpose
TBD - created by archiving change update-docs-after-refactor. Update Purpose after archive.
## Requirements
### Requirement: 补充事件驱动工具栏更新
README.md 和 README.zh-CN.md 的「Custom Renderers」章节 SHALL 新增「Event-Driven Toolbar Updates」子章节，说明：
- Toolbar 更新机制（Vue 3 响应式 + `watchEffect`）
- 与 React 版本的对齐（行为一致性）
- 性能优势（避免轮询）

#### Scenario: 开发者理解 Vue 事件驱动机制
- **WHEN** 开发者阅读自定义 renderer 文档
- **THEN** 能理解如何通过 `defineExpose` 和响应式状态实现工具栏更新

#### Scenario: 提供 Vue 代码示例
- **WHEN** 文档展示事件驱动示例
- **THEN** 包含完整的 Vue 3 Composition API + `defineExpose` 代码片段

### Requirement: 补充 Renderer 懒加载说明
README.md 和 README.zh-CN.md 的「Custom Renderers」章节 SHALL 新增「Renderer Lazy Loading」子章节，说明：
- `lazy.ts` 的注册流程
- `defineAsyncComponent` + `RendererLoading` 的代码分割原理
- 主入口体积控制目标（gzip ≤ 60 KB）

#### Scenario: 开发者理解懒加载必要性
- **WHEN** 开发者需要新增自定义 renderer
- **THEN** 能理解为何必须在 `lazy.ts` 注册而非直接 import

#### Scenario: 提供懒加载注册示例
- **WHEN** 文档展示懒加载流程
- **THEN** 包含 `lazy.ts` 注册代码和 `FilePreviewContent.vue` 导入示例

### Requirement: 补充 i18n 集成说明
README.md 和 README.zh-CN.md 的「Custom Renderers」章节 SHALL 新增「i18n Integration」子章节，说明：
- `useTranslator()` composable 的使用
- 字典文件位置（`file-preview-core/src/i18n/messages/`）
- 模板中 `t('key')` 和 script 中 `t.value('key')` 的区别

#### Scenario: 开发者使用 i18n composable
- **WHEN** 自定义 renderer 需要显示用户可见文案
- **THEN** 能通过 `useTranslator()` 获取翻译函数并在模板和 script 中正确使用

#### Scenario: 提供 i18n 代码示例
- **WHEN** 文档展示 i18n 集成
- **THEN** 包含 `const { t } = useTranslator()` 和模板 / script 两种用法示例

### Requirement: 补充主题适配说明
README.md 和 README.zh-CN.md 的「Custom Renderers」章节 SHALL 新增「Theme Adaptation」子章节，说明：
- 语义化 token 系统（`vfp-text-fg-primary`、`vfp-bg-surface-1` 等）
- `useResolvedTheme()` composable 的使用
- `<style scoped>` 中使用 `var(--fp-*)` 变量
- 禁止字面色类和硬编码颜色值的约束

#### Scenario: 开发者使用语义化 token
- **WHEN** 自定义 renderer 需要设置颜色
- **THEN** 能在 template 中使用 `vfp-text-fg-*` / `vfp-bg-surface-*` 等语义类，在 style 中使用 `var(--fp-*)` 变量

#### Scenario: 开发者切换三方库主题
- **WHEN** 自定义 renderer 依赖支持 theme prop 的三方库（如 `shiki`）
- **THEN** 能通过 `useResolvedTheme()` 获取已解析主题并传给三方库

### Requirement: 保持双语同步
README.md 和 README.zh-CN.md 的内容结构 SHALL 保持一致，仅语言不同。

#### Scenario: 中英文内容对齐
- **WHEN** 英文版新增或修改内容
- **THEN** 中文版同步更新对应章节

### Requirement: Vue 文档与当前版本一致
Vue 双语 README SHALL 描述当前 1.x 已实现能力，不得把已发布 API 标为 v2.0+，并 SHALL 与根入口导出的请求类型和高级图片 Worker 行为一致。

#### Scenario: Vue 文档 API 审查
- **WHEN** 对照 Vue `src/index.ts` 和 README
- **THEN** 文档导入、版本标签和 Worker 描述 MUST 与实现一致

