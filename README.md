# React File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/react-file-preview.svg)](https://github.com/wh131462/react-file-preview/blob/master/LICENSE)[![downloads](https://img.shields.io/npm/dm/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)

English | [简体中文](./README.zh-CN.md)

A modern, feature-rich file preview component for React with support for images, videos, audio, PDFs, Office documents (Word, Excel, PowerPoint), Markdown, and code files.

## 📚 Documentation

- 📖 [Full Documentation](https://wh131462.github.io/react-file-preview/docs/)
- 🎮 [Live Demo](https://wh131462.github.io/react-file-preview/)

## 🏗️ Monorepo Structure

This project is organized as a monorepo using pnpm workspaces:

- **packages/react-file-preview** - Core library (published to npm)
- **packages/example** - Demo application (deployed to GitHub Pages)
- **packages/docs** - VitePress documentation site (deployed to GitHub Pages)

### Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Start example dev server
pnpm dev:docs         # Start docs dev server

# Build
pnpm build            # Build all packages
pnpm build:lib        # Build library only
pnpm build:example    # Build example only
pnpm build:docs       # Build docs only

# Preview
pnpm preview:example  # Preview example build
pnpm preview:docs     # Preview docs build

# Deploy
pnpm deploy           # Deploy example and docs to GitHub Pages

# Publish
pnpm pub              # Publish library to npm
```



## ✨ Features

- 🎨 **Modern UI** - Apple-inspired minimalist design with glassmorphism effects
- 📁 **Multi-format Support** - Supports 20+ file formats
- 🪟 **Two Display Modes** - Full-screen modal **or** inline embedded preview
- 🖼️ **Powerful Image Viewer** - Zoom, rotate, drag, mouse wheel zoom
- 🎬 **Custom Video Player** - Built on Video.js, supports multiple video formats
- 🎵 **Custom Audio Player** - Beautiful audio control interface
- 📄 **PDF Viewer** - Pagination support
- 📊 **Office Documents Support** - Word, Excel, PowerPoint file preview
- 📝 **Markdown Rendering** - GitHub Flavored Markdown support
- 💻 **Code Highlighting** - Supports 40+ programming languages
- 🎭 **Smooth Animations** - Powered by Framer Motion
- 📱 **Responsive Design** - Adapts to all screen sizes
- ⌨️ **Keyboard Navigation** - Arrow keys and ESC support
- 🎯 **Drag & Drop** - File upload via drag and drop

## 📦 Installation

```bash
# Using npm
npm install @eternalheart/react-file-preview

# Using yarn
yarn add @eternalheart/react-file-preview

# Using pnpm
pnpm add @eternalheart/react-file-preview
```

**Important:** You also need to import the CSS file:

```tsx
import '@eternalheart/react-file-preview/style.css';
```

## 🚀 Quick Start

📖 **New to this library?** Check out the [Quick Start Guide](https://wh131462.github.io/react-file-preview/docs/guide/getting-started.html) for a 5-minute introduction!

### Basic Usage

```tsx
import { FilePreviewModal } from '@eternalheart/react-file-preview';
import '@eternalheart/react-file-preview/style.css';
import { useState } from 'react';

function App() {
  const [files, setFiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleFileSelect = (file: File) => {
    // Method 1: Directly pass File object (recommended)
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

### Multiple Input Types

The component supports three types of file inputs:

```tsx
import { FilePreviewModal, PreviewFileInput } from '@eternalheart/react-file-preview';
import '@eternalheart/react-file-preview/style.css';

function App() {
  const files: PreviewFileInput[] = [
    // 1. Native File object
    file1,

    // 2. HTTP URL string
    'https://example.com/image.jpg',

    // 3. File object with metadata
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

### Embedded Mode (`FilePreviewEmbed`)

Besides the full-screen modal, the library also ships an **embedded** variant that renders the preview inline inside any container. Useful for detail panels, side-by-side layouts, dashboards, etc.

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
    // The embedded preview fills its parent container by default.
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

Differences from `FilePreviewModal`:

- No portal, no full-screen overlay, no `isOpen` / `onClose`
- Does **not** show the close button (embedded previews have no concept of closing)
- Keyboard navigation (←/→) is scoped to the embed container (focus-based), so it won't hijack the rest of the page
- Size defaults to `width: 100%; height: 100%`, and can be overridden via `width` / `height` props

```tsx
// Explicit size
<FilePreviewEmbed files={files} width={800} height={500} />
```

## 💡 Usage Examples

### Preview PowerPoint Files

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
        Preview PPT
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

### Preview Multiple Files

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

## 📖 Supported File Formats

### Images
- **Formats**: JPG, PNG, GIF, WebP, SVG, BMP, ICO
- **Features**: Zoom (0.1x - 10x), rotate, drag, mouse wheel zoom, double-click reset

### Videos
- **Formats**: MP4, WebM, OGG, MOV, AVI, MKV, M4V, 3GP, FLV
- **Features**: Custom player, progress control, volume adjustment, fullscreen

### Audio
- **Formats**: MP3, WAV, OGG, M4A, AAC, FLAC
- **Features**: Custom player, progress bar, volume control, skip forward/backward

### Documents
- **PDF**: Pagination, zoom
- **Word**: DOCX format support
- **Excel**: XLSX format support
- **PowerPoint**: PPTX/PPT format support, slide preview

### Code & Text
- **Markdown**: GitHub Flavored Markdown, code highlighting
- **Code Files**: JS, TS, Python, Java, C++, Go, Rust, and 40+ languages
- **Text Files**: TXT, LOG, CSV, JSON, YAML, XML, etc.

## 🎮 API Reference

### FilePreviewModal Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `files` | `PreviewFileInput[]` | ✅ | Array of files (supports File objects, file objects, or URL strings) |
| `currentIndex` | `number` | ✅ | Current file index |
| `isOpen` | `boolean` | ✅ | Whether the modal is open |
| `onClose` | `() => void` | ✅ | Close callback |
| `onNavigate` | `(index: number) => void` | ❌ | Navigation callback |
| `customRenderers` | `CustomRenderer[]` | ❌ | Custom renderers for specific file types |

### FilePreviewEmbed Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `files` | `PreviewFileInput[]` | ✅ | - | Array of files |
| `currentIndex` | `number` | ❌ | `0` | Current file index |
| `onNavigate` | `(index: number) => void` | ❌ | - | Navigation callback |
| `customRenderers` | `CustomRenderer[]` | ❌ | - | Custom renderers |
| `width` | `number \| string` | ❌ | `'100%'` | Container width |
| `height` | `number \| string` | ❌ | `'100%'` | Container height |
| `className` | `string` | ❌ | - | Extra class on the root wrapper |
| `style` | `CSSProperties` | ❌ | - | Extra inline style on the root wrapper |

> `FilePreviewEmbed` has no `isOpen` / `onClose`. To hide/show the embed, conditionally render it from the parent. It also hides the close button in the toolbar.

### FilePreviewContent (advanced)

Both `FilePreviewModal` and `FilePreviewEmbed` are thin wrappers around the exported lower-level `FilePreviewContent` component. You can use it directly when building a fully custom wrapper (custom drawer, split-pane, etc.):

```tsx
import { FilePreviewContent } from '@eternalheart/react-file-preview';

<div className="my-custom-wrapper">
  <FilePreviewContent
    mode="embed"       // or "modal"
    files={files}
    currentIndex={index}
    onNavigate={setIndex}
  />
</div>
```

### File Type Definitions

```typescript
// Supports three types of file input
type PreviewFileInput = File | PreviewFileLink | string;

// 1. Native File object (Browser File API)
const file: File = ...;

// 2. File object
interface PreviewFileLink {
  id?: string;       // Optional unique identifier
  name: string;      // File name
  type: string;      // MIME type
  url: string;       // File URL (supports blob URLs and HTTP URLs)
  size?: number;     // File size in bytes
}

// 3. HTTP URL string
const url: string = 'https://example.com/file.pdf';
```

### Usage Examples

```typescript
// Method 1: Using native File objects
const files = [file1, file2]; // Array of File objects

// Method 2: Using HTTP URL strings
const files = [
  'https://example.com/image.jpg',
  'https://example.com/document.pdf',
];

// Method 3: Using file objects
const files = [
  {
    name: 'presentation.pptx',
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    url: '/path/to/presentation.pptx',
  },
];

// Method 4: Mixed usage
const files = [
  file1,  // File object
  'https://example.com/image.jpg',  // URL string
  { name: 'doc.pdf', type: 'application/pdf', url: '/doc.pdf' },  // File object
];
```

### Supported MIME Types

#### Office Documents
- **Word**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- **Excel**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)
- **PowerPoint**: `application/vnd.openxmlformats-officedocument.presentationml.presentation` (.pptx)
- **PowerPoint (Legacy)**: `application/vnd.ms-powerpoint` (.ppt)

#### Other Documents
- **PDF**: `application/pdf`

#### Media Files
- **Images**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, etc.
- **Videos**: `video/mp4`, `video/webm`, `video/ogg`, etc.
- **Audio**: `audio/mpeg`, `audio/wav`, `audio/ogg`, etc.

#### Text Files
- **Markdown**: File extensions `.md` or `.markdown`
- **Code**: Auto-detected by file extension (`.js`, `.ts`, `.py`, `.java`, etc.)
- **Plain Text**: `text/plain`, `text/csv`, etc.

## 🎨 Custom Styling

The component is built with Tailwind CSS. You can customize styles by overriding CSS variables:

```css
/* Custom theme colors */
:root {
  --primary-color: #8b5cf6;
  --secondary-color: #ec4899;
}
```

## ⌨️ Keyboard Shortcuts

- `ESC` - Close preview
- `←` - Previous file
- `→` - Next file
- `Mouse Wheel` - Zoom image (image preview only)

## 📚 Documentation

- [Online Demo](https://wh131462.github.io/react-file-preview) - Live demo

## 🛠️ Development

### For Library Development

```bash
# Clone repository
git clone https://github.com/wh131462/react-file-preview.git

# Install dependencies
pnpm install

# Start dev server (demo app)
pnpm dev

# Build library (for npm)
pnpm build:lib

# Build demo app (for GitHub Pages)
pnpm build:demo
```

## 📄 License

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 🔗 Links

- [GitHub](https://github.com/wh131462/react-file-preview)
- [npm](https://www.npmjs.com/package/@eternalheart/react-file-preview)
- [Online Demo](https://wh131462.github.io/react-file-preview)
- [Issue Tracker](https://github.com/wh131462/react-file-preview/issues)
