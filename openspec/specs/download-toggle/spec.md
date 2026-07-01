# download-toggle Specification

## Purpose

定义通过 `showDownload` prop 控制下载按钮显示的能力,使宿主应用能够根据业务需求(如用户权限、文件类型限制)动态控制下载功能的可见性。

## Requirements

### Requirement: FilePreviewModal SHALL accept showDownload prop

`FilePreviewModal` 组件(React 和 Vue 版本)SHALL 接受 `showDownload` prop 来控制下载按钮的显示。

#### Scenario: showDownload 未传递时使用默认值
- **WHEN** 用户未传递 `showDownload` prop
- **THEN** 组件 SHALL 使用默认值 `true`
- **AND** 下载按钮 SHALL 正常显示在工具栏中

#### Scenario: showDownload 为 true 时显示下载按钮
- **WHEN** 用户传递 `showDownload={true}` (React) 或 `:show-download="true"` (Vue)
- **THEN** 下载按钮 SHALL 显示在工具栏的操作区域
- **AND** 点击下载按钮 SHALL 触发文件下载

#### Scenario: showDownload 为 false 时隐藏下载按钮
- **WHEN** 用户传递 `showDownload={false}` (React) 或 `:show-download="false"` (Vue)
- **THEN** 下载按钮 SHALL NOT 出现在工具栏中
- **AND** 工具栏布局 SHALL 自动调整,不留空白占位

### Requirement: FilePreviewEmbed SHALL accept showDownload prop

`FilePreviewEmbed` 组件(React 和 Vue 版本)SHALL 接受 `showDownload` prop 来控制下载按钮的显示。

#### Scenario: showDownload 未传递时使用默认值
- **WHEN** 用户未传递 `showDownload` prop
- **THEN** 组件 SHALL 使用默认值 `true`
- **AND** 下载按钮 SHALL 正常显示在工具栏中

#### Scenario: showDownload 为 true 时显示下载按钮
- **WHEN** 用户传递 `showDownload={true}` (React) 或 `:show-download="true"` (Vue)
- **THEN** 下载按钮 SHALL 显示在工具栏的操作区域
- **AND** 点击下载按钮 SHALL 触发文件下载

#### Scenario: showDownload 为 false 时隐藏下载按钮
- **WHEN** 用户传递 `showDownload={false}` (React) 或 `:show-download="false"` (Vue)
- **THEN** 下载按钮 SHALL NOT 出现在工具栏中
- **AND** 工具栏布局 SHALL 自动调整,不留空白占位

### Requirement: FilePreviewContent SHALL propagate showDownload prop

`FilePreviewContent` 组件(React 和 Vue 版本)SHALL 接受 `showDownload` prop 并将其传递给工具栏组件。

#### Scenario: 接收并透传 showDownload prop
- **WHEN** `FilePreviewContent` 接收到 `showDownload` prop
- **THEN** 该 prop SHALL 被传递给内部的工具栏渲染逻辑
- **AND** 不对该 prop 进行任何转换或修改

#### Scenario: 默认值透传
- **WHEN** `FilePreviewContent` 未接收到 `showDownload` prop
- **THEN** 组件 SHALL 使用默认值 `true`
- **AND** 将该默认值传递给工具栏渲染逻辑

### Requirement: React FilePreviewToolbar SHALL conditionally render download button

React 版本的 `FilePreviewToolbar` 组件 SHALL 根据 `showDownload` prop 条件渲染下载按钮。

#### Scenario: showDownload 为 true 时渲染下载按钮
- **WHEN** `FilePreviewToolbar` 接收到 `showDownload={true}`
- **THEN** 下载按钮 SHALL 包含在 `actionGroups` 数组中
- **AND** 下载按钮 SHALL 在桌面端和移动端工具栏中都正常显示

#### Scenario: showDownload 为 false 时不渲染下载按钮
- **WHEN** `FilePreviewToolbar` 接收到 `showDownload={false}`
- **THEN** 下载按钮 SHALL NOT 包含在 `actionGroups` 数组中
- **AND** 关闭按钮(如果存在)SHALL 保持正常显示
- **AND** 渲染器工具栏项(toolGroups)SHALL 不受影响

### Requirement: Vue FilePreviewContent SHALL conditionally render download button

Vue 版本的 `FilePreviewContent` 组件 SHALL 根据 `showDownload` prop 条件渲染下载按钮。

#### Scenario: showDownload 为 true 时渲染下载按钮
- **WHEN** `FilePreviewContent` 接收到 `:show-download="true"`
- **THEN** 下载按钮 SHALL 包含在 `actionGroups` 计算属性中
- **AND** 下载按钮 SHALL 在桌面端和移动端工具栏中都正常显示

#### Scenario: showDownload 为 false 时不渲染下载按钮
- **WHEN** `FilePreviewContent` 接收到 `:show-download="false"`
- **THEN** 下载按钮 SHALL NOT 包含在 `actionGroups` 计算属性中
- **AND** 关闭按钮(如果存在)SHALL 保持正常显示
- **AND** 渲染器工具栏项(toolGroups)SHALL 不受影响

### Requirement: React 和 Vue 实现 SHALL 保持 API 一致性

两个框架的实现 SHALL 提供相同的 API 和行为。

#### Scenario: prop 命名一致
- **WHEN** 用户在 React 或 Vue 中使用该功能
- **THEN** prop 名称 SHALL 均为 `showDownload`(React camelCase,Vue kebab-case)
- **AND** 默认值 SHALL 均为 `true`

#### Scenario: 行为一致
- **WHEN** 用户传递相同的 `showDownload` 值
- **THEN** React 和 Vue 版本的工具栏 SHALL 显示相同的按钮集合
- **AND** 布局和交互行为 SHALL 保持一致

### Requirement: 工具栏布局 SHALL 自动适应按钮变化

当下载按钮显示或隐藏时,工具栏布局 SHALL 自动调整。

#### Scenario: 隐藏下载按钮后布局无缝调整
- **WHEN** 下载按钮因 `showDownload={false}` 被隐藏
- **THEN** 工具栏 SHALL NOT 显示空白占位
- **AND** 剩余按钮(关闭按钮、渲染器工具栏项)SHALL 紧密排列
- **AND** 桌面端和移动端布局 SHALL 均正常调整

#### Scenario: 动态切换 showDownload prop
- **WHEN** 运行时动态修改 `showDownload` prop 的值
- **THEN** 工具栏 SHALL 立即响应并更新显示
- **AND** 不产生布局抖动或闪烁

### Requirement: 向后兼容性 SHALL 得到保障

现有集成代码 SHALL 无需修改即可正常工作。

#### Scenario: 未传递 showDownload 的现有代码
- **WHEN** 现有代码中未传递 `showDownload` prop
- **THEN** 组件行为 SHALL 与之前完全一致
- **AND** 下载按钮 SHALL 正常显示(默认值 `true` 生效)

#### Scenario: 传递其他现有 props
- **WHEN** 用户传递其他现有 props(如 `onDownload`, `headless` 等)
- **THEN** 这些 props 的行为 SHALL 不受 `showDownload` 影响
- **AND** 所有现有功能 SHALL 保持正常工作
