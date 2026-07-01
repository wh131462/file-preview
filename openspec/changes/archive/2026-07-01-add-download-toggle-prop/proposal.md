## Why

在某些集成场景中，宿主应用可能需要根据业务逻辑（如用户权限、文件敏感度、或特定工作流阶段）来控制下载功能的可用性。当前实现中下载按钮始终显示且可用，无法满足这类场景的需求。

## What Changes

- 为 `FilePreviewContent`、`FilePreviewModal`、`FilePreviewEmbed` 组件（React 和 Vue 两个版本）添加新的 `showDownload` prop，用于控制下载按钮的显示
- 默认值为 `true`，保持向后兼容（现有集成无需修改代码）
- 当 `showDownload={false}` 时，工具栏中的下载按钮将被隐藏
- 该 prop 同时影响桌面端和移动端的工具栏布局

## Capabilities

### New Capabilities
- `download-toggle`: 通过 prop 控制下载按钮显示的能力

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **React 包**：
  - `FilePreviewContent.tsx`：添加 `showDownload` prop 并传递给工具栏
  - `FilePreviewToolbar.tsx`：接收 `showDownload` prop 并条件渲染下载按钮
  - `FilePreviewModal.tsx`：添加 `showDownload` prop 并透传
  - `FilePreviewEmbed.tsx`：添加 `showDownload` prop 并透传
  
- **Vue 包**：
  - `FilePreviewContent.vue`：添加 `showDownload` prop 并传递给工具栏
  - `FilePreviewModal.vue`：添加 `showDownload` prop 并透传
  - `FilePreviewEmbed.vue`：添加 `showDownload` prop 并透传

- **Core 包**：可能需要在类型定义中添加 `showDownload` 字段

- **向后兼容性**：完全向后兼容，默认值为 `true` 保持现有行为不变
