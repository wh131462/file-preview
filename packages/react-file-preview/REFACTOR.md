# FilePreviewContent 重构说明

## 新目录结构

```
src/
├── FilePreviewContent.tsx          # 主组件（413 行，从 751 行减少）
├── hooks/                          # 自定义 Hooks
│   ├── types.ts                    # 状态和 Action 类型
│   ├── rendererReducer.ts          # 状态管理 reducer
│   ├── useFilePreviewState.ts      # 状态管理 hook
│   ├── useKeyboardNavigation.ts    # 键盘导航
│   ├── useBookRenderer.ts          # 书籍渲染器通用逻辑
│   ├── useThemeMode.ts             # 主题模式
│   ├── useImageAutoFit.ts          # 图片自动适应
│   ├── useToolbarConfig.ts         # 工具栏配置
│   └── index.ts                    # Barrel exports
├── components/preview/             # 子组件
│   ├── ToolbarButton.tsx           # 工具栏按钮
│   ├── FilePreviewToolbar.tsx      # 顶部工具栏
│   ├── RendererError.tsx           # 错误 UI
│   ├── RendererErrorBoundary.tsx   # 错误边界
│   ├── FilePreviewRenderer.tsx     # 渲染器容器
│   ├── NavArrows.tsx               # 导航箭头
│   └── index.ts                    # Barrel exports
└── toolbar/                        # 工具栏配置
    ├── registry.ts                 # 工具栏工厂注册
    ├── renderItems.tsx             # 工具栏渲染函数
    └── index.ts                    # Barrel exports
```

## 主要改进

1. **状态管理统一**：16+ useState → useReducer + 类型化 actions
2. **逻辑提取**：4 个自定义 hooks 封装复用逻辑
3. **组件拆分**：单一职责，便于测试和维护
4. **工具栏注册**：80 行 if-else → 配置映射，便于扩展
5. **错误边界**：渲染器级错误处理，支持重试和下载
6. **无障碍增强**：aria-label、aria-keyshortcuts、aria-live

## 向后兼容

- Props 接口保持不变
- 所有现有功能正常工作
- 自定义渲染器 API 不受影响
