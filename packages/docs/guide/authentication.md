# 鉴权与自定义请求

当文件 URL 需要鉴权（`Authorization` header、cookie、签名头等），但 URL 本身**不能拼参数**时，推荐使用统一取数入口 `loadFile`：

- `loadFile`（推荐，1.7.0+）：由宿主决定文件内容怎么拿，返回 `Blob` 或 `{ url }`

以下三个 props 已废弃，将在 **1.8.0** 移除，仅用于旧版本迁移：

- `requestInit`：注入 headers / credentials 等
- `requestHandler`：完全接管 fetch（如换成 axios）
- `shouldFetchAsBlob`：让 image / video / audio / pdf 也走自定义请求

## 推荐：loadFile

```typescript
type FileContent = Blob | { url: string }

type FileLoader = (
  file: PreviewFile,
  ctx: { signal: AbortSignal },
) => Promise<FileContent>
```

规则：

- 不传 `loadFile`：按 `file.url` 直连，公开文件零配置；
- 返回 `Blob`：库内转 `blob:` URL 并负责释放，适合文档类、图片、小体积音视频；
- 返回 `{ url }`：直接使用该 URL，生命周期由你管理，适合**预签名直链 / 大视频流式播放**；
- 传入后库内不再对原始 URL 发请求，也不注入 `requestInit`；
- 切换文件或卸载时 `ctx.signal` 会 abort，记得透传给 HTTP 客户端；
- 库内对 `blob:` / `data:` 一律直接读取，不会交给自定义客户端或 handler。

最简写法：只想补一个 header / cookie 时用组件包导出的 `withHeaders`，不必自己写函数：

```tsx
import { withHeaders } from '@eternalheart/react-file-preview'

<FilePreviewModal
  files={files}
  loadFile={withHeaders({ Authorization: `Bearer ${token}` })}
  // 也可以传第二个参数补 credentials / mode 等
  // loadFile={withHeaders({ Authorization: `Bearer ${token}` }, { credentials: 'include' })}
/>
```

::: code-group

```tsx [React]
<FilePreviewModal
  files={files}
  loadFile={async (file, { signal }) => {
    const res = await axios.get(file.url, { responseType: 'blob', signal })
    return res.data
  }}
/>
```

```vue [Vue]
<FilePreviewModal
  :files="files"
  :load-file="(file, { signal }) => axios.get(file.url, { responseType: 'blob', signal }).then(r => r.data)"
/>
```

```ts [Angular]
// 模板：<afp-file-preview-modal [files]="files" [loadFile]="loadFile" />
readonly loadFile = async (file: PreviewFile, { signal }: { signal: AbortSignal }) =>
  (await axios.get(file.url, { responseType: 'blob', signal })).data
```

:::

> 视频/音频建议返回 `{ url }` 直链，保留浏览器原生 Range 流式播放；返回 `Blob` 会整段下载后才起播，大文件慎用。

### 旧参数迁移

| 旧写法 | 新写法 |
|--------|--------|
| `requestInit={{ headers }}` | `loadFile={withHeaders({ headers })}` |
| `requestInit={async (url) => ...}` | `loadFile={async (file, { signal }) => ...}` |
| `requestHandler={(url, init) => ...}` | `loadFile`（直接返回 `Blob` / `{ url }`） |
| `shouldFetchAsBlob={(f) => ...}` | `loadFile` 内按 `file.type` / `file.size` 返回 `Blob` 或 `{ url: file.url }` |

## 工作机制（旧参数）

组件内部所有 `fetch` 调用都经过同一个 fetcher：

```
调用方 init  ─┐
              ├── 合并 ──> requestHandler  ──> Response
requestInit ─┘             (或原生 fetch)
```

- 两个 init 合并时**调用方优先**，`headers` 走 `Headers` 合并语义
- 没传 `requestHandler` 时退化为原生 `fetch`
- 失败仍由 renderer 各自的错误 UI 显示

## 两类不同的 renderer

| 类别 | renderer | 默认行为 | 鉴权方式 |
|------|----------|---------|---------|
| **文档/文本类** | docx · doc · xlsx · xls · pptx · ppt · msg · zip · mobi · epub · markdown · json · csv · xml · subtitle · text | 用 fetch 拉到 ArrayBuffer / 文本再解析 | `loadFile` 返回 `Blob` 即可，无需额外配置 |
| **src 类** | image · video · audio · pdf | 浏览器自己请求 `<img src>` / `<source>` / pdf.js url | 同样由 `loadFile` 统一接管；大视频建议返回 `{ url }` 保留流式播放 |

## 旧写法 1：注入 Authorization（已废弃）

最常见场景。`requestInit` 可以是固定对象，也可以是按 URL 异步返回的工厂：

::: code-group

```tsx [React - 静态对象]
<FilePreviewModal
  files={files}
  currentIndex={0}
  isOpen={open}
  onClose={() => setOpen(false)}
  requestInit={{
    headers: { Authorization: `Bearer ${token}` },
  }}
  shouldFetchAsBlob={() => true}
/>
```

```tsx [React - 动态工厂]
<FilePreviewModal
  // ...其他 props
  requestInit={async (url) => ({
    headers: { Authorization: `Bearer ${await getFreshToken()}` },
  })}
  shouldFetchAsBlob={() => true}
/>
```

```vue [Vue]
<FilePreviewModal
  :files="files"
  :current-index="0"
  :is-open="open"
  :request-init="() => ({ headers: { Authorization: `Bearer ${token}` } })"
  :should-fetch-as-blob="() => true"
  @close="open = false"
/>
```

:::

## 旧写法 2：换成 axios / 自定义客户端（已废弃）

`requestHandler` 返回标准 `Response`，可以包装任何客户端：

```tsx
<FilePreviewModal
  requestHandler={async (url, init) => {
    const res = await axios.get(url, {
      headers: init?.headers as Record<string, string>,
      responseType: 'arraybuffer',
      withCredentials: true,
    })
    return new Response(res.data, {
      status: res.status,
      headers: res.headers as HeadersInit,
    })
  }}
  shouldFetchAsBlob={() => true}
/>
```

`requestInit` 与 `requestHandler` 可同时存在，`requestInit` 会先合并到 init 再传给 handler。

## 旧写法 3：仅文档类需要鉴权（已废弃）

如果图片/音视频是公开的、只有 docx/xlsx 等文档类需要鉴权，**不传 `shouldFetchAsBlob`** 即可——文档类天然走 fetcher，src 类继续浏览器原生加载，audio/video 保留流式播放：

```tsx
<FilePreviewModal
  requestInit={{ headers: { Authorization: `Bearer ${token}` } }}
  // 不传 shouldFetchAsBlob → image/video/audio/pdf 行为不变
/>
```

## blob 模式细节（旧参数）

命中 `shouldFetchAsBlob(file) === true` 时：

- 库内一次性把整个文件下载为 `Blob` → `URL.createObjectURL` → 喂给 renderer
- 切换文件 / 组件卸载 / `file.url` 变化时，旧的 blob URL 自动 `revokeObjectURL`
- audio/video 会**丢失浏览器原生的渐进式播放/seek 优化**，仅在文件较小或必须鉴权时启用

::: tip 推荐策略
按文件类型分别决定是否走 blob：

```tsx
shouldFetchAsBlob={(file) =>
  file.type.startsWith('image/') || file.type === 'application/pdf'
  // 让 audio/video 保留浏览器原生流式加载
}
```
:::

## 完整示例

```tsx
import { useState } from 'react'
import { FilePreviewModal } from '@eternalheart/react-file-preview'
import type { PreviewFileInput } from '@eternalheart/react-file-preview'
import '@eternalheart/react-file-preview/style.css'

function AuthedPreview({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const files: PreviewFileInput[] = [
    { name: 'report.docx', url: '/api/files/123/download', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { name: 'cover.jpg', url: '/api/files/124/download', type: 'image/jpeg' },
  ]

  return (
    <>
      <button onClick={() => setOpen(true)}>预览</button>
      <FilePreviewModal
        files={files}
        currentIndex={0}
        isOpen={open}
        onClose={() => setOpen(false)}
        loadFile={async (file, { signal }) => {
          const res = await fetch(file.url, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          })
          if (!res.ok) throw new Error(`Request failed: ${res.status}`)
          return res.blob()
        }}
      />
    </>
  )
}
```

## 自定义下载行为

工具栏右上角的「下载」按钮、`Unsupported` 渲染器的下载按钮，都会触发统一的下载逻辑：

- **默认行为**：库内复用已解析结果（`loadFile` 返回的 Blob / 直链）触发 `<a download>` 下载；如果上次 `loadFile` 解析失败（组件已回退到原始 URL），下载会**重新调用 `loadFile`** 取数，避免直接请求跨域 / 混合内容的原始地址；未配置 `loadFile` 时回退到 `requestInit` / `requestHandler` + fetcher。
- **完全接管**：传 `onDownload`，库内只调用你的回调，不再做任何动作。

### 默认下载（推荐）

配了 `loadFile` 之后，下载按钮**无需额外配置**就会复用同一次取数结果：

```tsx
<FilePreviewModal
  files={files}
  loadFile={async (file, { signal }) => myHttp.getBlob(file.url, { signal })}
  // 下载按钮复用已解析的 Blob / 直链，不会重复请求
  ...
/>
```

这避免了直接 `<a href={url} download>` 的两个老问题：

1. 浏览器自己发请求，**不带自定义 header**，鉴权 URL 直接 401
2. 同源策略下，跨域 URL 的 `download` 属性会被忽略，变成在新标签打开

### 自定义下载逻辑

如果你需要：
- 走自家的下载中心 / 上报埋点
- 不直接保存而是放到自己的「下载列表」里
- 用 streamsaver.js 大文件分片下载

传 `onDownload`：

::: code-group

```tsx [React]
<FilePreviewModal
  files={files}
  onDownload={async (file) => {
    // 1. 上报埋点
    analytics.track('file_download', { id: file.id, name: file.name })
    // 2. 走自家下载中心，弹通知而不是直接保存
    await downloadCenter.enqueue(file.url, file.name)
    notification.success(`${file.name} 已加入下载队列`)
  }}
/>
```

```vue [Vue]
<FilePreviewModal
  :files="files"
  :on-download="async (file) => {
    analytics.track('file_download', { id: file.id })
    await downloadCenter.enqueue(file.url, file.name)
    notification.success(`${file.name} 已加入下载队列`)
  }"
/>
```

:::

### 在 onDownload 中复用库内 fetcher

如果你只是想在默认下载行为前后插点埋点，又不想自己重写 fetch 调用，可以用 `downloadFileWithFetcher` 工具：

```tsx
import { downloadFileWithFetcher, createFetcher } from '@eternalheart/file-preview-core'

// 在组件外构造一次即可
const fetcher = createFetcher({
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
})

<FilePreviewModal
  files={files}
  requestInit={{ headers: { Authorization: `Bearer ${token}` } }}
  onDownload={async (file) => {
    const start = performance.now()
    await downloadFileWithFetcher(file.url, file.name, fetcher)
    console.log(`download ${file.name} took ${performance.now() - start}ms`)
  }}
/>
```

### 自定义渲染器的下载按钮

如果用 `customRenderers` 自己渲染文件、并通过 `getToolbarGroups` 自定义工具栏，可以直接在 `action` 里复用 `downloadFileWithFetcher`：

```tsx
import { Download } from 'lucide-react'
import { downloadFileWithFetcher, createFetcher } from '@eternalheart/file-preview-core'

const myRenderer: CustomRenderer = {
  test: (file) => file.name.endsWith('.myproto'),
  render: (file) => <MyViewer file={file} />,
  getToolbarGroups: (file, ctx) => [
    {
      items: [
        {
          type: 'button',
          icon: <Download className="rfp-w-4 rfp-h-4" />,
          tooltip: '下载',
          action: async () => {
            // 注：customRenderer 当前未暴露 fetcher，需自行构造；
            // 或继续走顶层下载按钮（其行为已自动带鉴权）
            const fetcher = createFetcher({
              requestInit: { headers: { Authorization: `Bearer ${getToken()}` } },
            })
            await downloadFileWithFetcher(file.url, file.name, fetcher)
            ctx.emit('downloaded', { id: file.id })
          },
        },
      ],
    },
  ],
}
```

::: tip
大多数情况下你**不需要**在自定义渲染器里写下载按钮——`actionGroups`（下载、关闭）始终保留，自定义工具组只替代文件类型相关那部分。直接用顶层的 `onDownload` prop 即可，逻辑更集中。
:::

## 参考

- [组件 API：requestInit / requestHandler / shouldFetchAsBlob](/api/components#requestinit)
- [类型定义：RequestInitFactory / RequestHandler / ShouldFetchAsBlob](/api/types#请求与鉴权)
- [工具函数：createFetcher / fetchAsBlobUrl](/api/utils#createfetcher)
