# Vue File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/vue-file-preview.svg)](https://github.com/wh131462/file-preview/blob/master/LICENSE)[![downloads](https://img.shields.io/npm/dm/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)

[English](./README.md) | 简体中文

一个现代化、功能丰富的 Vue 3 文件预览组件,支持图片、视频、音频、PDF、Office 文档(Word、Excel、PowerPoint)、Markdown 和代码文件预览。

## ✨ 特性

- 🎨 **现代化 UI** - Apple 风格的简约设计,毛玻璃效果
- 📁 **多格式支持** - 支持 20+ 种文件格式
- 🪟 **两种展示模式** - 全屏弹窗 **或** 嵌入式内联预览
- 🖼️ **强大的图片查看器** - 缩放、旋转、拖拽、滚轮缩放
- 🎬 **自定义视频播放器** - 基于 Video.js,支持多种视频格式
- 🎵 **自定义音频播放器** - 精美的音频控制界面
- 📄 **PDF 查看器** - 支持分页浏览
- 📊 **Office 文档支持** - Word、Excel、PowerPoint 文件预览
- 📝 **Markdown 渲染** - 支持 GitHub Flavored Markdown
- 💻 **代码高亮** - 支持 40+ 种编程语言
- 📱 **响应式设计** - 适配各种屏幕尺寸
- ⌨️ **键盘导航** - 支持方向键和 ESC 键
- 🎯 **拖拽上传** - 支持拖拽文件上传

## 📦 安装

```bash
# 使用 npm
npm install @eternalheart/vue-file-preview

# 使用 yarn
yarn add @eternalheart/vue-file-preview

# 使用 pnpm
pnpm add @eternalheart/vue-file-preview
```

**重要提示：** 你还需要导入 CSS 文件：

```ts
import '@eternalheart/vue-file-preview/style.css';
```

### PDF.js 配置（可选）

如果你需要预览 PDF 文件，建议配置 PDF.js 使用本地静态文件以提高性能和稳定性：

#### 方式 1: 使用 CDN（默认）

默认情况下，组件会自动使用 unpkg CDN 加载 PDF.js，无需额外配置。

#### 方式 2: 使用本地静态文件（推荐用于生产环境）

1. 将 PDF.js 文件复制到你的 public 目录：

```bash
cp -r node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdfjs/
cp -r node_modules/pdfjs-dist/cmaps public/pdfjs/
```

2. 在应用入口配置 PDF.js：

```ts
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { configurePdfWorker } from '@eternalheart/vue-file-preview';

configurePdfWorker(pdfjsLib, {
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
});
```

#### 使用 Vite 自动复制（推荐）

在 `vite.config.ts` 中配置自动复制：

```ts
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
          dest: 'pdfjs'
        },
        {
          src: 'node_modules/pdfjs-dist/cmaps',
          dest: 'pdfjs'
        }
      ]
    })
  ]
});
```

## 🚀 快速开始

### 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { FilePreviewModal } from '@eternalheart/vue-file-preview';
import '@eternalheart/vue-file-preview/style.css';

const files = ref<File[]>([]);
const currentIndex = ref(0);
const isOpen = ref(false);

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    files.value = [file];
    currentIndex.value = 0;
    isOpen.value = true;
  }
};
</script>

<template>
  <input type="file" @change="handleFileSelect" />

  <FilePreviewModal
    :files="files"
    :current-index="currentIndex"
    :is-open="isOpen"
    @close="isOpen = false"
    @navigate="currentIndex = $event"
  />
</template>
```

### 多种输入类型

组件支持三种类型的文件输入：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { FilePreviewModal, type PreviewFileInput } from '@eternalheart/vue-file-preview';
import '@eternalheart/vue-file-preview/style.css';

const files: PreviewFileInput[] = [
  // 1. 原生 File 对象
  file1,

  // 2. HTTP URL 字符串
  'https://example.com/image.jpg',

  // 3. 带元数据的文件对象
  {
    name: 'document.pdf',
    type: 'application/pdf',
    url: '/path/to/document.pdf',
    size: 1024,
  },
];

const isOpen = ref(true);
</script>

<template>
  <FilePreviewModal
    :files="files"
    :current-index="0"
    :is-open="isOpen"
    @close="isOpen = false"
  />
</template>
```

### 嵌入模式 (`FilePreviewEmbed`)

除了全屏弹窗,组件库还提供了**嵌入式**变体,可以将预览内联渲染到任意容器中,适合详情面板、左右分栏布局、仪表盘等场景。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { FilePreviewEmbed } from '@eternalheart/vue-file-preview';
import '@eternalheart/vue-file-preview/style.css';

const index = ref(0);

const files = [
  'https://example.com/image.jpg',
  { name: 'document.pdf', type: 'application/pdf', url: '/doc.pdf' },
];
</script>

<template>
  <div style="width: 100%; height: 520px">
    <FilePreviewEmbed
      :files="files"
      :current-index="index"
      @navigate="index = $event"
    />
  </div>
</template>
```

与 `FilePreviewModal` 的区别:

- 不使用 Teleport、无全屏遮罩、没有 `isOpen` / `@close`
- **不显示关闭按钮**
- 键盘导航 (←/→) 作用域限定在嵌入容器内 (基于 focus)
- 尺寸默认 `width: 100%; height: 100%`,可通过 `width` / `height` props 覆盖

```vue
<!-- 显式指定尺寸 -->
<FilePreviewEmbed :files="files" :width="800" :height="500" />
```

## 📖 支持的文件格式

### 图片
- **格式**: JPG, PNG, GIF, WebP, SVG, BMP, ICO
- **功能**: 缩放 (0.1x - 10x)、旋转、拖拽、滚轮缩放、双击重置

### 视频
- **格式**: MP4, WebM, OGG, MOV, AVI, MKV, M4V, 3GP, FLV
- **功能**: 自定义播放器、进度控制、音量调节、全屏播放

### 音频
- **格式**: MP3, WAV, OGG, M4A, AAC, FLAC
- **功能**: 自定义播放器、进度条、音量控制、快进/快退

### 文档
- **PDF**: 分页浏览、缩放
- **Word**: DOCX 格式支持
- **Excel**: XLSX 格式支持
- **PowerPoint**: PPTX/PPT 格式支持、幻灯片预览

### 代码 & 文本
- **Markdown**: GitHub Flavored Markdown,代码高亮
- **代码文件**: JS, TS, Python, Java, C++, Go, Rust 等 40+ 种语言
- **文本文件**: TXT, LOG, CSV, JSON, YAML, XML 等

## 🎮 API 参考

### FilePreviewModal Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `files` | `PreviewFileInput[]` | ✅ | 文件列表（支持 File 对象、文件对象或 URL 字符串） |
| `currentIndex` | `number` | ✅ | 当前文件索引 |
| `isOpen` | `boolean` | ✅ | 是否打开预览 |
| `customRenderers` | `CustomRenderer[]` | ❌ | 自定义渲染器 |

### FilePreviewModal 事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `close` | - | 关闭预览时触发 |
| `navigate` | `number` | 导航到其他文件时触发 |

### FilePreviewEmbed Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `files` | `PreviewFileInput[]` | ✅ | - | 文件列表 |
| `currentIndex` | `number` | ❌ | `0` | 当前文件索引 |
| `customRenderers` | `CustomRenderer[]` | ❌ | - | 自定义渲染器 |
| `width` | `number \| string` | ❌ | `'100%'` | 容器宽度 |
| `height` | `number \| string` | ❌ | `'100%'` | 容器高度 |

### FilePreviewEmbed 事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `navigate` | `number` | 导航到其他文件时触发 |

### FilePreviewContent（高级用法）

`FilePreviewModal` 和 `FilePreviewEmbed` 都是基于底层 `FilePreviewContent` 组件的薄包装。当你需要构建完全自定义的容器时,可以直接使用它:

```vue
<FilePreviewContent
  mode="embed"
  :files="files"
  :current-index="index"
  @navigate="index = $event"
/>
```

### 文件类型定义

```typescript
// 支持三种文件输入类型
type PreviewFileInput = File | PreviewFileLink | string;

// 1. 原生 File 对象（浏览器 File API）
const file: File = ...;

// 2. 文件对象
interface PreviewFileLink {
  id?: string;       // 可选的唯一标识符
  name: string;      // 文件名
  type: string;      // MIME 类型
  url: string;       // 文件 URL (支持 blob URL 和 HTTP URL)
  size?: number;     // 文件大小（字节）
}

// 3. HTTP URL 字符串
const url: string = 'https://example.com/file.pdf';
```

## ⌨️ 键盘快捷键

- `ESC` - 关闭预览
- `←` - 上一个文件
- `→` - 下一个文件
- `滚轮` - 缩放图片 (仅图片预览)

## 📚 文档

- [完整文档](https://wh131462.github.io/file-preview/docs/)
- [Vue 在线演示](https://wh131462.github.io/file-preview/vue/)
- [React 在线演示](https://wh131462.github.io/file-preview/)

## 📦 包信息

### Peer Dependencies

- `vue`: ^3.4.0

### 导出

```json
{
  ".": {
    "types": "./lib/index.d.ts",
    "import": "./lib/index.mjs",
    "require": "./lib/index.cjs"
  },
  "./style.css": "./lib/index.css"
}
```

## 🛠️ 开发

```bash
# 克隆仓库
git clone https://github.com/wh131462/file-preview.git

# 安装依赖
pnpm install

# 启动开发服务器（Vue 演示应用）
pnpm dev:vue-example

# 构建库
pnpm build:vue
```

## 📄 许可证

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 🔗 相关链接

- [GitHub](https://github.com/wh131462/file-preview)
- [npm](https://www.npmjs.com/package/@eternalheart/vue-file-preview)
- [Vue 在线演示](https://wh131462.github.io/file-preview/vue/)
- [问题反馈](https://github.com/wh131462/file-preview/issues)
