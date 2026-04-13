# Vue File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/vue-file-preview.svg)](https://github.com/wh131462/file-preview/blob/master/LICENSE)[![downloads](https://img.shields.io/npm/dm/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)

English | [简体中文](./README.zh-CN.md)

A modern, feature-rich file preview component for Vue 3 with support for images, videos, audio, PDFs, Office documents (Word, Excel, PowerPoint), Markdown, and code files.

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
- 📱 **Responsive Design** - Adapts to all screen sizes
- ⌨️ **Keyboard Navigation** - Arrow keys and ESC support
- 🎯 **Drag & Drop** - File upload via drag and drop

## 📦 Installation

```bash
# Using npm
npm install @eternalheart/vue-file-preview

# Using yarn
yarn add @eternalheart/vue-file-preview

# Using pnpm
pnpm add @eternalheart/vue-file-preview
```

**Important:** You also need to import the CSS file:

```ts
import '@eternalheart/vue-file-preview/style.css';
```

### PDF.js Configuration (Optional)

If you need to preview PDF files, it's recommended to configure PDF.js to use local static files for better performance and stability:

#### Method 1: Use CDN (Default)

By default, the component automatically uses unpkg CDN to load PDF.js, no additional configuration needed.

#### Method 2: Use Local Static Files (Recommended for Production)

1. Copy PDF.js files to your public directory:

```bash
cp -r node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdfjs/
cp -r node_modules/pdfjs-dist/cmaps public/pdfjs/
```

2. Configure PDF.js in your app entry:

```ts
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { configurePdfWorker } from '@eternalheart/vue-file-preview';

configurePdfWorker(pdfjsLib, {
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
});
```

#### Auto-copy with Vite (Recommended)

Configure auto-copy in `vite.config.ts`:

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

## 🚀 Quick Start

### Basic Usage

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

### Multiple Input Types

The component supports three types of file inputs:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { FilePreviewModal, type PreviewFileInput } from '@eternalheart/vue-file-preview';
import '@eternalheart/vue-file-preview/style.css';

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

### Embedded Mode (`FilePreviewEmbed`)

Besides the full-screen modal, the library also ships an **embedded** variant that renders the preview inline inside any container. Useful for detail panels, side-by-side layouts, dashboards, etc.

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

Differences from `FilePreviewModal`:

- No teleport, no full-screen overlay, no `isOpen` / `@close`
- Does **not** show the close button in the toolbar
- Keyboard navigation (←/→) is scoped to the embed container (focus-based)
- Size defaults to `width: 100%; height: 100%`; override via `width` / `height` props

```vue
<!-- Explicit size -->
<FilePreviewEmbed :files="files" :width="800" :height="500" />
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
- **Config/Logs**: YAML, TOML, INI, ENV, LOG, DIFF, PATCH, etc.

### Structured Data
- **JSON**: Auto formatting + syntax highlighting
- **CSV/TSV**: Zero-dependency parser, table view with headers and row/column stats
- **XML**: `DOMParser` validation + pretty print + syntax highlighting

### Subtitles & Lyrics
- **SRT / WebVTT**: Zero-dependency parser, structured cue list (index, time range, text)
- **LRC / Enhanced LRC**: Lyric files with `[mm:ss.xx]` line stamps (and inline `<mm:ss.xx>` per-word stamps for ELRC), with `[ti:][ar:][al:]` metadata header
- **ASS / SSA**: Advanced SubStation Alpha — extracts Dialogue events, strips `\N` `\h` and `{...}` override codes, surfaces Style names
- **TTML / DFXP**: W3C / Apple Music XML captions, supports `begin` / `end` / `dur` and `<br/>`

### Archives
- **ZIP**: Tree view + inline preview for text/code/image entries, download fallback for other types

### Outlook Email
- **MSG**: Headers, body rendering, attachment list

### E-books
- **EPUB**: Chapter navigation, pagination

## 🎮 API Reference

### FilePreviewModal Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `files` | `PreviewFileInput[]` | ✅ | Array of files (supports File objects, file objects, or URL strings) |
| `currentIndex` | `number` | ✅ | Current file index |
| `isOpen` | `boolean` | ✅ | Whether the modal is open |
| `customRenderers` | `CustomRenderer[]` | ❌ | Custom renderers for specific file types |

### FilePreviewModal Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | - | Emitted when the modal should close |
| `navigate` | `number` | Emitted when navigating to a different file index |

### FilePreviewEmbed Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `files` | `PreviewFileInput[]` | ✅ | - | Array of files |
| `currentIndex` | `number` | ❌ | `0` | Current file index |
| `customRenderers` | `CustomRenderer[]` | ❌ | - | Custom renderers |
| `width` | `number \| string` | ❌ | `'100%'` | Container width |
| `height` | `number \| string` | ❌ | `'100%'` | Container height |

### FilePreviewEmbed Events

| Event | Payload | Description |
|-------|---------|-------------|
| `navigate` | `number` | Emitted when navigating to a different file index |

### FilePreviewContent (advanced)

Both `FilePreviewModal` and `FilePreviewEmbed` are thin wrappers around the exported lower-level `FilePreviewContent` component. Use it directly when building a fully custom wrapper:

```vue
<FilePreviewContent
  mode="embed"
  :files="files"
  :current-index="index"
  @navigate="index = $event"
/>
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

## ⌨️ Keyboard Shortcuts

- `ESC` - Close preview
- `←` - Previous file
- `→` - Next file
- `Mouse Wheel` - Zoom image (image preview only)

## 📚 Documentation

- [Full Documentation](https://wh131462.github.io/file-preview/docs/)
- [Vue Demo](https://wh131462.github.io/file-preview/vue/)
- [React Demo](https://wh131462.github.io/file-preview/)

## 📦 Package Information

### Peer Dependencies

- `vue`: ^3.4.0

### Exports

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

## 🛠️ Development

```bash
# Clone repository
git clone https://github.com/wh131462/file-preview.git

# Install dependencies
pnpm install

# Start dev server (Vue demo app)
pnpm dev:vue-example

# Build library
pnpm build:vue
```

## 📄 License

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 🔗 Links

- [GitHub](https://github.com/wh131462/file-preview)
- [npm](https://www.npmjs.com/package/@eternalheart/vue-file-preview)
- [Vue Demo](https://wh131462.github.io/file-preview/vue/)
- [Issue Tracker](https://github.com/wh131462/file-preview/issues)
