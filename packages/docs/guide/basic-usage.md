# 基础用法

本库提供两种预览组件:

- **`FilePreviewModal`** — 全屏弹窗预览,默认通过 Portal/Teleport 挂载到 `document.body`
- **`FilePreviewEmbed`** — 嵌入式预览,直接内联到你指定的 div 容器中

两者底层共用一套渲染逻辑,API 风格也非常相似。根据你的场景选择即可,或者两者搭配使用。

## 基本示例

最简单的使用方式：

::: code-group

```tsx [React]
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

```vue [Vue 3]
<script setup>
import { ref } from 'vue'
import { FilePreviewModal } from '@eternalheart/vue-file-preview'
import '@eternalheart/vue-file-preview/style.css'

const isOpen = ref(false)
const currentIndex = ref(0)

const files = [
  { url: 'https://example.com/image.jpg', name: 'image.jpg' },
  { url: 'https://example.com/document.pdf', name: 'document.pdf' }
]
</script>

<template>
  <button @click="isOpen = true">预览文件</button>
  <FilePreviewModal
    :is-open="isOpen"
    :files="files"
    :current-index="currentIndex"
    @close="isOpen = false"
    @navigate="(i) => (currentIndex = i)"
  />
</template>
```

```ts [Angular]
import { Component, signal } from '@angular/core'
import { FilePreviewModal } from '@eternalheart/angular-file-preview'
import '@eternalheart/angular-file-preview/style.css'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FilePreviewModal],
  template: `
    <button (click)="isOpen.set(true)">预览文件</button>
    <FilePreviewModal
      [isOpen]="isOpen()"
      [files]="files"
      [currentIndex]="currentIndex()"
      (close)="isOpen.set(false)"
      (navigate)="currentIndex.set($event)"
    />
  `,
})
export class App {
  isOpen = signal(false)
  currentIndex = signal(0)
  files = [
    { url: 'https://example.com/image.jpg', name: 'image.jpg' },
    { url: 'https://example.com/document.pdf', name: 'document.pdf' }
  ]
}
```

:::

## 文件对象格式

文件对象支持三种格式：

### URL 字符串

```ts
const files = ['https://example.com/file.pdf']
```

### PreviewFileLink 对象

```ts
const file = {
  name: 'document.pdf',
  url: 'https://example.com/file.pdf',
  type: 'application/pdf'
}
```

### 原生 File 对象

```ts
const file = new File(['content'], 'document.txt', { type: 'text/plain' })
```

## 处理文件上传

::: code-group

```tsx [React]
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

```vue [Vue 3]
<script setup lang="ts">
import { ref } from 'vue'
import { FilePreviewModal, type PreviewFileInput } from '@eternalheart/vue-file-preview'

const files = ref<PreviewFileInput[]>([])
const isOpen = ref(false)

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  files.value = Array.from(target.files || [])
  isOpen.value = true
}
</script>

<template>
  <input type="file" multiple @change="handleFileChange" />
  <FilePreviewModal
    :is-open="isOpen"
    :files="files"
    :current-index="0"
    @close="isOpen = false"
  />
</template>
```

:::

## 嵌入式预览 (FilePreviewEmbed)

除了弹窗,你也可以把预览**直接内联**到页面任意位置,适合详情面板、分栏布局、仪表盘等场景。

::: code-group

```tsx [React]
import { useState } from 'react'
import { FilePreviewEmbed } from '@eternalheart/react-file-preview'
import '@eternalheart/react-file-preview/style.css'

function InlinePreview() {
  const [index, setIndex] = useState(0)

  const files = [
    'https://example.com/image.jpg',
    { name: 'doc.pdf', url: '/doc.pdf', type: 'application/pdf' }
  ]

  // 父容器必须有明确的高度,嵌入组件才能撑开
  return (
    <div style={{ width: '100%', height: 520 }}>
      <FilePreviewEmbed
        files={files}
        currentIndex={index}
        onNavigate={setIndex}
      />
    </div>
  )
}
```

```vue [Vue 3]
<script setup>
import { ref } from 'vue'
import { FilePreviewEmbed } from '@eternalheart/vue-file-preview'
import '@eternalheart/vue-file-preview/style.css'

const index = ref(0)
const files = [
  'https://example.com/image.jpg',
  { name: 'doc.pdf', url: '/doc.pdf', type: 'application/pdf' }
]
</script>

<template>
  <div style="width: 100%; height: 520px">
    <FilePreviewEmbed
      :files="files"
      :current-index="index"
      @navigate="(i) => (index = i)"
    />
  </div>
</template>
```

```ts [Angular]
import { Component, signal } from '@angular/core'
import { FilePreviewEmbed } from '@eternalheart/angular-file-preview'
import '@eternalheart/angular-file-preview/style.css'

@Component({
  selector: 'app-inline-preview',
  standalone: true,
  imports: [FilePreviewEmbed],
  template: `
    <div style="width: 100%; height: 520px">
      <FilePreviewEmbed
        [files]="files"
        [currentIndex]="index()"
        (navigate)="index.set($event)"
      />
    </div>
  `,
})
export class InlinePreview {
  index = signal(0)
  files = [
    'https://example.com/image.jpg',
    { name: 'doc.pdf', url: '/doc.pdf', type: 'application/pdf' }
  ]
}
```

:::

### 显式指定尺寸

除了默认填充父容器,你也可以通过 `width` / `height` props 显式指定:

::: code-group

```tsx [React]
<FilePreviewEmbed files={files} width={800} height={500} />
```

```vue [Vue 3]
<FilePreviewEmbed :files="files" :width="800" :height="500" />
```

```html [Angular]
<FilePreviewEmbed [files]="files" [width]="800" [height]="500" />
```

:::

### 与弹窗模式的主要区别

| 特性 | FilePreviewModal | FilePreviewEmbed |
|------|------------------|------------------|
| 渲染方式 | Portal / Teleport 到 `document.body` | 组件树内联 |
| 遮罩背景 | ✅ 半透明黑色全屏 | ❌ 无 |
| `isOpen` / `onClose` | ✅ 必填 | ❌ 不存在 |
| 工具栏"关闭"按钮 | ✅ 显示 | ❌ 不显示 |
| `Esc` 键关闭 | ✅ | ❌ |
| ← → 键导航 | 全局监听 | 仅容器 focus 时响应,不影响页面其他交互 |

## 自定义渲染器

你可以为特定文件类型提供自定义渲染器：

::: code-group

```tsx [React]
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

```vue [Vue 3]
<script setup lang="ts">
import { defineComponent, h } from 'vue'
import { FilePreviewModal, type CustomRenderer } from '@eternalheart/vue-file-preview'

// 自定义渲染器组件
const CustomRendererComp = defineComponent({
  props: ['file'],
  setup(props) {
    return () => h('div', [
      h('h2', '自定义渲染器'),
      h('p', `文件名: ${props.file.name}`)
    ])
  }
})

const customRenderers: CustomRenderer[] = [
  {
    test: (file) => file.name.endsWith('.custom'),
    render: () => CustomRendererComp
  }
]
</script>

<template>
  <FilePreviewModal
    :is-open="isOpen"
    :files="files"
    :current-index="0"
    :custom-renderers="customRenderers"
    @close="isOpen = false"
  />
</template>
```

:::

## 控制导航

::: code-group

```tsx [React]
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

```vue [Vue 3]
<FilePreviewModal
  :is-open="isOpen"
  :files="files"
  :current-index="currentIndex"
  @close="isOpen = false"
  @navigate="(index) => {
    console.log('切换到文件:', index)
    currentIndex = index
  }"
/>
```

:::

## 渲染机制

### Portal / Teleport 渲染

`FilePreviewModal` 使用 React Portal、Vue Teleport 或 Angular 全屏 overlay 将模态框渲染到视口顶层，这确保了：

- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> **最高层级**: 模态框始终显示在页面最上层，不受父元素 `z-index` 影响
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> **样式隔离**: 避免父元素的 CSS 样式（如 `overflow: hidden`）影响模态框
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> **定位准确**: 模态框相对于视口定位，不受父元素定位影响

这意味着你可以在任何位置使用 `FilePreviewModal`，无需担心层级和定位问题。

## 下一步

- [支持的文件类型](./supported-types) - 查看所有支持的文件格式
- [自定义渲染器](./custom-renderers) - 了解如何创建自定义渲染器
- [主题定制](./theming) - 自定义组件样式
