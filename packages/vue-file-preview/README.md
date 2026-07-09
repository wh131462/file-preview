# Vue File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/vue-file-preview.svg)](https://github.com/wh131462/file-preview/blob/master/LICENSE)[![downloads](https://img.shields.io/npm/dm/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)

English | [简体中文](./README.zh-CN.md)

A modern, feature-rich file preview component for Vue 3 with support for images, videos, audio, PDFs, Office documents (Word, Excel, PowerPoint), Markdown, and code files.

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
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4f1.svg" width="16" height="16" alt="📱" style="vertical-align: middle;" /> **Responsive Design** - Adapts to all screen sizes
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="16" height="16" alt="⌨️" style="vertical-align: middle;" /> **Keyboard Navigation** - Arrow keys and ESC support

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e6.svg" width="20" height="20" alt="📦" /> Installation

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

> **Note:** The `pdfjs-dist` dependency will be automatically installed for PDF preview support. No additional installation is required.

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

// Assume file1 comes from a File API source: <input type="file">,
// drag & drop, clipboard paste, or fetch().then(r => r.blob())
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

### CAD / 3D Models
- **Formats**: DXF, STL, OBJ, GLTF, GLB
- **Features**: Interactive 3D viewer with orbit/zoom/pan controls, wireframe/solid toggle, grid & axes display, auto-centering

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
| `customRenderers` | `CustomRenderer[]` | ❌ | Custom renderers for specific file types |
| `locale` | `Locale` | ❌ | UI language (`'zh-CN'` default, `'en-US'` built-in) |
| `messages` | `Partial<Record<Locale, Partial<Messages>>>` | ❌ | Custom translation overrides |
| `headless` | `boolean` | ❌ | Headless mode — hides toolbar and navigation arrows |
| `theme` | `Theme` | ❌ | Theme mode: `'auto' \| 'dark' \| 'light'` (default `'dark'`) |
| `showDownload` | `boolean` | ❌ | Whether to show the download button (default `true`) |
| `showClose` | `boolean` | ❌ | Whether to show the close button (default `true` for modal) |

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
| `locale` | `Locale` | ❌ | `'zh-CN'` | UI language (`'zh-CN'` or `'en-US'`) |
| `messages` | `Partial<Record<Locale, Partial<Messages>>>` | ❌ | - | Custom translation overrides |
| `headless` | `boolean` | ❌ | `false` | Headless mode — hides toolbar and navigation arrows |
| `theme` | `Theme` | ❌ | `'dark'` | Theme mode: `'auto' \| 'dark' \| 'light'` |
| `showDownload` | `boolean` | ❌ | `true` | Whether to show the download button |
| `showClose` | `boolean` | ❌ | `false` | Whether to show the close button (default `false` for embed) |

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

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f9e9.svg" width="20" height="20" alt="🧩" /> Custom Renderers

The library supports custom renderers for handling file types not built-in. Custom renderers can optionally provide toolbar configurations and integrate with the library's architecture.

### Event-Driven Toolbar Updates

Custom renderers can implement real-time toolbar updates using Vue 3's reactivity system:

**Benefits:**
- **Real-time updates**: Toolbar reflects state changes immediately via Vue reactivity
- **Better performance**: No polling overhead, leverages Vue's efficient change detection
- **Type-safe**: Full TypeScript support with proper interfaces

**Implementation:**

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { ToolbarGroup } from '@eternalheart/vue-file-preview';

interface Props {
  url: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  pageChange: [current: number, total: number];
}>();

const currentPage = ref(1);
const totalPages = ref(10);

// Emit page changes
watch([currentPage, totalPages], () => {
  emit('pageChange', currentPage.value, totalPages.value);
});

const getToolbarGroups = (): ToolbarGroup[] => [
  {
    items: [
      {
        type: 'button',
        icon: ChevronLeft,
        tooltip: 'Previous Page',
        action: () => currentPage.value = Math.max(1, currentPage.value - 1),
        disabled: currentPage.value <= 1
      },
      {
        type: 'text',
        content: `${currentPage.value} / ${totalPages.value}`,
        minWidth: '4rem'
      },
      {
        type: 'button',
        icon: ChevronRight,
        tooltip: 'Next Page',
        action: () => currentPage.value = Math.min(totalPages.value, currentPage.value + 1),
        disabled: currentPage.value >= totalPages.value
      }
    ]
  }
];

// Expose for parent component
defineExpose({
  getToolbarGroups
});
</script>

<template>
  <div>Your custom renderer UI</div>
</template>
```

**Main component usage:**

```vue
<script setup>
import { CustomRenderer } from './CustomRenderer.vue';

const files = [
  { name: 'custom.xyz', type: 'application/custom', url: '/path/to/file' }
];
</script>

<template>
  <FilePreviewModal
    :files="files"
    :custom-renderers="[
      {
        test: (file) => file.type === 'application/custom',
        component: CustomRenderer
      }
    ]"
  />
</template>
```

The main component automatically tracks reactive changes in `getToolbarGroups()` via Vue's reactivity system. No manual subscription needed.

### Renderer Lazy Loading

All built-in renderers use code-splitting via `defineAsyncComponent` to minimize the main bundle size and improve initial load performance.

**Architecture:**

- **Registration**: Renderers register in `src/renderers/lazy.ts` using `defineAsyncComponent` wrappers
- **Loading**: Each renderer is a separate chunk, loaded on-demand when needed
- **Fallback**: `RendererLoading` component handles the loading state

**Bundle Size Impact:**

- Main entry point: gzip ≤ 60 KB (strictly enforced by CI)
- Each renderer: separate async chunk
- Total library: gzip ≤ 500 KB (all renderers combined)

**Implementation Example:**

```ts
// src/renderers/lazy.ts
import { defineAsyncComponent } from 'vue';

const wrap = (loader: () => Promise<any>) =>
  defineAsyncComponent({
    loader,
    loadingComponent: RendererLoading,
    delay: 0
  });

export const CustomRenderer = wrap(() => import('./Custom/index.vue'));
```

```vue
<!-- src/FilePreviewContent.vue -->
<script setup>
import { CustomRenderer } from './renderers/lazy';  // ✅ Lazy import
// NOT: import CustomRenderer from './renderers/Custom/index.vue';  // ❌ Direct import breaks code-splitting
</script>

<template>
  <CustomRenderer
    v-if="fileType === 'custom'"
    ref="rendererRef"
    :url="currentFile.url"
  />
</template>
```

**For Custom Renderers:**

If you want your custom renderer to benefit from code-splitting, use the same pattern:

```vue
<script setup>
import { defineAsyncComponent } from 'vue';

const MyCustomRenderer = defineAsyncComponent(() => import('./MyCustomRenderer.vue'));

const files = [...];
</script>

<template>
  <FilePreviewModal
    :files="files"
    :custom-renderers="[
      {
        test: (file) => file.type === 'application/custom',
        component: MyCustomRenderer
      }
    ]"
  />
</template>
```

### i18n Integration

Custom renderers can access the library's i18n system via the `useTranslator()` composable for consistent multilingual support.

**Architecture:**

- **Dictionary Source**: `file-preview-core/src/i18n/messages/` (zh-CN.ts, en-US.ts)
- **No Hardcoding**: All user-visible text must use translation keys
- **Automatic Locale Switching**: Follows the `locale` prop passed to `FilePreviewModal`

**Usage in Custom Renderers:**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useTranslator } from '@eternalheart/vue-file-preview';

interface Props {
  url: string;
}

const props = defineProps<Props>();
const { t } = useTranslator();
const error = ref<string | null>(null);
</script>

<template>
  <div v-if="error" class="vfp-text-fg-primary">
    {{ t('custom.load_failed') }}: {{ error }}
  </div>
  <div v-else>
    <button>{{ t('common.download') }}</button>
    <span>{{ t('custom.loading') }}</span>
  </div>
</template>
```

**Note on Usage:**

- In `<template>`: Use `t('key')` directly (automatically unwrapped)
- In `<script>`: Use `t.value('key')` for imperative calls

**Adding Custom Translation Keys:**

For custom renderers, extend translations via the `messages` prop (do NOT modify source files in `node_modules`):

```vue
<template>
  <FilePreviewModal
    :files="files"
    locale="en-US"
    :messages="{
      'en-US': {
        'custom.load_failed': 'Failed to load custom file',
        'custom.file_size': 'File size: {size} KB'
      },
      'zh-CN': {
        'custom.load_failed': '自定义文件加载失败',
        'custom.file_size': '文件大小: {size} KB'
      }
    }"
    :custom-renderers="[...]"
  />
</template>
```

**Guidelines:**
- Use `<scope>.<snake_name>` format (e.g., `custom.load_failed`, `custom.parse_error`)
- Provide translations for all enabled locales (`zh-CN` and `en-US`)
- Common keys already available: `common.loading`, `common.download`, `common.close`, `toolbar.*`

**Parameterized Translations:**

```vue
<template>
  <!-- Dictionary: 'custom.file_size': 'File size: {size} KB' -->
  <span>{{ t('custom.file_size', { size: 1024 }) }}</span>
  <!-- → "File size: 1024 KB" -->
</template>
```

**Toolbar Integration:**

Toolbar items should also use translated strings:

```ts
const getToolbarGroups = (): ToolbarGroup[] => [
  {
    items: [
      {
        type: 'button',
        icon: Download,
        tooltip: t.value('common.download'),  // ✅ Translated (use .value in script)
        action: handleDownload
      }
    ]
  }
];
```

### Theme Adaptation

Custom renderers must use semantic color tokens to support the library's `'auto' | 'dark' | 'light'` theme system.

**Semantic Token System:**

All colors are defined as CSS variables (`--fp-*`) and exposed via Tailwind classes with the `vfp-` prefix:

| Usage | Class | Description |
|-------|-------|-------------|
| **Text (fg)** | | |
| Primary text | `vfp-text-fg-primary` | Highest contrast |
| Body text | `vfp-text-fg-secondary` | Default text |
| Secondary text | `vfp-text-fg-tertiary` | Captions, counters |
| Muted text | `vfp-text-fg-muted` | Placeholders |
| Disabled text | `vfp-text-fg-disabled` | Disabled buttons |
| **Background (surface)** | | |
| Surface 1 | `vfp-bg-surface-1` | Cards, weakest |
| Surface 2 | `vfp-bg-surface-2` | Hover states |
| Surface 3 | `vfp-bg-surface-3` | Emphasis |
| Toolbar | `vfp-bg-surface-toolbar` | Top toolbar |
| **Borders** | | |
| Weak border | `vfp-border-line-weak` | Subtle lines |
| Standard border | `vfp-border-line` | Default borders |
| Strong border | `vfp-border-line-strong` | Emphasis |
| **Code** | | |
| Code background | `vfp-bg-code-bg` | Dark: #1e1e1e / Light: #f6f8fa |
| Code text | `vfp-text-code-fg` | Follows theme |
| **Accent** | | |
| Accent background | `vfp-bg-accent` | Primary buttons |
| Accent hover | `vfp-bg-accent-hover` | Hover state |

**✅ Correct Usage:**

```vue
<template>
  <div class="vfp-bg-surface-1 vfp-border vfp-border-line-weak vfp-rounded">
    <h2 class="vfp-text-fg-primary vfp-text-lg">Title</h2>
    <p class="vfp-text-fg-secondary">Body text</p>
    <button class="vfp-bg-surface-2 hover:vfp-bg-surface-3 vfp-text-fg-primary">
      Click me
    </button>
    <pre class="vfp-bg-code-bg vfp-text-code-fg">{{ code }}</pre>
  </div>
</template>
```

**For `<style scoped>` blocks**, use CSS variables:

```vue
<style scoped>
.my-block {
  color: var(--fp-fg-primary);
  background: var(--fp-surface-2);
  border: 1px solid var(--fp-line);
}

.my-code {
  background: var(--fp-code-bg);
  color: var(--fp-code-fg);
}
</style>
```

**❌ Incorrect Usage (DO NOT USE):**

```vue
<!-- ❌ Literal color classes — breaks theme switching -->
<div class="vfp-text-white/90 vfp-bg-white/10 vfp-border-white/15">
<div class="vfp-text-gray-700 vfp-bg-gray-100">

<!-- ❌ Inline literal colors -->
<div :style="{ color: '#ffffff', background: '#1f2937' }">

<!-- ❌ Hardcoded dark-only colors in scoped style -->
<style scoped>
.foo { color: rgba(255, 255, 255, 0.75); }   /* Use var(--fp-fg-secondary) */
.foo { background: #1e1e1e; }                 /* Use var(--fp-code-bg) */
</style>
```

**Theme-Aware Third-Party Libraries:**

For libraries with theme props (e.g., `shiki`), use `useResolvedTheme()`:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';
import { codeToHtml } from 'shiki';
import { useResolvedTheme } from '@eternalheart/vue-file-preview';

const props = defineProps<{ code: string; lang: string }>();
const resolvedTheme = useResolvedTheme();  // Ref<'dark' | 'light'>
const highlighted = ref('');

const highlightCode = async () => {
  highlighted.value = await codeToHtml(props.code, {
    lang: props.lang,
    theme: resolvedTheme.value === 'light' ? 'github-light' : 'dark-plus'
  });
};

// Re-highlight when theme changes
watch(resolvedTheme, highlightCode, { immediate: true });
</script>

<template>
  <div v-html="highlighted"></div>
</template>
```

**Testing:**

Always test your custom renderer in both Light and Dark themes:

```vue
<FilePreviewModal
  :files="files"
  theme="light"  // Switch between 'light', 'dark', 'auto'
  :custom-renderers="[...]"
/>
```

Verify:
- Text is readable in both themes (no white-on-white or black-on-black)
- Borders and dividers are visible
- Hover states have sufficient contrast
- Code blocks follow theme (not always dark)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="20" height="20" alt="⌨️" /> Keyboard Shortcuts

- `ESC` - Close preview
- `←` - Previous file
- `→` - Next file
- `Mouse Wheel` - Zoom image (image preview only)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4da.svg" width="20" height="20" alt="📚" /> Documentation

- [Full Documentation](https://wh131462.github.io/file-preview/docs/)
- [Vue Demo](https://wh131462.github.io/file-preview/vue/)
- [React Demo](https://wh131462.github.io/file-preview/)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f6e0.svg" width="20" height="20" alt="🛠️" /> Development

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

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c4.svg" width="20" height="20" alt="📄" /> License

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f91d.svg" width="20" height="20" alt="🤝" /> Contributing

Issues and Pull Requests are welcome!

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f517.svg" width="20" height="20" alt="🔗" /> Links

- [GitHub](https://github.com/wh131462/file-preview)
- [npm](https://www.npmjs.com/package/@eternalheart/vue-file-preview)
- [Vue Demo](https://wh131462.github.io/file-preview/vue/)
- [Issue Tracker](https://github.com/wh131462/file-preview/issues)
