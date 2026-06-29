## ADDED Requirements

### Requirement: useFilePreviewState hook
系统必须提供 useFilePreviewState hook，封装 reducer 逻辑并返回状态和 dispatch 函数。

#### Scenario: Hook initialization
- **WHEN** 组件调用 useFilePreviewState(currentIndex)
- **THEN** 返回 { state, dispatch } 对象

#### Scenario: Automatic state reset
- **WHEN** currentIndex 参数改变
- **THEN** hook 内部自动 dispatch RESET action，重置所有状态

#### Scenario: State access
- **WHEN** 组件访问 state.common.zoom
- **THEN** 获取当前 zoom 值

#### Scenario: State update
- **WHEN** 组件调用 dispatch({ type: 'SET_ZOOM', payload: 1.5 })
- **THEN** state.common.zoom 更新为 1.5

### Requirement: useToolbarConfig hook
系统必须提供 useToolbarConfig hook，根据文件类型返回工具栏配置。

#### Scenario: Image toolbar config
- **WHEN** 调用 useToolbarConfig('image', state, handlers, t)
- **THEN** 返回图片工具栏配置（缩放、旋转、适应窗口等按钮）

#### Scenario: PDF toolbar config
- **WHEN** 调用 useToolbarConfig('pdf', state, handlers, t)
- **THEN** 返回 PDF 工具栏配置（缩放、页码、大纲等按钮）

#### Scenario: Unsupported file type toolbar
- **WHEN** 调用 useToolbarConfig('unsupported', state, handlers, t)
- **THEN** 返回空数组 []

#### Scenario: Custom renderer toolbar
- **WHEN** 传入 customRenderer 参数
- **THEN** 优先使用 customRenderer.getToolbarGroups() 返回值

### Requirement: useKeyboardNavigation hook
系统必须提供 useKeyboardNavigation hook，处理键盘导航逻辑。

#### Scenario: Modal mode keyboard navigation
- **WHEN** mode 为 'modal'
- **THEN** 监听 window 的 keydown 事件

#### Scenario: Embed mode keyboard navigation
- **WHEN** mode 为 'embed'
- **THEN** 仅监听根容器的 keydown 事件（需要容器获得焦点）

#### Scenario: Escape key closes modal
- **WHEN** mode 为 'modal' 且用户按下 Escape 键
- **THEN** 调用 onClose 回调

#### Scenario: Arrow left navigation
- **WHEN** 用户按下左箭头键且 currentIndex > 0
- **THEN** 调用 onNavigate(currentIndex - 1)

#### Scenario: Arrow right navigation
- **WHEN** 用户按下右箭头键且 currentIndex < files.length - 1
- **THEN** 调用 onNavigate(currentIndex + 1)

#### Scenario: Cleanup on unmount
- **WHEN** 组件卸载或 mode/currentIndex 改变
- **THEN** 移除事件监听器，防止内存泄漏

### Requirement: useBookRenderer hook
系统必须提供泛型 useBookRenderer<T> hook，统一 EPUB 和 Mobi 渲染器的状态管理。

#### Scenario: EPUB renderer usage
- **WHEN** 调用 useBookRenderer<EpubRendererHandle>(onChapterChange)
- **THEN** 返回 { ref, current, total, fullWidth, setFullWidth, handleChapterChange }

#### Scenario: Mobi renderer usage
- **WHEN** 调用 useBookRenderer<MobiRendererHandle>(onChapterChange)
- **THEN** 返回 { ref, current, total, fullWidth, setFullWidth, handleChapterChange }

#### Scenario: Chapter change callback
- **WHEN** handleChapterChange(3, 10) 被调用
- **THEN** 更新内部状态（current: 3, total: 10）并调用 onChapterChange(3, 10)

#### Scenario: Full width toggle
- **WHEN** 调用 setFullWidth(true)
- **THEN** fullWidth 状态更新为 true

#### Scenario: Ref forwarding
- **WHEN** 将返回的 ref 传递给渲染器组件
- **THEN** 可通过 ref.current.next()、ref.current.prev() 控制渲染器
