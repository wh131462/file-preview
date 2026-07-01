## 1. React 包：添加 showDownload prop

- [x] 1.1 在 `FilePreviewContent.tsx` 的 `FilePreviewContentProps` 接口中添加 `showDownload?: boolean` 类型定义
- [x] 1.2 在 `FilePreviewContent.tsx` 中为 `showDownload` 设置默认值 `true`
- [x] 1.3 将 `showDownload` prop 传递给 `FilePreviewToolbar` 组件
- [x] 1.4 在 `FilePreviewToolbar.tsx` 的 `FilePreviewToolbarProps` 接口中添加 `showDownload: boolean` 类型定义
- [x] 1.5 修改 `FilePreviewToolbar.tsx` 中的 `actionGroups` 生成逻辑，使用条件展开运算符根据 `showDownload` 控制下载按钮的显示
- [x] 1.6 在 `FilePreviewModal.tsx` 的 props 接口中添加 `showDownload?: boolean` 类型定义
- [x] 1.7 在 `FilePreviewModal.tsx` 中透传 `showDownload` prop 给 `FilePreviewContent` 组件
- [x] 1.8 在 `FilePreviewEmbed.tsx` 的 props 接口中添加 `showDownload?: boolean` 类型定义
- [x] 1.9 在 `FilePreviewEmbed.tsx` 中透传 `showDownload` prop 给 `FilePreviewContent` 组件

## 2. Vue 包：添加 showDownload prop

- [x] 2.1 在 `FilePreviewContent.vue` 的 props 定义中添加 `showDownload` prop（类型 `Boolean`，默认值 `true`）
- [x] 2.2 修改 `FilePreviewContent.vue` 中的 `actionGroups` 计算属性，使用条件展开运算符根据 `showDownload` 控制下载按钮的显示
- [x] 2.3 在 `FilePreviewModal.vue` 的 props 定义中添加 `showDownload` prop（类型 `Boolean`，默认值 `true`）
- [x] 2.4 在 `FilePreviewModal.vue` 中透传 `showDownload` prop 给 `FilePreviewContent` 组件
- [x] 2.5 在 `FilePreviewEmbed.vue` 的 props 定义中添加 `showDownload` prop（类型 `Boolean`，默认值 `true`）
- [x] 2.6 在 `FilePreviewEmbed.vue` 中透传 `showDownload` prop 给 `FilePreviewContent` 组件

## 3. 类型定义（如需要）

- [x] 3.1 检查 `@eternalheart/file-preview-core` 包中是否有需要更新的共享类型定义
- [x] 3.2 如有必要，在 core 包的类型文件中添加 `showDownload` 字段的类型声明

## 4. 验证与测试

- [ ] 4.1 验证 React 版本：`showDownload={true}` 时下载按钮正常显示（需手动测试）
- [ ] 4.2 验证 React 版本：`showDownload={false}` 时下载按钮被隐藏（需手动测试）
- [ ] 4.3 验证 React 版本：未传递 `showDownload` 时下载按钮正常显示（默认值生效）（需手动测试）
- [ ] 4.4 验证 Vue 版本：`:show-download="true"` 时下载按钮正常显示（需手动测试）
- [ ] 4.5 验证 Vue 版本：`:show-download="false"` 时下载按钮被隐藏（需手动测试）
- [ ] 4.6 验证 Vue 版本：未传递 `show-download` 时下载按钮正常显示（默认值生效）（需手动测试）
- [ ] 4.7 验证桌面端和移动端工具栏布局在隐藏下载按钮后正常调整（需手动测试）
- [ ] 4.8 验证关闭按钮和渲染器工具栏项不受 `showDownload` 影响（需手动测试）
- [ ] 4.9 验证 Modal 和 Embed 两种模式下功能均正常工作（需手动测试）
