## Why

当前工具栏状态更新采用 100ms 轮询机制，存在性能浪费和延迟问题。每次轮询都会调用 `getToolbarGroups()`，即使状态未变化也会重新计算。这种方式不仅消耗 CPU 资源，还可能导致工具栏更新不及时（最多 100ms 延迟）。需要改用事件驱动机制，实现精准的按需更新。

## What Changes

- 移除主组件中的 100ms 轮询 `setInterval`
- 为渲染器添加事件监听和通知机制
- 主组件订阅渲染器的工具栏变化事件
- 渲染器状态变化时主动触发事件通知主组件更新
- 保持现有的 `RendererHandle` 接口向后兼容
- 完成剩余渲染器的重构（Mobi、Text、Markdown + 所有简单渲染器）

## Capabilities

### New Capabilities
- `renderer-toolbar-events`: 渲染器工具栏事件系统，支持状态变化时主动通知主组件

### Modified Capabilities
<!-- No existing capabilities are being modified at spec level -->

## Impact

**受影响的文件**：
- `packages/react-file-preview/src/renderers/base.types.ts` - 扩展 RendererHandle 接口
- `packages/react-file-preview/src/FilePreviewContent.tsx` - 移除轮询，添加事件监听
- `packages/react-file-preview/src/renderers/Image/index.tsx` - 添加事件触发
- `packages/react-file-preview/src/renderers/Pdf/index.tsx` - 添加事件触发
- `packages/react-file-preview/src/renderers/Epub/index.tsx` - 添加事件触发
- `packages/react-file-preview/src/renderers/Mobi/index.tsx` - 完成重构 + 事件触发
- `packages/react-file-preview/src/renderers/Text/index.tsx` - 完成重构 + 事件触发
- `packages/react-file-preview/src/renderers/Markdown/index.tsx` - 完成重构 + 事件触发
- 所有简单渲染器（12 个）- 添加空的 RendererHandle 实现
- Vue 包的对应文件 - 相同的变更

**性能影响**：
- 消除每秒 10 次的无效轮询调用
- 工具栏更新延迟从最多 100ms 降低到实时（~1ms）
- 降低 CPU 使用率

**兼容性**：
- 保持 `RendererHandle.getToolbarGroups()` 方法向后兼容
- 新增可选的事件监听方法
- 不影响自定义渲染器的现有实现
