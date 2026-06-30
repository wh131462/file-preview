## ADDED Requirements

### Requirement: FilePreviewToolbar component
系统必须提供 FilePreviewToolbar 组件，负责渲染顶部工具栏 UI。

#### Scenario: Toolbar rendering with groups
- **WHEN** 传入 toolGroups 和 actionGroups
- **THEN** 渲染工具栏，包含文件名、分页信息、工具按钮和操作按钮

#### Scenario: Mobile layout
- **WHEN** 视口宽度 < 768px（移动端）
- **THEN** 第一行显示文件名 + 分页 + 下载/关闭按钮，第二行显示工具按钮

#### Scenario: Desktop layout
- **WHEN** 视口宽度 >= 768px（桌面端）
- **THEN** 单行显示文件名 + 分页 + 所有工具按钮 + 下载/关闭按钮

#### Scenario: Headless mode
- **WHEN** headless 为 true
- **THEN** 不渲染工具栏组件

#### Scenario: Empty tool groups
- **WHEN** toolGroups 为空数组
- **THEN** 桌面端隐藏工具按钮区域，移动端隐藏第二行

### Requirement: FilePreviewRenderer component
系统必须提供 FilePreviewRenderer 组件，负责渲染器容器和错误处理。

#### Scenario: Suspense fallback
- **WHEN** 渲染器组件正在加载（React.lazy）
- **THEN** 显示 RendererLoading 加载状态

#### Scenario: Custom renderer rendering
- **WHEN** customRenderer 存在且匹配当前文件
- **THEN** 调用 customRenderer.render(file, context) 渲染自定义内容

#### Scenario: Built-in renderer rendering
- **WHEN** fileType 为 'image'
- **THEN** 渲染 ImageRenderer 组件并传递 zoom、rotation 等 props

#### Scenario: Unsupported file type
- **WHEN** fileType 为 'unsupported'
- **THEN** 渲染 UnsupportedRenderer 组件

#### Scenario: Renderer error boundary
- **WHEN** 渲染器抛出错误（加载失败或运行时错误）
- **THEN** 错误边界捕获错误，显示 RendererError UI 并提供重试和下载选项

#### Scenario: Error retry
- **WHEN** 用户点击错误 UI 的"重试"按钮
- **THEN** 错误边界重置状态，重新尝试渲染

### Requirement: NavArrows component isolation
NavArrows 组件必须保持状态隔离，避免触发父组件重渲染。

#### Scenario: Independent visibility state
- **WHEN** 用户移动鼠标触发箭头显示/隐藏
- **THEN** 仅 NavArrows 组件内部状态更新，不触发 FilePreviewContent 重渲染

#### Scenario: Mouse move handler
- **WHEN** 用户在内容区域移动鼠标
- **THEN** 箭头显示，并在 2 秒后自动隐藏

#### Scenario: File change visibility reset
- **WHEN** currentIndex 改变（切换文件）
- **THEN** 箭头重新显示，并启动 2 秒隐藏定时器

### Requirement: Component props backward compatibility
所有新子组件必须通过 props 接收数据，不破坏现有 API。

#### Scenario: FilePreviewContent props unchanged
- **WHEN** 外部使用 FilePreviewContent 组件
- **THEN** 所有现有 props（files、currentIndex、onNavigate 等）保持不变

#### Scenario: Internal component props
- **WHEN** 内部使用 FilePreviewToolbar 或 FilePreviewRenderer
- **THEN** 通过 props 传递必要的状态和回调，不使用全局状态或 Context

#### Scenario: Custom renderer context unchanged
- **WHEN** 自定义渲染器使用 CustomRendererContext
- **THEN** context 结构保持不变（emit、t、theme、locale）
