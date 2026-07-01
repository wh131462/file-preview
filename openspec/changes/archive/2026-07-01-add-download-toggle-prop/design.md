## Context

当前工具栏实现中，下载按钮被硬编码在 `FilePreviewToolbar`（React）和 `FilePreviewContent.vue`（Vue）的工具栏区域。下载功能始终可用，无法根据外部条件（如用户权限、文件类型）动态控制。

项目采用 monorepo 结构，核心类型定义在 `@eternalheart/file-preview-core` 包中，React 和 Vue 实现分别在独立包中。两个框架实现需要保持 API 一致性。

## Goals / Non-Goals

**Goals:**
- 添加 `showDownload` prop 控制下载按钮显示
- 保持 React 和 Vue 两个实现的 API 一致性
- 完全向后兼容，不影响现有集成
- 同时支持 Modal、Embed 两种使用模式

**Non-Goals:**
- 不涉及下载功能本身的逻辑修改
- 不提供细粒度的下载权限控制（如针对单个文件的权限）
- 不添加下载按钮的禁用态（disabled），仅控制显示/隐藏

## Decisions

### 1. Prop 命名：`showDownload` vs `enableDownload`

**选择：`showDownload`**

**理由：**
- 语义明确：控制按钮的显示/隐藏，而非启用/禁用
- 与项目中现有类似 prop 命名风格一致（如 `headless` 控制整个工具栏显示）
- `enableDownload` 可能暗示"禁用态"，但当前设计只做显示控制

**备选方案：**
- `enableDownload`：语义上可能误导为"禁用态按钮"
- `hideDownload`：负向语义，不如正向的 `showDownload` 直观

### 2. 默认值：`true`

**理由：**
- 保持向后兼容：现有代码不传该 prop 时，行为与当前完全一致
- 符合"默认开放"原则：下载是常见需求，默认可用

### 3. Prop 传递层级

**选择：从顶层组件（Modal/Embed）一路透传到工具栏组件**

**理由：**
- 用户通常在最外层组件（`<FilePreviewModal>` 或 `<FilePreviewEmbed>`）设置配置
- 中间层（`FilePreviewContent`）作为数据流转的枢纽，负责将 prop 传递给实际的渲染组件
- 保持组件职责清晰：顶层接收配置，底层实现逻辑

**传递路径：**
```
FilePreviewModal/Embed (接收 showDownload)
  ↓
FilePreviewContent (透传)
  ↓
FilePreviewToolbar (React) / 工具栏渲染逻辑 (Vue)
```

### 4. React 实现：修改 `actionGroups` 生成逻辑

在 `FilePreviewToolbar.tsx` 中，下载按钮当前位于 `actionGroups` 数组的第一个元素。修改方案：

```typescript
const actionGroups: ToolbarGroup[] = [
  ...(showDownload ? [{
    items: [{
      type: 'button',
      icon: <Download className="rfp-w-4 rfp-h-4" />,
      tooltip: t('accessibility.downloadFile'),
      action: onDownload,
    }],
  }] : []),
  // ... 关闭按钮逻辑
];
```

**理由：**
- 利用条件展开运算符，简洁且类型安全
- 不影响关闭按钮和其他工具栏项的逻辑

### 5. Vue 实现：修改工具栏计算属性

在 `FilePreviewContent.vue` 中，下载按钮在 `actionGroups` 计算属性中定义。修改方案：

```typescript
const actionGroups = computed<ToolbarGroup[]>(() => [
  ...(props.showDownload ? [{
    items: [{
      type: 'button' as const,
      icon: Download,
      tooltip: t.value('common.download'),
      action: handleDownload,
    }],
  }] : []),
  // ... 关闭按钮逻辑
]);
```

**理由：**
- 与 React 实现保持一致的逻辑结构
- 利用 Vue 3 响应式系统，prop 变化自动触发工具栏重新计算

## Risks / Trade-offs

### 风险 1：遗漏传递导致功能失效

**风险：** 如果在某个中间层组件忘记透传 `showDownload`，会导致下游组件无法接收到该 prop。

**缓解措施：**
- 在实现时明确检查所有涉及的组件（Modal/Embed/Content/Toolbar）
- 通过手动测试验证 prop 传递链路完整性

### 风险 2：React 和 Vue 实现不一致

**风险：** 两个框架实现逻辑不同步，导致 API 行为差异。

**缓解措施：**
- 在 design 和 tasks 阶段明确列出两个实现的对应修改点
- 使用相同的默认值和命名约定
- 测试时同时验证两个框架的行为一致性

### Trade-off：仅控制显示，不提供禁用态

**当前选择：** 隐藏按钮而非禁用

**理由：**
- 禁用态需要额外的 UI 状态（灰色按钮 + tooltip 说明原因），增加复杂度
- 大多数场景下，"不显示"比"显示但不可用"更符合用户体验
- 如未来有禁用态需求，可另加 `disableDownload` prop，两者可独立工作

**影响：**
- 无法向用户展示"下载功能存在但当前不可用"的提示
- 适用场景：完全隐藏下载功能的场景（如纯预览模式）
