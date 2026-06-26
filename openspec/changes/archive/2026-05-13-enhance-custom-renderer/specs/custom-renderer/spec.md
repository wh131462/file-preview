## ADDED Requirements

### Requirement: 自定义渲染器匹配契约

系统 SHALL 允许用户通过 `customRenderers: CustomRenderer[]` 向 `FilePreviewContent` 注入自定义渲染器。`CustomRenderer` 必须包含同步 `test(file: PreviewFile): boolean`；当存在多个命中项时，系统 MUST 采用数组中第一个命中的渲染器。

#### Scenario: 命中首个匹配的自定义渲染器
- **WHEN** 用户传入 `customRenderers` 中的第一个渲染器 `test(file)` 返回 true
- **THEN** 系统 MUST 使用该渲染器而非内置渲染器渲染 `currentFile`

#### Scenario: 无命中时退回内置渲染器
- **WHEN** 所有 `customRenderers` 的 `test(file)` 均返回 false
- **THEN** 系统 MUST 根据 `getFileType(file)` 选择内置渲染器

#### Scenario: `customRenderers` 为空
- **WHEN** 未传入 `customRenderers` 或传入空数组
- **THEN** 系统 MUST 仅使用内置渲染器，且不报错

### Requirement: 自定义渲染器渲染契约

`CustomRenderer.render` SHALL 接收 `(file: PreviewFile, ctx: CustomRendererContext)`；React 端返回 `ReactNode`，Vue 端返回 `Component`。`ctx` 参数 MUST 可选——仅传入一个参数的旧版实现必须继续可用，不得报运行时错误。`ctx` MUST 至少包含以下字段：`emit(name: string, payload?: unknown): void`、`t: Translator`、`theme: 'dark' | 'light'`、`locale: Locale`。

#### Scenario: 两参数签名的新版渲染器
- **WHEN** 用户定义 `render: (file, ctx) => <MyComp file={file} ctx={ctx} />`
- **THEN** 系统 MUST 以 `currentFile` 和完整 `ctx` 两个参数调用该函数

#### Scenario: 单参数签名的旧版渲染器向后兼容
- **WHEN** 用户定义 `render: (file) => <MyComp file={file} />`
- **THEN** 系统 MUST 正常调用，且不因缺少第二参数抛错；第二参数被忽略

#### Scenario: `ctx.t` 与顶层 `locale` / `messages` 一致
- **WHEN** `FilePreviewContent` 以 `locale="en-US"` 渲染，自定义渲染器在 `render` 中调用 `ctx.t('common.download')`
- **THEN** 返回值 MUST 与内置渲染器在相同 locale 下的翻译一致

#### Scenario: `ctx.theme` 与顶层 `theme` 解析结果一致
- **WHEN** 顶层 `theme="auto"` 且系统处于深色模式
- **THEN** `ctx.theme` MUST 为 `"dark"`

### Requirement: 自定义渲染器工具组声明

`CustomRenderer` SHALL 提供可选方法 `getToolbarGroups(file: PreviewFile, ctx: CustomRendererContext): ToolbarGroup[]`。当命中自定义渲染器且该方法存在时，`FilePreviewContent` 的 `toolGroups`（即文件类型相关工具栏段）MUST 使用该方法返回值；否则 `toolGroups` MUST 为空数组。通用 `actionGroups`（下载、关闭）MUST 不受自定义渲染器影响。

#### Scenario: 自定义工具组替换内置工具组
- **WHEN** 命中的自定义渲染器实现了 `getToolbarGroups`，返回两个 `ToolbarGroup`
- **THEN** 工具栏桌面端 MUST 渲染这两个组；内置 `getFileType` 对应的默认工具组 MUST 不出现

#### Scenario: 未声明 `getToolbarGroups` 时工具栏为空
- **WHEN** 命中的自定义渲染器未实现 `getToolbarGroups`
- **THEN** `toolGroups` MUST 为 `[]`，工具栏仅渲染 `actionGroups`

#### Scenario: 通用操作组保持可见
- **WHEN** 命中自定义渲染器并声明了自定义 `getToolbarGroups`
- **THEN** 下载按钮 MUST 仍然可见；在 `mode === 'modal'` 且传入 `onClose` 时关闭按钮 MUST 仍然可见

#### Scenario: 工具组按钮调用 `ctx.emit` 派发事件
- **WHEN** 自定义 `getToolbarGroups` 返回的按钮 `action` 内部调用 `ctx.emit('do-something', { foo: 1 })`
- **THEN** 用户点击该按钮后，`FilePreviewContent` 的 `onCustomEvent` / `custom-event` 出口 MUST 收到 `{ name: 'do-something', payload: { foo: 1 }, file: currentFile }`

#### Scenario: `headless` 模式隐藏所有工具栏
- **WHEN** `headless === true` 且命中自定义渲染器
- **THEN** 无论自定义 `getToolbarGroups` 是否声明，工具栏 MUST 不渲染

### Requirement: 自定义渲染器事件通道

`FilePreviewContent` SHALL 对外暴露统一事件出口：React 端为 `onCustomEvent?: (event: { name: string; payload?: unknown; file: PreviewFile }) => void`；Vue 端为 `emit('custom-event', { name, payload, file })`。自定义渲染器通过 `ctx.emit(name, payload)` 派发的所有事件 MUST 通过该出口转发。`FilePreviewModal` / `FilePreviewEmbed` MUST 透传该事件出口。

#### Scenario: React 端事件转发
- **WHEN** 自定义渲染器在 `render` 返回的组件内部调用 `ctx.emit('page-change', { page: 2 })`
- **THEN** 宿主通过 `FilePreviewContent` 的 `onCustomEvent` prop MUST 收到 `{ name: 'page-change', payload: { page: 2 }, file: currentFile }`

#### Scenario: Vue 端事件转发
- **WHEN** 自定义渲染器组件内部调用注入 ctx 的 `ctx.emit('chapter-change', 3)`
- **THEN** 宿主在 `<FilePreviewContent @custom-event="handler">` MUST 收到 `{ name: 'chapter-change', payload: 3, file: currentFile }`

#### Scenario: Modal / Embed 透传事件
- **WHEN** 宿主在 `FilePreviewModal`（React）或 `<FilePreviewModal>`（Vue）上绑定事件监听，自定义渲染器 `ctx.emit('x')`
- **THEN** Modal / Embed 封装层 MUST 将事件透传到宿主绑定的监听器，参数形状与 `FilePreviewContent` 一致

#### Scenario: 未绑定监听时不抛错
- **WHEN** 宿主未传入 `onCustomEvent` / 未绑定 `@custom-event`，自定义渲染器调用 `ctx.emit('x')`
- **THEN** 系统 MUST 静默忽略，不抛错

### Requirement: 事件名白名单声明（可选）

`CustomRenderer` SHALL 提供可选字段 `events?: readonly string[]`，作为文档性的事件名白名单。运行时 MUST 不做强制拦截——即使 `ctx.emit` 的 `name` 不在 `events` 列表中，事件也 MUST 正常转发。该字段仅用于 TS 类型提示与文档约定。

#### Scenario: 声明了 `events` 但运行时不拦截
- **WHEN** `CustomRenderer.events = ['a', 'b']`，但自定义渲染器调用 `ctx.emit('c', 1)`
- **THEN** 宿主 `onCustomEvent` MUST 收到 `{ name: 'c', payload: 1, file: currentFile }`

#### Scenario: 未声明 `events` 时所有事件仍然可派发
- **WHEN** `CustomRenderer` 未提供 `events` 字段
- **THEN** `ctx.emit` 任意事件名 MUST 正常转发

### Requirement: React 与 Vue 双端 API 架构

React 包（`@eternalheart/react-file-preview`）与 Vue 包（`@eternalheart/vue-file-preview`）SHALL 暴露等价的 `CustomRenderer` 类型、等价的 `ctx` 字段集合、等价的事件载荷形状（`{ name, payload, file }`）。两端的 `getToolbarGroups` 返回值 MUST 均为 `ToolbarGroup[]`，其中按钮的 `icon` 类型按各自框架既有规范（React 为 `ReactNode`，Vue 为 `Component`）。

#### Scenario: 两端 ctx 字段一致
- **WHEN** 对比 React 与 Vue 两端 `CustomRendererContext` 的公开字段
- **THEN** 两端 MUST 同时包含 `emit` / `t` / `theme` / `locale`，字段名与语义一致

#### Scenario: 两端事件载荷形状一致
- **WHEN** 两端自定义渲染器各自调用 `ctx.emit('x', { v: 1 })`
- **THEN** 两端顶层事件出口收到的对象 MUST 均为 `{ name: 'x', payload: { v: 1 }, file: currentFile }`

#### Scenario: 两端工具组规范一致
- **WHEN** 同一份"伪代码工具组声明"分别在 React / Vue 包中使用对应 `ToolbarGroup` 类型实现
- **THEN** 两端 MUST 渲染结构相同的按钮序列、分隔符与 tooltip
