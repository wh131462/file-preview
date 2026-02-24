# 工具函数

## VERSION

当前包的版本号常量。

```typescript
import { VERSION } from '@eternalheart/react-file-preview'

console.log(VERSION) // e.g. "1.0.5"
```

## normalizeFile

将单个文件输入标准化为内部使用的 `PreviewFile` 格式。

### 签名

```typescript
function normalizeFile(
  input: PreviewFileInput,
  index: number
): PreviewFile
```

### 参数

- `input` - 输入的文件，支持三种格式：
  - `File` 对象：会创建 Object URL
  - `PreviewFileLink` 对象：直接使用提供的信息
  - `string`：作为 URL，从文件名推断 MIME 类型
- `index` - 文件索引，用于生成唯一 ID

### 返回值

返回标准化后的 `PreviewFile` 对象，包含：
- `id`: 唯一标识符（自动生成或使用提供的）
- `name`: 文件名
- `url`: 文件 URL
- `type`: MIME 类型（自动推断或使用提供的）
- `size`: 文件大小（如果可用）

### 示例

```typescript
import { normalizeFile } from '@eternalheart/react-file-preview'

// 1. 标准化 URL 字符串
const file1 = normalizeFile('https://example.com/image.jpg', 0)
// {
//   id: 'file-0-1234567890',
//   name: 'image.jpg',
//   url: 'https://example.com/image.jpg',
//   type: 'image/jpeg'
// }

// 2. 标准化文件对象
const file2 = normalizeFile({
  name: 'document.pdf',
  url: '/files/doc.pdf',
  type: 'application/pdf',
  size: 1024000
}, 1)
// {
//   id: 'file-1-1234567890',
//   name: 'document.pdf',
//   url: '/files/doc.pdf',
//   type: 'application/pdf',
//   size: 1024000
// }

// 3. 标准化 File 对象
const fileObj = new File(['content'], 'text.txt', { type: 'text/plain' })
const file3 = normalizeFile(fileObj, 2)
// {
//   id: 'file-2-1234567890',
//   name: 'text.txt',
//   url: 'blob:http://...',  // Object URL
//   type: 'text/plain',
//   size: 7
// }
```

## normalizeFiles

将文件数组批量标准化为内部使用的格式。

### 签名

```typescript
function normalizeFiles(inputs: PreviewFileInput[]): PreviewFile[]
```

### 参数

- `inputs` - 输入的文件数组，每个元素可以是 `File` 对象、`PreviewFileLink` 对象或 URL 字符串

### 返回值

返回标准化后的 `PreviewFile` 数组。

### 示例

```typescript
import { normalizeFiles } from '@eternalheart/react-file-preview'

const inputs = [
  'https://example.com/image.jpg',
  {
    name: 'document.pdf',
    url: '/files/doc.pdf',
    type: 'application/pdf'
  },
  new File(['content'], 'text.txt', { type: 'text/plain' })
]

const normalized = normalizeFiles(inputs)
// [
//   {
//     id: 'file-0-1234567890',
//     name: 'image.jpg',
//     url: 'https://example.com/image.jpg',
//     type: 'image/jpeg'
//   },
//   {
//     id: 'file-1-1234567890',
//     name: 'document.pdf',
//     url: '/files/doc.pdf',
//     type: 'application/pdf'
//   },
//   {
//     id: 'file-2-1234567890',
//     name: 'text.txt',
//     url: 'blob:http://...',
//     type: 'text/plain',
//     size: 7
//   }
// ]
```

## MIME 类型推断

`normalizeFile` 和 `normalizeFiles` 会自动根据文件扩展名推断 MIME 类型，支持 40+ 种文件扩展名：

### 图片
- `.jpg`, `.jpeg` → `image/jpeg`
- `.png` → `image/png`
- `.gif` → `image/gif`
- `.webp` → `image/webp`
- `.svg` → `image/svg+xml`
- `.bmp` → `image/bmp`
- `.ico` → `image/x-icon`

### 文档
- `.pdf` → `application/pdf`
- `.docx` → `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `.xlsx` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `.pptx`, `.ppt` → `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- `.msg` → `application/vnd.ms-outlook`

### 视频
- `.mp4` → `video/mp4`
- `.webm` → `video/webm`
- `.ogg`, `.ogv` → `video/ogg`
- `.mov` → `video/quicktime`
- `.avi` → `video/x-msvideo`
- `.mkv` → `video/x-matroska`

### 音频
- `.mp3` → `audio/mpeg`
- `.wav` → `audio/wav`
- `.ogg` → `audio/ogg`
- `.m4a` → `audio/mp4`
- `.aac` → `audio/aac`
- `.flac` → `audio/flac`

### 文本和代码
- `.txt`, `.log` → `text/plain`
- `.md`, `.markdown` → `text/markdown`
- `.json` → `application/json`
- `.js`, `.jsx`, `.ts`, `.tsx`, `.py`, `.java`, `.cpp`, `.c`, `.h`, `.cs`, `.php`, `.rb`, `.go`, `.rs`, `.swift`, `.kt` → `text/plain`
- `.html` → `text/html`
- `.css`, `.scss`, `.sass`, `.less` → `text/css`
- `.xml` → `application/xml`
- `.yaml`, `.yml` → `text/yaml`
- `.csv` → `text/csv`
- `.sh`, `.bash`, `.zsh` → `application/x-sh`
- `.sql` → `application/sql`

## 使用场景

### 场景 1: 处理用户上传的文件

```typescript
import { normalizeFiles } from '@eternalheart/react-file-preview'

function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
  const fileList = event.target.files
  if (!fileList) return

  const files = Array.from(fileList)
  const normalized = normalizeFiles(files)

  // 现在可以传给 FilePreviewModal
  setPreviewFiles(normalized)
}
```

### 场景 2: 处理混合来源的文件

```typescript
import { normalizeFiles } from '@eternalheart/react-file-preview'

// 混合使用 URL、文件对象和 File 对象
const mixedFiles = [
  // 来自 API 的 URL
  'https://api.example.com/files/image.jpg',

  // 来自数据库的文件信息
  {
    name: 'report.pdf',
    url: '/uploads/report.pdf',
    type: 'application/pdf',
    size: 2048000
  },

  // 用户刚上传的文件
  uploadedFile  // File 对象
]

const normalized = normalizeFiles(mixedFiles)
```

### 场景 3: 自定义文件处理

```typescript
import { normalizeFile } from '@eternalheart/react-file-preview'

function processFile(input: PreviewFileInput, index: number) {
  const normalized = normalizeFile(input, index)

  // 根据文件类型执行不同操作
  if (normalized.type.startsWith('image/')) {
    console.log('这是一个图片文件')
  } else if (normalized.type === 'application/pdf') {
    console.log('这是一个 PDF 文件')
  }

  return normalized
}
```

## configurePdfjs

配置 PDF.js 的 Worker 和 CMap 设置。

### 签名

```typescript
function configurePdfjs(options?: PdfConfigOptions): void
```

### 参数

- `options` - 可选配置对象：
  - `workerSrc`: PDF.js Worker 文件路径
  - `cMapUrl`: CMap 文件路径
  - `cMapPacked`: 是否使用压缩的 CMap

### 示例

```typescript
import { configurePdfjs } from '@eternalheart/react-file-preview'

// 使用本地 Worker 文件
configurePdfjs({
  workerSrc: '/pdf.worker.min.mjs'
})

// 自定义 CMap 配置
configurePdfjs({
  cMapUrl: '/cmaps/',
  cMapPacked: true
})
```

::: tip
默认情况下，组件会自动从 unpkg CDN 加载 PDF.js Worker，无需手动配置。仅在需要离线使用或自定义部署时才需要调用此函数。
:::

## pdfjs

PDF.js 库的重新导出，可用于高级配置场景。

```typescript
import { pdfjs } from '@eternalheart/react-file-preview'

// 访问 PDF.js 版本
console.log(pdfjs.version)
```

## 下一步

- [组件 API](./components) - 查看组件的完整 API
- [类型定义](./types) - 了解所有类型定义

