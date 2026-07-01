## ADDED Requirements

### Requirement: 补充事件驱动工具栏更新
README.md 和 README.zh-CN.md 的「Custom Renderers」章节 SHALL 新增「Event-Driven Toolbar Updates」子章节，说明：
- `ToolbarEventEmitter` 类的作用
- `onToolbarChange` 回调的注册与触发
- 与轮询方式的对比优势（实时性、性能）

#### Scenario: 开发者理解事件驱动机制
- **WHEN** 开发者阅读自定义 renderer 文档
- **THEN** 能理解如何通过 `useImperativeHandle` 暴露 `onToolbarChange` 实现实时工具栏更新

#### Scenario: 提供 React 代码示例
- **WHEN** 文档展示事件驱动示例
- **THEN** 包含完整的 `ToolbarEventEmitter` + `useImperativeHandle` 代码片段

### Requirement: 补充 Renderer 懒加载说明
README.md 和 README.zh-CN.md 的「Custom Renderers」章节 SHALL 新增「Renderer Lazy Loading」子章节，说明：
- `lazy.tsx` 的注册流程
- `React.lazy` + `Suspense` 的代码分割原理
- 主入口体积控制目标（gzip ≤ 80 KB）

#### Scenario: 开发者理解懒加载必要性
- **WHEN** 开发者��要新增自定义 renderer
- **THEN** 能理解为何必须在 `lazy.tsx` 注册而非直接 import

#### Scenario: 提供懒加载注册示例
- **WHEN** 文档展示懒加载流程
- **THEN** 包��� `lazy.tsx` 注册代码和 `FilePreviewContent.tsx` 导入示例

### Requirement: 补充 i18n 集成说明
README.md 和 README.zh-CN.md 的「Custom Renderers」章节 SHALL 新增「i18n Integration」子章节，说明：
- `useTranslator()` hook 的使用
- 字典文件位置（`file-preview-core/src/i18n/messages/`）
- 禁止硬编码文案的约束

#### Scenario: 开发者使用 i18n hook
- **WHEN** 自定义 renderer 需要显示用户可见文案
- **THEN** 能通过 `useTranslator()` 获取翻译函数并正确使用

#### Scenario: 提供 i18n 代码示例
- **WHEN** 文档展示 i18n 集成
- **THEN** 包含 `const t = useTranslator()` 和 `t('key')` 的完整示例

### Requirement: 补充主题适配说明
README.md 和 README.zh-CN.md 的「Custom Renderers」章节 SHALL 新增「Theme Adaptation」子章节，说明：
- 语义化 token 系统（`text-fg-primary`、`bg-surface-1` 等）
- `useResolvedTheme()` hook 的使用
- 禁止字面色类（`text-white/XX`、`bg-gray-N00` 等）的约束

#### Scenario: 开发者使用语义化 token
- **WHEN** 自定义 renderer 需要设置颜色
- **THEN** 能使用 `rfp-text-fg-*` / `rfp-bg-surface-*` 等语义类而非字面色

#### Scenario: 开发者切换三方库主题
- **WHEN** 自定义 renderer 依赖支持 theme prop 的三方库（如 `react-syntax-highlighter`）
- **THEN** 能通过 `useResolvedTheme()` 获取已解析主题并传给三方库

### Requirement: 保持双语同步
README.md 和 README.zh-CN.md 的内容结构 SHALL 保持一致，仅语言不同。

#### Scenario: 中英文内容对齐
- **WHEN** 英文版新增或修改内容
- **THEN** 中文版同步更新对应章节
