# File Preview

[![npm version](https://img.shields.io/npm/v/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)
[![license](https://img.shields.io/npm/l/@eternalheart/react-file-preview.svg)](https://github.com/wh131462/file-preview/blob/master/LICENSE)
[![react-file-preview downloads](https://img.shields.io/npm/dm/@eternalheart/react-file-preview.svg?label=@eternalheart/react-file-preview)](https://www.npmjs.com/package/@eternalheart/react-file-preview)
[![vue-file-preview downloads](https://img.shields.io/npm/dm/@eternalheart/vue-file-preview.svg?label=@eternalheart/vue-file-preview)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)

English | [简体中文](./README.zh-CN.md)

A modern, feature-rich file preview component library with **first-class support for both React and Vue**. Preview images, videos, audio, PDFs, Office documents (Word, Excel, PowerPoint), Markdown, and code files — through a shared core and framework-specific bindings.

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2728.svg" width="20" height="20" alt="✨" /> Key Features

- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a8.svg" width="16" height="16" alt="🎨" style="vertical-align: middle;" /> **Modern UI** — Clean and modern interface with smooth animations
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c1.svg" width="16" height="16" alt="📁" style="vertical-align: middle;" /> **20+ Format Support** — Images, videos, audio, PDF, Office, code, e-books, and more
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1fa9f.svg" width="16" height="16" alt="🪟" style="vertical-align: middle;" /> **Dual Display Modes** — Full-screen modal or inline embedded preview
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3af.svg" width="16" height="16" alt="🎯" style="vertical-align: middle;" /> **Multi-framework Support** — React and Vue share core logic with consistent APIs
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="16" height="16" alt="⌨️" style="vertical-align: middle;" /> **Full Interaction** — Keyboard navigation, drag-and-drop, zoom/rotate, custom players

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f310.svg" width="20" height="20" alt="🌐" /> Quick Navigation

<table>
<tr>
  <td width="33%"><strong><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4d6.svg" width="16" height="16" alt="📖" style="vertical-align: middle;" /> Documentation & Demos</strong></td>
  <td width="33%"><strong><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e6.svg" width="16" height="16" alt="📦" style="vertical-align: middle;" /> Packages & Resources</strong></td>
  <td width="33%"><strong><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f6e0.svg" width="16" height="16" alt="🛠️" style="vertical-align: middle;" /> Development & Contributing</strong></td>
</tr>
<tr>
  <td>
    &bull; <a href="https://wh131462.github.io/file-preview/docs/">Full Documentation</a><br>
    &bull; <a href="https://wh131462.github.io/file-preview/">React Demo</a><br>
    &bull; <a href="https://wh131462.github.io/file-preview/vue/">Vue Demo</a>
  </td>
  <td>
    &bull; <a href="https://www.npmjs.com/package/@eternalheart/react-file-preview">React Package</a><br>
    &bull; <a href="https://www.npmjs.com/package/@eternalheart/vue-file-preview">Vue Package</a><br>
    &bull; <a href="https://github.com/wh131462/file-preview/issues">Issue Tracker</a>
  </td>
  <td>
    &bull; <a href="#-project-architecture">Monorepo Structure</a><br>
    &bull; <a href="#-development-guide">Dev Commands</a><br>
    &bull; <a href="./CONTRIBUTING.md">Contributing Guide</a>
  </td>
</tr>
</table>

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3af.svg" width="20" height="20" alt="🎯" /> Quick Start

### React

```bash
npm install @eternalheart/react-file-preview
```

```tsx
import { FilePreviewModal } from '@eternalheart/react-file-preview';
import '@eternalheart/react-file-preview/style.css';

<FilePreviewModal
  files={[file]}
  currentIndex={0}
  isOpen={true}
  onClose={() => setIsOpen(false)}
/>
```

<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f449.svg" width="16" height="16" alt="👉" style="vertical-align: middle;" /> [View React Full Documentation](./packages/react-file-preview/README.md) | [Live Demo](https://wh131462.github.io/file-preview/)

### Vue

```bash
npm install @eternalheart/vue-file-preview
```

```vue
<script setup>
import { FilePreviewModal } from '@eternalheart/vue-file-preview';
import '@eternalheart/vue-file-preview/style.css';
</script>

<template>
  <FilePreviewModal
    :files="[file]"
    :current-index="0"
    :is-open="true"
    @close="isOpen = false"
  />
</template>
```

<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f449.svg" width="16" height="16" alt="👉" style="vertical-align: middle;" /> [View Vue Full Documentation](./packages/vue-file-preview/README.md) | [Live Demo](https://wh131462.github.io/file-preview/vue/)

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e6.svg" width="20" height="20" alt="📦" /> Package Overview

| Package | Description | Version | Documentation |
|---------|-------------|---------|---------------|
| [@eternalheart/react-file-preview](https://www.npmjs.com/package/@eternalheart/react-file-preview) | React component library | [![npm](https://img.shields.io/npm/v/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview) | [README](./packages/react-file-preview/README.md) |
| [@eternalheart/vue-file-preview](https://www.npmjs.com/package/@eternalheart/vue-file-preview) | Vue 3 component library | [![npm](https://img.shields.io/npm/v/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview) | [README](./packages/vue-file-preview/README.md) |
| file-preview-core | Framework-agnostic core | Internal | - |

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4cb.svg" width="20" height="20" alt="📋" /> Supported Formats

<table>
<tr>
  <th width="15%">Type</th>
  <th width="40%">Formats</th>
  <th width="45%">Key Features</th>
</tr>
<tr>
  <td><strong>Images</strong></td>
  <td>JPG, PNG, GIF, WebP, SVG, BMP, ICO, AVIF, HEIC</td>
  <td>Zoom (0.1x-10x), rotate, drag, mouse wheel zoom</td>
</tr>
<tr>
  <td><strong>Videos</strong></td>
  <td>MP4, WebM, OGG, MOV, AVI, MKV, M4V, 3GP, FLV</td>
  <td>Custom player, progress control, volume adjustment, fullscreen</td>
</tr>
<tr>
  <td><strong>Audio</strong></td>
  <td>MP3, WAV, OGG, M4A, AAC, FLAC</td>
  <td>Custom player, progress bar, volume control, skip forward/backward</td>
</tr>
<tr>
  <td><strong>Documents</strong></td>
  <td>PDF, DOCX, XLSX, PPTX/PPT</td>
  <td>Pagination, zoom, slide preview, spreadsheet view</td>
</tr>
<tr>
  <td><strong>Code</strong></td>
  <td>JS, TS, Python, Java, C++, Go, Rust, and 40+ languages</td>
  <td>Syntax highlighting, theme support, line numbers</td>
</tr>
<tr>
  <td><strong>Subtitles</strong></td>
  <td>SRT, WebVTT, LRC, ASS/SSA, TTML/DFXP</td>
  <td>Timeline parsing, metadata extraction, structured display</td>
</tr>
<tr>
  <td><strong>Others</strong></td>
  <td>Markdown, CSV, JSON, XML, ZIP, MSG, EPUB, Fonts</td>
  <td>Rendering, formatting, tree view, character set preview</td>
</tr>
</table>

<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f449.svg" width="16" height="16" alt="👉" style="vertical-align: middle;" /> [View complete format list and examples](https://wh131462.github.io/file-preview/docs/guide/supported-formats.html)

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3d7.svg" width="20" height="20" alt="🏗️" /> Project Architecture

This project uses a pnpm workspace monorepo architecture:

```
file-preview/
├── packages/
│   ├── file-preview-core/     # Framework-agnostic core (types, detection, parsers)
│   ├── react-file-preview/    # React bindings → @eternalheart/react-file-preview
│   ├── vue-file-preview/      # Vue bindings → @eternalheart/vue-file-preview
│   ├── example/               # React demo app (deployed to GitHub Pages)
│   ├── vue-example/           # Vue demo app (deployed to GitHub Pages /vue)
│   └── docs/                  # VitePress documentation site
└── openspec/                  # OpenSpec change records
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f6e0.svg" width="20" height="20" alt="🛠️" /> Development Guide

### Install Dependencies

```bash
pnpm install
```

### Development Commands

```bash
# Start dev servers
pnpm dev              # React demo
pnpm dev:vue          # Vue demo
pnpm dev:docs         # Documentation site

# Build
pnpm build            # Build all packages
pnpm build:lib        # Build library only
pnpm build:example    # Build examples only

# Preview builds
pnpm preview:example  # Preview example build
pnpm preview:docs     # Preview docs build

# Deploy and publish
pnpm deploy           # Deploy examples and docs to GitHub Pages
pnpm pub              # Publish library to npm
```

### Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Submit a Pull Request

<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f449.svg" width="16" height="16" alt="👉" style="vertical-align: middle;" /> [Read full contributing guide](./CONTRIBUTING.md)

---


## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f9e9.svg" width="20" height="20" alt="🧩" /> Custom Renderers

Support custom renderers for file types not built-in.

**React Example:**

```tsx
import { FilePreviewModal } from '@eternalheart/react-file-preview';

const customRenderers = [
  {
    test: (file) => file.type === 'application/custom',
    component: ({ url }) => <div>Custom render: {url}</div>
  }
];

<FilePreviewModal files={files} customRenderers={customRenderers} />
```

**Vue Example:**

```vue
<script setup>
import { FilePreviewModal } from '@eternalheart/vue-file-preview';

const CustomRenderer = {
  props: ['url'],
  template: '<div>Custom render: {{ url }}</div>'
};

const customRenderers = [
  {
    test: (file) => file.type === 'application/custom',
    component: CustomRenderer
  }
];
</script>

<template>
  <FilePreviewModal :files="files" :custom-renderers="customRenderers" />
</template>
```

<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f449.svg" width="16" height="16" alt="👉" style="vertical-align: middle;" /> Full documentation: [React Custom Renderers](./packages/react-file-preview/README.md#-custom-renderers) | [Vue Custom Renderers](./packages/vue-file-preview/README.md#-custom-renderers)

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="20" height="20" alt="⌨️" /> Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `ESC` | Close preview |
| `←` / `→` | Navigate to previous/next file |
| `Mouse Wheel` | Zoom image (image preview only) |

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c4.svg" width="20" height="20" alt="📄" /> License

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f517.svg" width="20" height="20" alt="🔗" /> Links

- **GitHub**: [wh131462/file-preview](https://github.com/wh131462/file-preview)
- **Documentation**: [wh131462.github.io/file-preview/docs](https://wh131462.github.io/file-preview/docs/)
- **Issue Tracker**: [GitHub Issues](https://github.com/wh131462/file-preview/issues)
- **Community**: [Linux.do](https://linux.do/)

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4ac.svg" width="20" height="20" alt="💬" /> Community & Support

If this project helps you, please:

- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2b50.svg" width="16" height="16" alt="⭐" style="vertical-align: middle;" /> Star the project on GitHub
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f41b.svg" width="16" height="16" alt="🐛" style="vertical-align: middle;" /> [Report issues](https://github.com/wh131462/file-preview/issues) to help us improve
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4a1.svg" width="16" height="16" alt="💡" style="vertical-align: middle;" /> [Submit PRs](https://github.com/wh131462/file-preview/pulls) to contribute code
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e2.svg" width="16" height="16" alt="📢" style="vertical-align: middle;" /> Share it with more developers
