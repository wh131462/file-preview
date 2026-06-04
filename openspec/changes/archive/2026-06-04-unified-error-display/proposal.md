## Why

当前所有渲染器（Text、Image、Pdf、Video、Csv、Json、Xml、Markdown、Subtitle 等）都单独实现了加载失败的错误展示 UI，导致：
1. 代码重复度高，每个渲染器都有类似的错误显示逻辑
2. 错误展示样式不一致（有的使用图标、有的纯文本、响应式样式不统一）
3. 后续修改错误展示需要在多个文件中同步更新

需要提供统一的错误展示组件，消除重复代码，确保视觉一致性。

## What Changes

- 创建 `RendererError` 组件（React 和 Vue 版本），提供统一的错误展示 UI
- 替换所有渲染器中重复的错误显示代码，统一使用新组件
- 支持可选的错误详情和自定义错误信息
- 保持现有 Design System 的样式规范（Tailwind CSS + `rfp-` 前缀）

## Capabilities

### New Capabilities
- `unified-error-component`: 创建统一的错误展示组件，包含图标、标题、详情等元素，支持 React 和 Vue

### Modified Capabilities
<!-- 不涉及现有 spec 的需求变更 -->

## Impact

**受影响的代码：**
- `packages/react-file-preview/src/renderers/**/index.tsx` - 所有渲染器的错误显示逻辑
- `packages/vue-file-preview/src/renderers/**/index.vue` - 所有 Vue 渲染器的错误显示逻辑

**预期改进：**
- 减少约 15-20 处重复的错误显示代码
- 统一错误 UI 视觉体验
- 简化后续维护和样式更新
