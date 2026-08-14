# Angular File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/angular-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/angular-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/angular-file-preview.svg)](https://github.com/wh131462/file-preview/blob/master/LICENSE)

English | [简体中文](./README.zh-CN.md)

A modern, feature-rich file preview component for Angular (19+) with support for images, videos, audio, PDFs, Office documents, Markdown, and code files. API is aligned with the React and Vue packages.

## Installation

```bash
npm install @eternalheart/angular-file-preview
```

Import the CSS once:

```ts
import '@eternalheart/angular-file-preview/style.css';
```

Peer dependencies: `@angular/core` / `@angular/common` `>=19.0.0`, `rxjs` `>=7.8.0`.

## Quick Start

```ts
import { Component, signal } from '@angular/core';
import { FilePreviewModal } from '@eternalheart/angular-file-preview';
import '@eternalheart/angular-file-preview/style.css';

@Component({
  standalone: true,
  imports: [FilePreviewModal],
  template: `
    <input type="file" (change)="onSelect($event)" />
    <afp-file-preview-modal
      [files]="files()"
      [currentIndex]="currentIndex()"
      [isOpen]="isOpen()"
      (close)="isOpen.set(false)"
      (navigate)="currentIndex.set($event)"
    />
  `,
})
export class AppComponent {
  files = signal<File[]>([]);
  currentIndex = signal(0);
  isOpen = signal(false);

  onSelect(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.files.set([file]);
    this.currentIndex.set(0);
    this.isOpen.set(true);
  }
}
```

## Components

| Component | Selector | Use |
|-----------|----------|-----|
| `FilePreviewModal` | `afp-file-preview-modal` | Full-screen overlay, portaled to `document.body` |
| `FilePreviewEmbed` | `afp-file-preview-embed` | Inline preview filling a parent container |
| `FilePreviewContent` | `afp-file-preview-content` | Headless content used by the two wrappers |

### FilePreviewModal inputs / outputs

**Inputs:** `files` (required), `currentIndex` (required), `isOpen` (required), `customRenderers`, `locale`, `messages`, `headless`, `theme`, `requestInit`, `requestHandler`, `shouldFetchAsBlob`, `onDownload`, `showClose`, `showDownload`

**Outputs:** `close`, `navigate`, `customEvent`

Behavior matches `@eternalheart/vue-file-preview` / `@eternalheart/react-file-preview`.

### FilePreviewEmbed

```html
<afp-file-preview-embed
  [files]="files()"
  [currentIndex]="0"
  [theme]="'dark'"
  (navigate)="currentIndex.set($event)"
/>
```

Optional `width` / `height` inputs default to `100%`.

## PDF.js (optional)

Same as Vue: call `configurePdfWorker(pdfjsLib, { workerSrc, cMapUrl, cMapPacked })` if you serve worker files locally.

## License

MIT
