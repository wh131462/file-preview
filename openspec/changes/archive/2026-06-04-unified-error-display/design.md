## Context

当前项目有 React 和 Vue 两套渲染器，包括 Text、Image、Pdf、Video、Csv、Json、Xml、Markdown、Subtitle、Xlsx、Pptx、Epub、Mobi、Font、Zip 等 15+ 种文件类型。

**现状：**
- 每个渲染器独立实现错误显示，代码重复
- 错误显示样式不一致：
  - 简单型：纯文本（Text、Pdf、Json、Xml、Markdown、Subtitle）
  - 图标型：警告图标 + 标题 + 详情（Video、Xlsx、Csv、Pptx）
  - 特殊型：AlertCircle + 边框（Image 解码错误）
- 响应式处理不统一（有的用 `md:rfp-text-xl`，有的固定 `rfp-text-lg`）

**约束：**
- 保持 Design System 一致性（Tailwind CSS + `rfp-` 前缀）
- 不改变现有渲染器的 API 和行为
- 支持 i18n（错误信息通过参数传入）
- React 和 Vue 需要独立实现

## Goals / Non-Goals

**Goals:**
- 提供统一的 `RendererError` 组件（React 和 Vue）
- 替换所有渲染器中的重复错误显示代码
- 保持视觉一致性和响应式体验
- 支持可选的详情信息显示

**Non-Goals:**
- 不修改错误状态管理逻辑（仍由各渲染器控制）
- 不改变 i18n 翻译键值结构
- 不增加新的错误类型或错误处理机制
- 不涉及加载状态组件（已有 `RendererLoading`）

## Decisions

### 1. 组件 API 设计

**决策：** 采用简洁的 props 接口

```typescript
// React
interface RendererErrorProps {
  message: string;          // 主要错误信息（必填）
  detail?: string;          // 可选详情（用于技术错误信息）
  showIcon?: boolean;       // 是否显示图标，默认 true
}

// Vue
defineProps<{
  message: string;
  detail?: string;
  showIcon?: boolean;
}>()
```

**理由：**
- `message` 必填：确保始终有错误提示
- `detail` 可选：适配 Video 等需要显示技术错误详情的场景
- `showIcon` 可选：保持灵活性，默认显示图标符合大多数场景

**备选方案：**
- ❌ 使用 `type` 枚举区分错误类型：增加复杂度，当前场景不需要
- ❌ 支持自定义图标：过度设计，统一图标更一致

### 2. 视觉样式

**决策：** 采用图标 + 标题 + 详情的布局

```
┌─────────────────────┐
│   ⚠️  (警告图标)      │
│   错误标题           │
│   [详情信息]         │
└─────────────────────┘
```

**样式规范：**
- 图标：`lucide-react` 的 `AlertCircle`（红色 400）
- 图标容器：64px 圆形，红色 500/10 背景
- 标题：`text-lg` (移动端) / `text-xl` (桌面端)，`font-medium`
- 详情：`text-sm`，`text-fg-tertiary`

**理由：**
- 与 Video、Xlsx、Csv 等现有高质量实现保持一致
- 图标增强视觉识别度
- 响应式字体大小适配移动端

**备选方案：**
- ❌ 纯文本样式：视觉吸引力不足
- ❌ Image 的边框样式：过于突出，不适合通用场景

### 3. 文件位置

**决策：**
- React: `packages/react-file-preview/src/renderers/RendererError.tsx`
- Vue: `packages/vue-file-preview/src/renderers/RendererError.vue`

**理由：**
- 与现有 `RendererLoading` 组件位置平行
- 属于渲染器通用组件，不是独立的功能模块

### 4. 迁移策略

**决策：** 渐进式替换，优先替换 React 渲染器

**阶段 1：** 创建组件并验证
- 实现 React 和 Vue 版本的 `RendererError`
- 在 1-2 个渲染器中试用验证

**阶段 2：** 批量替换
- 替换所有 React 渲染器的错误显示（15+ 个）
- 替换所有 Vue 渲染器的错误显示（15+ 个）

**阶段 3：** 清理
- 验证功能和样式一致性
- 删除冗余代码

**理由：**
- 降低风险，出现问题可快速回滚
- 分阶段提交，代码审查更容易

**备选方案：**
- ❌ 一次性全部替换：风险高，难以定位问题
- ❌ 仅替换部分渲染器：无法达成统一目标

## Risks / Trade-offs

### Risk 1: 样式回归
**风险：** 统一组件可能与某些渲染器现有样式有细微差异

**缓解：**
- 以 Video/Xlsx/Csv 的高质量实现为基准
- 逐个渲染器验证视觉效果
- 保留截图对比

### Risk 2: 特殊场景覆盖不足
**风险：** Image 渲染器有解码错误和加载错误两种，需求可能不同

**缓解：**
- 通过 `detail` 参数支持额外信息
- 如确有特殊需求，可在组件内部保留自定义错误显示

### Risk 3: i18n 键值变更
**风险：** 部分渲染器可能使用不同的翻译键

**缓解：**
- 不修改翻译键值结构
- 组件只接收已翻译的字符串
- 各渲染器继续使用现有的 `t()` 调用

## Migration Plan

**部署步骤：**
1. 创建 `RendererError` 组件（React + Vue）
2. 在 Text 和 Image 渲染器中试点替换
3. 验证无问题后批量替换其他渲染器
4. 提交 PR 并进行视觉回归测试

**回滚策略：**
- 每个渲染器独立修改，可单独回滚
- 组件代码量小，回滚成本低

**测试验证：**
- 手动测试每种文件类型的错误场景（网络错误、格式错误）
- 检查响应式布局（移动端 + 桌面端）
- 验证 i18n 显示正确

## Open Questions

无
