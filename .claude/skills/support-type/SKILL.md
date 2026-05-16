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
  - **禁止中文/英文文案硬编码**，用 `const t = useTranslator()` + `t('xxx.key')`（详见 §3.7）
  - **主题适配**：颜色只能用语义 token 类（`rfp-text-fg-*` / `rfp-bg-surface-*` / `rfp-border-line-*` / `rfp-bg-code-bg` / `rfp-bg-media-bg` 等），禁止 `text-white/XX`、`text-gray-N00`、`bg-[#1e1e1e]` 等字面色类（详见 §3.8）
  - 如果需要工具栏控制（翻页/缩放/全屏/目录等），必须用 `forwardRef` + `useImperativeHandle` 暴露 `XxxRendererHandle`
- [ ] `packages/react-file-preview/src/renderers/Xxx/toolbar.tsx` — **如需工具栏，必加** 伴生 toolbar 配置（详见 §3.5）
- [ ] `packages/react-file-preview/src/FilePreviewContent.tsx`
  - `import` 新 renderer + `getXxxToolbarGroups`
  - 声明 `xxxRef` + 派生 state（`xxxCurrent` / `xxxTotal` / `xxxFullWidth` 等）
  - 在 toolbar 计算分支新增 `if (fileType === 'xxx') return getXxxToolbarGroups({...})`
  - 在渲染分支新增 `{fileType === 'xxx' && <XxxRenderer ref={xxxRef} ... />}`
- [ ] `packages/react-file-preview/package.json` — 新增必要依赖

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
- [ ] `packages/vue-file-preview/src/FilePreviewContent.vue`
  - `import` 新 renderer + `getXxxToolbarGroups`
  - 声明 `xxxRef` + 派生 state（用 `ref()`）
  - 在 toolbar 计算分支新增 `if (fileType.value === 'xxx') return getXxxToolbarGroups({...})`
  - 在 template 中新增 `<XxxRenderer v-if="fileType === 'xxx'" ref="xxxRef" ... />`
- [ ] `packages/vue-file-preview/package.json` — 新增必要依赖

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

### 4. 文档同步（必须）

新增文件类型必须同步更新以下文档，在对应的格式列表 / FileType 枚举中补充新类型：

- [ ] `packages/react-file-preview/README.md` — "Supported File Formats" 章节 + "Supported MIME Types" 章节
- [ ] `packages/react-file-preview/README.zh-CN.md` — "支持的文件格式" 章节 + "支持的 MIME 类型" 章节
- [ ] `packages/vue-file-preview/README.md` — "Supported File Formats" 章节
- [ ] `packages/vue-file-preview/README.zh-CN.md` — "支持的文件格式" 章节
- [ ] `packages/docs/guide/supported-types.md` — 新增类型说明章节 + 底部 FileType 枚举列表
- [ ] `packages/docs/api/types.md` — FileType 联合类型说明（如有列举）
- [ ] `packages/docs/api/components.md` — 如涉及新工具栏控件，补充说明

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
2. React renderer + 接入 + toolbar 接 `t`
3. Vue renderer + 接入 + toolbar 接 `t`
4. 文档同步（README × 4 + docs）
5. 依赖 / 示例

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
- ❌ **禁止**把 `@eternalheart/file-preview-core` 加进 react / vue 两个发布包的 `vite.config.ts` 的 `rollupOptions.external` 数组 — core 是内部共享层，**永不发布到 npm**，必须内联打包进 react / vue 产物。若 external 列表里出现 core，消费者项目装包后会报 `Could not resolve "@eternalheart/file-preview-core"`。两个 vite.config.ts 里已经有警示注释「注意：@eternalheart/file-preview-core 未发布到 npm，必须内联打包」，不要删除

## 边界：什么时候 Vue 可以滞后

仅当用户**明确说**"先只做 React，Vue 我自己来"时，才允许单框架实现。即使如此，也必须：

1. 在 core 包完成类型与识别（双框架共享部分不能漏）
2. 告知用户 Vue 侧需要补充的**具体文件清单**和**对齐点**，方便其后续补全
