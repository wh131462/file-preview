# 主题定制

## 内置主题

组件通过 `theme` prop 提供三种内置主题模式：

| 值 | 说明 |
|------|------|
| `'dark'` | 暗色主题（默认） |
| `'light'` | 浅色主题 |
| `'auto'` | 跟随系统 `prefers-color-scheme` 自动切换 |

### 基本用法

::: code-group

```tsx [React]
import { FilePreviewModal } from '@eternalheart/react-file-preview'

// 浅色主题
<FilePreviewModal theme="light" files={files} ... />

// 跟随系统
<FilePreviewModal theme="auto" files={files} ... />

// 嵌入模式同样支持
<FilePreviewEmbed theme="light" files={files} />
```

```vue [Vue]
<!-- 浅色主��� -->
<FilePreviewModal theme="light" :files="files" ... />

<!-- 跟随系统 -->
<FilePreviewModal theme="auto" :files="files" ... />

<!-- 嵌入模式同样支持 -->
<FilePreviewEmbed theme="light" :files="files" />
```

:::

### auto 模式

当 `theme="auto"` 时，组件会监听 `window.matchMedia('(prefers-color-scheme: dark)')` 的变化，实时跟随系统主题切换。

## 无头模式

通过 `headless` prop 可以隐藏所有 UI 外壳（工具栏、导航箭头），仅渲染文件内容。适用于需要自定义外壳或纯内容展示的场景。

::: code-group

```tsx [React]
<FilePreviewEmbed headless files={files} />
```

```vue [Vue]
<FilePreviewEmbed headless :files="files" />
```

:::

## CSS 变量覆盖

除了内置主题，你还可以通过 CSS 变量进一步定制样式。组件根元素会添加 `data-theme="dark"` 或 `data-theme="light"` 属性，可以基于此选择器覆盖样式：

```css
/* 自定义 light 主题的滚动条 */
.rfp-root[data-theme="light"] ::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
}

/* 自定义 dark 主题的滚动条 */
.rfp-root[data-theme="dark"] ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
}
```

## Tailwind CSS 集成

组件内部使用带前缀的 Tailwind 类（`rfp-` / `vfp-`），不会与你项目中的 Tailwind 冲突。如需进一步定制，可通过 `data-theme` 属性选择器配合你自己的 Tailwind 类。

## 响应式设计

组件已内置响应式设计，桌面端显示完整工具栏，移动端自动简化 UI 并支持触摸手势。

## 下一步

- [API 参考](../api/components) - 查看完整的 API 文档
- [类型定义](../api/types) - 了解所有类型定义

