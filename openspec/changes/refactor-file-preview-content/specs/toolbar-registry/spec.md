## ADDED Requirements

### Requirement: Toolbar configuration registry
系统必须提供集中的工具栏配置注册表，按文件类型映射到工厂函数。

#### Scenario: Registry initialization
- **WHEN** 模块加载时
- **THEN** TOOLBAR_CONFIG_MAP 初始化，包含所有支持的文件类型映射

#### Scenario: Image config lookup
- **WHEN** 调用 getToolbarGroups('image', state, handlers, t)
- **THEN** 返回 getImageToolbarGroups 工厂函数的执行结果

#### Scenario: PDF config lookup
- **WHEN** 调用 getToolbarGroups('pdf', state, handlers, t)
- **THEN** 返回 getPdfToolbarGroups 工厂函数的执行结果

#### Scenario: Unknown file type
- **WHEN** 调用 getToolbarGroups('unknown', state, handlers, t)
- **THEN** 返回空数组 []

#### Scenario: All supported types
- **WHEN** 遍历所有支持的文件类型（image、pdf、epub、mobi、zip、text、markdown）
- **THEN** 每个类型都有对应的工厂函数注册

### Requirement: Toolbar config factory signature
所有工具栏配置工厂函数必须遵循统一的签名。

#### Scenario: Factory function signature
- **WHEN** 定义工具栏配置工厂函数
- **THEN** 函数签名为 (state: RendererState, handlers: RendererHandlers, t: Translator) => ToolbarGroup[]

#### Scenario: Type-safe state access
- **WHEN** 工厂函数访问 state.pdf.currentPage
- **THEN** TypeScript 提供类型检查和自动补全

#### Scenario: Handler invocation
- **WHEN** 工厂函数中的按钮 action 被触发
- **THEN** 调用对应的 handler（如 handlers.onZoomIn()）

### Requirement: Toolbar render function extraction
renderToolbarItems 函数必须提取到组件外部，避免每次渲染重新创建。

#### Scenario: Function definition location
- **WHEN** 查看 toolbar/renderItems.tsx
- **THEN** renderToolbarItems 函数定义在模块顶层，不在组件内部

#### Scenario: Function reuse
- **WHEN** FilePreviewToolbar 组件多次渲染
- **THEN** renderToolbarItems 函数引用保持稳定，不会重新创建

#### Scenario: Render output equivalence
- **WHEN** 使用提取后的 renderToolbarItems 渲染工具栏
- **THEN** 渲染结果与重构前完全一致（视觉和行为）

### Requirement: Action groups configuration
通用操作组（下载、关闭）必须独立于文件类型工具栏配置。

#### Scenario: Download button always present
- **WHEN** 任何文件类型预览
- **THEN** 操作组中包含下载按钮

#### Scenario: Close button conditional
- **WHEN** onClose 回调存在（通常 modal 模式）
- **THEN** 操作组中包含关闭按钮

#### Scenario: Embed mode without close
- **WHEN** mode 为 'embed' 且未提供 onClose
- **THEN** 操作组中不包含关闭按钮
