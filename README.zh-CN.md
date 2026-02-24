# React File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/react-file-preview.svg)](https://github.com/wh131462/react-file-preview/blob/master/LICENSE)[![downloads](https://img.shields.io/npm/dm/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)

[English](./README.md) | 简体中文

一个现代化、功能丰富的 React 文件预览组件,支持图片、视频、音频、PDF、Office 文档(Word、Excel、PowerPoint)、Markdown 和代码文件预览。

## 📚 文档

- 📖 [完整文档](https://wh131462.github.io/react-file-preview/docs/)
- 🎮 [在线演示](https://wh131462.github.io/react-file-preview/)

## 🏗️ Monorepo 结构

本项目使用 pnpm workspaces 组织为 monorepo：

- **packages/react-file-preview** - 核心库（发布到 npm）
- **packages/example** - 演示应用（部署到 GitHub Pages）
- **packages/docs** - VitePress 文档站点（部署到 GitHub Pages）

### 开发命令

```bash
# 安装依赖
pnpm install

# 开发
pnpm dev              # 启动示例开发服务器
pnpm dev:docs         # 启动文档开发服务器

# 构建
pnpm build            # 构建所有包
pnpm build:lib        # 仅构建库
pnpm build:example    # 仅构建示例
pnpm build:docs       # 仅构建文档

# 预览
pnpm preview:example  # 预览示例构建
pnpm preview:docs     # 预览文档构建

# 部署
pnpm deploy           # 部署示例和文档到 GitHub Pages

# 发布
pnpm pub              # 发布库到 npm
```

## ✨ 特性

- 🎨 **现代化 UI** - Apple 风格的简约设计,毛玻璃效果
- 📁 **多格式支持** - 支持 20+ 种文件格式
- 🖼️ **强大的图片查看器** - 缩放、旋转、拖拽、滚轮缩放
- 🎬 **自定义视频播放器** - 基于 Video.js,支持多种视频格式
- 🎵 **自定义音频播放器** - 精美的音频控制界面
- 📄 **PDF 查看器** - 支持分页浏览
- 📊 **Office 文档支持** - Word、Excel、PowerPoint 文件预览
- 📝 **Markdown 渲染** - 支持 GitHub Flavored Markdown
- 💻 **代码高亮** - 支持 40+ 种编程语言
- 🎭 **流畅动画** - 基于 Framer Motion
- 📱 **响应式设计** - 适配各种屏幕尺寸
- ⌨️ **键盘导航** - 支持方向键和 ESC 键
- 🎯 **拖拽上传** - 支持拖拽文件上传

## 📦 安装

```bash
# 使用 npm
npm install react-file-preview

# 使用 yarn
yarn add react-file-preview

# 使用 pnpm
pnpm add react-file-preview
```

**重要提示：** 你还需要导入 CSS 文件：

```tsx
import 'react-file-preview/style.css';
```

## 🚀 快速开始

📖 **第一次使用？** 查看 [快速开始指南](./QUICK_START.md) 获取 5 分钟入门教程！

### 基础用法

```tsx
import { FilePreviewModal } from 'react-file-preview';
import 'react-file-preview/style.css';
import { useState } from 'react';

function App() {
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleFileSelect = (file: File) => {
    // 方法 1: 直接传入 File 对象（推荐）
    setFiles([file]);
    setCurrentIndex(0);
    setIsOpen(true);
  };

  return (
    <>
      <input
        type="file"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
      />

      <FilePreviewModal
        files={files}
        currentIndex={currentIndex}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNavigate={setCurrentIndex}
      />
    </>
  );
}
```

### 多种输入类型

组件支持三种类型的文件输入：

```tsx
import { FilePreviewModal, PreviewFileInput } from '@eternalheart/react-file-preview';
import '@eternalheart/react-file-preview/style.css';

function App() {
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

  return (
    <FilePreviewModal
      files={files}
      currentIndex={0}
      isOpen={true}
      onClose={() => {}}
    />
  );
}
```

## 💡 使用示例

### 预览 PowerPoint 文件

```tsx
import { FilePreviewModal } from '@eternalheart/react-file-preview';
import { useState } from 'react';

function PptPreview() {
  const [isOpen, setIsOpen] = useState(false);

  const pptFile = {
    name: 'presentation.pptx',
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    url: '/path/to/your/presentation.pptx',
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        预览 PPT
      </button>

      <FilePreviewModal
        files={[pptFile]}
        currentIndex={0}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

### 预览多个文件

```tsx
const files = [
  { name: 'image.jpg', type: 'image/jpeg', url: '/path/to/image.jpg' },
  { name: 'document.pdf', type: 'application/pdf', url: '/path/to/document.pdf' },
  { name: 'presentation.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', url: '/path/to/presentation.pptx' },
  { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', url: '/path/to/spreadsheet.xlsx' },
];

<FilePreviewModal
  files={files}
  currentIndex={0}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onNavigate={setCurrentIndex}
/>
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
| `onClose` | `() => void` | ✅ | 关闭回调 |
| `onNavigate` | `(index: number) => void` | ❌ | 导航回调 |

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

### 使用示例

```typescript
// 方式 1: 使用原生 File 对象
const files = [file1, file2]; // File 对象数组

// 方式 2: 使用 HTTP URL 字符串
const files = [
  'https://example.com/image.jpg',
  'https://example.com/document.pdf',
];

// 方式 3: 使用文件对象
const files = [
  {
    name: 'presentation.pptx',
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    url: '/path/to/presentation.pptx',
  },
];

// 方式 4: 混合使用
const files = [
  file1,  // File 对象
  'https://example.com/image.jpg',  // URL 字符串
  { name: 'doc.pdf', type: 'application/pdf', url: '/doc.pdf' },  // 文件对象
];
```

### 支持的 MIME 类型

#### Office 文档
- **Word**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- **Excel**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)
- **PowerPoint**: `application/vnd.openxmlformats-officedocument.presentationml.presentation` (.pptx)
- **PowerPoint (旧版)**: `application/vnd.ms-powerpoint` (.ppt)

#### 其他文档
- **PDF**: `application/pdf`

#### 媒体文件
- **图片**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, 等
- **视频**: `video/mp4`, `video/webm`, `video/ogg`, 等
- **音频**: `audio/mpeg`, `audio/wav`, `audio/ogg`, 等

#### 文本文件
- **Markdown**: 文件扩展名 `.md` 或 `.markdown`
- **代码**: 根据文件扩展名自动识别 (`.js`, `.ts`, `.py`, `.java`, 等)
- **纯文本**: `text/plain`, `text/csv`, 等

## 🎨 自定义样式

组件使用 Tailwind CSS 构建,您可以通过覆盖 CSS 变量来自定义样式:

```css
/* 自定义主题色 */
:root {
  --primary-color: #8b5cf6;
  --secondary-color: #ec4899;
}
```

## ⌨️ 键盘快捷键

- `ESC` - 关闭预览
- `←` - 上一个文件
- `→` - 下一个文件
- `滚轮` - 缩放图片 (仅图片预览)

## 📚 文档

- [在线演示](https://wh131462.github.io/react-file-preview) - 在线 Demo

## 📦 包信息

### 打包体积

- **ESM**: ~54 KB (gzipped: ~12 KB)
- **CJS**: ~37 KB (gzipped: ~11 KB)
- **CSS**: ~56 KB (gzipped: ~14 KB)

### Peer Dependencies

- `react`: ^18.0.0
- `react-dom`: ^18.0.0

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

### 库开发

```bash
# 克隆仓库
git clone https://github.com/wh131462/react-file-preview.git

# 安装依赖
pnpm install

# 启动开发服务器（演示应用）
pnpm dev

# 构建库（用于 npm 发布）
pnpm build:lib

# 构建演示应用（用于 GitHub Pages）
pnpm build:demo
```

### 项目结构

```
react-file-preview/
├── src/
│   ├── index.ts              # 库入口文件
│   ├── FilePreviewModal.tsx  # 主组件
│   ├── types.ts              # 类型定义
│   ├── utils/                # 工具函数
│   ├── renderers/            # 文件类型渲染器
│   ├── App.tsx               # 演示应用
│   └── main.tsx              # 演示应用入口
├── lib/                      # 构建后的库（npm 包）
├── dist/                     # 构建后的演示应用（GitHub Pages）
└── vite.config.lib.ts        # 库构建配置
```

## 📄 许可证

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 🔗 相关链接

- [GitHub](https://github.com/wh131462/react-file-preview)
- [npm](https://www.npmjs.com/package/@eternalheart/react-file-preview)
- [在线演示](https://wh131462.github.io/react-file-preview)
- [问题反馈](https://github.com/wh131462/react-file-preview/issues)

