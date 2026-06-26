# 鉴权与自定义请求

当文件 URL 需要鉴权（`Authorization` header、cookie、签名头等），但 URL 本身**不能拼参数**时，组件提供三个 props 解决这一类问题：

- `requestInit`：注入 headers / credentials 等
- `requestHandler`：完全接管 fetch（如换成 axios）
- `shouldFetchAsBlob`：让 image / video / audio / pdf 也走自定义请求

## 工作机制

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
| **文档/文本类** | docx · xlsx · pptx · msg · zip · mobi · epub · markdown · json · csv · xml · subtitle · text | 用 fetch 拉到 ArrayBuffer / 文本再解析 | **自动**复用自定义 fetcher，无需额外配置 |
| **src 类** | image · video · audio · pdf | 浏览器自己请求 `<img src>` / `<source>` / pdf.js url | 需打开 `shouldFetchAsBlob` 才会复用 fetcher |

## 场景 1：注入 Authorization

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

## 场景 2：换成 axios / 自定义客户端

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

## 场景 3：仅文档类需要鉴权

如果图片/音视频是公开的、只有 docx/xlsx 等文档类需要鉴权，**不传 `shouldFetchAsBlob`** 即可——文档类天然走 fetcher，src 类继续浏览器原生加载，audio/video 保留流式播放：

```tsx
<FilePreviewModal
  requestInit={{ headers: { Authorization: `Bearer ${token}` } }}
  // 不传 shouldFetchAsBlob → image/video/audio/pdf 行为不变
/>
```

## blob 模式细节

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
        requestInit={{
          headers: { Authorization: `Bearer ${token}` },
        }}
        shouldFetchAsBlob={(file) =>
          file.type.startsWith('image/') || file.type === 'application/pdf'
        }
      />
    </>
  )
}
```

## 自定义下载行为

工具栏右上角的「下载」按钮、`Unsupported` 渲染器的下载按钮，都会触发统一的下载逻辑：

- **默认行为**：库内**自动**用配置好的 `fetcher` 拉成 Blob → 触发 `<a download>` 下载。无论是否开了 `shouldFetchAsBlob`，鉴权 URL 都能正确下载（带上你的 headers）。
- **完全接管**：传 `onDownload`，库内只调用你的回调，不再做任何动作。

### 默认下载（推荐）

配了 `requestInit` / `requestHandler` 之后，下载按钮**无需额外配置**就会带上鉴权：

```tsx
<FilePreviewModal
  files={files}
  requestInit={{ headers: { Authorization: `Bearer ${token}` } }}
  // 下载按钮自动通过 fetcher 拉 Blob，再保存到本地
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
