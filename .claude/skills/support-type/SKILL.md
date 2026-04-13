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

### 2. React 包

- [ ] `packages/react-file-preview/src/renderers/Xxx/index.tsx` — 新增 React 渲染器
  - 目录约定：每个 renderer 是 `renderers/Xxx/` 子目录，主入口固定为 `index.tsx`
  - 参考同类 renderer（如 `Pdf/index.tsx`、`Epub/index.tsx`）的 props 约定
  - 样式类名必须使用 `rfp-` 前缀（Tailwind prefix）
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

1. core 类型与识别
2. React renderer + 接入
3. Vue renderer + 接入
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

## 边界：什么时候 Vue 可以滞后

仅当用户**明确说**"先只做 React，Vue 我自己来"时，才允许单框架实现。即使如此，也必须：

1. 在 core 包完成类型与识别（双框架共享部分不能漏）
2. 告知用户 Vue 侧需要补充的**具体文件清单**和**对齐点**，方便其后续补全
