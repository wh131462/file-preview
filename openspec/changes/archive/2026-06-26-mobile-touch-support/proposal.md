## Why

当前图片预览组件仅支持鼠标交互（拖拽、滚轮缩放、双击），在移动端设备上缺少原生触屏手势支持，用户体验较差。移动端用户无法使用双指缩放、单指拖拽等常见手势操作图片，严重影响移动端可用性。

## What Changes

- 为 React 和 Vue 两个版本的图片渲染器添加触屏手势支持
- 支持单指拖拽移动图片
- 支持双指缩放（pinch zoom）
- 支持双击放大/缩小
- 确保触屏操作与现有鼠标操作不冲突
- 添加必要的触摸事件防抖和边界检测

## Capabilities

### New Capabilities

- `mobile-touch-gestures`: 移动端触屏手势支持，包括单指拖拽、双指缩放、双击缩放等核心触控交互功能

### Modified Capabilities

<!-- 无现有 capability 的需求变更 -->

## Impact

- 影响组件：
  - `packages/react-file-preview/src/renderers/Image/index.tsx`
  - `packages/vue-file-preview/src/renderers/Image/index.vue`
- 需要添加 touch 事件监听器（touchstart、touchmove、touchend）
- 需要处理多点触控逻辑
- 需要确保与现有鼠标事件不产生冲突
- 可能需要调整 CSS 以优化移动端触摸体验（如禁用浏览器默认手势）
