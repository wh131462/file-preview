# React File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/react-file-preview.svg)](https://github.com/wh131462/file-preview/blob/master/LICENSE)[![downloads](https://img.shields.io/npm/dm/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)

English | [简体中文](./README.zh-CN.md)

A modern, feature-rich file preview component for React with support for images, videos, audio, PDFs, Office documents (Word, Excel, PowerPoint), Markdown, and code files.



## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2728.svg" width="20" height="20" alt="✨" /> Features

- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a8.svg" width="16" height="16" alt="🎨" style="vertical-align: middle;" /> **Modern UI** - Clean and modern interface with smooth animations
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c1.svg" width="16" height="16" alt="📁" style="vertical-align: middle;" /> **Multi-format Support** - Supports 20+ file formats
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1fa9f.svg" width="16" height="16" alt="🪟" style="vertical-align: middle;" /> **Two Display Modes** - Full-screen modal **or** inline embedded preview
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f5bc.svg" width="16" height="16" alt="🖼️" style="vertical-align: middle;" /> **Powerful Image Viewer** - Zoom, rotate, drag, mouse wheel zoom
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" width="16" height="16" alt="🎬" style="vertical-align: middle;" /> **Custom Video Player** - Built on Video.js, supports multiple video formats
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b5.svg" width="16" height="16" alt="🎵" style="vertical-align: middle;" /> **Custom Audio Player** - Beautiful audio control interface
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c4.svg" width="16" height="16" alt="📄" style="vertical-align: middle;" /> **PDF Viewer** - Pagination support
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4ca.svg" width="16" height="16" alt="📊" style="vertical-align: middle;" /> **Office Documents Support** - Word, Excel, PowerPoint file preview
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4dd.svg" width="16" height="16" alt="📝" style="vertical-align: middle;" /> **Markdown Rendering** - GitHub Flavored Markdown support
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4bb.svg" width="16" height="16" alt="💻" style="vertical-align: middle;" /> **Code Highlighting** - Supports 40+ programming languages
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ad.svg" width="16" height="16" alt="🎭" style="vertical-align: middle;" /> **Smooth Animations** - Powered by Framer Motion
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4f1.svg" width="16" height="16" alt="📱" style="vertical-align: middle;" /> **Responsive Design** - Adapts to all screen sizes
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="16" height="16" alt="⌨️" style="vertical-align: middle;" /> **Keyboard Navigation** - Arrow keys and ESC support

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e6.svg" width="20" height="20" alt="📦" /> Installation

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

> **Note:** The `pdfjs-dist` dependency will be automatically installed for PDF preview support. No additional installation is required.

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

### Vite Bundler Note (AVIF Decoder)

If your project bundler is Vite and you happen to have `@jsquash/avif` installed (transitively or directly), the production build may fail with:

```
[commonjs--resolver] Invalid value "iife" for option "worker.format"
- UMD and IIFE output formats are not supported for code-splitting builds.
file: .../@jsquash/avif/codec/enc/avif_enc_mt.js
```

This happens because `@jsquash/avif` ships a multi-threaded worker that uses code-splitting, while Vite's default `worker.format` is `'iife'`, which does not support split chunks.

**Fix** — add this to your `vite.config.ts`:

```ts
export default defineConfig({
  // ... your existing config
  worker: {
    format: 'es',
  },
});
```

`'es'` produces module workers (`type: 'module'`), supported by all modern browsers and compatible with code-splitting.

> Note: `@jsquash/avif` is only used as a fallback when the browser does not natively support AVIF (Chrome 85+, Firefox 93+, Safari 16+ all support it natively). If your target browsers cover the native list, you can also remove `@jsquash/avif` from your dependencies entirely.

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f680.svg" width="20" height="20" alt="🚀" /> Quick Start

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
  // Assume `file1` comes from a File API source: <input type="file">,
  // drag &amp; drop, clipboard paste, or fetch().then(r =&gt; r.blob())
  const file1 = new File(['content'], 'example.txt', { type: 'text/plain' });

  const files: PreviewFileInput[] = [
    // 1. Native File object (auto revoked when unmounted)
    file1,

    // 2. HTTP URL string (loaded on demand)
    'https://example.com/image.jpg',

    // 3. File object with metadata (recommended for remote resources)
    {
      name: 'document.pdf',
      type: 'application/pdf',
      url: '/path/to/document.pdf',
      size: 1024,
    },
  ];

  // Memory note: If you generate URLs via URL.createObjectURL(),
  // call URL.revokeObjectURL() when files are removed to avoid memory leaks.

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
- Does **not** show the close button in the toolbar
- Keyboard navigation (←/→) is scoped to the embed container (focus-based)
- Size defaults to `width: 100%; height: 100%`; override via `width` / `height` props

```tsx
// Explicit size
<FilePreviewEmbed files={files} width={800} height={500} />
```

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4a1.svg" width="20" height="20" alt="💡" /> Usage Examples

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

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4d6.svg" width="20" height="20" alt="📖" /> Supported File Formats

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

### Fonts
- **Formats**: TTF, OTF, WOFF, WOFF2
- **Features**: Font metadata (family, designer, version), character set preview, custom text input, multi-size display

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

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/26a0.svg" width="20" height="20" alt="⚠️" /> Limitations &amp; Performance

### Support Levels

**✅ Full Support (Production Ready)**
- Images (JPG, PNG, GIF, WebP, SVG, BMP, ICO)
- Videos (MP4, WebM, OGG)
- Audio (MP3, WAV, OGG)
- PDF
- Markdown
- Code files (40+ languages via Shiki, lazy-loaded)
- JSON, CSV, XML

**⚠️ Partial Support (Preview Only)**
- **Office (DOCX, XLSX, PPTX)**: Basic layout and text rendering. Complex formatting (charts, macros, embedded objects) may not render accurately.
- **ZIP**: Directory tree browsing + inline preview for text/code/images. Large archives (&gt;100MB) may cause performance issues.
- **Fonts (TTF, OTF, WOFF)**: Metadata + character preview. Full font feature testing not supported.

**🧪 Experimental**
- **MSG (Outlook Email)**: Headers and plain text body. Complex HTML body may not render correctly.
- **EPUB**: Basic chapter navigation. CSS styling may differ from native readers. DRM-protected files not supported.
- **Subtitle formats (SRT, ASS, TTML, LRC)**: Text display only. No video sync or advanced styling.

### Performance Boundaries

| File Size | Status | Notes |
|-----------|--------|-------|
| &lt; 50MB | ✅ Recommended | Smooth preview experience |
| 50-100MB | ⚠️ May lag | UI may become unresponsive during load |
| &gt; 100MB | ❌ Not recommended | Browser memory limits may be exceeded |

**Special Cases:**
- **ZIP archives**: Performance depends on file count, not just size
- **Office documents**: Complex files (&gt;200 pages, heavy images) may timeout
- **Code highlighting**: Files &gt;5MB may take 3-5s to highlight

### Browser Compatibility

**Minimum Requirements:**
- Chrome 90+ / Edge 90+
- Firefox 88+
- Safari 14+

**Known Limitations:**
- **Safari iOS**: Video autoplay requires user interaction
- **Firefox**: AVIF support requires Firefox 93+ (fallback decoder included)
- **Office formats**: Rendering quality varies across browsers
- **EPUB**: Some CSS features unsupported in older browsers

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ae.svg" width="20" height="20" alt="🎮" /> API Reference

### FilePreviewModal Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `files` | `PreviewFileInput[]` | ✅ | Array of files (supports File objects, file objects, or URL strings) |
| `currentIndex` | `number` | ✅ | Current file index |
| `isOpen` | `boolean` | ✅ | Whether the modal is open |
| `onClose` | `() => void` | ✅ | Close callback |
| `onNavigate` | `(index: number) => void` | ❌ | Navigation callback |
| `customRenderers` | `CustomRenderer[]` | ❌ | Custom renderers for specific file types |
| `locale` | `Locale` | ❌ | UI language (`'zh-CN'` default, `'en-US'` built-in) |
| `messages` | `Partial<Record<Locale, Partial<Messages>>>` | ❌ | Custom translation overrides |
| `headless` | `boolean` | ❌ | Headless mode — hides toolbar and navigation arrows |
| `theme` | `Theme` | ❌ | Theme mode: `'auto' \| 'dark' \| 'light'` (default `'dark'`) |
| `showDownload` | `boolean` | ❌ | Whether to show the download button (default `true`) |

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
| `locale` | `Locale` | ❌ | `'zh-CN'` | UI language (`'zh-CN'` or `'en-US'`) |
| `messages` | `Partial<Record<Locale, Partial<Messages>>>` | ❌ | - | Custom translation overrides |
| `headless` | `boolean` | ❌ | `false` | Headless mode — hides toolbar and navigation arrows |
| `theme` | `Theme` | ❌ | `'dark'` | Theme mode: `'auto' \| 'dark' \| 'light'` |
| `showDownload` | `boolean` | ❌ | `true` | Whether to show the download button |

> `FilePreviewEmbed` has no `isOpen` / `onClose`. To hide/show it, conditionally render it from the parent. It also hides the close button in the toolbar.

### FilePreviewContent (advanced)

Both `FilePreviewModal` and `FilePreviewEmbed` are thin wrappers around the exported lower-level `FilePreviewContent` component. Use it directly when building a fully custom wrapper:

```tsx
import { FilePreviewContent } from '@eternalheart/react-file-preview';

<FilePreviewContent
  mode="embed"       // or "modal"
  files={files}
  currentIndex={index}
  onNavigate={setIndex}
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

#### Fonts
- **TrueType**: `application/x-font-ttf`, `font/ttf` (.ttf)
- **OpenType**: `application/x-font-otf`, `font/otf` (.otf)
- **WOFF**: `application/font-woff`, `font/woff` (.woff)
- **WOFF2**: `application/font-woff2`, `font/woff2` (.woff2)

#### Media Files
- **Images**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, etc.
- **Videos**: `video/mp4`, `video/webm`, `video/ogg`, etc.
- **Audio**: `audio/mpeg`, `audio/wav`, `audio/ogg`, etc.

#### Text Files
- **Markdown**: File extensions `.md` or `.markdown`
- **Code**: Auto-detected by file extension (`.js`, `.ts`, `.py`, `.java`, etc.)
- **Config / Logs**: `.yaml`, `.yml`, `.toml`, `.ini`, `.conf`, `.env`, `.log`, `.diff`, `.patch`
- **Plain Text**: `text/plain`

#### Structured Data
- **JSON**: `application/json` (.json)
- **CSV / TSV**: `text/csv` (.csv), `text/tab-separated-values` (.tsv)
- **XML**: `application/xml`, `text/xml` (.xml)

#### Subtitles & Lyrics
- **SRT**: `application/x-subrip` (.srt)
- **WebVTT**: `text/vtt` (.vtt)
- **LRC**: (.lrc)
- **Enhanced LRC**: (.elrc)
- **ASS / SSA**: (.ass, .ssa)
- **TTML / DFXP**: `application/ttml+xml` (.ttml, .dfxp)

#### Archives
- **ZIP**: `application/zip`, `application/x-zip-compressed` (.zip)

#### Outlook Email
- **MSG**: `application/vnd.ms-outlook` (.msg)

#### E-books
- **EPUB**: `application/epub+zip` (.epub)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f310.svg" width="20" height="20" alt="🌐" /> Internationalization (i18n)

Built-in support for Chinese (default) and English. Zero external dependencies.

```tsx
// Switch to English
<FilePreviewModal files={files} locale="en-US" ... />

// Override specific translations
<FilePreviewModal
  files={files}
  locale="en-US"
  messages={{ 'en-US': { 'toolbar.zoom_in': 'Zoom ++' } }}
/>
```

Use `useTranslator()` hook in custom renderers to access the translation function.

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f9e9.svg" width="20" height="20" alt="🧩" /> Custom Renderers

The library supports custom renderers for handling file types not built-in. Custom renderers can optionally provide toolbar configurations and integrate with the library's architecture.

### Event-Driven Toolbar Updates

Custom renderers can implement real-time toolbar updates using the event-driven mechanism:

**Benefits:**
- **Real-time updates**: Toolbar reflects state changes immediately
- **Better performance**: No polling overhead or unnecessary re-renders
- **Type-safe**: Full TypeScript support with proper interfaces

**Implementation:**

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
  
  // Notify toolbar when state changes
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
          tooltip: 'Previous Page',
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
          tooltip: 'Next Page',
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
  
  return <div>Your custom renderer UI</div>;
});
```

**Main component usage:**

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

The main component automatically detects `onToolbarChange` and subscribes to events. If not implemented, it falls back to polling for backward compatibility.

### Renderer Lazy Loading

All built-in renderers use code-splitting via `React.lazy` to minimize the main bundle size and improve initial load performance.

**Architecture:**

- **Registration**: Renderers register in `src/renderers/lazy.tsx` using named exports wrapped in `React.lazy`
- **Loading**: Each renderer is a separate chunk, loaded on-demand when needed
- **Fallback**: `<Suspense>` with `<RendererLoading />` handles the loading state

**Bundle Size Impact:**

- Main entry point: gzip ≤ 80 KB (strictly enforced by CI)
- Each renderer: separate async chunk
- Total library: gzip ≤ 800 KB (all renderers combined)

**Implementation Example:**

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
import { CustomRenderer } from './renderers/lazy';  // ✅ Lazy import
// NOT: import { CustomRenderer } from './renderers/Custom';  // ❌ Direct import breaks code-splitting

<Suspense fallback={<RendererLoading />}>
  {fileType === 'custom' && <CustomRenderer ref={rendererRef} url={currentFile.url} />}
</Suspense>
```

**For Custom Renderers:**

If you want your custom renderer to benefit from code-splitting, you can use the same pattern:

```tsx
import { lazy, Suspense } from 'react';

const MyCustomRenderer = lazy(() => import('./MyCustomRenderer'));

<FilePreviewModal
  files={files}
  customRenderers={[
    {
      test: (file) => file.type === 'application/custom',
      component: (props) => (
        <Suspense fallback={<div>Loading...</div>}>
          <MyCustomRenderer {...props} />
        </Suspense>
      )
    }
  ]}
/>
```

### i18n Integration

Custom renderers can access the library's i18n system via the `useTranslator()` hook for consistent multilingual support.

**Architecture:**

- **Dictionary Source**: `file-preview-core/src/i18n/messages/` (zh-CN.ts, en-US.ts)
- **No Hardcoding**: All user-visible text must use translation keys
- **Automatic Locale Switching**: Follows the `locale` prop passed to `FilePreviewModal`

**Usage in Custom Renderers:**

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

**Adding Custom Translation Keys:**

For custom renderers, extend translations via the `messages` prop (do NOT modify source files in `node_modules`):

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

**Guidelines:**
- Use `<scope>.<snake_name>` format (e.g., `custom.load_failed`, `custom.parse_error`)
- Provide translations for all enabled locales (`zh-CN` and `en-US`)
- Common keys already available: `common.loading`, `common.download`, `common.close`, `toolbar.*`

**Parameterized Translations:**

```tsx
// Dictionary: 'custom.file_size': '文件大小: {size} KB'
t('custom.file_size', { size: 1024 })  // → "文件大小: 1024 KB"
```

**Toolbar Integration:**

Toolbar items should also use translated strings:

```tsx
const getToolbarGroups = useCallback((): ToolbarGroup[] => [
  {
    items: [
      {
        type: 'button',
        icon: <Download className="rfp-w-4 rfp-h-4" />,
        tooltip: t('common.download'),  // ✅ Translated
        action: handleDownload
      }
    ]
  }
], [t]);
```

### Theme Adaptation

Custom renderers must use semantic color tokens to support the library's `'auto' | 'dark' | 'light'` theme system.

**Semantic Token System:**

All colors are defined as CSS variables (`--fp-*`) and exposed via Tailwind classes with the `rfp-` prefix:

| Usage | Class | Description |
|-------|-------|-------------|
| **Text (fg)** | | |
| Primary text | `rfp-text-fg-primary` | Highest contrast |
| Body text | `rfp-text-fg-secondary` | Default text |
| Secondary text | `rfp-text-fg-tertiary` | Captions, counters |
| Muted text | `rfp-text-fg-muted` | Placeholders |
| Disabled text | `rfp-text-fg-disabled` | Disabled buttons |
| **Background (surface)** | | |
| Surface 1 | `rfp-bg-surface-1` | Cards, weakest |
| Surface 2 | `rfp-bg-surface-2` | Hover states |
| Surface 3 | `rfp-bg-surface-3` | Emphasis |
| Toolbar | `rfp-bg-surface-toolbar` | Top toolbar |
| **Borders** | | |
| Weak border | `rfp-border-line-weak` | Subtle lines |
| Standard border | `rfp-border-line` | Default borders |
| Strong border | `rfp-border-line-strong` | Emphasis |
| **Code** | | |
| Code background | `rfp-bg-code-bg` | Dark: #1e1e1e / Light: #f6f8fa |
| Code text | `rfp-text-code-fg` | Follows theme |
| **Accent** | | |
| Accent background | `rfp-bg-accent` | Primary buttons |
| Accent hover | `rfp-bg-accent-hover` | Hover state |

**✅ Correct Usage:**

```tsx
export const CustomRenderer = forwardRef<RendererHandle, Props>((props, ref) => {
  return (
    <div className="rfp-bg-surface-1 rfp-border rfp-border-line-weak rfp-rounded">
      <h2 className="rfp-text-fg-primary rfp-text-lg">Title</h2>
      <p className="rfp-text-fg-secondary">Body text</p>
      <button className="rfp-bg-surface-2 hover:rfp-bg-surface-3 rfp-text-fg-primary">
        Click me
      </button>
      <pre className="rfp-bg-code-bg rfp-text-code-fg">
        {code}
      </pre>
    </div>
  );
});
```

**❌ Incorrect Usage (DO NOT USE):**

```tsx
// ❌ Literal color classes — breaks theme switching
<div className="rfp-text-white/90 rfp-bg-white/10 rfp-border-white/15">
<div className="rfp-text-gray-700 rfp-bg-gray-100">

// ❌ Inline literal colors
<div style={{ color: '#ffffff', background: '#1f2937' }}>

// ❌ Hardcoded dark-only colors
<div style={{ background: '#1e1e1e' }}>  // Use rfp-bg-code-bg instead
```

**Theme-Aware Third-Party Libraries:**

For libraries with theme props (e.g., `react-syntax-highlighter`), use `useResolvedTheme()`:

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

**Testing:**

Always test your custom renderer in both Light and Dark themes:

```tsx
<FilePreviewModal
  files={files}
  theme="light"  // Switch between 'light', 'dark', 'auto'
  customRenderers={[...]}
/>
```

Verify:
- Text is readable in both themes (no white-on-white or black-on-black)
- Borders and dividers are visible
- Hover states have sufficient contrast
- Code blocks follow theme (not always dark)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a8.svg" width="20" height="20" alt="🎨" /> Custom Styling

The component is built with Tailwind CSS. You can customize styles by overriding CSS variables:

```css
/* Custom theme colors */
:root {
  --primary-color: #8b5cf6;
  --secondary-color: #ec4899;
}
```

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="20" height="20" alt="⌨️" /> Keyboard Shortcuts

- `ESC` - Close preview
- `←` - Previous file
- `→` - Next file
- `Mouse Wheel` - Zoom image (image preview only)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4da.svg" width="20" height="20" alt="📚" /> Documentation

- [Online Demo](https://wh131462.github.io/file-preview) - Live demo

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f916.svg" width="20" height="20" alt="🤖" /> Context7 Support

This project supports [Context7](https://context7.com) MCP Server. If you are using AI coding assistants (such as Claude Code, Cursor, etc.), you can configure the Context7 MCP Server to get the latest documentation and code examples for `@eternalheart/react-file-preview`, enabling a better AI-assisted development experience.

### How to Use

1. Add the Context7 MCP Server to your AI tool configuration
2. When interacting with AI, Context7 will automatically provide up-to-date API docs and usage examples for this library
3. Get more accurate code suggestions and answers without manually looking up documentation

> For more details on configuring Context7, please visit [Context7 official documentation](https://github.com/upstash/context7).

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f6e0.svg" width="20" height="20" alt="🛠️" /> Development

### For Library Development

```bash
# Clone repository
git clone https://github.com/wh131462/file-preview.git

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

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c4.svg" width="20" height="20" alt="📄" /> License

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f91d.svg" width="20" height="20" alt="🤝" /> Contributing

Issues and Pull Requests are welcome!

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f517.svg" width="20" height="20" alt="🔗" /> Links

- [GitHub](https://github.com/wh131462/file-preview)
- [npm](https://www.npmjs.com/package/@eternalheart/react-file-preview)
- [Online Demo](https://wh131462.github.io/file-preview)
- [Issue Tracker](https://github.com/wh131462/file-preview/issues)
