## Context

`file-preview` 以 core（纯逻辑/工具）+ React / Vue 两个 UI 适配包的形式组织。`FilePreviewContent`（两端）负责装配"工具栏 + 内容区 + 导航箭头"：
- 工具栏分 `toolGroups`（当前文件类型的工具，由各内置 Renderer 导出的 `getXxxToolbarGroups` 提供）与 `actionGroups`（通用下载 / 关闭）。
- 内容区根据 `customRenderers.find(r => r.test(currentFile))` 命中情况，优先使用自定义渲染器，否则走内置分支。

现状的约束：
- React：`CustomRenderer = { test, render(file): ReactNode }`。
- Vue：`CustomRenderer = { test, render(file): Component }`（渲染组件通过 `<component :is>` 传入 `file` prop）。
- 当命中自定义渲染器时，`toolGroups` 逻辑只检查内置 `fileType`，返回 `[]`，工具栏会完全退化为只剩下载 / 关闭。
- 自定义渲染器内部要暴露事件必须靠全局事件总线或 prop 透传 hack，没有规范位置。

利益相关：
- 组件库用户：希望按官方"工具组规范"接入自己的 Renderer，视觉与交互完全对齐内置 Renderer。
- 组件库内部：两端 API 必须同构，不得引入框架耦合的接口差异。

## Goals / Non-Goals

**Goals:**
- 让自定义渲染器能按 `ToolbarGroup[]` 规范声明工具组，并由 `FilePreviewContent` 渲染到工具栏与内置渲染器完全同位置。
- 让自定义渲染器能派发事件，宿主通过 `FilePreviewContent`（及其 Modal / Embed 封装）的统一出口绑定监听，无需引入全局总线。
- 保持 React / Vue 两端 API 语义同构；保持向后兼容。

**Non-Goals:**
- 不改动内置 Renderer 的工具组与事件机制。
- 不引入跨文件状态持久化（如上次缩放值记忆）。
- 不实现自定义渲染器的"外部 ref 句柄"方案（如 React `forwardRef` 暴露方法）；宿主调用自定义渲染器方法的需求由自定义组件自己解决，不纳入本规范。
- 不实现 `events` 字段的运行时严格校验（仅作为 TS 层面的事件名白名单，运行时仅透传）。

## Decisions

### 决策 1：通过"上下文对象 ctx"扩展 render/工具组声明签名，而非新增独立字段链

**选项 A（采用）**：将 `render(file)` 扩展为 `render(file, ctx)`；新增可选 `getToolbarGroups(file, ctx): ToolbarGroup[]`。`ctx` 统一承载 `emit`、`t`、`theme`、`locale` 等外部注入。

**选项 B**：为每项外部依赖各加一个 prop（`onEvent`、`translator`、`theme`…），工具栏声明也各自为政。

**选择理由**：
- 单一上下文对象向后演进友好（新增字段不破坏现有签名）。
- 与内置 `getXxxToolbarGroups` 接收 "ctx 参数"的写法同构，用户心智一致。
- 向后兼容：老版本只用 `render(file)` 忽略第二参数即可。

### 决策 2：事件通道使用顶层 `onCustomEvent` / `custom-event`，不在自定义渲染器与 FilePreviewContent 之间走 prop drill

**结构**：
- 自定义渲染器通过 `ctx.emit(name, payload)` 派发事件。
- `FilePreviewContent` 将 `emit` 实现为：`(name, payload) => onCustomEvent?.({ name, payload, file })`（React） / `emit('custom-event', { name, payload, file })`（Vue）。
- Modal / Embed 外层组件按现有模式透传 `onCustomEvent` / `@custom-event`。

**为什么不直接在 props 上声明 `onXxx` 的动态回调**：TS 无法在组件层面为不定事件名生成强类型；用统一 `custom-event` 出口 + `events` 白名单保留类型收敛可能性（`events: readonly ['page-change', 'zoom']` 可在未来用作 `payload` 联合类型推导，但本期不实现）。

### 决策 3：工具组优先级与覆盖策略

- 命中自定义渲染器时：`toolGroups` = `customRenderer.getToolbarGroups?.(file, ctx) ?? []`；内置 `fileType` 相关的工具组不再参与装配。
- `actionGroups`（下载、关闭）保持不变——这是容器级功能，不属于 Renderer。
- 工具组在 `render` 同一 `ctx` 的 `emit` 下书写即可与内部组件联动；或用闭包访问外层 state（由用户自管）。

### 决策 4：Vue 端 `render(file, ctx)` 的返回值与 ctx 注入路径

Vue 自定义渲染器 `render` 返回 `Component`；现状通过 `<component :is="customRendererComponent" :file="currentFile" />` 传入 `file`。扩展后：
- `render(file, ctx)` 仍返回 `Component`，`ctx` 通过 `provide/inject` 以及 `:ctx` prop 同时注入：
  - `:ctx` prop 让组件显式接收；
  - `provide('custom-renderer-ctx', ctx)` 便于深层子组件 `inject` 使用；
- 工具组声明 `getToolbarGroups(file, ctx)` 返回 `ToolbarGroup[]`（与内置 Vue `getXxxToolbarGroups` 行为一致，使用 `Component` 作为图标）。

### 决策 5：React 端 ctx 注入路径

- `render(file, ctx)` 返回 `ReactNode`。推荐用法：`render: (file, ctx) => <MyCustom file={file} ctx={ctx} />`，或自由使用闭包。
- 不引入 React Context，避免为单一场景新增 provider 树层级（由用户在自己的 `MyCustom` 组件中自行决定是否再向下广播）。

### 决策 6：事件名命名空间

- `ctx.emit(name, payload)` 中 `name` 不做前缀强制，但文档建议使用 `kebab-case`（与 Vue 事件命名对齐）。
- `FilePreviewContent` 派发的顶层事件固定名 `custom-event`（Vue） / `onCustomEvent`（React），载荷 `{ name, payload, file }`。

## Risks / Trade-offs

- **[风险] `render` 签名变更导致 TS 报错**：现有用户传入 `render: (file) => <X />` 仍合法（TS 对可选参数兼容）→ 在 `CustomRenderer` 类型中 `render` 的第二参数写为可选；提供 d.ts 与 README 示例。
- **[风险] Vue 端 `ctx.emit` 与 Vue 组件事件 emit 语义混淆**：用户可能误以为 `ctx.emit('foo')` 会触发 `<CustomComp @foo>` → 在 `getToolbarGroups` 与 `render` 的 ctx 文档里明确说明：`ctx.emit` 只把事件转发到外层 `custom-event`，与组件内 `defineEmits` 无关；用户如需组件内 emit 到自身可继续使用 Vue 原生机制。
- **[风险] 自定义渲染器声明了 `getToolbarGroups` 但依赖的内部状态尚未就绪**（比如组件还没挂载）→ 工具栏在渲染第一帧可能拿到初值；推荐用户使用 ref 或闭包懒取值；同时 `getToolbarGroups` 在每次外部相关 state 变更时会被重新求值（通过 React `useMemo` / Vue `computed` 依赖）。
- **[取舍] 不提供 ref 句柄**：如需外部触发自定义组件动作，短期内要求用户在组件内部订阅 `ctx` 或自己维护 imperative handle；好处是接口面更小，后续再加 `ref` 字段不破坏兼容。
- **[取舍] `events` 字段仅作文档 / 弱类型白名单**：运行时不做拦截校验；换来实现复杂度低、迁移零成本。

## Migration Plan

- 新字段全部可选，老代码零改动继续工作。
- 发布说明中给出"最小增量升级示例"：
  1. 在 `CustomRenderer` 中补充 `getToolbarGroups(file, ctx)` 返回若干 `ToolbarGroup`；
  2. 在 `FilePreviewContent`（或外层 Modal/Embed）监听 `onCustomEvent` / `@custom-event`。
- 无需 rollback 计划：改动仅为加法。

## Open Questions

- 是否需要在 `ctx` 中额外注入 `currentIndex` / `totalFiles` / `navigate(index)` 以便自定义渲染器实现"上一个/下一个"行为？当前倾向不注入（这类导航是容器职责），如需求明确再补。
- 是否允许自定义渲染器提供 `actionGroups` 追加项（如自定义下载行为）？本期不支持，后续评估。
