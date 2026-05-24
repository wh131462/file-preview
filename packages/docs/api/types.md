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
  | 'epub'        // EPUB 电子书
  | 'video'       // 视频 (MP4, WebM, OGG, MOV, AVI, MKV 等)
  | 'audio'       // 音频 (MP3, WAV, OGG, M4A, AAC, FLAC)
  | 'markdown'    // Markdown 文件 (MD)
  | 'json'        // JSON 文件
  | 'csv'         // CSV / TSV 表格
  | 'xml'         // XML 文件
  | 'subtitle'    // SRT / WebVTT / LRC / ELRC / ASS / SSA / TTML 字幕与歌词
  | 'zip'         // ZIP 压缩包
  | 'text'        // 其他文本和代码文件
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

## Theme

主题模式类型：

```typescript
type Theme = 'auto' | 'dark' | 'light'
```

- `'dark'` — 暗色主题（默认）
- `'light'` — 浅色主题
- `'auto'` — 跟随系统 `prefers-color-scheme` 自动切换

## CustomRenderer

自定义渲染器接口，用于扩展或覆盖默认的文件渲染逻辑。从 v1.4 起新增工具组声明与事件派发能力。

```typescript
interface CustomRenderer {
  /** 文件匹配函数；返回 true 表示使用此渲染器 */
  test: (file: PreviewFile) => boolean
  /** 渲染函数；ctx 可选，旧版 render(file) 仍兼容 */
  render: (file: PreviewFile, ctx?: CustomRendererContext) => React.ReactNode
  /** 可选：声明自定义工具组，命中此渲染器时替代内置工具组 */
  getToolbarGroups?: (
    file: PreviewFile,
    ctx: CustomRendererContext,
  ) => ToolbarGroup[]
  /** 可选：事件名白名单，仅作 TS 与文档约定，运行时不拦截 */
  events?: readonly string[]
}
```

### CustomRendererContext

`render` 与 `getToolbarGroups` 第二参数注入的上下文：

```typescript
interface CustomRendererContext {
  /** 派发自定义事件，转发到顶层 onCustomEvent / @custom-event */
  emit: (name: string, payload?: unknown) => void
  /** 已构建的翻译器，与顶层 locale / messages 一致 */
  t: Translator
  /** 已解析的主题（'auto' 会被解析为 'dark' 或 'light'） */
  theme: 'dark' | 'light'
  /** 当前 locale */
  locale: Locale
}
```

### CustomRendererEventPayload

顶层事件出口的载荷形状（React `onCustomEvent` / Vue `@custom-event`）：

```typescript
interface CustomRendererEventPayload<T = unknown> {
  name: string
  payload?: T
  file: PreviewFile
}
```

### 属性说明

- `test`：文件匹配函数，接收 `PreviewFile` 对象，返回 `true` 表示使用此渲染器
- `render`：渲染函数，接收 `(file, ctx?)`；ctx 可选，旧版仅传 `file` 仍可用
- `getToolbarGroups`：可选；返回 `ToolbarGroup[]`，命中时替代内置文件类型工具组；通用操作组（下载、关闭）保持不变
- `events`：可选；事件名白名单（不强制运行时校验）

### 示例

```typescript
import type {
  CustomRenderer,
  CustomRendererEventPayload,
} from '@eternalheart/react-file-preview'
import { Sparkles } from 'lucide-react'

const demoRenderer: CustomRenderer = {
  test: (file) => file.name.endsWith('.demo'),
  render: (file, ctx) => (
    <div style={{ color: ctx?.theme === 'light' ? '#111' : '#fff' }}>
      {file.name}
    </div>
  ),
  getToolbarGroups: (_file, ctx) => [
    {
      items: [
        {
          type: 'button',
          icon: <Sparkles className="rfp-w-4 rfp-h-4" />,
          tooltip: 'Say Hello',
          action: () => ctx.emit('hello', { ok: true }),
        },
      ],
    },
  ],
  events: ['hello'] as const,
}

function onCustomEvent(e: CustomRendererEventPayload) {
  console.log(e.name, e.payload, e.file)
}
```

### 注意事项

1. **优先级**：自定义渲染器优先于内置渲染器执行
2. **匹配顺序**：多个自定义渲染器匹配同一文件时，使用第一个匹配的
3. **性能**：`test` 函数应当尽可能快速，避免异步操作
4. **工具组覆盖**：命中自定义渲染器时，内置文件类型相关工具组不再装配；`actionGroups`（下载、关闭）保持
5. **事件未绑定**：宿主未传 `onCustomEvent` / `@custom-event` 时 `ctx.emit` 静默忽略，不抛错

## 请求与鉴权

以下类型用于配置库内请求行为，详见 [鉴权与自定义请求](./components#鉴权与自定义请求)。

### RequestInitFactory

```typescript
type RequestInitFactory =
  | RequestInit
  | ((url: string) => RequestInit | Promise<RequestInit>)
```

- 固定对象或按 URL 异步推导的工厂
- 与库内传入的 init 合并，库内 init 优先；`headers` 走 `Headers` 合并语义

### RequestHandler

```typescript
type RequestHandler = (
  url: string,
  init?: RequestInit,
) => Promise<Response>
```

- 完全接管库内请求，返回标准 `Response`
- 与 `requestInit` 同时存在时，handler 接收已合并的 init

### Fetcher

```typescript
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>
```

- 与原生 `fetch` 同签名；`createFetcher(options)` 的返回值
- 内部 hook（`useFetcher` / 注入的 `fetcher`）也是此类型

### RequestOptions

```typescript
interface RequestOptions {
  requestInit?: RequestInitFactory
  requestHandler?: RequestHandler
}
```

传给 `createFetcher(options)` 的入参类型。

### ShouldFetchAsBlob

```typescript
type ShouldFetchAsBlob = (file: PreviewFile) => boolean
```

返回 `true` 时，该文件会先经 fetcher 拉成 `blob:` URL 再喂给 image / video / audio / pdf renderer。命中后 blob URL 生命周期由库内自动管理。

## 请求与鉴权

以下类型用于配置库内请求行为，详见 [鉴权与自定义请求](./components#鉴权与自定义请求)。

### RequestInitFactory

```typescript
type RequestInitFactory =
  | RequestInit
  | ((url: string) => RequestInit | Promise<RequestInit>)
```

- 固定对象或按 URL 异步推导的工厂
- 与库内传入的 init 合并，库内 init 优先；`headers` 走 `Headers` 合并语义

### RequestHandler

```typescript
type RequestHandler = (
  url: string,
  init?: RequestInit,
) => Promise<Response>
```

- 完全接管库内请求，返回标准 `Response`
- 与 `requestInit` 同时存在时，handler 接收已合并的 init

### Fetcher

```typescript
type Fetcher = (url: string, init?: RequestInit) => Promise<Response>
```

- 与原生 `fetch` 同签名；`createFetcher(options)` 的返回值
- 内部 hook（`useFetcher` / 注入的 `fetcher`）也是此类型

### RequestOptions

```typescript
interface RequestOptions {
  requestInit?: RequestInitFactory
  requestHandler?: RequestHandler
}
```

传给 `createFetcher(options)` 的入参类型。

### ShouldFetchAsBlob

```typescript
type ShouldFetchAsBlob = (file: PreviewFile) => boolean
```

返回 `true` 时，该文件会先经 fetcher 拉成 `blob:` URL 再喂给 image / video / audio / pdf renderer。命中后 blob URL 生命周期由库内自动管理。

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
  RequestInitFactory,
  RequestHandler,
  ShouldFetchAsBlob,
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
