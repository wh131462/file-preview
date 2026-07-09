# React File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/react-file-preview.svg)](https://github.com/wh131462/file-preview/blob/master/LICENSE)[![downloads](https://img.shields.io/npm/dm/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)

[English](./README.md) | 简体中文

一个现代化、功能丰富的 React 文件预览组件,支持图片、视频、音频、PDF、Office 文档(Word、Excel、PowerPoint)、Markdown 和代码文件预览。

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2728.svg" width="20" height="20" alt="✨" /> 特性

<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a8.svg" width="16" height="16" alt="🎨" style="vertical-align: middle;" /> **现代化 UI** - 简洁现代的界面设计，流畅动画
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c1.svg" width="16" height="16" alt="📁" style="vertical-align: middle;" /> **多格式支持** - 支持 20+ 种文件格式
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1fa9f.svg" width="16" height="16" alt="🪟" style="vertical-align: middle;" /> **两种展示模式** - 全屏弹窗 **或** 嵌入式内联预览
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f5bc.svg" width="16" height="16" alt="🖼️" style="vertical-align: middle;" /> **强大的图片查看器** - 缩放、旋转、拖拽、滚轮缩放
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" width="16" height="16" alt="🎬" style="vertical-align: middle;" /> **自定义视频播放器** - 基于 Video.js,支持多种视频格式
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b5.svg" width="16" height="16" alt="🎵" style="vertical-align: middle;" /> **自定义音频播放器** - 精美的音频控制界面
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c4.svg" width="16" height="16" alt="📄" style="vertical-align: middle;" /> **PDF 查看器** - 支持分页浏览
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4ca.svg" width="16" height="16" alt="📊" style="vertical-align: middle;" /> **Office 文档支持** - Word、Excel、PowerPoint 文件预览
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4dd.svg" width="16" height="16" alt="📝" style="vertical-align: middle;" /> **Markdown 渲染** - 支持 GitHub Flavored Markdown
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4bb.svg" width="16" height="16" alt="💻" style="vertical-align: middle;" /> **代码高亮** - 支持 40+ 种编程语言
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ad.svg" width="16" height="16" alt="🎭" style="vertical-align: middle;" /> **流畅动画** - 基于 Framer Motion
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4f1.svg" width="16" height="16" alt="📱" style="vertical-align: middle;" /> **响应式设计** - 适配各种屏幕尺寸
<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="16" height="16" alt="⌨️" style="vertical-align: middle;" /> **键盘导航** - 支持方向键和 ESC 键

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e6.svg" width="20" height="20" alt="📦" /> 安装

```bash
# 使用 npm
npm install @eternalheart/react-file-preview

# 使用 yarn
yarn add @eternalheart/react-file-preview

# 使用 pnpm
pnpm add @eternalheart/react-file-preview
```

**重要提示：** 你还需要导入 CSS 文件：

```tsx
import '@eternalheart/react-file-preview/style.css';
```

> **说明：** PDF 预览所需的 `pdfjs-dist` 依赖会自动安装，无需额外操作。

### PDF.js 配置（可选）

如果你需要预览 PDF 文件，建议配置 PDF.js 使用本地静态文件以提高性能和稳定性：

#### 方式 1: 使用 CDN（默认）

默认情况下，组件会自动使用 unpkg CDN 加载 PDF.js，无需额外配置。

#### 方式 2: 使用本地静态文件（推荐用于生产环境）

1. 将 PDF.js 文件复制到你的 public 目录：

```bash
# 从 node_modules 复制 PDF.js 文件到 public 目录
cp -r node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdfjs/
cp -r node_modules/pdfjs-dist/cmaps public/pdfjs/
```

2. 在应用入口配置 PDF.js：

```tsx
import { configurePdfjs } from '@eternalheart/react-file-preview';

// 配置使用本地静态文件
configurePdfjs({
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true
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

然后在应用入口配置：

```tsx
import { configurePdfjs } from '@eternalheart/react-file-preview';

configurePdfjs({
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true
});
```

### Vite 打包提示（AVIF 解码器）

如果你的项目使用 Vite 打包,且项目里安装了 `@jsquash/avif`(直接安装或被其它依赖间接引入),生产构建时可能报错:

```
[commonjs--resolver] Invalid value "iife" for option "worker.format"
- UMD and IIFE output formats are not supported for code-splitting builds.
file: .../@jsquash/avif/codec/enc/avif_enc_mt.js
```

原因:`@jsquash/avif` 内部包含一个使用代码分割的多线程 worker,而 Vite 默认的 `worker.format` 是 `'iife'`,不支持多 chunk 拆分。

**解决方法** —— 在你的 `vite.config.ts` 中加入:

```ts
export default defineConfig({
  // ... 原有配置
  worker: {
    format: 'es',
  },
});
```

`'es'` 会产生 module worker(`type: 'module'`),现代浏览器全部支持,且兼容代码分割。

> 说明:`@jsquash/avif` 仅在浏览器不原生支持 AVIF 时作为兜底使用(Chrome 85+、Firefox 93+、Safari 16+ 均已原生支持)。如果你的目标浏览器都覆盖原生支持范围,也可以直接从依赖中移除 `@jsquash/avif`。

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f680.svg" width="20" height="20" alt="🚀" /> 快速开始

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
  // 假设 file1 来自 File API：<input type="file">、拖拽、
  // 剪贴板粘贴,或 fetch().then(r => r.blob())
  const file1 = new File(['content'], 'example.txt', { type: 'text/plain' });

  const files: PreviewFileInput[] = [
    // 1. 原生 File 对象（组件卸载时自动释放）
    file1,

    // 2. HTTP URL 字符串（按需加载）
    'https://example.com/image.jpg',

    // 3. 带元数据的文件对象（推荐用于远程资源）
    {
      name: 'document.pdf',
      type: 'application/pdf',
      url: '/path/to/document.pdf',
      size: 1024,
    },
  ];

  // 内存提示: 如果你通过 URL.createObjectURL() 生成 URL,
  // 文件移除时请调用 URL.revokeObjectURL() 避免内存泄漏。

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

### 嵌入模式 (`FilePreviewEmbed`)

除了全屏弹窗,组件库还提供了**嵌入式**变体,可以将预览内联渲染到任意 div 容器中,适合详情面板、左右分栏布局、仪表盘等场景。

```tsx
import { FilePreviewEmbed } from '@eternalheart/react-file-preview';
import '@eternalheart/react-file-preview/style.css';
import { useState } from 'react';

function InlinePreview() {
  const [index, setIndex] = useState(0);

  const files = [
    'https://example.com/image.jpg',
    { name: 'document.pdf', type: 'application/pdf', url: '/doc.pdf' },
  ];

  return (
    // 嵌入式预览默认填充父容器
    <div style={{ width: '100%', height: 520 }}>
      <FilePreviewEmbed
        files={files}
        currentIndex={index}
        onNavigate={setIndex}
      />
    </div>
  );
}
```

与 `FilePreviewModal` 的区别:

- 不使用 Portal、无全屏遮罩、没有 `isOpen` / `onClose`
- **不显示关闭按钮**
- 键盘导航 (←/→) 作用域限定在嵌入容器内 (基于 focus)
- 尺寸默认 `width: 100%; height: 100%`,可通过 `width` / `height` props 覆盖

```tsx
// 显式指定尺寸
<FilePreviewEmbed files={files} width={800} height={500} />
```

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4a1.svg" width="20" height="20" alt="💡" /> 使用示例

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

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4d6.svg" width="20" height="20" alt="📖" /> 支持的文件格式

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

### 字体
- **格式**: TTF, OTF, WOFF, WOFF2
- **功能**: 字体元数据（字体家族、设计师、版本）、字符集预览、自定义文本输入、多字号展示

### CAD / 3D 模型
- **格式**: DXF, STL, OBJ, GLTF, GLB
- **功能**: 交互式 3D 查看器（旋转/缩放/平移）、线框/实体切换、网格与坐标轴显示、自动居中

### 代码 & 文本
- **Markdown**: GitHub Flavored Markdown,代码高亮
- **代码文件**: JS, TS, Python, Java, C++, Go, Rust 等 40+ 种语言
- **配置 / 日志**: YAML, TOML, INI, ENV, LOG, DIFF, PATCH 等

### 结构化数据
- **JSON**: 自动格式化 + 语法高亮
- **CSV / TSV**: 零依赖解析,表格视图 + 行列统计
- **XML**: `DOMParser` 校验 + 自动缩进 + 语法高亮

### 字幕 / 歌词
- **SRT / WebVTT**: 零依赖解析,结构化 cue 列表(索引、时间区间、文本)
- **LRC / Enhanced LRC**: 歌词文件,`[mm:ss.xx]` 行时间戳(ELRC 额外支持行内 `<mm:ss.xx>` 逐字时间戳),自动解析 `[ti:][ar:][al:]` 等元数据
- **ASS / SSA**: Advanced SubStation Alpha,提取 Dialogue 事件,自动剥离 `\N` `\h` 与 `{...}` 样式覆盖码,展示 Style 标签
- **TTML / DFXP**: W3C / Apple Music 使用的 XML 字幕,支持 `begin` / `end` / `dur` 与 `<br/>`

### 压缩包
- **ZIP**: 树形目录 + 内嵌预览文本/代码/图片,其他类型可下载导出

### Outlook 邮件
- **MSG**: 邮件头、正文、附件列表

### 电子书
- **EPUB**: 章节导航、翻页

## ⚠️ 功能限制与性能说明

### 支持等级

**✅ 完全支持（生产可用）**
- 图片（JPG, PNG, GIF, WebP, SVG, BMP, ICO）
- 视频（MP4, WebM, OGG）
- 音频（MP3, WAV, OGG）
- PDF
- Markdown
- 代码文件（通过 Shiki 支持 40+ 种语言，按需加载）
- JSON, CSV, XML

**⚠️ 部分支持（仅供预览）**
- **Office（DOCX, XLSX, PPTX）**: 基础布局和文本渲染。复杂格式（图表、宏、嵌入对象）可能无法准确渲染。
- **ZIP**: 目录树浏览 + 文本/代码/图片内联预览。大型压缩包（>100MB）可能导致性能问题。
- **字体（TTF, OTF, WOFF）**: 元数据 + 字符预览。不支持完整字体特性测试。

**🧪 实验性支持**
- **MSG（Outlook 邮件）**: 邮件头和纯文本正文。复杂 HTML 正文可能无法正确渲染。
- **EPUB**: 基础章节导航。CSS 样式可能与原生阅读器有差异。不支持 DRM 保护文件。
- **字幕格式（SRT, ASS, TTML, LRC）**: 仅文本显示。不支持视频同步或高级样式。

### 性能边界

| 文件大小 | 状态 | 说明 |
|---------|------|------|
| < 50MB | ✅ 推荐 | 流畅的预览体验 |
| 50-100MB | ⚠️ 可能卡顿 | 加载时 UI 可能无响应 |
| > 100MB | ❌ 不推荐 | 可能超出浏览器内存限制 |

**特殊情况：**
- **ZIP 压缩包**: 性能取决于文件数量，而非仅体积
- **Office 文档**: 复杂文件（>200 页、大量图片）可能超时
- **代码高亮**: >5MB 的文件可能需要 3-5 秒高亮时间

### 浏览器兼容性

**最低要求：**
- Chrome 90+ / Edge 90+
- Firefox 88+
- Safari 14+

**已知限制：**
- **Safari iOS**: 视频自动播放需要用户交互
- **Firefox**: AVIF 支持需要 Firefox 93+（已包含降级解码器）
- **Office 格式**: 不同浏览器渲染质量有差异
- **EPUB**: 旧版浏览器可能不支持某些 CSS 特性

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ae.svg" width="20" height="20" alt="🎮" /> API 参考

### FilePreviewModal Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `files` | `PreviewFileInput[]` | ✅ | 文件列表（支持 File 对象、文件对象或 URL 字符串） |
| `currentIndex` | `number` | ✅ | 当前文件索引 |
| `isOpen` | `boolean` | ✅ | 是否打开预览 |
| `onClose` | `() => void` | ✅ | 关闭回调 |
| `onNavigate` | `(index: number) => void` | ❌ | 导航回调 |
| `customRenderers` | `CustomRenderer[]` | ❌ | 自定义渲染器 |
| `locale` | `Locale` | ❌ | 界面语言（默认 `'zh-CN'`，内置 `'en-US'`） |
| `messages` | `Partial<Record<Locale, Partial<Messages>>>` | ❌ | 自定义翻译覆盖 |
| `headless` | `boolean` | ❌ | 无头模式，隐藏工具栏和导航箭头 |
| `theme` | `Theme` | ❌ | 主题模式: `'auto' \| 'dark' \| 'light'`（默认 `'dark'`） |
| `showDownload` | `boolean` | ❌ | 是否显示下载按钮（默认 `true`） |
| `showClose` | `boolean` | ❌ | 是否显示关闭按钮（modal 模式默认 `true`） |

### FilePreviewEmbed Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `files` | `PreviewFileInput[]` | ✅ | - | 文件列表 |
| `currentIndex` | `number` | ❌ | `0` | 当前文件索引 |
| `onNavigate` | `(index: number) => void` | ❌ | - | 导航回调 |
| `customRenderers` | `CustomRenderer[]` | ❌ | - | 自定义渲染器 |
| `width` | `number \| string` | ❌ | `'100%'` | 容器宽度 |
| `height` | `number \| string` | ❌ | `'100%'` | 容器高度 |
| `className` | `string` | ❌ | - | 根节点额外 className |
| `style` | `CSSProperties` | ❌ | - | 根节点额外内联样式 |
| `locale` | `Locale` | ❌ | `'zh-CN'` | 界面语言（`'zh-CN'` 或 `'en-US'`） |
| `messages` | `Partial<Record<Locale, Partial<Messages>>>` | ❌ | - | 自定义翻译覆盖 |
| `headless` | `boolean` | ❌ | `false` | 无头模式，隐藏工具栏和导航箭头 |
| `theme` | `Theme` | ❌ | `'dark'` | 主题模式: `'auto' \| 'dark' \| 'light'` |
| `showDownload` | `boolean` | ❌ | `true` | 是否显示下载按钮 |
| `showClose` | `boolean` | ❌ | `false` | 是否显示关闭按钮（embed 模式默认 `false`） |

> `FilePreviewEmbed` 没有 `isOpen` / `onClose`,若要显示/隐藏,请在父组件中条件渲染。关闭按钮默认隐藏，但可通过 `showClose` 启用。

### FilePreviewContent（高级用法）

`FilePreviewModal` 和 `FilePreviewEmbed` 都是基于底层 `FilePreviewContent` 组件的薄包装。当你需要构建完全自定义的容器时,可以直接使用它:

```tsx
import { FilePreviewContent } from '@eternalheart/react-file-preview';

<FilePreviewContent
  mode="embed"       // 或 "modal"
  files={files}
  currentIndex={index}
  onNavigate={setIndex}
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

#### 字体
- **TrueType**: `application/x-font-ttf`, `font/ttf` (.ttf)
- **OpenType**: `application/x-font-otf`, `font/otf` (.otf)
- **WOFF**: `application/font-woff`, `font/woff` (.woff)
- **WOFF2**: `application/font-woff2`, `font/woff2` (.woff2)

#### CAD / 3D 模型
- **DXF**: `application/dxf` (.dxf)
- **STL**: `model/stl`, `application/vnd.ms-pki.stl` (.stl)
- **OBJ**: `model/obj` (.obj)
- **GLTF**: `model/gltf+json` (.gltf)
- **GLB**: `model/gltf-binary` (.glb)

#### 媒体文件
- **图片**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, 等
- **视频**: `video/mp4`, `video/webm`, `video/ogg`, 等
- **音频**: `audio/mpeg`, `audio/wav`, `audio/ogg`, 等

#### 文本文件
- **Markdown**: 文件扩展名 `.md` 或 `.markdown`
- **代码**: 根据文件扩展名自动识别 (`.js`, `.ts`, `.py`, `.java`, 等)
- **配置 / 日志**: `.yaml`, `.yml`, `.toml`, `.ini`, `.conf`, `.env`, `.log`, `.diff`, `.patch`
- **纯文本**: `text/plain`

#### 结构化数据
- **JSON**: `application/json` (.json)
- **CSV / TSV**: `text/csv` (.csv), `text/tab-separated-values` (.tsv)
- **XML**: `application/xml`, `text/xml` (.xml)

#### 字幕 / 歌词
- **SRT**: `application/x-subrip` (.srt)
- **WebVTT**: `text/vtt` (.vtt)
- **LRC**: (.lrc)
- **Enhanced LRC**: (.elrc)
- **ASS / SSA**: (.ass, .ssa)
- **TTML / DFXP**: `application/ttml+xml` (.ttml, .dfxp)

#### 压缩包
- **ZIP**: `application/zip`, `application/x-zip-compressed` (.zip)

#### Outlook 邮件
- **MSG**: `application/vnd.ms-outlook` (.msg)

#### 电子书
- **EPUB**: `application/epub+zip` (.epub)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f310.svg" width="20" height="20" alt="🌐" /> 国际化（i18n）

内置中文（默认）和英文，零外部依赖。

```tsx
// 切换为英文
<FilePreviewModal files={files} locale="en-US" ... />

// 自定义覆盖某些翻译
<FilePreviewModal
  files={files}
  locale="en-US"
  messages={{ 'en-US': { 'toolbar.zoom_in': 'Zoom ++' } }}
/>
```

在自定义渲染器中可通过 `useTranslator()` hook 获取翻译函数。

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f9e9.svg" width="20" height="20" alt="🧩" /> 自定义渲染器

本库支持自定义渲染器以处理内置不支持的文件类型。自定义渲染器可以可选地提供工具栏配置并集成到本库的架构中。

### 事件驱动的工具栏更新

自定义渲染器可以通过事件驱动机制实现实时工具栏更新：

**优势：**
- **实时更新**：工具栏立即反映状态变化
- **更好的性能**：无轮询开销或不必要的重新渲染
- **类型安全**：完整的 TypeScript 接口支持

**实现方式：**

```tsx
import { forwardRef, useImperativeHandle, useState, useEffect, useMemo, useCallback } from 'react';
import { ToolbarEventEmitter } from '@eternalheart/react-file-preview';
import type { RendererHandle, ToolbarGroup } from '@eternalheart/react-file-preview';

interface CustomRendererProps {
  url: string;
  onPageChange?: (current: number, total: number) => void;
}

export const CustomRenderer = forwardRef<RendererHandle, CustomRendererProps>((props, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(10);
  const emitter = useMemo(() => new ToolbarEventEmitter(), []);
  
  // 状态变化时通知工具栏
  useEffect(() => {
    emitter.notify();
    props.onPageChange?.(currentPage, totalPages);
  }, [currentPage, totalPages, emitter, props]);
  
  const getToolbarGroups = useCallback((): ToolbarGroup[] => [
    {
      items: [
        {
          type: 'button',
          icon: <ChevronLeft className="w-4 h-4" />,
          tooltip: '上一页',
          action: () => setCurrentPage(p => Math.max(1, p - 1)),
          disabled: currentPage <= 1
        },
        {
          type: 'text',
          content: `${currentPage} / ${totalPages}`,
          minWidth: '4rem'
        },
        {
          type: 'button',
          icon: <ChevronRight className="w-4 h-4" />,
          tooltip: '下一页',
          action: () => setCurrentPage(p => Math.min(totalPages, p + 1)),
          disabled: currentPage >= totalPages
        }
      ]
    }
  ], [currentPage, totalPages]);
  
  useImperativeHandle(ref, () => ({
    getToolbarGroups,
    onToolbarChange: (listener) => emitter.subscribe(listener)
  }), [getToolbarGroups, emitter]);
  
  return <div>你的自定义渲染器 UI</div>;
});
```

**主组件使用：**

```tsx
import { CustomRenderer } from './CustomRenderer';

<FilePreviewModal
  files={files}
  customRenderers={[
    {
      test: (file) => file.type === 'application/custom',
      component: CustomRenderer
    }
  ]}
/>
```

主组件会自动检测 `onToolbarChange` 并订阅事件。如果未实现，则回退到轮询以保持向后兼容。

### Renderer 懒加载

所有内置渲染器通过 `React.lazy` 实现代码分割，以最小化主包体积并提升初始加载性能。

**架构：**

- **注册**：渲染器在 `src/renderers/lazy.tsx` 中注册，使用 named export 并通过 `React.lazy` 包装
- **加载**：每个渲染器是独立的 chunk，按需加载
- **回退**：`<Suspense>` 配合 `<RendererLoading />` 处理加载状态

**打包体积影响：**

- 主入口：gzip ≤ 80 KB（CI 强制约束）
- 每个渲染器：独立异步 chunk
- 整个库：gzip ≤ 800 KB（所有渲染器合计）

**实现示例：**

```tsx
// src/renderers/lazy.tsx
import { lazy } from 'react';
import type { CustomRenderer as CustomRendererImpl } from './Custom';

export const CustomRenderer: Lazy<typeof CustomRendererImpl> = lazy(() =>
  import('./Custom').then((m) => ({ default: m.CustomRenderer }))
);
```

```tsx
// src/FilePreviewContent.tsx
import { CustomRenderer } from './renderers/lazy';  // ✅ 懒加载导入
// 禁止: import { CustomRenderer } from './renderers/Custom';  // ❌ 直接导入会破坏代码分割

<Suspense fallback={<RendererLoading />}>
  {fileType === 'custom' && <CustomRenderer ref={rendererRef} url={currentFile.url} />}
</Suspense>
```

**用于自定义渲染器：**

如果你希望自定义渲染器也享受代码分割，可以使用相同的模式：

```tsx
import { lazy, Suspense } from 'react';

const MyCustomRenderer = lazy(() => import('./MyCustomRenderer'));

<FilePreviewModal
  files={files}
  customRenderers={[
    {
      test: (file) => file.type === 'application/custom',
      component: (props) => (
        <Suspense fallback={<div>加载中...</div>}>
          <MyCustomRenderer {...props} />
        </Suspense>
      )
    }
  ]}
/>
```

### i18n 集成

自定义渲染器可以通过 `useTranslator()` hook 访问本库的 i18n 系统，实现一致的多语言支持。

**架构：**

- **字典源**：`file-preview-core/src/i18n/messages/`（zh-CN.ts、en-US.ts）
- **禁止硬编码**：所有用户可见文案必须使用翻译 key
- **自动切换语言**：跟随 `FilePreviewModal` 的 `locale` prop

**在自定义渲染器中使用：**

```tsx
import { useTranslator } from '@eternalheart/react-file-preview';

export const CustomRenderer = forwardRef<RendererHandle, Props>((props, ref) => {
  const t = useTranslator();
  const [error, setError] = useState<string | null>(null);
  
  if (error) {
    return (
      <div className="rfp-text-fg-primary">
        {t('custom.load_failed')}: {error}
      </div>
    );
  }
  
  return (
    <div>
      <button>{t('common.download')}</button>
      <span>{t('custom.loading')}</span>
    </div>
  );
});
```

**新增自定义翻译键：**

对于自定义渲染器，通过 `messages` prop 扩展翻译（不要修改 `node_modules` 中的源文件）：

```tsx
<FilePreviewModal
  files={files}
  locale="en-US"
  messages={{
    'en-US': {
      'custom.load_failed': 'Failed to load custom file',
      'custom.file_size': 'File size: {size} KB'
    },
    'zh-CN': {
      'custom.load_failed': '自定义文件加载失败',
      'custom.file_size': '文件大小: {size} KB'
    }
  }}
  customRenderers={[...]}
/>
```

**指南：**
- 使用 `<scope>.<snake_name>` 格式（如 `custom.load_failed`、`custom.parse_error`）
- 为所有启用的语言（`zh-CN` 和 `en-US`）提供翻译
- 已有通用 key：`common.loading`、`common.download`、`common.close`、`toolbar.*`

**参数化翻译：**

```tsx
// 字典: 'custom.file_size': '文件大小: {size} KB'
t('custom.file_size', { size: 1024 })  // → "文件大小: 1024 KB"
```

**工具栏集成：**

工具栏项也应使用翻译字符串：

```tsx
const getToolbarGroups = useCallback((): ToolbarGroup[] => [
  {
    items: [
      {
        type: 'button',
        icon: <Download className="rfp-w-4 rfp-h-4" />,
        tooltip: t('common.download'),  // ✅ 已翻译
        action: handleDownload
      }
    ]
  }
], [t]);
```

### 主题适配

自定义渲染器必须使用语义化颜色 token 以支持本库的 `'auto' | 'dark' | 'light'` 主题系统。

**语义化 Token 系统：**

所有颜色定义为 CSS 变量（`--fp-*`），通过 Tailwind 类暴露，前缀为 `rfp-`：

| 用途 | 类名 | 说明 |
|------|------|------|
| **文字（fg）** | | |
| 主文本 | `rfp-text-fg-primary` | 最高对比度 |
| 正文 | `rfp-text-fg-secondary` | 默认文字 |
| 次要文本 | `rfp-text-fg-tertiary` | 副本、计数器 |
| 弱化文本 | `rfp-text-fg-muted` | 占位符 |
| 禁用文本 | `rfp-text-fg-disabled` | 禁用按钮 |
| **背景（surface）** | | |
| 表面层 1 | `rfp-bg-surface-1` | 卡片、最弱 |
| 表面层 2 | `rfp-bg-surface-2` | hover 状态 |
| 表面层 3 | `rfp-bg-surface-3` | 强调 |
| 工具栏 | `rfp-bg-surface-toolbar` | 顶部工具栏 |
| **边框** | | |
| 弱边框 | `rfp-border-line-weak` | 细线 |
| 标准边框 | `rfp-border-line` | 默认边框 |
| 强边框 | `rfp-border-line-strong` | 强调 |
| **代码** | | |
| 代码背景 | `rfp-bg-code-bg` | Dark：#1e1e1e / Light：#f6f8fa |
| 代码文字 | `rfp-text-code-fg` | 跟随主题 |
| **强调（accent）** | | |
| 强调背景 | `rfp-bg-accent` | 主按钮 |
| 强调 hover | `rfp-bg-accent-hover` | hover 状态 |

**✅ 正确用法：**

```tsx
export const CustomRenderer = forwardRef<RendererHandle, Props>((props, ref) => {
  return (
    <div className="rfp-bg-surface-1 rfp-border rfp-border-line-weak rfp-rounded">
      <h2 className="rfp-text-fg-primary rfp-text-lg">标题</h2>
      <p className="rfp-text-fg-secondary">正文内容</p>
      <button className="rfp-bg-surface-2 hover:rfp-bg-surface-3 rfp-text-fg-primary">
        点击
      </button>
      <pre className="rfp-bg-code-bg rfp-text-code-fg">
        {code}
      </pre>
    </div>
  );
});
```

**❌ 错误用法（禁止使用）：**

```tsx
// ❌ 字面色类 — 会破坏主题切换
<div className="rfp-text-white/90 rfp-bg-white/10 rfp-border-white/15">
<div className="rfp-text-gray-700 rfp-bg-gray-100">

// ❌ 内联字面色
<div style={{ color: '#ffffff', background: '#1f2937' }}>

// ❌ 硬编码暗色
<div style={{ background: '#1e1e1e' }}>  // 应改用 rfp-bg-code-bg
```

**支持主题的三方库：**

对于具有 theme prop 的库（如 `react-syntax-highlighter`），使用 `useResolvedTheme()`：

```tsx
import { useResolvedTheme } from '@eternalheart/react-file-preview';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const CodeRenderer = forwardRef<RendererHandle, Props>((props, ref) => {
  const resolvedTheme = useResolvedTheme();  // 'dark' | 'light'
  
  return (
    <SyntaxHighlighter
      language="javascript"
      style={resolvedTheme === 'light' ? vs : vscDarkPlus}
    >
      {code}
    </SyntaxHighlighter>
  );
});
```

**测试：**

务必在 Light 和 Dark 两个主题下测试你的自定义渲染器：

```tsx
<FilePreviewModal
  files={files}
  theme="light"  // 在 'light'、'dark'、'auto' 间切换
  customRenderers={[...]}
/>
```

验证：
- 文字在两个主题下都可读（无白底白字或黑底黑字）
- 边框和分隔线清晰可见
- hover 状态有足够对比度
- 代码块跟随主题（不固定为暗色）

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a8.svg" width="20" height="20" alt="🎨" /> 自定义样式

组件使用 Tailwind CSS 构建,您可以通过覆盖 CSS 变量来自定义样式:

```css
/* 自定义主题色 */
:root {
  --primary-color: #8b5cf6;
  --secondary-color: #ec4899;
}
```

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="20" height="20" alt="⌨️" /> 键盘快捷键

- `ESC` - 关闭预览
- `←` - 上一个文件
- `→` - 下一个文件
- `滚轮` - 缩放图片 (仅图片预览)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4da.svg" width="20" height="20" alt="📚" /> 文档

- [在线演示](https://wh131462.github.io/file-preview) - 在线 Demo

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f916.svg" width="20" height="20" alt="🤖" /> Context7 支持

本项目支持 [Context7](https://context7.com) MCP Server。如果你正在使用 AI 编程助手（如 Claude Code、Cursor 等），可以配置 Context7 MCP Server 来获取 `@eternalheart/react-file-preview` 的最新文档和代码示例，从而获得更好的 AI 辅助开发体验。

### 如何使用

1. 将 Context7 MCP Server 添加到你的 AI 工具配置中
2. 在与 AI 交互时，Context7 会自动提供本库的最新 API 文档和使用示例
3. 无需手动查阅文档，即可获得更精准的代码建议和解答

> 更多关于 Context7 的配置方式，请访问 [Context7 官方文档](https://github.com/upstash/context7)。

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f6e0.svg" width="20" height="20" alt="🛠️" /> 开发

### 库开发

```bash
# 克隆仓库
git clone https://github.com/wh131462/file-preview.git

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

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c4.svg" width="20" height="20" alt="📄" /> 许可证

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f91d.svg" width="20" height="20" alt="🤝" /> 贡献

欢迎提交 Issue 和 Pull Request!

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f517.svg" width="20" height="20" alt="🔗" /> 相关链接

- [GitHub](https://github.com/wh131462/file-preview)
- [npm](https://www.npmjs.com/package/@eternalheart/react-file-preview)
- [在线演示](https://wh131462.github.io/file-preview)
- [问题反馈](https://github.com/wh131462/file-preview/issues)

