## ADDED Requirements

### Requirement: Renderer error boundary
系统必须为渲染器提供错误边界，捕获加载失败和运行时错误。

#### Scenario: React.lazy loading failure
- **WHEN** 渲染器动态导入失败（网络错误、chunk 加载失败）
- **THEN** 错误边界捕获错误，显示 RendererError UI

#### Scenario: Renderer runtime error
- **WHEN** 渲染器在运行时抛出异常（如解析失败）
- **THEN** 错误边界捕获错误，显示 RendererError UI

#### Scenario: Error UI display
- **WHEN** 错误边界激活
- **THEN** 显示错误消息、文件名、错误类型，并提供"重试"和"下载"按钮

#### Scenario: Error retry action
- **WHEN** 用户点击"重试"按钮
- **THEN** 错误边界重置状态，重新渲染渲染器组件

#### Scenario: Error download action
- **WHEN** 用户点击"下载"按钮
- **THEN** 调用 handleDownload 回调，下载文件到本地

### Requirement: Error boundary scope
错误边界必须仅包裹渲染器组件，不影响工具栏和导航。

#### Scenario: Toolbar remains functional
- **WHEN** 渲染器发生错误
- **THEN** 工具栏仍然可见且可交互（下载、关闭按钮可用）

#### Scenario: Navigation arrows remain functional
- **WHEN** 当前文件渲染器发生错误
- **THEN** 导航箭头仍然可用，可以切换到其他文件

#### Scenario: File switch resets error
- **WHEN** 渲染器处于错误状态且用户切换文件
- **THEN** 错误边界自动重置，尝试渲染新文件

### Requirement: Error boundary with Suspense
错误边界必须与 Suspense 正确配合使用。

#### Scenario: Loading state priority
- **WHEN** 渲染器正在加载
- **THEN** 显示 Suspense fallback（RendererLoading），而非错误 UI

#### Scenario: Error after loading
- **WHEN** 渲染器加载完成后抛出错误
- **THEN** Suspense 不再处理，错误边界捕获错误

#### Scenario: Retry triggers loading
- **WHEN** 用户点击"重试"按钮
- **THEN** 重新进入 Suspense 加载状态，显示 RendererLoading

### Requirement: Error information logging
错误边界必须记录错误信息，便于调试和监控。

#### Scenario: Console error logging
- **WHEN** 错误边界捕获错误
- **THEN** 在控制台输出错误详情（错误消息、堆栈、文件信息）

#### Scenario: Optional error callback
- **WHEN** 提供 onError 回调 prop
- **THEN** 错误边界调用 onError(error, file)，允许用户自定义错误上报（如 Sentry）

#### Scenario: Error callback not provided
- **WHEN** 未提供 onError 回调
- **THEN** 仅记录到控制台，不抛出异常
