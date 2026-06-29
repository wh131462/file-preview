## Why

FilePreviewContent.tsx 组件职责过重（540+ 行），包含 16+ 个分散的状态、冗长的工具栏配置逻辑（80+ 行）和重复的渲染器状态管理模式。这导致代码可维护性差、状态重置逻辑易出错、难以扩展新的文件类型支持。需要重构以提升代码质量、可维护性和可测试性。

## What Changes

- 使用 `useReducer` 统一管理分散的渲染器状态（zoom、rotation、page、epub/mobi/pdf 等状态）
- 提取自定义 hooks：`useFilePreviewState`、`useToolbarConfig`、`useKeyboardNavigation`、`useBookRenderer`
- 拆分子组件：`FilePreviewToolbar`、`FilePreviewRenderer`，将 540 行组件拆分为多个职责清晰的模块
- 重构工具栏配置逻辑：从 80 行 if-else 改为配置映射 + 工厂函数模式
- 提取 `renderToolbarItems` 到组件外，避免每次渲染重新创建
- 改善类型安全：类型化 DOM 查询，使用 data 属性替代硬编码 CSS 选择器
- 增强 accessibility：为工具栏按钮和导航箭头添加 `aria-label`、`aria-keyshortcuts`
- 添加错误边界处理渲染器加载失败场景

## Capabilities

### New Capabilities
- `state-management`: 统一的渲染器状态管理，使用 useReducer 替代分散的 useState
- `custom-hooks`: 提取可复用的自定义 hooks（状态、工具栏、键盘导航、书籍渲染器）
- `component-decomposition`: 将大组件拆分为职责清晰的子组件
- `toolbar-registry`: 工具栏配置注册机制，支持声明式配置
- `error-boundary`: 渲染器错误边界，优雅处理加载失败
- `accessibility-enhancement`: 增强无障碍支持，完善 ARIA 属性

### Modified Capabilities
<!-- 无现有能力需要修改，这是代码重构而非功能变更 -->

## Impact

- **受影响文件**：
  - `packages/react-file-preview/src/FilePreviewContent.tsx`（主要重构目标）
  - 新增文件：`hooks/`、`components/`、`toolbar/` 目录下的拆分模块
- **向后兼容性**：外部 API（Props 接口）保持不变，纯内部重构
- **测试影响**：需要更新组件测试，新增 hook 和子组件的单元测试
- **性能影响**：预期性能提升（减少不必要的重渲染、优化状态更新）
- **开发体验**：代码可读性和可维护性显著提升，新增文件类型支持更容易
