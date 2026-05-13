# 自定义渲染器

自定义渲染器允许你为特定的文件类型提供自定义的预览实现，并按内置渲染器同样的规范声明工具组、派发事件。

## 基本概念

一个自定义渲染器是一个对象，至少包含：

- `test`：判断是否应该使用该渲染器
- `render`：返回 React 节点 / Vue 组件

可选地：

- `getToolbarGroups`：按 `ToolbarGroup[]` 规范声明自定义工具组（命中时替代内置文件类型工具组）
- `events`：事件名白名单（仅用于 TS 与文档约定，运行时不拦截）

## 类型定义

```ts
// React
interface CustomRenderer {
  test: (file: PreviewFile) => boolean
  render: (file: PreviewFile, ctx?: CustomRendererContext) => React.ReactNode
  getToolbarGroups?: (file: PreviewFile, ctx: CustomRendererContext) => ToolbarGroup[]
  events?: readonly string[]
}

interface CustomRendererContext {
  emit: (name: string, payload?: unknown) => void
  t: Translator
  theme: 'dark' | 'light'
  locale: Locale
}

interface CustomRendererEventPayload<T = unknown> {
  name: string
  payload?: T
  file: PreviewFile
}
```

Vue 端 `render` 返回 `Component`，其余字段同构。

## 基本示例

```tsx
import { FilePreviewModal, CustomRenderer, PreviewFile } from '@eternalheart/react-file-preview'

const customRenderers: CustomRenderer[] = [
  {
    // 判断是否使用该渲染器
    test: (file: PreviewFile) => {
      return file.name.endsWith('.custom')
    },
    // 渲染预览内容
    render: (file: PreviewFile) => {
      return (
        <div className="custom-preview">
          <h2>自定义文件预览</h2>
          <p>文件名: {file.name}</p>
        </div>
      )
    }
  }
]

function App() {
  return (
    <FilePreviewModal
      isOpen={true}
      onClose={() => {}}
      files={files}
      currentIndex={0}
      customRenderers={customRenderers}
    />
  )
}
```

## 高级示例

### 自定义 JSON 查看器

```tsx
import { useState, useEffect } from 'react'

function JsonViewer({ url }: { url: string }) {
  const [content, setContent] = useState<string>('加载中...')

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(json => setContent(JSON.stringify(json, null, 2)))
      .catch(err => setContent(`加载失败: ${err.message}`))
  }, [url])

  return (
    <div className="w-full h-full p-8 overflow-auto">
      <pre className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
        {content}
      </pre>
    </div>
  )
}

const jsonRenderer: CustomRenderer = {
  test: (file) => file.name.endsWith('.json'),
  render: (file) => <JsonViewer url={file.url} />,
}
```

### 自定义 CSV 表格查看器

```tsx
import { useState, useEffect } from 'react'

function CsvViewer({ url }: { url: string }) {
  const [rows, setRows] = useState<string[][]>([])

  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n')
        const data = lines.map(line => line.split(','))
        setRows(data)
      })
  }, [url])

  return (
    <div className="w-full h-full p-8 overflow-auto">
      <table className="border-collapse border border-gray-300 bg-white">
        <thead>
          <tr className="bg-gray-100">
            {rows[0]?.map((cell, i) => (
              <th key={i} className="border border-gray-300 px-4 py-2 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border border-gray-300 px-4 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const csvRenderer: CustomRenderer = {
  test: (file) => file.name.endsWith('.csv'),
  render: (file) => <CsvViewer url={file.url} />,
}
```

## 渲染器优先级

自定义渲染器的优先级高于内置渲染器。渲染器按照数组顺序进行测试，第一个匹配的渲染器将被使用。

```tsx
const customRenderers = [
  // 这个会先被测试
  { test: (file) => file.name.endsWith('.txt'), render: CustomTextRenderer },
  // 如果上面的不匹配，才会测试这个
  { test: (file) => file.name.endsWith('.log'), render: LogRenderer }
]
```

## 访问文件内容

所有文件都通过 `file.url` 访问，这个 URL 可能是：
- HTTP/HTTPS URL（远程文件）
- Blob URL（本地 File 对象）
- Data URL（Base64 编码）

### 读取文本内容

```tsx
function TextViewer({ url }: { url: string }) {
  const [content, setContent] = useState<string>('加载中...')

  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(setContent)
      .catch(err => setContent(`加载失败: ${err.message}`))
  }, [url])

  return <div>{content}</div>
}
```

### 读取 JSON 内容

```tsx
function JsonViewer({ url }: { url: string }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error(err))
  }, [url])

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

### 读取二进制内容

```tsx
function BinaryViewer({ url }: { url: string }) {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)

  useEffect(() => {
    fetch(url)
      .then(res => res.arrayBuffer())
      .then(setBuffer)
  }, [url])

  return <div>文件大小: {buffer?.byteLength} 字节</div>
}
```

## 样式建议

建议为自定义渲染器添加适当的样式，以保持与内置渲染器的一致性：

```css
.custom-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: auto;
}
```

## 工具组与事件（v1.4+）

命中自定义渲染器后，除了渲染内容，还可以：

- 通过 `getToolbarGroups` 声明**自定义工具按钮**，与内置 Image / Pdf 等工具栏同一视觉风格
- 通过 `ctx.emit(name, payload)` **派发事件**，宿主在 `FilePreviewContent` / `Modal` / `Embed` 上通过 `onCustomEvent`（React）或 `@custom-event`（Vue）统一接收

### React 示例

```tsx
import { FilePreviewModal } from '@eternalheart/react-file-preview'
import type {
  CustomRenderer,
  CustomRendererEventPayload,
} from '@eternalheart/react-file-preview'
import { Sparkles } from 'lucide-react'

const demoRenderers: CustomRenderer[] = [
  {
    test: (file) => file.name.endsWith('.demo'),
    render: (file, ctx) => (
      <div style={{ color: ctx?.theme === 'light' ? '#111' : '#fff', padding: 24 }}>
        <p>file: {file.name}</p>
        <p>locale: {ctx?.locale} · theme: {ctx?.theme}</p>
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
  },
]

function App() {
  return (
    <FilePreviewModal
      files={files}
      currentIndex={0}
      isOpen={open}
      onClose={() => setOpen(false)}
      customRenderers={demoRenderers}
      onCustomEvent={(e: CustomRendererEventPayload) => {
        console.log(e.name, e.payload, e.file)
      }}
    />
  )
}
```

### Vue 示例

```vue
<script setup lang="ts">
import { h, defineComponent } from 'vue'
import {
  FilePreviewModal,
  type CustomRenderer,
  type CustomRendererContext,
  type CustomRendererEventPayload,
} from '@eternalheart/vue-file-preview'
import { Sparkles } from 'lucide-vue-next'

const DemoRenderer = defineComponent({
  props: {
    file: { type: Object, required: true },
    ctx: { type: Object as () => CustomRendererContext | undefined, default: undefined },
  },
  setup(props) {
    return () => h('div', { style: { padding: '24px' } }, `file: ${props.file.name}`)
  },
})

const demoRenderers: CustomRenderer[] = [
  {
    test: (file) => file.name.endsWith('.demo'),
    render: () => DemoRenderer,
    getToolbarGroups: (_file, ctx) => [
      {
        items: [
          {
            type: 'button',
            icon: Sparkles,
            tooltip: 'Say Hello',
            action: () => ctx.emit('hello', { ok: true }),
          },
        ],
      },
    ],
    events: ['hello'] as const,
  },
]

function onCustomEvent(e: CustomRendererEventPayload) {
  console.log(e.name, e.payload, e.file)
}
</script>

<template>
  <FilePreviewModal
    :files="files"
    :current-index="0"
    :is-open="open"
    :custom-renderers="demoRenderers"
    @close="open = false"
    @custom-event="onCustomEvent"
  />
</template>
```

### 工具组语义

- 自定义 `getToolbarGroups` 返回结果会替代内置文件类型工具组；通用操作组（下载、关闭）保持不变
- 未声明 `getToolbarGroups` 时工具栏仅保留通用操作组
- `headless === true` 时不渲染任何工具栏（包括自定义工具组）

### 事件语义

- `ctx.emit(name, payload)` 会通过顶层 `FilePreviewContent` 的 `onCustomEvent` / `custom-event` 出口向宿主转发
- 载荷固定为 `{ name, payload, file }`（`file` 为当前渲染的 `PreviewFile`）
- 宿主未绑定监听时静默忽略，不抛错
- `FilePreviewModal` / `FilePreviewEmbed` 会自动透传事件

### 向后兼容

- 旧版 `render: (file) => <Comp />` 仍然可用；`ctx` 是可选参数
- 不声明 `getToolbarGroups` / `events` / 不绑定事件出口时，行为与旧版完全一致

## 下一步

- [主题定制](./theming) - 了解如何自定义组件样式
- [API 参考](../api/components) - 查看完整的 API 文档

