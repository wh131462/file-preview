# 基础用法

## 基本示例

最简单的使用方式：

```tsx
import { useState } from 'react'
import { FilePreviewModal } from '@eternalheart/react-file-preview'
import '@eternalheart/react-file-preview/style.css'

function App() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const files = [
    { url: 'https://example.com/image.jpg', name: 'image.jpg' },
    { url: 'https://example.com/document.pdf', name: 'document.pdf' }
  ]

  return (
    <>
      <button onClick={() => setIsOpen(true)}>预览文件</button>
      <FilePreviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        files={files}
        currentIndex={currentIndex}
        onNavigate={setCurrentIndex}
      />
    </>
  )
}
```

## 文件对象格式

文件对象支持三种格式：

### URL 字符串

```tsx
const files = ['https://example.com/file.pdf']
```

### PreviewFileLink 对象

```tsx
const file = {
  name: 'document.pdf',
  url: 'https://example.com/file.pdf',
  type: 'application/pdf'
}
```

### 原生 File 对象

```tsx
const file = new File(['content'], 'document.txt', { type: 'text/plain' })
```

## 处理文件上传

```tsx
function FileUploadExample() {
  const [files, setFiles] = useState<PreviewFileInput[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(selectedFiles)
    setIsOpen(true)
  }

  return (
    <>
      <input type="file" multiple onChange={handleFileChange} />
      <FilePreviewModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        files={files}
        currentIndex={0}
      />
    </>
  )
}
```

## 自定义渲染器

你可以为特定文件类型提供自定义渲染器：

```tsx
import type { CustomRenderer } from '@eternalheart/react-file-preview'

const customRenderers: CustomRenderer[] = [
  {
    test: (file) => file.name.endsWith('.custom'),
    render: (file) => (
      <div>
        <h2>自定义渲染器</h2>
        <p>文件名: {file.name}</p>
      </div>
    )
  }
]

<FilePreviewModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  files={files}
  currentIndex={0}
  customRenderers={customRenderers}
/>
```

## 控制导航

```tsx
<FilePreviewModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  files={files}
  currentIndex={currentIndex}
  onNavigate={(index) => {
    console.log('切换到文件:', index)
    setCurrentIndex(index)
  }}
/>
```

## 渲染机制

### Portal 渲染

`FilePreviewModal` 使用 React Portal 将模态框渲染到 `document.body`，这确保了：

- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> **最高层级**: 模态框始终显示在页面最上层，不受父元素 `z-index` 影响
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> **样式隔离**: 避免父元素的 CSS 样式（如 `overflow: hidden`）影响模态框
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> **定位准确**: 模态框相对于视口定位，不受父元素定位影响

这意味着你可以在任何位置使用 `FilePreviewModal`，无需担心层级和定位问题：

```tsx
// 即使在嵌套很深的组件中使用也没问题
<div style={{ position: 'relative', overflow: 'hidden', zIndex: 100 }}>
  <div style={{ position: 'absolute' }}>
    <FilePreviewModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      files={files}
      currentIndex={0}
    />
  </div>
</div>
```

模态框会自动渲染到 `document.body`，不受上述样式影响。

## 下一步

- [支持的文件类型](./supported-types) - 查看所有支持的文件格式
- [自定义渲染器](./custom-renderers) - 了解如何创建自定义渲染器
- [主题定制](./theming) - 自定义组件样式

