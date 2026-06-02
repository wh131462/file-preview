---
name: support-type
description: 为 file-preview 新增文件类型支持时使用。必须同时在 core / react / vue 三个包中完成类型声明、类型识别、渲染器实现与接入，保证 React 和 Vue 两个框架同步支持。当用户提到"支持 xxx 类型"、"新增文件类型"、"添加 xxx 预览"时使用。
---

# 同步新增文件类型支持 (React + Vue)

本项目是 monorepo，包含三个核心包：

- `packages/file-preview-core/` — 共享类型、工具、文件识别
- `packages/react-file-preview/` — React 实现
- `packages/vue-file-preview/` — Vue 实现

**核心原则：新增任何文件类型支持，必须 React + Vue 同时实现，不允许只做一个框架。**

## 强制检查清单

新增一个文件类型（例如 `epub`）必须完成以下全部步骤，缺一不可：

### 1. Core 包（共享层）

- [ ] `packages/file-preview-core/src/types.ts`
  - 在 `FileType` 联合类型中新增字面量（如 `| 'epub'`）
- [ ] `packages/file-preview-core/src/utils/fileType.ts`
  - 在 `getFileType()` 中添加 mime / 扩展名的识别分支
  - 如果是媒体类，同步更新 `getVideoMimeType` / 语言表等
- [ ] 如需新增解析工具，放在 `packages/file-preview-core/src/utils/` 下，框架无关
- [ ] **i18n 字典**：`packages/file-preview-core/src/i18n/messages/zh-CN.ts` 与 `en-US.ts` 必须**同时**补齐新 renderer 用到的所有文案 key（详见 §3.7）
- [ ] **主题适配自检**：renderer 颜色只能用 §3.8 中的语义 token 类（`xxx-text-fg-*` / `xxx-bg-surface-*` / `xxx-border-line-*` 等），禁止 `text-white/XX`、`text-gray-N00`、`bg-[#1e1e1e]` 等字面色类（详见 §3.8）

### 2. React 包

- [ ] `packages/react-file-preview/src/renderers/Xxx/index.tsx` — 新增 React 渲染器
  - 目录约定：每个 renderer 是 `renderers/Xxx/` 子目录，主入口固定为 `index.tsx`
  - 参考同类 renderer（如 `Pdf/index.tsx`、`Epub/index.tsx`）的 props 约定
  - 样式类名必须使用 `rfp-` 前缀（Tailwind prefix）
  - **导出形式**：必须是 `export const XxxRenderer = ...`（named export）。`lazy.tsx` 集中处理 `default` 适配，**禁止** renderer 自身写 `export default`
  - **禁止中文/英文文案硬编码**，用 `const t = useTranslator()` + `t('xxx.key')`（详见 §3.7）
  - **主题适配**：颜色只能用语义 token 类（`rfp-text-fg-*` / `rfp-bg-surface-*` / `rfp-border-line-*` / `rfp-bg-code-bg` / `rfp-bg-media-bg` 等），禁止 `text-white/XX`、`text-gray-N00`、`bg-[#1e1e1e]` 等字面色类（详见 §3.8）
  - 如果需要工具栏控制（翻页/缩放/全屏/目录等），必须用 `forwardRef` + `useImperativeHandle` 暴露 `XxxRendererHandle`
- [ ] `packages/react-file-preview/src/renderers/Xxx/toolbar.tsx` — **如需工具栏，必加** 伴生 toolbar 配置（详见 §3.5）
- [ ] `packages/react-file-preview/src/renderers/lazy.tsx` — **必加** lazy 注册项（详见 §3.6）
  - 追加 `export const XxxRenderer: Lazy<typeof XxxRendererImpl> = lazy(() => import('./Xxx').then((m) => ({ default: m.XxxRenderer })));`
  - 同时在文件顶部追加 `import type { XxxRenderer as XxxRendererImpl } from './Xxx';`
- [ ] `packages/react-file-preview/src/FilePreviewContent.tsx`
  - **从 `./renderers/lazy` 导入** lazy 版 renderer（**禁止**改回静态 `from './renderers/Xxx'`，否则会破坏代码分割）
  - `import` `getXxxToolbarGroups`（toolbar 配置仍然静态导入，因为 toolbar 在 close-state 即被调用）
  - 如有 ref/handle 类型，从原 renderer 文件 `import type { XxxRendererHandle } from './renderers/Xxx';`
  - 声明 `xxxRef` + 派生 state（`xxxCurrent` / `xxxTotal` / `xxxFullWidth` 等）
  - 在 toolbar 计算分支新增 `if (fileType === 'xxx') return getXxxToolbarGroups({...})`
  - 在渲染分支新增 `{fileType === 'xxx' && <XxxRenderer ref={xxxRef} ... />}`（外层已有 `<Suspense fallback={<RendererLoading />}>` 包裹，**不要**自己再加 Suspense）
- [ ] `packages/react-file-preview/package.json` — 新增必要依赖
  - **重型 npm 依赖（解析库、UI 库、媒体库等）必须放在 `dependencies`**，**禁止**放在 `devDependencies`（否则消费者装包后会缺包；详见 §3.9）
  - 同时在 `packages/react-file-preview/vite.config.ts` 的 `rollupOptions.external` 中加入对应条目（详见 §3.9）

### 3. Vue 包

- [ ] `packages/vue-file-preview/src/renderers/Xxx/index.vue` — 新增 Vue 渲染器
  - 目录约定：每个 renderer 是 `renderers/Xxx/` 子目录，主入口固定为 `index.vue`
  - 参考同类 renderer（如 `Pdf/index.vue`、`Epub/index.vue`）的 props 约定
  - 行为、props、事件要与 React 版本**完全对齐**
  - 样式类名必须使用 `vfp-` 前缀
  - **禁止中文/英文文案硬编码**，用 `const { t } = useTranslator()` + `t('xxx.key')`（详见 §3.7）
  - **主题适配**：颜色只能用语义 token 类（`vfp-text-fg-*` / `vfp-bg-surface-*` / `vfp-border-line-*` 等），`<style scoped>` 中改用 `var(--fp-*)` 变量；禁止字面色类与硬编码 `rgba(255, 255, 255, ...)` / `#XXXXXX` 字面量（详见 §3.8）
  - 如果需要工具栏控制，必须用 `defineExpose({...})` 暴露与 React 同名的方法
- [ ] `packages/vue-file-preview/src/renderers/Xxx/toolbar.ts` — **如需工具栏，必加** 伴生 toolbar 配置（详见 §3.5）
- [ ] `packages/vue-file-preview/src/renderers/lazy.ts` — **必加** lazy 注册项（详见 §3.6）
  - 追加 `export const XxxRenderer = wrap(() => import('./Xxx/index.vue'));`
- [ ] `packages/vue-file-preview/src/FilePreviewContent.vue`
  - **从 `./renderers/lazy` 导入** lazy 版 renderer（**禁止**改回静态 `from './renderers/Xxx/index.vue'`）
  - `import` `getXxxToolbarGroups`
  - 声明 `xxxRef` + 派生 state（用 `ref()`）
  - 在 toolbar 计算分支新增 `if (fileType.value === 'xxx') return getXxxToolbarGroups({...})`
  - 在 template 中新增 `<XxxRenderer v-if="fileType === 'xxx'" ref="xxxRef" ... />`
- [ ] `packages/vue-file-preview/package.json` — 新增必要依赖
  - **重型 npm 依赖必须放在 `dependencies`**，**禁止**放在 `devDependencies`（详见 §3.9）
  - 同时在 `packages/vue-file-preview/vite.config.ts` 的 `rollupOptions.external` 中加入对应条目（详见 §3.9）

### 3.5 工具栏配置规范（数据驱动，沉到 renderer 伴生文件）

项目采用**数据驱动 + 伴生 toolbar 配置**的模式（commit `acb2e09` 重构后）。FilePreviewContent 不再通过 `showZoomControls` 这类布尔变量切换按钮，而是统一调 `getXxxToolbarGroups(ctx)` 拿到 `ToolbarGroup[]` 数组渲染。

#### 目录约定

```
renderers/Xxx/
├── index.tsx | index.vue   # renderer 本体
└── toolbar.tsx | toolbar.ts # 伴生 toolbar 配置（如需）
```

#### ToolbarItem 类型（已在 `renderers/toolbar.types.ts` 定义，不要重复声明）

```ts
interface ToolbarButtonItem {
  type: 'button';
  icon: React.ReactNode;     // React 用 JSX；Vue 用 `Component`（lucide 图标组件本身）
  tooltip: string;
  action: () => void;
  disabled?: boolean;
}
interface ToolbarTextItem {
  type: 'text';
  content: string;
  minWidth?: string;          // CSS 长度，给指示器留稳定宽度避免抖动
}
type ToolbarGroup = { items: (ToolbarButtonItem | ToolbarTextItem)[] };
```

`ToolbarGroup[]` 在渲染时会以分隔线断开为不同区段。

#### RendererHandle 命名规范（强制对齐）

`forwardRef` / `defineExpose` 暴露的方法名必须使用以下动词，**两个框架完全一致**：

| 用途 | 方法名 |
|---|---|
| 翻页 | `prevPage()` / `nextPage()` |
| 翻章 | `prevChapter()` / `nextChapter()`（仅当 page 与 chapter 行为不同时） |
| 缩放 | `zoomIn()` / `zoomOut()` / `resetZoom()` |
| 旋转 | `rotateLeft()` / `rotateRight()` |
| 全屏 | `toggleFullWidth()` |
| 目录 | `toggleToc()` |

状态上抛走 props 回调，**不要**用 ref 上抛：
- `onPageChange?: (current: number, total: number) => void`
- `onFullWidthChange?: (isFullWidth: boolean) => void`
- `onChapterChange?: (current: number, total: number) => void`

> ⚠️ React 用 `useImperativeHandle` + `useCallback` 暴露；Vue 用 `defineExpose({ prevPage, nextPage, ... })` 暴露同名函数。两边类型签名必须一一对应。

#### 工具栏配置文件契约

**React (`renderers/Xxx/toolbar.tsx`)**：

```tsx
import React from 'react';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import type { ToolbarGroup } from '../toolbar.types';
import type { XxxRendererHandle } from './index';

export interface XxxToolbarContext {
  xxxRef: React.RefObject<XxxRendererHandle | null>;
  current: number;
  total: number;
  fullWidth: boolean;          // 视具体 renderer 需要的派生状态
}

export function getXxxToolbarGroups(ctx: XxxToolbarContext): ToolbarGroup[] {
  return [
    { items: [{ type: 'button', icon: <List className="rfp-w-4 rfp-h-4" />, tooltip: '目录', action: () => ctx.xxxRef.current?.toggleToc() }] },
    {
      items: [
        { type: 'button', icon: <ChevronLeft className="rfp-w-4 rfp-h-4" />, tooltip: '上一页', action: () => ctx.xxxRef.current?.prevPage() },
        { type: 'text', content: `${ctx.current} / ${ctx.total}`, minWidth: '4rem' },
        { type: 'button', icon: <ChevronRight className="rfp-w-4 rfp-h-4" />, tooltip: '下一页', action: () => ctx.xxxRef.current?.nextPage() },
      ],
    },
  ];
}
```

**Vue (`renderers/Xxx/toolbar.ts`)**：

```ts
import { ChevronLeft, ChevronRight, List } from 'lucide-vue-next';
import type { ToolbarGroup } from '../toolbar.types';

export interface XxxToolbarContext {
  // Vue 直接传 ref 解包后的对象（在 FilePreviewContent 里传 xxxRef.value）
  xxxRef: { prevPage: () => void; nextPage: () => void; toggleToc: () => void } | null;
  current: number;
  total: number;
  fullWidth: boolean;
}

export function getXxxToolbarGroups(ctx: XxxToolbarContext): ToolbarGroup[] {
  return [
    { items: [{ type: 'button', icon: List, tooltip: '目录', action: () => ctx.xxxRef?.toggleToc() }] },
    {
      items: [
        { type: 'button', icon: ChevronLeft, tooltip: '上一页', action: () => ctx.xxxRef?.prevPage() },
        { type: 'text', content: `${ctx.current} / ${ctx.total}`, minWidth: '4rem' },
        { type: 'button', icon: ChevronRight, tooltip: '下一页', action: () => ctx.xxxRef?.nextPage() },
      ],
    },
  ];
}
```

> 🔑 注意 React/Vue 对图标和 ref 的差异：
> - **React**：`icon` 是 JSX 元素（`<List className="rfp-w-4 rfp-h-4" />`），`xxxRef` 是 `React.RefObject<Handle | null>`，调用时 `ctx.xxxRef.current?.method()`
> - **Vue**：`icon` 是组件本身（`List`，由模板侧用 `<component :is="icon" class="vfp-w-4 vfp-h-4" />` 渲染），`xxxRef` 是已解包的对象，调用时 `ctx.xxxRef?.method()`

#### FilePreviewContent 接入"五件事"

无论 React 还是 Vue，接入新 toolbar 都是相同的五步：

1. **Import**：`import { getXxxToolbarGroups, type XxxToolbarContext } from './renderers/Xxx/toolbar'`
2. **Ref + State**：声明 `xxxRef`、`xxxCurrent`、`xxxTotal`、`xxxFullWidth` 等状态
3. **Handler**：定义 `handleXxxPageChange` / `handleXxxFullWidthChange` 写回 state
4. **Toolbar 分支**：在 `toolGroups` 计算块加 `if (fileType === 'xxx') return getXxxToolbarGroups({ xxxRef, current: xxxCurrent, total: xxxTotal, fullWidth: xxxFullWidth })`
5. **渲染分支**：在 JSX/template 中挂上 `ref` 和回调 props

**React 示例片段**（参考 `Epub` / `Mobi` 接入）：

```tsx
const xxxRef = useRef<XxxRendererHandle>(null);
const [xxxCurrent, setXxxCurrent] = useState(0);
const [xxxTotal, setXxxTotal] = useState(0);
const [xxxFullWidth, setXxxFullWidth] = useState(false);

const handleXxxPageChange = useCallback((current: number, total: number) => {
  setXxxCurrent(current);
  setXxxTotal(total);
}, []);

// toolGroups 计算块
if (fileType === 'xxx') {
  return getXxxToolbarGroups({ xxxRef, current: xxxCurrent, total: xxxTotal, fullWidth: xxxFullWidth });
}

// 渲染分支
{fileType === 'xxx' && (
  <XxxRenderer
    ref={xxxRef}
    url={currentFile.url}
    onPageChange={handleXxxPageChange}
    onFullWidthChange={setXxxFullWidth}
  />
)}
```

**Vue 示例片段**：

```vue
<script setup lang="ts">
const xxxRef = ref<{ prevPage: () => void; nextPage: () => void; toggleFullWidth: () => void; toggleToc: () => void } | null>(null);
const xxxCurrent = ref(0);
const xxxTotal = ref(0);
const xxxFullWidth = ref(false);

const handleXxxPageChange = (current: number, total: number) => {
  xxxCurrent.value = current;
  xxxTotal.value = total;
};

// toolGroups computed 内
if (fileType.value === 'xxx') {
  return getXxxToolbarGroups({
    xxxRef: xxxRef.value,
    current: xxxCurrent.value,
    total: xxxTotal.value,
    fullWidth: xxxFullWidth.value,
  });
}
</script>

<template>
  <XxxRenderer
    v-else-if="fileType === 'xxx'"
    ref="xxxRef"
    :url="currentFile.url"
    @page-change="handleXxxPageChange"
    @full-width-change="(v: boolean) => (xxxFullWidth = v)"
  />
</template>
```

#### Reference 实现（按场景挑最近的抄）

| 场景 | React 参考 | Vue 参考 |
|---|---|---|
| 仅缩放 / 旋转（图片类） | `renderers/Image/` | `renderers/Image/` |
| 缩放 + 翻页 / 滚动（PDF 类） | `renderers/Pdf/` | `renderers/Pdf/` |
| 翻页 + 章节 + 全屏 + 目录（电子书类） | `renderers/Epub/`、`renderers/Mobi/` | `renderers/Epub/`、`renderers/Mobi/` |
| 切换显示模式（自动换行 / HTML 预览等纯 toggle） | `renderers/Text/` | `renderers/Text/` |
| 仅展示文本统计（纯信息类） | `renderers/Zip/` | `renderers/Zip/` |

#### 硬性禁止（toolbar 相关）

- ❌ **禁止**在 `FilePreviewContent` 内联硬编码工具栏按钮 — 必须沉到伴生 `toolbar.tsx|.ts`
- ❌ **禁止**用 `showZoomControls` / `showPagination` 这类布尔派生 — 已废弃，全部用 `ToolbarGroup[]` 数据驱动
- ❌ **禁止**直接在 toolbar 配置里调 renderer 内部状态 — 必须通过 `xxxRef` 暴露的 handle 方法
- ❌ **禁止**让 React 和 Vue 的 handle 方法名出现差异 — 两边必须 1:1 对应

### 3.6 Renderer 懒加载与代码分割（强制）

为了让发布包主入口保持极小（React 主入口 gzip ≤ 80 KB / Vue ≤ 60 KB），所有 renderer **强制走 `React.lazy` / `defineAsyncComponent` 异步加载**，由 rollup 自动拆 chunk。每个新 renderer 必须同步在两个框架的 `renderers/lazy.{tsx,ts}` 中注册，**禁止**在 `FilePreviewContent` 中静态 import 任何 renderer 本体（toolbar 配置文件除外，它本来就在主入口）。

> ⚠️ 例外：`UnsupportedRenderer` 因为是所有错误回退的兜底，且自身体量极小，**保留**静态 import 直接打进主入口。除此之外**没有任何其它例外**。

#### React (`packages/react-file-preview/src/renderers/lazy.tsx`)

新增 renderer 必须同时追加两处：

1. 顶部 `import type { XxxRenderer as XxxRendererImpl } from './Xxx';`
2. 文件下方追加一行 lazy 注册：

```tsx
export const XxxRenderer: Lazy<typeof XxxRendererImpl> = lazy(() =>
  import('./Xxx').then((m) => ({ default: m.XxxRenderer })),
);
```

> 🔑 `Lazy<typeof ...Impl>` 显式类型签名是为了避免 `TS4023: Exported variable ... has or is using name ... but cannot be named`（在 `emitDeclarationOnly` 模式下，TypeScript 要求把 `XxxRendererProps` 这类内部类型显式可见）。**禁止**省略类型签名。

`FilePreviewContent.tsx` 顶部应该是：

```tsx
import {
  ImageRenderer,
  PdfRenderer,
  // ... 18 个 lazy 版 renderer
  XxxRenderer,  // 新增
} from './renderers/lazy';
import type { XxxRendererHandle } from './renderers/Xxx';  // 类型从原文件
import { UnsupportedRenderer } from './renderers/Unsupported';  // 仅 Unsupported 静态
import { RendererLoading } from './renderers/RendererLoading';
```

外层已有的 `<Suspense fallback={<RendererLoading />}>` 包住所有 fileType 分支，新增分支不需要再加 Suspense。

#### Vue (`packages/vue-file-preview/src/renderers/lazy.ts`)

文件下方追加一行：

```ts
export const XxxRenderer = wrap(() => import('./Xxx/index.vue'));
```

`wrap` 已封装 `defineAsyncComponent({ loader, loadingComponent: RendererLoading, delay: 0 })`，不需要自己写 `defineAsyncComponent`。

`FilePreviewContent.vue` `<script setup>` 顶部：

```ts
import {
  ImageRenderer,
  // ... 18 个 lazy 版 renderer
  XxxRenderer,  // 新增
} from './renderers/lazy';
import UnsupportedRenderer from './renderers/Unsupported/index.vue';  // 仅 Unsupported 静态
```

#### 自检

完工后跑：

```bash
pnpm build:lib
pnpm size           # size-limit 校验 gzip 上限
pnpm measure        # 输出每个 chunk 的体积
```

- 主入口 `lib/index.mjs` 必须保持 **gzip ≤ 1 KB** 量级（实际应在 ~300 B；新增 renderer 不应推高主入口）
- 全量 JS gzip：React ≤ 800 KB / Vue ≤ 500 KB
- CSS gzip：每个包 ≤ 400 KB

如果 `pnpm size` 失败，几乎一定是把新 renderer 静态 import 进了主入口或 FilePreviewContent，回头检查 lazy.tsx/lazy.ts 是否补完。

#### 硬性禁止（懒加载相关）

- ❌ **禁止**在 `FilePreviewContent.{tsx,vue}` 中直接 `import { XxxRenderer } from './renderers/Xxx'`（除 `UnsupportedRenderer` 外）— 必须走 `lazy.{tsx,ts}` 间接导入
- ❌ **禁止** renderer 本体写 `export default` — 统一 `named export`，由 `lazy.tsx` 转换为 `{ default: ... }`
- ❌ **禁止**省略 `lazy.tsx` 中的 `Lazy<typeof XxxRendererImpl>` 显式类型签名 — 会触发 TS4023 构建失败
- ❌ **禁止**在 renderer 文件中再加 `<Suspense>` — 外层 `FilePreviewContent` 已统一包裹
- ❌ **禁止**完工不跑 `pnpm size` — CI 也会跑，但本地未通过的话直接 push 是浪费 CI 时间

### 3.7 i18n 国际化（强制）

项目已打通 i18n 机制（commit `bc7064a` / `fe76570` / `4d8c2e8`）。新 renderer 的**所有用户可见文案**必须走 translator，不得直接写中文/英文字面量。

#### 字典权威源

唯一权威源：`packages/file-preview-core/src/i18n/messages/zh-CN.ts` 与 `en-US.ts`。两个 framework 包都从 core 的 `builtInMessages` import，**严禁**在 react/vue 包本地再建字典。

**流程铁律**：先改字典，再用 key。不允许 framework 包先写 `t('xxx.yyy')` 再回头补字典。

#### 新增文件类型必做

- [ ] 在 `zh-CN.ts` 的对应 scope（或新建 scope）下补齐**全部**用户可见文案 key
- [ ] 在 `en-US.ts` 按**完全相同的 key**补齐英文翻译（两边 key 集合必须严格一致）
- [ ] React renderer：`import { useTranslator } from '../../i18n/LocaleContext';` → `const t = useTranslator();`
- [ ] Vue renderer：`import { useTranslator } from '../../composables/useTranslator';` → `const { t } = useTranslator();`（模板用 `t('key')` 自动解包；`<script setup>` 命令式代码用 `t.value('key')`）
- [ ] 如有 toolbar：`XxxToolbarContext` 接口加 `t: Translator` 字段，所有 `tooltip` 改为 `ctx.t('toolbar.xxx')`
- [ ] `FilePreviewContent.tsx|.vue` 调 `getXxxToolbarGroups({ ..., t })`（Vue 侧传 `t: t.value`）

#### Key 命名规范

扁平化 `<scope>.<snake_name>`，点号只做视觉分组：

- `<renderer>.load_failed` — 各 renderer 加载失败文案（如 `xlsx.load_failed`）
- `<renderer>.parse_failed` — 解析失败
- `<renderer>.loading` — 加载中
- `<renderer>.<specific>` — 该 renderer 特有状态（如 `pptx.not_found` / `pptx.invalid_format`）
- `common.*` — 跨 renderer 的通用文案（`download` / `close` / `loading` / `unknown_error` / `unsupported_preview`）
- `toolbar.*` — 通用工具栏按钮 tooltip（已覆盖 16 个基础按钮，新按钮优先复用已有 key）
- `<renderer>.aria.*` — 无障碍 aria-label（如 `audio.aria.play`）
- `<renderer>.meta.*` — 文件元数据字段标签（如 `subtitle.meta.title`）

#### 参数化插值

translator 支持 `{param}` 占位：

```ts
// zh-CN.ts
'video.load_failed_with_error': '视频加载失败: {error}',
'common.unsupported_preview': '不支持预览此文件类型 ({type})',

// 使用
t('video.load_failed_with_error', { error: err.message })
t('common.unsupported_preview', { type: fileType })
```

#### 不翻译的内容（保持字面量）

- 格式标识符：`PDF` / `EPUB` / `LRC` / `SRT` / `MOBI` 等通用缩写
- 文件名 / URL / 用户输入内容
- 浏览器或三方库的原始 `Error.message`（保留以便调试）
- 数字单位：`KB` / `MB` / `GB` / `{zoom}%` / `{current}/{total}`
- 代码高亮语言标签（`javascript` / `python` 等）
- `console.error` / `console.warn` 等开发者日志（面向开发者不面向用户）
- 源码注释

#### 参考实现

| 场景 | 参考文件 |
|---|---|
| 简单错误态 + loading | `renderers/Image/index.tsx` / `.vue` |
| 多状态错误文案 | `renderers/Pptx/index.tsx` / `.vue`、`renderers/Xlsx/index.tsx` / `.vue` |
| 参数化文案 | `renderers/Unsupported/index.tsx` / `.vue`（使用 `{type}`）、`renderers/Video/index.tsx` / `.vue`（使用 `{error}`） |
| aria-label 无障碍 | `renderers/Audio/index.tsx` / `.vue` |
| 元数据字段标签 | `renderers/Subtitle/index.tsx` / `.vue`（`subtitle.meta.*` 系列） |
| toolbar 接入 t | `renderers/Image/toolbar.tsx` / `.ts`（ctx 加 `t: Translator`） |

#### 硬性禁止（i18n 相关）

- ❌ **禁止**在 framework 包（react/vue）本地复制字典 — 权威源唯一是 core
- ❌ **禁止**只补 zh-CN 不补 en-US（反之亦然）— 两边 key 集合必须对等
- ❌ **禁止**硬编码任何用户可见中文/英文字面量 — 全部走 `t()`
- ❌ **禁止**发明新 scope 而不沿用已有 scope — 新建 scope 前先检查 `common.*` / `toolbar.*` 是否已有合适 key
- ❌ **禁止**把 key 命名成 camelCase 或 kebab-case — 统一 `snake_case`（与现有 50+ 个 key 对齐）

### 3.8 Light / Dark 主题适配（强制 / 语义化 token）

组件支持 `theme: 'auto' | 'dark' | 'light'`，最终解析后通过 `data-theme="dark|light"` 挂在根容器 `.rfp-root` / `.vfp-root` 上。**项目用 CSS 变量定义语义化颜色 token，由 Tailwind 的 `theme.extend.colors` 暴露成语义类（`text-fg-primary`、`bg-surface-1`、`border-line` 等）**。Renderer 里只用语义类，主题切换只换 `[data-theme]` 上的变量值，class 完全不变。

> ⚠️ 历史风格（`text-white/XX`、`text-gray-700` 等字面色类）已**全部废弃**，禁止再使用。所有 renderer 的颜色必须落在下方 token 表中。

#### 设计 token 总表（**只能用这些**）

token 在 `packages/{react,vue}-file-preview/src/index.css` 顶部定义为 `--fp-*` CSS 变量；Tailwind 配置在 `tailwind.config.js` 的 `theme.extend.colors` 中映射为类名。前缀：React 用 `rfp-`，Vue 用 `vfp-`。

| 用途 | 类名 | 说明 |
|---|---|---|
| **文字（fg）** | | |
| 主标题 / 强调字 | `xxx-text-fg-primary` | 最强对比度 |
| 正文 | `xxx-text-fg-secondary` | 默认正文 |
| 次要描述 | `xxx-text-fg-tertiary` | 副本、计数器 |
| 弱化 / 占位 | `xxx-text-fg-muted` | 灰白占位 |
| 禁用态 | `xxx-text-fg-disabled` | disabled 按钮 |
| 反色（tooltip 字） | `xxx-text-fg-inverse` | 暗底 tooltip 上的字 |
| **背景（surface）** | | |
| 表面层 1 | `xxx-bg-surface-1` | 卡片底、最弱表面 |
| 表面层 2 | `xxx-bg-surface-2` | hover、稍强 |
| 表面层 3 | `xxx-bg-surface-3` | 强调表面 |
| 工具栏 | `xxx-bg-surface-toolbar` | 顶部 toolbar |
| 模态遮罩 | `xxx-bg-surface-overlay` | modal/embed 背板 |
| 导航按钮底 | `xxx-bg-surface-nav` | 左右翻页按钮 |
| 导航 hover | `xxx-bg-surface-nav-hover` | 翻页按钮 hover |
| **边框（line）** | | |
| 弱边框 | `xxx-border-line-weak` | 卡片细线 |
| 标准边框 | `xxx-border-line` | 默认边框 |
| 强边框 | `xxx-border-line-strong` | spinner 轨道 / 引用线 |
| 分隔线 | `xxx-divide-divide` | 用于 `divide-y` 等 |
| **品牌强调（accent）** | | |
| 强调底 | `xxx-bg-accent` | 主按钮、链接 |
| 强调悬停 | `xxx-text-accent-hover` / `xxx-bg-accent-hover` | hover 状态 |
| 强调弱底 | `xxx-bg-accent-soft` | 强调高亮的浅底 |
| **代码（跟随主题）** | | |
| 代码块底 | `xxx-bg-code-bg` | Dark：`#1e1e1e` / Light：`#f6f8fa`（GitHub Light） |
| 代码块字 | `xxx-text-code-fg` | Dark：浅白 / Light：`#24292f` 深字 |
| 代码块 header | `xxx-bg-code-header` | 跟随主题切换 |
| **媒体（固定豁免）** | | |
| 媒体画布 | `xxx-bg-media-bg` | 视频/音频固定 `#000` 黑底（不随主题切换） |
| **加载（spinner）** | | |
| spinner 轨道 | `xxx-border-spinner-track` | loading 圈底色 |
| spinner 头部 | `xxx-border-t-spinner-head` | loading 圈高亮色 |

#### 主题豁免场景（永久固定）

以下场景**永久暗底**，不随主题切换 —— 它们天然就是「黑色画布」：

- 视频 / 音频画布黑底 — 用 `xxx-bg-media-bg`（固定 `#000`）

代码块**不再豁免**。`bg-code-bg` / `text-code-fg` 在 dark 主题取 VSCode Dark Plus 配色（`#1e1e1e` + 浅字），light 主题取 GitHub Light 配色（`#f6f8fa` + 深字），与主流编辑器一致。

#### 代码语法高亮三方库（跟随主题）

`react-syntax-highlighter`、`shiki` 等三方库有自己的 theme prop，必须根据已解析的主题切换：

- **React**：用 `useResolvedTheme()` hook（来自 `src/ThemeContext.tsx`）

```tsx
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useResolvedTheme } from '../../ThemeContext';

const resolvedTheme = useResolvedTheme(); // 'dark' | 'light'
<SyntaxHighlighter style={resolvedTheme === 'light' ? vs : vscDarkPlus} ... />
```

- **Vue**：用 `useResolvedTheme()` composable（来自 `src/composables/useResolvedTheme.ts`）

```vue
<script setup lang="ts">
import { codeToHtml } from 'shiki';
import { useResolvedTheme } from '../../composables/useResolvedTheme';

const resolvedTheme = useResolvedTheme();
// shiki 用法：
highlighted.value = await codeToHtml(code, {
  lang,
  theme: resolvedTheme.value === 'light' ? 'github-light' : 'dark-plus',
});

// 主题切换时必须重新高亮（shiki 输出含 inline style，不会自动响应）
watch(resolvedTheme, () => { if (content.value) reload(); });
</script>
```

> ⚠️ **不允许** renderer 直接读 `data-theme` 属性切样式 —— 必须走 hook/composable。Provider 之外它会回退到 `'dark'`，保证组件被孤立使用时仍有合理默认值。

#### Renderer 写法约束

✅ **DO** — 全部用语义类

```tsx
// React renderer
<div className="rfp-text-fg-primary rfp-bg-surface-1 rfp-border rfp-border-line-weak">
  <span className="rfp-text-fg-tertiary">{description}</span>
  <button className="rfp-text-fg-secondary hover:rfp-bg-surface-2">{label}</button>
  <pre className="rfp-bg-code-bg rfp-text-code-fg">{code}</pre>
</div>
```

```vue
<!-- Vue renderer -->
<template>
  <div class="vfp-text-fg-primary vfp-bg-surface-1 vfp-border vfp-border-line-weak">
    <span class="vfp-text-fg-tertiary">{{ description }}</span>
    <button class="vfp-text-fg-secondary hover:vfp-bg-surface-2">{{ label }}</button>
    <pre class="vfp-bg-code-bg vfp-text-code-fg">{{ code }}</pre>
  </div>
</template>

<style scoped>
/* scoped style 用 var(--fp-*) */
.my-block {
  color: var(--fp-fg-primary);
  background: var(--fp-surface-2);
  border: 1px solid var(--fp-line);
}
</style>
```

❌ **DON'T**

```tsx
// ❌ 字面色类已全部废弃
<div className="rfp-text-white/90 rfp-bg-white/10 rfp-border-white/15">
<div className="rfp-text-gray-700 rfp-bg-gray-100 rfp-border-gray-200">

// ❌ 内联绝对色（除非走 var(--fp-*)）
<div style={{ color: '#ffffff', background: '#1f2937' }}>
<div style={{ background: '#1e1e1e' }}>  {/* 应改用 className="rfp-bg-code-bg" */}

// ❌ 在 renderer 里读 data-theme 切换样式分支
const isLight = root.getAttribute('data-theme') === 'light';
```

```vue
<!-- ❌ Vue scoped style 写死字面色 -->
<style scoped>
.foo { color: rgba(255, 255, 255, 0.75); }   /* 应该用 var(--fp-fg-secondary) */
.foo { background: #1e1e1e; }                 /* 应该用 var(--fp-code-bg) */
</style>
```

#### 旧字面色 → 新 token 映射表（机械替换参考）

补充档位时按下表选择最近的语义；选错档位会破坏视觉层次。

| 旧字面色 | 新 token |
|---|---|
| `text-white` / `text-white/95` / `text-white/90` / `text-white/85` | `text-fg-primary` |
| `text-white/80` / `text-white/75` / `text-white/70` | `text-fg-secondary` |
| `text-white/60` / `text-white/55` / `text-white/50` | `text-fg-tertiary` |
| `text-white/45` / `text-white/40` | `text-fg-muted` |
| `text-white/30` / `text-white/25` / `text-white/20` | `text-fg-disabled` |
| `text-gray-800` / `text-gray-700` | `text-fg-primary` |
| `text-gray-500` / `text-gray-400` | `text-fg-tertiary` |
| `text-gray-300` | `text-fg-disabled` |
| `bg-white/5` / `bg-white/[0.06]` / `bg-white/[0.08]` | `bg-surface-1` |
| `bg-white/10` | `bg-surface-2` |
| `bg-white/15` / `bg-white/20` | `bg-surface-3` |
| `bg-white/60..90` / `bg-gray-100..200` | `bg-surface-toolbar`（视场景） |
| `bg-black/5..20` | `bg-surface-1..3` |
| `bg-black/40` | `bg-surface-nav` |
| `bg-black/50` | `bg-surface-toolbar` |
| `bg-black/60` | `bg-surface-nav-hover` |
| `bg-black/80..90` | `bg-surface-overlay` |
| `bg-[#1e1e1e]` / 内联 `style={{background:'#1e1e1e'}}` | `bg-code-bg` |
| `border-white/10` / `border-white/[0.08]` | `border-line-weak` |
| `border-white/15` | `border-line` |
| `border-white/20` / `border-white/30` | `border-line-strong` |
| `border-gray-200` / `border-gray-300` | `border-line` |
| `divide-white/10` / `divide-white/15` | `divide-divide` |
| `border-t-white` (spinner head) | `border-t-spinner-head` |
| `border-white/20` (spinner track) | `border-spinner-track` |

#### 三方库主题对接（其他场景）

代码高亮（`react-syntax-highlighter` / `shiki`）已在上面「代码语法高亮三方库」节单独说明。其他三方库（`x-data-spreadsheet`、`react-pdf` 等）：

1. **数据表格 / 结构性 UI**：在 `index.css` 中补 `[data-theme="light"]` 覆盖（参考 `xlsx-spreadsheet-container` 的滚动条覆盖示例）
2. **有 theme prop 但无主题切换 API**（如 `react-pdf`）：保持默认，在 `index.css` 中用 CSS 变量覆盖部分元素

> ⚠️ 不要给 renderer 加 `theme` props 让用户传入，也不要在 renderer 内部读 `data-theme` 属性 —— 主题来源唯一是 `useResolvedTheme()` hook/composable。

#### 必做自检

新增 renderer 完工前，在 example 中切到 Light 主题，肉眼检查：

- [ ] 工具栏文字 / 图标可读
- [ ] 主体文字 / 标题不再是白底白字
- [ ] 加载 spinner 在白底上可见
- [ ] 错误态文字可读
- [ ] 列表 / 表格 / 边框线在白底上有对比
- [ ] hover 高亮在白底上有可感知差异
- [ ] 代码块在 light 主题下用 GitHub Light 浅底配色（不再是黑底），dark 主题保留 VSCode Dark Plus
- [ ] 视频 / 音频画布在两个主题下都保持黑底（媒体豁免）
- [ ] 切回 Dark 视觉与改前一致（无回归）

#### 调色 / 新增 token 的流程

需要新颜色（如 `accent-warning`）时：

1. 在 `packages/react-file-preview/src/index.css` 与 `packages/vue-file-preview/src/index.css` 的 `.rfp-root` / `.vfp-root` 默认块加 `--fp-accent-warning: ...`
2. 在两个 css 的 `[data-theme="light"]` 覆盖块加 light 值（如果需要主题切换）
3. 在两个 `tailwind.config.js` 的 `theme.extend.colors` 加 `'accent-warning': 'var(--fp-accent-warning)'`
4. **重新 build：** `cd packages/react-file-preview && pnpm build && cd ../vue-file-preview && pnpm build`（example 引用 `dist/index.css`，不重新构建新类不会出现）
5. renderer 用 `xxx-bg-accent-warning` 或 `xxx-text-accent-warning`

#### 硬性禁止（主题相关）

- ❌ **禁止**在 renderer 中使用 `text-white/XX`、`bg-white/XX`、`bg-black/XX`、`text-gray-N00`、`bg-gray-N00`、`border-gray-N00`、`border-white/XX`、`divide-white/XX` 等字面色类（已全部废弃）
- ❌ **禁止**在 renderer 内联 `style={{ background: '#1e1e1e' }}` 或 `rgba(255,255,255,X)` 等硬编码颜色 — 用 `bg-code-bg` 或 `var(--fp-*)`
- ❌ **禁止**在 Vue `<style scoped>` 中写死 `rgba(255, 255, 255, X)` / `#XXXXXX` 等暗色字面量 — 全部用 `var(--fp-*)`
- ❌ **禁止**给 renderer 加 `theme?: Theme` props 或在 renderer 内部读 `data-theme` 属性切样式分支 — 主题适配统一交给 CSS 变量；需要切第三方库 theme prop 时用 `useResolvedTheme()` hook/composable
- ❌ **禁止**让代码高亮永远停在 dark 主题 — `react-syntax-highlighter` / `shiki` 的 `style` / `theme` 参数必须根据 `useResolvedTheme()` 切换（详见「代码语法高亮三方库」节）
- ❌ **禁止**只验证 dark 主题就交付 — 必须切 Light 实际看过一遍（含代码块语法高亮的色彩对比度）
- ❌ **禁止**新增 token 后忘记重 build react/vue 包 — example 是从 `dist/index.css` 加载，不重 build 新类不生成

### 3.9 依赖外部化与体积预算（强制）

为了让发布包不重复打包重型解析库（PDF.js / docx-preview / shiki / katex / ExcelJS 等），所有重型 npm 依赖都通过 `rollupOptions.external` 外部化：产物只保留 `import` 语句，使用者侧由其工程的打包器从自己的 `node_modules` 解析。

**核心约束（零 BREAKING 策略）**：外部化的依赖**必须同时**声明在 `packages/{react,vue}-file-preview/package.json#dependencies` 中，npm/pnpm install 时自动拉取，使用者无需手动安装任何新包。

#### 新增重型依赖的标准流程

1. **加到 `dependencies` 而不是 `devDependencies`**：

   ```jsonc
   // packages/react-file-preview/package.json
   "dependencies": {
     "xxx-parser": "^1.2.3"    // ✅
   }
   // ❌ 不要放在 devDependencies — 使用者装包后会缺包
   ```

2. **加到 `rollupOptions.external`**（两个 vite.config.ts 都要）：

   ```ts
   // packages/{react,vue}-file-preview/vite.config.ts
   external: [
     // ... 已有项
     'xxx-parser',
     /^xxx-parser(\/.*)?$/,   // 如果使用了子路径导入（如 'xxx-parser/dist/foo'）
   ],
   ```

3. **跑 build 验证外部化**：

   ```bash
   pnpm build:lib
   # 应该看到 lib/index.mjs 或 lib/chunks/*.mjs 里只有 `import ... from "xxx-parser"`，没有 xxx-parser 的实现代码
   grep -c 'from "xxx-parser"' packages/react-file-preview/lib/chunks/*.mjs   # 有匹配
   grep -c 'PARSER_INTERNAL_FUNC' packages/react-file-preview/lib/chunks/*.mjs # 应为 0
   ```

4. **跑 `pnpm size` 确认未超阈值**：

   ```bash
   pnpm size
   # 全部条目应输出 "Size: X KB ≤ limit"，任一超阈值都需要回头查为什么没 external 干净
   ```

#### 已外部化的依赖清单（不要在它们里挑了重复加）

React 包当前已 external：`react`、`react-dom`、`react/jsx-runtime`、`pdfjs-dist`（含子路径）、`react-pdf`、`@videojs-player/react`、`video.js`、`framer-motion`、`lucide-react`、`react-markdown`、`react-syntax-highlighter`、`remark-gfm`、`remark-math`、`rehype-katex`、`rehype-raw`、`katex`、`shiki`、`docx-preview`、`mammoth`、`pptx-preview`、`exceljs`、`foliate-js`、`@kenjiuno/msgreader`、`@likecoin/epub-ts`、`jszip`。

Vue 包当前已 external：`vue`、`pdfjs-dist`（含子路径）、`lucide-vue-next`、`markdown-it`、`@traptitech/markdown-it-katex`、`katex`、`shiki`、`docx-preview`、`mammoth`、`pptx-preview`、`exceljs`、`foliate-js`、`@kenjiuno/msgreader`、`@likecoin/epub-ts`、`jszip`、`video.js`、`x-data-spreadsheet`。

#### `@eternalheart/file-preview-core` 是例外

core 包**永不发布到 npm**，必须**内联打包**到 react/vue 产物中。**禁止**把它加进 `external` 列表（重复警示：见本文档底部"硬性禁止"第 12 条）。

#### 体积预算（CI 拦截）

仓库根目录 `.size-limit.cjs` 声明了 gzip 上限。任一 PR 超阈值会被 CI 拦截：

| 产物 | gzip 上限 |
|---|---|
| `packages/react-file-preview/lib/index.mjs` | 80 KB |
| `packages/react-file-preview/lib/**/*.mjs`（全量） | 800 KB |
| `packages/react-file-preview/lib/**/*.css` | 400 KB |
| `packages/vue-file-preview/lib/index.mjs` | 60 KB |
| `packages/vue-file-preview/lib/**/*.mjs`（全量） | 500 KB |
| `packages/vue-file-preview/lib/**/*.css` | 400 KB |

新增 renderer **必须**在本地跑通 `pnpm size` 才能交付。

#### 硬性禁止（外部化与体积相关）

- ❌ **禁止**把重型 npm 依赖放进 `devDependencies` — 使用者装包后会缺包；放 `dependencies`
- ❌ **禁止**只改 `package.json` 不改 `vite.config.ts` 的 `external` — 否则依赖被打入产物，体积爆炸
- ❌ **禁止**只改 `vite.config.ts` 不改 `package.json#dependencies` — 否则使用者运行时报 "Could not resolve xxx"
- ❌ **禁止**把 `@eternalheart/file-preview-core` 加进 `external` — 见底部硬性禁止第 12 条
- ❌ **禁止**完工不跑 `pnpm size` — 超阈值的 PR 一定被 CI 拦截

### 4. 文档同步（必须）

新增文件类型必须同步更新以下文档，在对应的格式列表 / FileType 枚举中补充新类型。**任何一处遗漏都视为未完工**——即使代码跑通，对外文档/枚举未对齐就会让消费者搜不到、IDE 类型提示不全。

#### 4.1 包级 README（4 份必改）

- [ ] `packages/react-file-preview/README.md` — 「Supported File Formats」章节 **+** 「Supported MIME Types」章节
- [ ] `packages/react-file-preview/README.zh-CN.md` — 「支持的文件格式」章节 **+** 「支持的 MIME 类型」章节
- [ ] `packages/vue-file-preview/README.md` — 「Supported File Formats」章节
- [ ] `packages/vue-file-preview/README.zh-CN.md` — 「支持的文件格式」章节

格式参考已有条目（如「Documents」「E-books」）：先列扩展名，再列特性 bullet。MIME 类型章节同步补全识别用到的所有 mime 字符串（与 §1 `getFileType()` 的判断条件 1:1 对齐）。

#### 4.2 站点 docs（VitePress，3 份必改）

- [ ] `packages/docs/guide/supported-types.md`
  - 新增独立章节（与已有「电子书」「Office 文档」等同级），描述格式列表、特性、特殊渲染策略（如降级/双模式）
  - 底部「支持的文件类型枚举」列表追加 `xxx`
- [ ] `packages/docs/api/types.md`
  - `FileType` 联合类型代码块追加 `| 'xxx'` 字面量与同行注释
- [ ] `packages/docs/index.md`
  - Hero `tagline` 中如有格式枚举，追加新类别
  - 「多格式支持」特性卡片 `details` 同步
  - 底部「## 支持的文件类型」清单追加新类别行

#### 4.3 components.md（按需）

- [ ] `packages/docs/api/components.md` — **仅当**新 renderer 引入新工具栏控件（新按钮、新交互模式）时才需补充

#### 4.4 自检（防漏）

完工前用 grep 反向校验所有关键节点都已更新，命令模板：

```bash
# 应在 8 处都搜到新类型字面量（core/types.ts、core/fileType.ts、4 份 README、supported-types.md、types.md）
grep -rn "'xxx'" packages/file-preview-core/src packages/docs/api/types.md packages/docs/guide/supported-types.md
grep -rn "XXX\|\.xxx" packages/react-file-preview/README.md packages/vue-file-preview/README.md
```

如果某一处没匹配，说明遗漏——回头补齐再交付。

### 5. 示例（如有明显 UI 变化）

- [ ] `packages/example/src/App.tsx` — React 示例新增测试文件入口
- [ ] `packages/vue-example/src/App.vue` — Vue 示例同步新增

## 执行流程

### 步骤 1：确认需求

使用 `AskUserQuestion` 询问：
- 要支持的**文件类型标识**（如 `epub`）
- **识别依据**（扩展名 / MIME 类型）
- **是否需要第三方解析库**（如 `epubjs`），以及库名
- 是否**已有**同类 renderer 可以参考

### 步骤 2：对照检查清单扫描现状

使用 `Read` 读取以下关键文件，判断哪些已存在、哪些需新增：

```
packages/file-preview-core/src/types.ts
packages/file-preview-core/src/utils/fileType.ts
packages/react-file-preview/src/FilePreviewContent.tsx
packages/vue-file-preview/src/FilePreviewContent.vue
```

并用 `Glob` 确认是否已有同名 renderer：

```
packages/react-file-preview/src/renderers/*Renderer.tsx
packages/vue-file-preview/src/renderers/*Renderer.vue
```

### 步骤 3：使用 TodoWrite 制定任务清单

按"检查清单"的四个阶段拆分为 todos，至少包含：

1. core 类型与识别 + **i18n 字典（zh-CN + en-US）**
2. React renderer + **lazy.tsx 注册** + 接入 FilePreviewContent + toolbar 接 `t`
3. Vue renderer + **lazy.ts 注册** + 接入 FilePreviewContent + toolbar 接 `t`
4. **依赖治理**：新依赖加到 `dependencies` + 两个 `vite.config.ts` 的 `external`（详见 §3.9）
5. **文档同步**（README × 4 + docs guide/supported-types.md + docs api/types.md + docs index.md），见 §4
6. 依赖 / 示例
7. **体积自检**：`pnpm build:lib && pnpm size`，确认全部条目通过

### 步骤 4：实施修改

- **先改 core**，保证类型与识别是双框架共享的
- **再做 React**，得到一个可运行的参考实现
- **再做 Vue**，对照 React 实现 1:1 移植行为
- 每完成一步立即 `TodoWrite` 标记 completed

### 步骤 5：一致性交叉验证

修改完成后必须回头对比两个框架的 renderer：

- props 字段（名称、类型、默认值）是否一致
- 支持的交互（缩放 / 分页 / 下载）是否一致
- 错误状态 / 加载状态的处理是否一致
- 两边 `FilePreviewContent` 的 `fileType === 'xxx'` 分支是否都已接入
- **主题切换验证**：在 example 中切到 `Light` 主题打开新 renderer，肉眼确认无白底白字、无对比度不足，必要时同时切 `Dark` 回归（详见 §3.8 自检清单）

使用 `Grep` 命令交叉检查：

```
Grep: "'xxx'" in packages/file-preview-core/src
Grep: "XxxRenderer" in packages/react-file-preview/src
Grep: "XxxRenderer" in packages/vue-file-preview/src
```

### 步骤 6：报告 diff

列出变更涉及的文件，按 core / react / vue 分组，让用户一眼看到两个框架是否都被覆盖。**不要自动 commit**，除非用户明确要求。

## 硬性禁止

- ❌ **禁止**只实现 React 不做 Vue，或反之
- ❌ **禁止**把与框架无关的解析逻辑写进 react/vue 包里——必须沉到 `file-preview-core`
- ❌ **禁止**让 React 和 Vue 的 renderer 行为出现差异（交互、props、事件语义必须对齐）
- ❌ **禁止**跳过 `FilePreviewContent` 的接入步骤（新增 renderer 不接入等于没做）
- ❌ **禁止**假设用户"之后会补 Vue"，同步实现是本 skill 的核心价值
- ❌ **禁止**在 renderer / toolbar 中硬编码中文或英文文案 — 必须走 `t('xxx.key')`，字典只在 core 维护（详见 §3.7）
- ❌ **禁止**只验证 dark 主题就交付 — 新 renderer 必须在 example 中切到 Light 实际看过一遍，确认无白底白字 / 对比度足够（详见 §3.8）
- ❌ **禁止**在 renderer 里使用字面色类（`text-white/XX`、`text-gray-N00`、`bg-[#1e1e1e]`、`bg-white/XX`、`border-gray-N00` 等）或硬编码 `rgba(255,255,255,X)` / `#XXXXXX` — 全部用 §3.8 中的语义 token 类（`text-fg-*` / `bg-surface-*` / `border-line-*` / `bg-code-bg` 等）或 `var(--fp-*)` 变量
- ❌ **禁止**给 renderer 加 `theme?: Theme` props 或在 renderer 内部读 `data-theme` 切样式分支 — 主题适配统一交给 CSS 变量（详见 §3.8）
- ❌ **禁止**在 `FilePreviewContent.{tsx,vue}` 中静态 `import` 任何 renderer 本体（仅 `UnsupportedRenderer` 例外） — 必须经由 `renderers/lazy.{tsx,ts}` 间接导入，否则破坏代码分割（详见 §3.6）
- ❌ **禁止** renderer 写 `export default` — 统一 `named export`，由 `lazy.tsx` 适配 `{ default: ... }`（详见 §3.6）
- ❌ **禁止**把重型 npm 依赖（解析库 / UI 库 / 媒体库）放在 react / vue 包的 `devDependencies` — 必须放 `dependencies` + 在 `vite.config.ts` 的 `rollupOptions.external` 加对应条目（详见 §3.9）
- ❌ **禁止**新增 renderer 后不跑 `pnpm size` — CI 会拦截超阈值，本地未通过就提交浪费 CI 时间（详见 §3.6 / §3.9）
- ❌ **禁止**把 `@eternalheart/file-preview-core` 加进 react / vue 两个发布包的 `vite.config.ts` 的 `rollupOptions.external` 数组 — core 是内部共享层，**永不发布到 npm**，必须内联打包进 react / vue 产物。若 external 列表里出现 core，消费者项目装包后会报 `Could not resolve "@eternalheart/file-preview-core"`。两个 vite.config.ts 里已经有警示注释「注意：@eternalheart/file-preview-core 未发布到 npm，必须内联打包」，不要删除
- ❌ **禁止**只更新部分文档就交付 — §4 列出的 README × 4 + docs 三件套（`guide/supported-types.md` / `api/types.md` / `index.md`）必须**全部**同步；任一处遗漏都视为未完工。`docs/index.md` 的 hero tagline、特性卡片 details、底部「## 支持的文件类型」清单**三处都要看**，不要只改一处

## 边界：什么时候 Vue 可以滞后

仅当用户**明确说**"先只做 React，Vue 我自己来"时，才允许单框架实现。即使如此，也必须：

1. 在 core 包完成类型与识别（双框架共享部分不能漏）
2. 告知用户 Vue 侧需要补充的**具体文件清单**和**对齐点**，方便其后续补全
