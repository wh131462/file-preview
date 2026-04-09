---
layout: home

hero:
  name: File Preview
  text: 现代化的文件预览组件
  tagline: 同时支持 React 与 Vue 3 · 图片、视频、音频、PDF、Office 文档、Markdown 和代码文件
  image:
    src: /icon.svg
    alt: File Preview
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: React 在线示例
      link: https://wh131462.github.io/file-preview/
    - theme: alt
      text: Vue 在线示例
      link: https://wh131462.github.io/file-preview/vue/
    - theme: alt
      text: GitHub
      link: https://github.com/wh131462/file-preview

features:
  - icon:
      src: /assets/icons/picture.svg
      width: 48
      height: 48
    title: 多格式支持
    details: 支持图片、视频、音频、PDF、Word、Excel、PowerPoint、Markdown 和代码文件等多种格式
  - icon:
      src: /assets/icons/lightning.svg
      width: 48
      height: 48
    title: React + Vue 双框架
    details: 提供功能完全对等的 React 和 Vue 3 两个版本，共享底层 core 包
  - icon:
      src: /assets/icons/palette.svg
      width: 48
      height: 48
    title: 可定制
    details: 支持自定义渲染器和主题，轻松适配你的应用风格
  - icon:
      src: /assets/icons/mobile.svg
      width: 48
      height: 48
    title: 响应式设计
    details: 完美适配桌面和移动设备，提供一致的用户体验
  - icon:
      src: /assets/icons/wrench.svg
      width: 48
      height: 48
    title: 弹窗 & 嵌入双模式
    details: 既可以全屏弹窗展示,也可以嵌入到任意 div 容器中内联预览,灵活适配不同场景
  - icon:
      src: /assets/icons/package.svg
      width: 48
      height: 48
    title: TypeScript 支持
    details: 完整的 TypeScript 类型定义，提供更好的开发体验
---

## 快速开始

### 安装

::: code-group

```bash [React · pnpm]
pnpm add @eternalheart/react-file-preview
```

```bash [Vue 3 · pnpm]
pnpm add @eternalheart/vue-file-preview
```

```bash [React · npm]
npm install @eternalheart/react-file-preview
```

```bash [Vue 3 · npm]
npm install @eternalheart/vue-file-preview
```

:::

### 基础用法

使用 **弹窗模式** (`FilePreviewModal`):

::: code-group

```tsx [React]
import { useState } from 'react'
import { FilePreviewModal } from '@eternalheart/react-file-preview'
import '@eternalheart/react-file-preview/style.css'

function App() {
  const [isOpen, setIsOpen] = useState(false)
  const files = [
    { url: 'https://example.com/document.pdf', name: 'document.pdf' }
  ]

  return (
    <>
      <button onClick={() => setIsOpen(true)}>预览文件</button>
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
<script setup>
import { ref } from 'vue'
import { FilePreviewModal } from '@eternalheart/vue-file-preview'
import '@eternalheart/vue-file-preview/style.css'

const isOpen = ref(false)
const files = [
  { url: 'https://example.com/document.pdf', name: 'document.pdf' }
]
</script>

<template>
  <button @click="isOpen = true">预览文件</button>
  <FilePreviewModal
    :is-open="isOpen"
    :files="files"
    :current-index="0"
    @close="isOpen = false"
  />
</template>
```

:::

使用 **嵌入模式** (`FilePreviewEmbed`) — 将预览直接内联到页面任意容器:

::: code-group

```tsx [React]
import { FilePreviewEmbed } from '@eternalheart/react-file-preview'
import '@eternalheart/react-file-preview/style.css'

function Detail() {
  const files = [
    { url: 'https://example.com/document.pdf', name: 'document.pdf' }
  ]

  return (
    <div style={{ width: '100%', height: 520 }}>
      <FilePreviewEmbed files={files} />
    </div>
  )
}
```

```vue [Vue 3]
<script setup>
import { FilePreviewEmbed } from '@eternalheart/vue-file-preview'
import '@eternalheart/vue-file-preview/style.css'

const files = [
  { url: 'https://example.com/document.pdf', name: 'document.pdf' }
]
</script>

<template>
  <div style="width: 100%; height: 520px">
    <FilePreviewEmbed :files="files" />
  </div>
</template>
```

:::

## 支持的文件类型

- **图片**: JPG, PNG, GIF, WebP, SVG, BMP, ICO
- **视频**: MP4, WebM, OGG, MOV, AVI, MKV, M4V, 3GP, FLV
- **音频**: MP3, WAV, OGG, M4A, AAC, FLAC
- **文档**: PDF, Word (DOCX), Excel (XLSX), PowerPoint (PPT/PPTX), Outlook (MSG)
- **文本**: Markdown, 代码文件 (支持语法高亮)

## 包架构

```
@eternalheart/file-preview-core    # 框架无关的核心工具（types/工具函数/PDF 配置）
       │
       ├── @eternalheart/react-file-preview   # React 18+ 版本
       └── @eternalheart/vue-file-preview     # Vue 3 版本
```

两个 UI 包共享同一份纯 TS 工具与类型定义，行为完全对齐，可按需选择适合你项目的版本。

## 许可证

[MIT License](https://github.com/wh131462/file-preview/blob/main/LICENSE)
