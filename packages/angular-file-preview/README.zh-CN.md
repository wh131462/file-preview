# Angular File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/angular-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/angular-file-preview)

[English](./README.md) | 简体中文

面向 Angular 19+ 的文件预览组件，支持图片、视频、音频、PDF、Office、Markdown 与代码文件。公开 API 与 React / Vue 包对齐。

## 安装

```bash
npm install @eternalheart/angular-file-preview
```

需要额外引入样式：

```ts
import '@eternalheart/angular-file-preview/style.css';
```

Peer：`@angular/core` / `@angular/common` `>=19.0.0`，`rxjs` `>=7.8.0`。

## 快速开始

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

## 组件

| 组件 | 选择器 | 场景 |
|------|--------|------|
| `FilePreviewModal` | `afp-file-preview-modal` | 全屏弹窗，挂到 `document.body` |
| `FilePreviewEmbed` | `afp-file-preview-embed` | 内联嵌入父容器 |
| `FilePreviewContent` | `afp-file-preview-content` | 底层内容，供自定义包装 |

`FilePreviewModal` 的输入/输出与 Vue / React 版本一致：`files` / `currentIndex` / `isOpen` / `theme` / `locale` / `showDownload` 等；事件为 `close` / `navigate` / `customEvent`。

## License

MIT
