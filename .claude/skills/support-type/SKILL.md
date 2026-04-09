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

- [ ] `packages/react-file-preview/src/renderers/XxxRenderer.tsx` — 新增 React 渲染器
  - 参考同类 renderer（如 `PdfRenderer.tsx`）的 props 约定
  - 样式类名必须使用 `rfp-` 前缀（Tailwind prefix）
- [ ] `packages/react-file-preview/src/FilePreviewContent.tsx`
  - `import` 新 renderer
  - 在渲染分支中新增 `{fileType === 'xxx' && <XxxRenderer ... />}`
  - 如需工具栏按钮（缩放/旋转/分页），更新 `showZoomControls` 等派生变量
- [ ] `packages/react-file-preview/package.json` — 新增必要依赖

### 3. Vue 包

- [ ] `packages/vue-file-preview/src/renderers/XxxRenderer.vue` — 新增 Vue 渲染器
  - 参考同类 renderer（如 `PdfRenderer.vue`）的 props 约定
  - 行为、props、事件要与 React 版本**完全对齐**
  - 样式类名必须使用 `vfp-` 前缀
- [ ] `packages/vue-file-preview/src/FilePreviewContent.vue`
  - `import` 新 renderer
  - 在 template 中新增 `<XxxRenderer v-if="fileType === 'xxx'" ... />`
  - 如需工具栏按钮，同步 React 的派生逻辑
- [ ] `packages/vue-file-preview/package.json` — 新增必要依赖

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
