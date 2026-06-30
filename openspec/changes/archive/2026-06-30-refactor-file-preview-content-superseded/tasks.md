## 1. 准备工作

- [x] 1.1 备份当前 `FilePreviewContent.tsx` 文件（重命名为 `FilePreviewContent.tsx.backup`）
- [x] 1.2 创建新目录结构：`hooks/`、`components/preview/`、`toolbar/`
- [x] 1.3 创建 `hooks/types.ts`，定义 `RendererState`、`RendererAction`、`RendererHandlers` 类型
- [x] 1.4 确认现有测试覆盖率，记录基线（如有测试）

## 2. 状态管理重构（Phase 1）

- [x] 2.1 创建 `hooks/rendererReducer.ts`，实现 reducer 函数和 initialState
- [x] 2.2 定义所有 action types：`RESET`、`SET_ZOOM`、`SET_ROTATION`、`SET_PDF_PAGE`、`SET_PDF_TOTAL_PAGES`、`SET_PDF_OUTLINE`、`SET_EPUB_CHAPTER`、`SET_EPUB_FULL_WIDTH`、`SET_MOBI_CHAPTER`、`SET_MOBI_FULL_WIDTH`、`SET_ZIP_STATS`、`SET_TEXT_WORD_WRAP`、`SET_TEXT_HTML_PREVIEW`、`SET_MARKDOWN_VIEW_MODE`、`SET_IMAGE_NATURAL_SIZE`、`RESET_IMAGE`
- [x] 2.3 创建 `hooks/useFilePreviewState.ts`，封装 reducer 和自动重置逻辑
- [x] 2.4 验证 reducer 逻辑（手动测试或单元测试）

## 3. 自定义 Hooks 提取（Phase 1）

- [x] 3.1 创建 `hooks/useKeyboardNavigation.ts`，提取键盘事件处理逻辑
- [x] 3.2 创建 `hooks/useBookRenderer.ts`，实现泛型 `useBookRenderer<T>` hook
- [x] 3.3 创建 `hooks/useThemeMode.ts`，提取主题模式逻辑（systemDark + resolvedTheme）
- [x] 3.4 创建 `hooks/useImageAutoFit.ts`，提取图片自动适应窗口逻辑
- [x] 3.5 创建 `hooks/index.ts`，添加 barrel exports

## 4. 工具栏配置重构（Phase 2）

- [x] 4.1 创建 `toolbar/registry.ts`，定义 `ToolbarConfigFactory` 类型和 `TOOLBAR_CONFIG_MAP`
- [x] 4.2 适配现有工厂函数签名（如需要）：`getImageToolbarGroups`、`getPdfToolbarGroups` 等
- [x] 4.3 实现 `getToolbarGroups(fileType, state, handlers, t)` 函数
- [x] 4.4 创建 `toolbar/renderItems.tsx`，将 `renderToolbarItems` 提取到模块顶层
- [x] 4.5 创建 `hooks/useToolbarConfig.ts`，封装工具栏配置逻辑（包含自定义渲染器处理）
- [x] 4.6 创建 `toolbar/index.ts`，添加 barrel exports

## 5. 子组件拆分（Phase 3）

- [x] 5.1 创建 `components/preview/ToolbarButton.tsx`，从主文件提取按钮组件
- [x] 5.2 创建 `components/preview/FilePreviewToolbar.tsx`，负责工具栏渲染
- [x] 5.3 创建 `components/preview/RendererError.tsx`，错误 UI 组件
- [x] 5.4 创建 `components/preview/RendererErrorBoundary.tsx`，React 错误边界类组件
- [x] 5.5 创建 `components/preview/FilePreviewRenderer.tsx`，渲染器容器（包含 Suspense + 错误边界）
- [x] 5.6 将 `NavArrows` 提取到独立文件 `components/preview/NavArrows.tsx`
- [x] 5.7 创建 `components/preview/index.ts`，添加 barrel exports

## 6. 主组件重构（Phase 3）

- [x] 6.1 重构 `FilePreviewContentInner`，使用新的 hooks（useFilePreviewState、useKeyboardNavigation 等）
- [x] 6.2 替换分散的 useState 为 useReducer + dispatch
- [x] 6.3 使用 `useToolbarConfig` 替换 80 行 if-else 工具栏配置
- [x] 6.4 使用 `FilePreviewToolbar` 子组件替换内联工具栏 JSX
- [x] 6.5 使用 `FilePreviewRenderer` 子组件替换内联渲染器 JSX
- [x] 6.6 使用 `useBookRenderer` 替换 EPUB/Mobi 重复状态
- [x] 6.7 移除旧的内联 `ToolbarButton` 和 `NavArrows` 定义
- [x] 6.8 验证主组件代码量 < 200 行

## 7. 类型安全改进

- [x] 7.1 为内容容器添加 `data-scroll-container` 属性，替换 `.rfp-overflow-auto` 选择器
- [x] 7.2 更新 PDF 翻页逻辑，使用类型化的 `querySelector<HTMLElement>`
- [x] 7.3 检查所有 DOM 查询，确保使用类型化访问
- [x] 7.4 启用 TypeScript 严格模式检查（如未启用）
- [x] 7.5 修复所有 TypeScript 警告和错误

## 8. Accessibility 增强（Phase 4）

- [x] 8.1 为所有 `ToolbarButton` 添加 `aria-label`（使用 `t()` 函数翻译）
- [x] 8.2 为导航箭头添加 `aria-label`（"上一个文件" / "下一个文件"）
- [x] 8.3 为关闭按钮添加 `aria-keyshortcuts="Escape"`
- [x] 8.4 为导航箭头添加 `aria-keyshortcuts="ArrowLeft"` / `"ArrowRight"`
- [x] 8.5 为页码信息区域添加 `aria-live="polite"` 和 `aria-atomic="true"`
- [x] 8.6 为禁用按钮添加 `aria-disabled="true"`
- [ ] 8.7 验证 modal 模式下焦点管理（Tab 循环）
- [x] 8.8 添加 i18n 翻译键（如 `accessibility.previousFile`、`accessibility.nextFile` 等）

## 9. 错误边界实现

- [x] 9.1 实现 `RendererErrorBoundary` 类组件（getDerivedStateFromError、componentDidCatch）
- [x] 9.2 实现 `RendererError` UI 组件，包含错误信息、重试按钮、下载按钮
- [x] 9.3 实现错误重置逻辑（key 变化或显式 reset 方法）
- [x] 9.4 添加可选的 `onError` prop 用于自定义错误上报
- [ ] 9.5 测试错误边界：模拟渲染器加载失败和运行时错误
- [ ] 9.6 验证错误状态下工具栏和导航仍然可用

## 10. 文件切换错误重置

- [x] 10.1 错误边界使用 `key={currentFile.url}` 触发自动重置
- [ ] 10.2 验证切换文件时错误状态正确清除
- [ ] 10.3 验证重试按钮触发渲染器重新加载

## 11. 测试与验证

- [ ] 11.1 手动测试所有文件类型预览（image、pdf、docx、xlsx、pptx、msg、epub、mobi、video、audio、markdown、json、csv、xml、subtitle、zip、text、font）【需要浏览器】
- [ ] 11.2 测试 modal 模式：打开、关闭、键盘导航（Escape、ArrowLeft、ArrowRight）【需要浏览器】
- [ ] 11.3 测试 embed 模式：键盘导航需要容器获得焦点【需要浏览器】
- [ ] 11.4 测试 headless 模式：工具栏和导航箭头不显示【需要浏览器】
- [ ] 11.5 测试 theme 切换（light、dark、auto）【需要浏览器】
- [ ] 11.6 测试 i18n 切换（zh-CN、en-US）【需要浏览器】
- [ ] 11.7 测试自定义渲染器：自定义 test、render、getToolbarGroups【需要浏览器】
- [ ] 11.8 测试 onCustomEvent 回调【需要浏览器】
- [ ] 11.9 测试 onDownload 自定义回调【需要浏览器】
- [ ] 11.10 测试 requestInit、requestHandler、shouldFetchAsBlob【需要浏览器】

## 12. 性能验证

- [ ] 12.1 使用 React DevTools Profiler 对比重构前后性能【需要浏览器】
- [ ] 12.2 验证图片缩放无延迟【需要浏览器】
- [ ] 12.3 验证 PDF 滚动流畅【需要浏览器】
- [ ] 12.4 验证文件切换状态重置无卡顿【需要浏览器】
- [x] 12.5 检查 bundle 体积变化（应无显著增加）

## 13. Accessibility 验证

- [ ] 13.1 使用 axe DevTools 扫描，确保无 critical/serious 问题【需要浏览器 + axe 插件】
- [ ] 13.2 使用键盘导航测试所有交互（Tab、Enter、Space、Escape、Arrow keys）【需要浏览器】
- [ ] 13.3 使用屏幕阅读器测试（VoiceOver / NVDA）【需要浏览器 + 屏幕阅读器】
- [ ] 13.4 验证色彩对比度满足 WCAG AA【需要浏览器 + 对比度工具】

## 14. 文档与清理

- [x] 14.1 更新模块 README 或注释，说明新的目录结构
- [ ] 14.2 删除 `FilePreviewContent.tsx.backup` 备份文件（建议在验证完成后再删除）
- [x] 14.3 确认所有新文件都有适当的 TypeScript 类型注解
- [x] 14.4 运行 ESLint 修复所有警告（项目未配置 ESLint，跳过）
- [x] 14.5 确认无未使用的导入和变量

## 15. 最终验证

- [x] 15.1 运行项目构建命令，确保无编译错误
- [ ] 15.2 在示例项目中验证所有功能正常
- [ ] 15.3 对比重构前后视觉效果，确保无回归
- [ ] 15.4 提交代码（按 phase 分批提交，便于回滚）
