## Why

当前 `CustomRenderer` 仅提供 `test` / `render` 两个字段，只能决定"是否匹配 + 渲染什么"。但内置渲染器已经形成了"Renderer 自行声明工具组"的统一规范（`getXxxToolbarGroups` → `ToolbarGroup[]`），自定义渲染器却无法参与：既拼接不进顶部工具栏，也没有标准方式把组件内部事件（翻页、缩放、全屏等）暴露给外层容器或宿主应用。这导致用户写的自定义渲染器要么"裸渲染无按钮"，要么自己在 DOM 里再做一个悬浮工具条，既破坏视觉一致性又与内置渲染器形成两套 UX。

本次变更让自定义渲染器成为"一等公民"——按和内置渲染器完全相同的规范声明工具组，并通过事件回调把内部动作回传给容器与宿主应用。

## What Changes

- 扩展 `CustomRenderer` 接口：新增可选字段 `getToolbarGroups` 用于按 `ToolbarGroup[]` 规范声明工具组；新增可选字段 `events` 用于声明组件会派发的事件名白名单（便于 TS 推导与校验）
- 自定义渲染器的 `render` 签名扩展为 `render(file, ctx)`，`ctx` 中提供 `emit(eventName, payload)` 与 `t`（翻译器）、`theme` 等上下文；`emit` 会统一转发到 `FilePreviewContent` 的 `onCustomEvent` / Vue `custom-event` 事件
- `FilePreviewContent` 新增 prop `onCustomEvent`（React）/ `custom-event` emit（Vue），宿主应用可据此绑定自定义渲染器的事件
- 当命中自定义渲染器时，顶部工具栏使用自定义渲染器声明的 `getToolbarGroups` 结果替代默认的内置工具组；通用操作组（下载 / 关闭）保持不变
- 自定义渲染器工具组内按钮的 `action` 通过 `ctx.emit` 或闭包直接访问内部状态，保持与 Image/Pdf 等内置渲染器一致的书写方式
- 更新 `packages/react-file-preview` 与 `packages/vue-file-preview` 两端实现，保持 API 同构
- **BREAKING**：无。新字段全部为可选，旧版 `CustomRenderer`（仅 `test` + `render(file)`）保持兼容

## Capabilities

### New Capabilities
- `custom-renderer`: 自定义渲染器的规范接口，涵盖匹配测试、渲染契约、工具组声明、事件派发四个部分；覆盖 React 与 Vue 两端实现的等价行为

### Modified Capabilities
<!-- 目前 openspec/specs/ 为空，无既有能力需要修改 -->

## Impact

- 代码：
  - `packages/react-file-preview/src/types.ts`：扩展 `CustomRenderer`
  - `packages/react-file-preview/src/FilePreviewContent.tsx`：接入自定义工具组与事件转发，新增 `onCustomEvent` prop
  - `packages/react-file-preview/src/FilePreviewModal.tsx` / `FilePreviewEmbed.tsx`：透传新 prop
  - `packages/vue-file-preview/src/types.ts`：扩展 `CustomRenderer`
  - `packages/vue-file-preview/src/FilePreviewContent.vue`：接入自定义工具组与事件转发，新增 `custom-event` emit
  - `packages/vue-file-preview/src/FilePreviewModal.vue` / `FilePreviewEmbed.vue`：透传事件
- API：`CustomRenderer` 接口向后兼容扩展；`FilePreviewContent` / `FilePreviewModal` / `FilePreviewEmbed` 新增一个可选事件入口
- 依赖：无新增依赖，仅复用现有 `ToolbarGroup` / `Translator` / `Theme` 类型
- 文档：`packages/docs` 中"自定义渲染器"章节需要追加工具组与事件示例（本次变更不包含文档写作，仅留接口）
