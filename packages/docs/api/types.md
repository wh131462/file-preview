# 类型定义

## PreviewFileInput

文件输入类型，支持三种格式：

```typescript
type PreviewFileInput = 
  | File                    // 原生 File 对象
  | PreviewFileLink         // 文件链接对象
  | string                  // HTTP URL 字符串
```

### 示例

```typescript
// 1. 使用 File 对象
const file: File = new File(['content'], 'document.txt')

// 2. 使用文件链接对象
const fileLink: PreviewFileLink = {
  name: 'document.pdf',
  url: 'https://example.com/file.pdf',
  type: 'application/pdf'
}

// 3. 使用 URL 字符串
const url: string = 'https://example.com/image.jpg'

// 混合使用
const files: PreviewFileInput[] = [file, fileLink, url]
```

## PreviewFileLink

文件链接对象的接口定义：

```typescript
interface PreviewFileLink {
  id?: string           // 可选的唯一标识符
  name: string          // 文件名（必需）
  url: string           // 文件 URL（必需）
  type: string          // MIME 类型（必需）
  size?: number         // 文件大小（字节）
}
```

### 属性说明

- `id`: 可选的唯一标识符，如果不提供会自动生成
- `name`: 文件名，用于显示和下载
- `url`: 文件的 URL 地址，可以是相对路径或绝对路径
- `type`: MIME 类型，如 `'application/pdf'`、`'image/jpeg'` 等
- `size`: 文件大小，单位为字节

### 示例

```typescript
const fileLink: PreviewFileLink = {
  id: 'doc-001',
  name: 'My Document.pdf',
  url: '/uploads/document.pdf',
  type: 'application/pdf',
  size: 1024000  // 1MB
}
```

## PreviewFile

内部使用的标准化文件类型（所有输入都会被转换为此格式）：

```typescript
interface PreviewFile {
  id: string            // 唯一标识符
  name: string          // 文件名
  url: string           // 文件 URL
  type: string          // MIME 类型
  size?: number         // 文件大小（字节）
}
```

## FileType

支持的文件类型枚举：

```typescript
type FileType =
  | 'image'       // 图片 (JPG, PNG, GIF, WebP, SVG, BMP, ICO)
  | 'pdf'         // PDF 文档
  | 'docx'        // Word 文档 (DOCX)
  | 'xlsx'        // Excel 表格 (XLSX)
  | 'pptx'        // PowerPoint 演示文稿 (PPTX, PPT)
  | 'msg'         // Outlook 邮件 (MSG)
  | 'video'       // 视频 (MP4, WebM, OGG, MOV, AVI, MKV 等)
  | 'audio'       // 音频 (MP3, WAV, OGG, M4A, AAC, FLAC)
  | 'markdown'    // Markdown 文件 (MD)
  | 'text'        // 文本和代码文件
  | 'unsupported' // 不支持的类型
```

## ToolbarAction

工具栏操作接口：

```typescript
interface ToolbarAction {
  icon: React.ReactNode    // 图标
  label: string            // 标签
  onClick: () => void      // 点击回调
  disabled?: boolean       // 是否禁用
}
```

## PreviewState

预览状态接口：

```typescript
interface PreviewState {
  zoom: number          // 缩放级别
  rotation: number      // 旋转角度
  currentPage: number   // 当前页码（PDF）
  totalPages: number    // 总页数（PDF）
}
```

## CustomRenderer

自定义渲染器接口，用于扩展或覆盖默认的文件渲染逻辑：

```typescript
interface CustomRenderer {
  test: (file: PreviewFile) => boolean      // 文件匹配函数
  render: (file: PreviewFile) => React.ReactNode  // 渲染函数
}
```

### 属性说明

- `test`: 文件匹配函数，接收 `PreviewFile` 对象，返回 `true` 表示使用此渲染器
- `render`: 渲染函数，接收 `PreviewFile` 对象，返回要显示的 React 组件

### 示例

```typescript
import type { CustomRenderer } from '@eternalheart/react-file-preview'

// 示例 1: 为 JSON 文件添加格式化显示
const jsonRenderer: CustomRenderer = {
  test: (file) => file.name.endsWith('.json'),
  render: (file) => (
    <div className="p-8">
      <pre className="bg-gray-900 text-white p-4 rounded">
        {/* 加载并格式化 JSON */}
      </pre>
    </div>
  ),
}

// 示例 2: 根据 MIME 类型匹配
const customTypeRenderer: CustomRenderer = {
  test: (file) => file.type === 'application/x-custom',
  render: (file) => <CustomViewer url={file.url} />,
}

// 示例 3: 根据文件名模式匹配
const logRenderer: CustomRenderer = {
  test: (file) => /\.(log|txt)$/i.test(file.name),
  render: (file) => <LogViewer url={file.url} />,
}

// 使用多个自定义渲染器
const customRenderers: CustomRenderer[] = [
  jsonRenderer,
  customTypeRenderer,
  logRenderer,
]
```

### 注意事项

1. **优先级**: 自定义渲染器优先于内置渲染器执行
2. **匹配顺序**: 如果多个自定义渲染器匹配同一文件，使用第一个匹配的
3. **性能**: `test` 函数应该尽可能快速，避免复杂的异步操作
4. **样式**: 自定义渲染器应该自行处理样式和布局

## PdfConfigOptions

PDF.js 配置选项接口：

```typescript
interface PdfConfigOptions {
  workerSrc?: string     // PDF.js Worker 文件路径
  cMapUrl?: string       // CMap 文件路径（多字节字符支持）
  cMapPacked?: boolean   // 是否使用压缩的 CMap
}
```

### 属性说明

- `workerSrc`: 自定义 PDF.js Worker 文件路径，默认从 unpkg CDN 加载
- `cMapUrl`: CMap 文件路径，用于支持 CJK 等多字节字符
- `cMapPacked`: 是否使用压缩格式的 CMap 文件

### 示例

```typescript
import { configurePdfjs } from '@eternalheart/react-file-preview'

// 使用本地 worker
configurePdfjs({
  workerSrc: '/pdf.worker.min.mjs'
})
```

## 完整类型定义示例

```typescript
import { FilePreviewModal } from '@eternalheart/react-file-preview'
import type {
  PreviewFileInput,
  PreviewFileLink,
  PreviewFile,
  FileType,
  ToolbarAction,
  PreviewState,
  CustomRenderer,
  PdfConfigOptions,
} from '@eternalheart/react-file-preview'

// 使用示例
const files: PreviewFileInput[] = [
  // URL 字符串
  'https://example.com/image.jpg',
  
  // 文件对象
  {
    name: 'document.pdf',
    url: '/files/document.pdf',
    type: 'application/pdf',
    size: 1024000
  },
  
  // File 对象
  new File(['content'], 'text.txt', { type: 'text/plain' })
]
```

## 下一步

- [组件 API](./components) - 查看组件的完整 API
- [工具函数](./utils) - 了解可用的工具函数
