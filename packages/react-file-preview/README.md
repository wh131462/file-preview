# React File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/react-file-preview.svg)](https://github.com/wh131462/react-file-preview/blob/master/LICENSE)[![downloads](https://img.shields.io/npm/dm/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)

English | [简体中文](./README.zh-CN.md)

A modern, feature-rich file preview component for React with support for images, videos, audio, PDFs, Office documents (Word, Excel, PowerPoint), Markdown, and code files.



## ✨ Features

- 🎨 **Modern UI** - Apple-inspired minimalist design with glassmorphism effects
- 📁 **Multi-format Support** - Supports 20+ file formats
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

### PDF.js Configuration (Optional)

If you need to preview PDF files, it's recommended to configure PDF.js to use local static files for better performance and stability:

#### Method 1: Use CDN (Default)

By default, the component automatically uses unpkg CDN to load PDF.js, no additional configuration needed.

#### Method 2: Use Local Static Files (Recommended for Production)

1. Copy PDF.js files to your public directory:

```bash
# Copy PDF.js files from node_modules to public directory
cp -r node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdfjs/
cp -r node_modules/pdfjs-dist/cmaps public/pdfjs/
```

2. Configure PDF.js in your app entry:

```tsx
import { configurePdfjs } from '@eternalheart/react-file-preview';

// Configure to use local static files
configurePdfjs({
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true
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

Then configure in your app entry:

```tsx
import { configurePdfjs } from '@eternalheart/react-file-preview';

configurePdfjs({
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true
});
```

## 🚀 Quick Start

📖 **New to this library?** Check out the [Quick Start Guide](./QUICK_START.md) for a 5-minute introduction!

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

## 📦 Package Information

### Bundle Size

- **ESM**: ~54 KB (gzipped: ~12 KB)
- **CJS**: ~37 KB (gzipped: ~11 KB)
- **CSS**: ~56 KB (gzipped: ~14 KB)

### Peer Dependencies

- `react`: ^18.0.0
- `react-dom`: ^18.0.0

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

### Project Structure

```
react-file-preview/
├── src/
│   ├── index.ts              # Library entry point
│   ├── FilePreviewModal.tsx  # Main component
│   ├── types.ts              # Type definitions
│   ├── utils/                # Utility functions
│   ├── renderers/            # File type renderers
│   ├── App.tsx               # Demo app
│   └── main.tsx              # Demo app entry
├── lib/                      # Built library (npm package)
├── dist/                     # Built demo app (GitHub Pages)
└── vite.config.lib.ts        # Library build config
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
