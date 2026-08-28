# 安装

本库提供 **React**、**Vue 3** 和 **Angular** 三个版本，根据你的项目选择对应的包。

## 环境要求

::: code-group

```text [React]
React >= 18.0.0
React DOM >= 18.0.0
```

```text [Vue 3]
Vue >= 3.4.0
```

```text [Angular]
Angular >= 19.0.0
```

:::

## 包管理器安装

::: code-group

```bash [React · pnpm]
pnpm add @eternalheart/react-file-preview
```

```bash [Vue 3 · pnpm]
pnpm add @eternalheart/vue-file-preview
```

```bash [Angular · pnpm]
pnpm add @eternalheart/angular-file-preview
```

```bash [React · npm]
npm install @eternalheart/react-file-preview
```

```bash [Vue 3 · npm]
npm install @eternalheart/vue-file-preview
```

```bash [Angular · npm]
npm install @eternalheart/angular-file-preview
```

```bash [React · yarn]
yarn add @eternalheart/react-file-preview
```

```bash [Vue 3 · yarn]
yarn add @eternalheart/vue-file-preview
```

```bash [Angular · yarn]
yarn add @eternalheart/angular-file-preview
```

:::

## 导入样式

在你的应用入口文件中导入样式：

::: code-group

```tsx [React]
import '@eternalheart/react-file-preview/style.css'
```

```ts [Vue 3]
import '@eternalheart/vue-file-preview/style.css'
```

```ts [Angular]
import '@eternalheart/angular-file-preview/style.css'
```

:::

## PDF 支持

组件已内置 PDF.js Worker 和文档资源配置，**无需任何额外配置**。

Worker、CMap、标准字体和 WASM 文件会自动从 CDN 加载，确保：
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> 零配置，开箱即用
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> 自动匹配 pdfjs-dist 版本
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> 稳定可靠的加载方式
- <img src="/assets/icons/check.svg" width="18" height="18" style="display:inline;vertical-align:middle" /> 无需手动复制任何文件

::: tip
组件会自动使用 unpkg CDN 加载 PDF.js 资源，无需任何手动配置。生产、离线或受内容安全策略限制的环境建议部署本地资源。
:::

如需使用本地静态资源，请在客户端应用初始化阶段、首次渲染 PDF 前调用配置函数：

::: code-group

```tsx [React]
import { configurePdfjs } from '@eternalheart/react-file-preview'

configurePdfjs({
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
})
```

```ts [Vue 3]
import { configurePdfWorker } from '@eternalheart/vue-file-preview'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

configurePdfWorker(pdfjsLib, {
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
})
```

```ts [Angular]
import { configurePdfWorker } from '@eternalheart/angular-file-preview'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

configurePdfWorker(pdfjsLib, {
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/pdfjs/standard_fonts/',
  wasmUrl: '/pdfjs/wasm/',
})
```

:::

::: warning
`workerSrc` 必须指向与当前 `pdfjs-dist` 版本匹配的 `legacy/build/pdf.worker.min.mjs`。服务端渲染阶段调用配置函数不会生效。
:::

## 验证安装

::: code-group

```tsx [React]
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

```vue [Vue 3]
<script setup>
import { ref } from 'vue'
import { FilePreviewModal } from '@eternalheart/vue-file-preview'
import '@eternalheart/vue-file-preview/style.css'

const isOpen = ref(false)
</script>

<template>
  <div>
    <button @click="isOpen = true">打开预览</button>
    <FilePreviewModal
      :is-open="isOpen"
      :files="[{ url: 'https://via.placeholder.com/800', name: 'test.png' }]"
      :current-index="0"
      @close="isOpen = false"
    />
  </div>
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
    <div>
      <button (click)="isOpen.set(true)">打开预览</button>
      <FilePreviewModal
        [isOpen]="isOpen()"
        [files]="files"
        [currentIndex]="0"
        (close)="isOpen.set(false)"
      />
    </div>
  `,
})
export class App {
  isOpen = signal(false)
  files = [{ url: 'https://via.placeholder.com/800', name: 'test.png' }]
}
```

:::

## 下一步

- [基础用法](./basic-usage) - 学习如何使用组件
- [支持的文件类型](./supported-types) - 查看所有支持的文件格式
