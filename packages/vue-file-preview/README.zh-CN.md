# Vue File Preview [![npm version](https://img.shields.io/npm/v/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)[![license](https://img.shields.io/npm/l/@eternalheart/vue-file-preview.svg)](https://github.com/wh131462/file-preview/blob/master/LICENSE)[![downloads](https://img.shields.io/npm/dm/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)

[English](./README.md) | 简体中文

一个现代化、功能丰富的 Vue 3 文件预览组件,支持图片、视频、音频、PDF、Office 文档(Word、Excel、PowerPoint)、Markdown 和代码文件预览。

## ✨ 特性

- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a8.svg" width="16" height="16" alt="🎨" style="vertical-align: middle;" /> **现代化 UI** - 简洁现代的界面设计，流畅动画
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c1.svg" width="16" height="16" alt="📁" style="vertical-align: middle;" /> **多格式支持** - 支持 20+ 种文件格式
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1fa9f.svg" width="16" height="16" alt="🪟" style="vertical-align: middle;" /> **两种展示模式** - 全屏弹窗 **或** 嵌入式内联预览
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f5bc.svg" width="16" height="16" alt="🖼️" style="vertical-align: middle;" /> **强大的图片查看器** - 缩放、旋转、拖拽、滚轮缩放
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" width="16" height="16" alt="🎬" style="vertical-align: middle;" /> **自定义视频播放器** - 基于 Video.js,支持多种视频格式
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b5.svg" width="16" height="16" alt="🎵" style="vertical-align: middle;" /> **自定义音频播放器** - 精美的音频控制界面
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c4.svg" width="16" height="16" alt="📄" style="vertical-align: middle;" /> **PDF 查看器** - 支持分页浏览
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4ca.svg" width="16" height="16" alt="📊" style="vertical-align: middle;" /> **Office 文档支持** - Word、Excel、PowerPoint 文件预览
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4dd.svg" width="16" height="16" alt="📝" style="vertical-align: middle;" /> **Markdown 渲染** - 支持 GitHub Flavored Markdown
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4bb.svg" width="16" height="16" alt="💻" style="vertical-align: middle;" /> **代码高亮** - 支持 40+ 种编程语言
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4f1.svg" width="16" height="16" alt="📱" style="vertical-align: middle;" /> **响应式设计** - 适配各种屏幕尺寸
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="16" height="16" alt="⌨️" style="vertical-align: middle;" /> **键盘导航** - 支持方向键和 ESC 键

## 📦 安装

```bash
# 使用 npm
npm install @eternalheart/vue-file-preview

# 使用 yarn
yarn add @eternalheart/vue-file-preview

# 使用 pnpm
pnpm add @eternalheart/vue-file-preview
```

**重要提示：** 你还需要导入 CSS 文件：

```ts
import '@eternalheart/vue-file-preview/style.css';
```

### PDF.js 配置（可选）

如果你需要预览 PDF 文件，建议配置 PDF.js 使用本地静态文件以提高性能和稳定性：

#### 方式 1: 使用 CDN（默认）

默认情况下，组件会自动使用 unpkg CDN 加载 PDF.js，无需额外配置。

#### 方式 2: 使用本地静态文件（推荐用于生产环境）

1. 将 PDF.js 文件复制到你的 public 目录：

```bash
cp -r node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdfjs/
cp -r node_modules/pdfjs-dist/cmaps public/pdfjs/
```

2. 在应用入口配置 PDF.js：

```ts
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { configurePdfWorker } from '@eternalheart/vue-file-preview';

configurePdfWorker(pdfjsLib, {
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true,
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

## 🚀 快速开始

### 基础用法

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

### 多种输入类型

组件支持三种类型的文件输入：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { FilePreviewModal, type PreviewFileInput } from '@eternalheart/vue-file-preview';
import '@eternalheart/vue-file-preview/style.css';

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

### 嵌入模式 (`FilePreviewEmbed`)

除了全屏弹窗,组件库还提供了**嵌入式**变体,可以将预览内联渲染到任意容器中,适合详情面板、左右分栏布局、仪表盘等场景。

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

与 `FilePreviewModal` 的区别:

- 不使用 Teleport、无全屏遮罩、没有 `isOpen` / `@close`
- **不显示关闭按钮**
- 键盘导航 (←/→) 作用域限定在嵌入容器内 (基于 focus)
- 尺寸默认 `width: 100%; height: 100%`,可通过 `width` / `height` props 覆盖

```vue
<!-- 显式指定尺寸 -->
<FilePreviewEmbed :files="files" :width="800" :height="500" />
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

### 字体
- **格式**: TTF, OTF, WOFF, WOFF2
- **功能**: 字体元数据（字体家族、设计师、版本）、字符集预览、自定义文本输入、多字号展示

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

## 🎮 API 参考

### FilePreviewModal Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `files` | `PreviewFileInput[]` | ✅ | 文件列表（支持 File 对象、文件对象或 URL 字符串） |
| `currentIndex` | `number` | ✅ | 当前文件索引 |
| `isOpen` | `boolean` | ✅ | 是否打开预览 |
| `customRenderers` | `CustomRenderer[]` | ❌ | 自定义渲染器 |
| `locale` | `Locale` | ❌ | 界面语言（默认 `'zh-CN'`，内置 `'en-US'`） |
| `messages` | `Partial<Record<Locale, Partial<Messages>>>` | ❌ | 自定义翻译覆盖 |
| `headless` | `boolean` | ❌ | 无头模式，隐藏工具栏和导航箭头 |
| `theme` | `Theme` | ❌ | 主题模式: `'auto' \| 'dark' \| 'light'`（默认 `'dark'`） |
| `showDownload` | `boolean` | ❌ | 是否显示下载按钮（默认 `true`） |

### FilePreviewModal 事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `close` | - | 关闭预览时触发 |
| `navigate` | `number` | 导航到其他文件时触发 |

### FilePreviewEmbed Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `files` | `PreviewFileInput[]` | ✅ | - | 文件列表 |
| `currentIndex` | `number` | ❌ | `0` | 当前文件索引 |
| `customRenderers` | `CustomRenderer[]` | ❌ | - | 自定义渲染器 |
| `width` | `number \| string` | ❌ | `'100%'` | 容器宽度 |
| `height` | `number \| string` | ❌ | `'100%'` | 容器高度 |
| `locale` | `Locale` | ❌ | `'zh-CN'` | 界面语言（`'zh-CN'` 或 `'en-US'`） |
| `messages` | `Partial<Record<Locale, Partial<Messages>>>` | ❌ | - | 自定义翻译覆盖 |
| `headless` | `boolean` | ❌ | `false` | 无头模式，隐藏工具栏和导航箭头 |
| `theme` | `Theme` | ❌ | `'dark'` | 主题模式: `'auto' \| 'dark' \| 'light'` |
| `showDownload` | `boolean` | ❌ | `true` | 是否显示下载按钮 |

### FilePreviewEmbed 事件

| 事件 | 参数 | 说明 |
|------|------|------|
| `navigate` | `number` | 导航到其他文件时触发 |

### FilePreviewContent（高级用法）

`FilePreviewModal` 和 `FilePreviewEmbed` 都是基于底层 `FilePreviewContent` 组件的薄包装。当你需要构建完全自定义的容器时,可以直接使用它:

```vue
<FilePreviewContent
  mode="embed"
  :files="files"
  :current-index="index"
  @navigate="index = $event"
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

## 🧩 自定义渲染器

本库支持自定义渲染器以处理内置不支持的文件类型。自定义渲染器可以可选地提供工具栏配置并集成到本库的架构中。

### 事件驱动的工具栏更新

自定义渲染器可以通过 Vue 3 的响应式系统实现实时工具栏更新：

**优势：**
- **实时更新**：工具栏通过 Vue 响应式立即反映状态变化
- **更好的性能**：无轮询开销，利用 Vue 的高效变更检测
- **类型安全**：完整的 TypeScript 接口支持

**实现方式：**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';
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

// 发送页码变化
watch([currentPage, totalPages], () => {
  emit('pageChange', currentPage.value, totalPages.value);
});

const getToolbarGroups = (): ToolbarGroup[] => [
  {
    items: [
      {
        type: 'button',
        icon: ChevronLeft,
        tooltip: '上一页',
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
        tooltip: '下一页',
        action: () => currentPage.value = Math.min(totalPages.value, currentPage.value + 1),
        disabled: currentPage.value >= totalPages.value
      }
    ]
  }
];

// 暴露给父组件
defineExpose({
  getToolbarGroups
});
</script>

<template>
  <div>你的自定义渲染器 UI</div>
</template>
```

**主组件使用：**

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

主组件通过 Vue 的响应式系统自动追踪 `getToolbarGroups()` 的响应式变化。无需手动订阅。

### Renderer 懒加载

所有内置渲染器通过 `defineAsyncComponent` 实现代码分割，以最小化主包体积并提升初始加载性能。

**架构：**

- **注册**：渲染器在 `src/renderers/lazy.ts` 中注册，使用 `defineAsyncComponent` 包装
- **加载**：每个渲染器是独立的 chunk，按需加载
- **回退**：`RendererLoading` 组件处理加载状态

**打包体积影响：**

- 主入口：gzip ≤ 60 KB（CI 强制约束）
- 每个渲染器：独立异步 chunk
- 整个库：gzip ≤ 500 KB（所有渲染器合计）

**实现示例：**

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
import { CustomRenderer } from './renderers/lazy';  // ✅ 懒加载导入
// 禁止: import CustomRenderer from './renderers/Custom/index.vue';  // ❌ 直接导入会破坏代码分割
</script>

<template>
  <CustomRenderer
    v-if="fileType === 'custom'"
    ref="rendererRef"
    :url="currentFile.url"
  />
</template>
```

**用于自定义渲染器：**

如果你希望自定义渲染器也享受代码分割，可以使用相同的模式：

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

### i18n 集成

自定义渲染器可以通过 `useTranslator()` composable 访问本库的 i18n 系统，实现一致的多语言支持。

**架构：**

- **字典源**：`file-preview-core/src/i18n/messages/`（zh-CN.ts、en-US.ts）
- **禁止硬编码**：所有用户可见文案必须使用翻译 key
- **自动切换语言**：跟随 `FilePreviewModal` 的 `locale` prop

**在自定义渲染器中使用：**

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

**使用说明：**

- 在 `<template>` 中：直接使用 `t('key')`（自动解包）
- 在 `<script>` 中：命令式调用使用 `t.value('key')`

**新增翻译 key：**

1. 在 `file-preview-core/src/i18n/messages/` 的 `zh-CN.ts` 和 `en-US.ts` 中同时添加 key
2. 使用 `<scope>.<snake_name>` 格式（如 `custom.load_failed`、`custom.parse_error`）
3. 已有通用 key：`common.loading`、`common.download`、`common.close`、`toolbar.*`

**参数化翻译：**

```vue
<template>
  <!-- 字典: 'custom.file_size': '文件大小: {size} KB' -->
  <span>{{ t('custom.file_size', { size: 1024 }) }}</span>
  <!-- → "文件大小: 1024 KB" -->
</template>
```

**工具栏集成：**

工具栏项也应使用翻译字符串：

```ts
const getToolbarGroups = (): ToolbarGroup[] => [
  {
    items: [
      {
        type: 'button',
        icon: Download,
        tooltip: t.value('common.download'),  // ✅ 已翻译（script 中用 .value）
        action: handleDownload
      }
    ]
  }
];
```

### 主题适配

自定义渲染器必须使用语义化颜色 token 以支持本库的 `'auto' | 'dark' | 'light'` 主题系统。

**语义化 Token 系统：**

所有颜色定义为 CSS 变量（`--fp-*`），通过 Tailwind 类暴露，前缀为 `vfp-`：

| 用途 | 类名 | 说明 |
|------|------|------|
| **文字（fg）** | | |
| 主文本 | `vfp-text-fg-primary` | 最高对比度 |
| 正文 | `vfp-text-fg-secondary` | 默认文字 |
| 次要文本 | `vfp-text-fg-tertiary` | 副本、计数器 |
| 弱化文本 | `vfp-text-fg-muted` | 占位符 |
| 禁用文本 | `vfp-text-fg-disabled` | 禁用按钮 |
| **背景（surface）** | | |
| 表面层 1 | `vfp-bg-surface-1` | 卡片、最弱 |
| 表面层 2 | `vfp-bg-surface-2` | hover 状态 |
| 表面层 3 | `vfp-bg-surface-3` | 强调 |
| 工具栏 | `vfp-bg-surface-toolbar` | 顶部工具栏 |
| **边框** | | |
| 弱边框 | `vfp-border-line-weak` | 细线 |
| 标准边框 | `vfp-border-line` | 默认边框 |
| 强边框 | `vfp-border-line-strong` | 强调 |
| **代码** | | |
| 代码背景 | `vfp-bg-code-bg` | Dark：#1e1e1e / Light：#f6f8fa |
| 代码文字 | `vfp-text-code-fg` | 跟随主题 |
| **强调（accent）** | | |
| 强调背景 | `vfp-bg-accent` | 主按钮 |
| 强调 hover | `vfp-bg-accent-hover` | hover 状态 |

**✅ 正确用法：**

```vue
<template>
  <div class="vfp-bg-surface-1 vfp-border vfp-border-line-weak vfp-rounded">
    <h2 class="vfp-text-fg-primary vfp-text-lg">标题</h2>
    <p class="vfp-text-fg-secondary">正文内容</p>
    <button class="vfp-bg-surface-2 hover:vfp-bg-surface-3 vfp-text-fg-primary">
      点击
    </button>
    <pre class="vfp-bg-code-bg vfp-text-code-fg">{{ code }}</pre>
  </div>
</template>
```

**对于 `<style scoped>` 块**，使用 CSS 变量：

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

**❌ 错误用法（禁止使用）：**

```vue
<!-- ❌ 字面色类 — 会破坏主题切换 -->
<div class="vfp-text-white/90 vfp-bg-white/10 vfp-border-white/15">
<div class="vfp-text-gray-700 vfp-bg-gray-100">

<!-- ❌ 内联字面色 -->
<div :style="{ color: '#ffffff', background: '#1f2937' }">

<!-- ❌ scoped style 中硬编码暗色 -->
<style scoped>
.foo { color: rgba(255, 255, 255, 0.75); }   /* 应该用 var(--fp-fg-secondary) */
.foo { background: #1e1e1e; }                 /* 应该用 var(--fp-code-bg) */
</style>
```

**支持主题的三方库：**

对于具有 theme prop 的库（如 `shiki`），使用 `useResolvedTheme()`：

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

// 主题切换时重新高亮
watch(resolvedTheme, highlightCode, { immediate: true });
</script>

<template>
  <div v-html="highlighted"></div>
</template>
```

**测试：**

务必在 Light 和 Dark 两个主题下测试你的自定义渲染器：

```vue
<FilePreviewModal
  :files="files"
  theme="light"  // 在 'light'、'dark'、'auto' 间切换
  :custom-renderers="[...]"
/>
```

验证：
- 文字在两个主题下都可读（无白底白字或黑底黑字）
- 边框和分隔线清晰可见
- hover 状态有足够对比度
- 代码块跟随主题（不固定为暗色）

## ⌨️ 键盘快捷键

- `ESC` - 关闭预览
- `←` - 上一个文件
- `→` - 下一个文件
- `滚轮` - 缩放图片 (仅图片预览)

## 📚 文档

- [完整文档](https://wh131462.github.io/file-preview/docs/)
- [Vue 在线演示](https://wh131462.github.io/file-preview/vue/)
- [React 在线演示](https://wh131462.github.io/file-preview/)

## 📦 包信息

### Peer Dependencies

- `vue`: ^3.4.0

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

```bash
# 克隆仓库
git clone https://github.com/wh131462/file-preview.git

# 安装依赖
pnpm install

# 启动开发服务器（Vue 演示应用）
pnpm dev:vue-example

# 构建库
pnpm build:vue
```

## 📄 许可证

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 🔗 相关链接

- [GitHub](https://github.com/wh131462/file-preview)
- [npm](https://www.npmjs.com/package/@eternalheart/vue-file-preview)
- [Vue 在线演示](https://wh131462.github.io/file-preview/vue/)
- [问题反馈](https://github.com/wh131462/file-preview/issues)
