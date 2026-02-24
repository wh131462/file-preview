# 安装

## 环境要求

- React >= 18.0.0
- React DOM >= 18.0.0

## 包管理器安装

::: code-group

```bash [pnpm]
pnpm add @eternalheart/react-file-preview
```

```bash [npm]
npm install @eternalheart/react-file-preview
```

```bash [yarn]
yarn add @eternalheart/react-file-preview
```

:::

## 导入样式

在你的应用入口文件中导入样式：

```tsx
import '@eternalheart/react-file-preview/style.css'
```

## PDF 支持

组件已内置 PDF.js worker 配置，**无需任何额外配置**。

Worker 文件会自动从 CDN 加载，确保：
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> 零配置，开箱即用
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> 自动匹配 pdfjs-dist 版本
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> 稳定可靠的加载方式
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> 无需手动复制任何文件

::: tip
组件会自动使用 unpkg CDN 加载 PDF.js worker 文件，无需任何手动配置。
:::

## 验证安装

创建一个简单的示例来验证安装：

```tsx
import { useState } from 'react'
import { FilePreviewModal } from '@eternalheart/react-file-preview'
import '@eternalheart/react-file-preview/style.css'

function App() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>打开预览</button>
      <FilePreviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        files={[
          { url: 'https://via.placeholder.com/800', name: 'test.png' }
        ]}
        currentIndex={0}
      />
    </div>
  )
}

export default App
```

## 下一步

- [基础用法](./basic-usage) - 学习如何使用组件
- [支持的文件类型](./supported-types) - 查看所有支持的文件格式

