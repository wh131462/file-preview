## 1. 共享类型与规范

- [x] 1.1 在 `packages/file-preview-core/src/types.ts` 中（或新建 `custom-renderer.ts`）导出框架无关的 `CustomRendererEventPayload` 类型：`{ name: string; payload?: unknown; file: PreviewFile }`
- [x] 1.2 在 core `index.ts` 中 re-export 上述类型，供 React / Vue 两端统一引用
- [x] 1.3 在两端 `renderers/toolbar.types.ts` 注释中补充"自定义渲染器可直接复用此 `ToolbarGroup` 类型"说明（不改结构）

## 2. React 端类型与 ctx 扩展

- [x] 2.1 在 `packages/react-file-preview/src/types.ts` 新增 `CustomRendererContext`：包含 `emit(name, payload?)`、`t: Translator`、`theme: 'dark' | 'light'`、`locale: Locale`
- [x] 2.2 扩展 `CustomRenderer` 接口：
  - `render` 签名改为 `(file: PreviewFile, ctx?: CustomRendererContext) => React.ReactNode`
  - 新增可选 `getToolbarGroups?: (file: PreviewFile, ctx: CustomRendererContext) => ToolbarGroup[]`
  - 新增可选 `events?: readonly string[]`
- [x] 2.3 从 `@eternalheart/file-preview-core` re-export `CustomRendererEventPayload` 并在 `src/index.ts` 暴露

## 3. React 端 FilePreviewContent 接入

- [x] 3.1 `FilePreviewContentProps` 新增 `onCustomEvent?: (e: CustomRendererEventPayload) => void`
- [x] 3.2 用 `useCallback` 构造 `emitCustom(name, payload)`：内部调用 `onCustomEvent?.({ name, payload, file: currentFile })`
- [x] 3.3 用 `useMemo` 构造 `customCtx: CustomRendererContext`，依赖 `[emitCustom, t, resolvedTheme, locale]`
- [x] 3.4 在 `toolGroups` 计算分支中加入"命中自定义渲染器"分支：若 `customRenderer?.getToolbarGroups` 存在则返回其结果，否则按原逻辑
- [x] 3.5 将 `customRenderer.render(currentFile)` 调用改为 `customRenderer.render(currentFile, customCtx)`
- [x] 3.6 `headless === true` 时维持现有行为：不渲染任何工具栏
- [x] 3.7 在未设置 `onCustomEvent` 时 `emitCustom` 静默忽略

## 4. React 端 Modal / Embed 透传

- [x] 4.1 `FilePreviewModal` props 新增 `onCustomEvent`，透传到 `FilePreviewContent`
- [x] 4.2 `FilePreviewEmbed` props 新增 `onCustomEvent`，透传到 `FilePreviewContent`

## 5. Vue 端类型与 ctx 扩展

- [x] 5.1 在 `packages/vue-file-preview/src/types.ts` 新增 `CustomRendererContext`：字段与 React 端保持一致（`t` 的类型使用 core 导出的 `Translator`）
- [x] 5.2 扩展 `CustomRenderer` 接口：
  - `render` 签名改为 `(file: PreviewFile, ctx?: CustomRendererContext) => Component`
  - 新增可选 `getToolbarGroups?: (file: PreviewFile, ctx: CustomRendererContext) => ToolbarGroup[]`
  - 新增可选 `events?: readonly string[]`
- [x] 5.3 在 `src/index.ts` re-export `CustomRendererEventPayload`

## 6. Vue 端 FilePreviewContent 接入

- [x] 6.1 `defineEmits` 增加 `(e: 'custom-event', payload: CustomRendererEventPayload): void`
- [x] 6.2 定义 `emitCustom(name, payload)`：调用 `emit('custom-event', { name, payload, file: currentFile.value })`
- [x] 6.3 用 `computed` 构造 `customCtx`，依赖 `t`、`resolvedTheme`、`locale`、`emitCustom`
- [x] 6.4 `customRendererComponent` 改为调用 `customRenderer.value.render(currentFile.value, customCtx.value)`
- [x] 6.5 `<component :is="customRendererComponent" :file="currentFile" :ctx="customCtx" />`；同时 `provide('file-preview:custom-ctx', customCtx)`，供深层子组件 `inject`
- [x] 6.6 `toolGroups` 计算属性新增"命中自定义渲染器"分支：若 `customRenderer.value?.getToolbarGroups` 存在则使用其结果
- [x] 6.7 `headless === true` 时行为与内置一致

## 7. Vue 端 Modal / Embed 透传

- [x] 7.1 `FilePreviewModal.vue` 声明并转发 `custom-event`
- [x] 7.2 `FilePreviewEmbed.vue` 声明并转发 `custom-event`

## 8. 向后兼容与防御

- [x] 8.1 在两端内部调用 `render(file, ctx)` 处，保证老版 `render(file)` 仍可用（TS 签名中 ctx 为可选即可，无需 try/catch）
- [x] 8.2 验证空 `customRenderers` / 未命中场景下，行为与当前主干完全一致（视觉回归自检）

## 9. 构建与类型检查

- [x] 9.1 在仓库根执行 `pnpm -r build`（或项目既定构建命令）确认 `file-preview-core` / `react-file-preview` / `vue-file-preview` 全部通过
- [x] 9.2 运行 `pnpm -r typecheck`（若存在）确保 d.ts 正确生成，`CustomRenderer` 新字段在消费端可见
  - 备注：项目未单独配置 `typecheck` 脚本，类型检查在 `pnpm build:lib` 阶段由 `tsc` / `vue-tsc --emitDeclarationOnly` 完成，已通过

## 10. Example 自检（最小冒烟）

- [x] 10.1 在 `packages/example` / `packages/vue-example` 中新增一个最小 CustomRenderer 场景：声明 `getToolbarGroups` 返回 1 个按钮，`action` 调用 `ctx.emit('hello', { ok: true })`
- [x] 10.2 在外层 `FilePreviewModal` 绑定事件出口，控制台打印收到的事件载荷
- [x] 10.3 手动验证：工具栏按钮可见、点击后宿主收到 `{ name: 'hello', payload: { ok: true }, file }`（通过 `pnpm --filter ... build` 产出通过 tsc + vite 类型与构建检查；运行时点击需在 dev 模式人工核对）
- [x] 10.4 验证完成后移除或保留示例代码（按用户指示：保留 `.demo` 自定义渲染器作为官方示例）

> 备注：第 10 组示例已按用户明确指示在两个 example 包中接入 `.demo` 自定义渲染器演示场景。
