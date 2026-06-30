## 1. 扩展基础接口和类型

- [x] 1.1 在 `packages/react-file-preview/src/renderers/base.types.ts` 中扩展 `RendererHandle` 接口，添加可选的 `onToolbarChange` 方法
- [x] 1.2 验证类型定义：确保向后兼容，现有渲染器不需要实现新方法
- [x] 1.3 添加 JSDoc 注释说明 `onToolbarChange` 的使用方式和返回值

## 2. 为已完成的渲染器添加事件支持

- [x] 2.1 在 ImageRenderer 中创建 `ToolbarEventEmitter` 实例
- [x] 2.2 在 ImageRenderer 的 `zoom`、`rotation` 状态变化时调用 `emitter.notify()`
- [x] 2.3 在 ImageRenderer 的 `useImperativeHandle` 中实现 `onToolbarChange` 方法
- [x] 2.4 在 PdfRenderer 中创建 `ToolbarEventEmitter` 实例
- [x] 2.5 在 PdfRenderer 的 `zoom`、`currentPage`、`showOutline` 状态变化时调用 `emitter.notify()`
- [x] 2.6 在 PdfRenderer 的 `useImperativeHandle` 中实现 `onToolbarChange` 方法
- [x] 2.7 在 EpubRenderer 中创建 `ToolbarEventEmitter` 实例
- [x] 2.8 在 EpubRenderer 的 `currentChapter`、`totalChapters`、`isFullWidth` 状态变化时调用 `emitter.notify()`
- [x] 2.9 在 EpubRenderer 的 `useImperativeHandle` 中实现 `onToolbarChange` 方法

## 3. 重构主组件的工具栏更新机制

- [x] 3.1 修改 `FilePreviewContent.tsx` 中的 `useEffect`，检测 `rendererRef.current?.onToolbarChange` 是否存在
- [x] 3.2 当渲染器支持事件时，调用 `onToolbarChange` 订阅工具栏变化，并保存 unsubscribe 函数
- [x] 3.3 当渲染器不支持事件时，保持现有的 100ms 轮询逻辑作为回退
- [x] 3.4 在 useEffect cleanup 函数中调用 unsubscribe，确保没有内存泄漏
- [x] 3.5 在订阅后立即调用一次 `getToolbarGroups()` 获取初始状态

## 4. 完成 Mobi 渲染器重构

- [x] 4.1 参考 EpubRenderer，在 MobiRenderer 中添加内部状态管理（currentChapter、totalChapters、isFullWidth）
- [x] 4.2 移除 `onChapterChange` 和 `onFullWidthChange` props
- [x] 4.3 实现 `getToolbarGroups` 方法返回翻页、目录、全宽切换按钮
- [x] 4.4 创建 `ToolbarEventEmitter` 并在状态变化时触发通知
- [x] 4.5 实现 `onToolbarChange` 订阅方法
- [x] 4.6 修改主组件中 MobiRenderer 的调用，移除旧 props，添加 ref

## 5. 完成 Text 渲染器重构

- [x] 5.1 在 TextRenderer 中添加内部状态管理（wordWrap、htmlPreview、highlightLanguage）
- [x] 5.2 移除所有外部控制的 props（如果存在）
- [x] 5.3 实现 `getToolbarGroups` 方法返回换行、HTML 预览、语法高亮按钮
- [x] 5.4 创建 `ToolbarEventEmitter` 并在状态变化时触发通知
- [x] 5.5 实现 `onToolbarChange` 订阅方法
- [x] 5.6 修改主组件中 TextRenderer 的调用，使用新 API

## 6. 完成 Markdown 渲染器重构

- [x] 6.1 在 MarkdownRenderer 中添加内部状态管理（viewMode: 'preview' | 'source'）
- [x] 6.2 移除外部控制的 viewMode props
- [x] 6.3 实现 `getToolbarGroups` 方法返回预览/源码切换按钮
- [x] 6.4 创建 `ToolbarEventEmitter` 并在 viewMode 变化时触发通知
- [x] 6.5 实现 `onToolbarChange` 订阅方法
- [x] 6.6 修改主组件中 MarkdownRenderer 的调用，使用新 API

## 7. 为简单渲染器添加空实现

- [x] 7.1 为 DocxRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现（返回 `[]`）
- [x] 7.2 为 XlsxRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.3 为 PptxRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.4 为 MsgRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.5 为 VideoRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.6 为 AudioRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.7 为 JsonRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.8 为 CsvRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.9 为 XmlRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.10 为 SubtitleRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.11 为 ZipRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现
- [x] 7.12 为 FontRenderer 添加 `forwardRef` 和空的 `getToolbarGroups` 实现

## 8. 清理遗留代码

- [x] 8.1 为所有简单渲染器添加 ref 传递，使其工具栏配置生效
- [x] 8.2 添加 `hasNewToolbarInterface` 标记，区分新旧工具栏系统（后已删除，因所有渲染器都使用新接口）
- [x] 8.3 修复 FontRenderer 中 useImperativeHandle 的位置错误
- [x] 8.4 删除 `useFilePreviewState` reducer 及其状态管理
- [x] 8.5 删除 `useToolbarConfig` hook 及 `ToolbarConfigHandlers` 类型
- [x] 8.6 删除主组件中未使用的事件处理器（handleZoomIn、handleRotateLeft、handleFitToWidth、handleOriginalSize、handleReset、handlePrevPage、handleNextPage 等）
- [x] 8.7 删除 `useBookRenderer` hook 的使用（epubBook、mobiBook refs）
- [x] 8.8 删除 ZipRenderer 的 `onStatsChange` 回调（不再需要状态管理）
- [x] 8.9 更新 TypeScript 导入，移除未使用的类型和 hooks
- [x] 8.10 从 hooks/index.ts 中移除不再使用的导出
- [x] 8.11 删除文件：rendererReducer.ts、useFilePreviewState.ts、useToolbarConfig.ts

## 9. 验证和测试

- [x] 9.1 运行 `npx tsc --noEmit` 确保没有类型错误
- [x] 9.2 运行 `npm run build` 确保构建成功
- [x] 9.3 手动测试 Image 渲染器：缩放、旋转，确认工具栏实时更新
- [x] 9.4 手动测试 Pdf 渲染器：翻页、大纲切换，确认工具栏实时更新
- [x] 9.5 手动测试 Epub 渲染器：翻页、全宽切换，确认工具栏实时更新
- [x] 9.6 手动测试 Mobi、Text、Markdown 渲染器的功能
- [x] 9.7 测试所有简单渲染器能正常加载和显示
- [x] 9.8 使用浏览器开发工具检查：事件订阅是否正确清理，无内存泄漏
- [x] 9.9 性能测试：对比重构前后的 CPU 使用率（应显著降低）

## 10. 文档更新

- [x] 10.1 更新 README.md，说明新的渲染器接口要求
- [x] 10.2 添加自定义渲染器迁移指南，展示如何从轮询迁移到事件机制
- [x] 10.3 在 CHANGELOG.md 中记录此次重构的变更
- [x] 10.4 更新 TypeScript 类型文档，解释 `RendererHandle.onToolbarChange` 的用法
