## Context

当前图片渲染器（React 和 Vue 版本）仅实现了鼠标事件交互：
- 鼠标拖拽通过 mousedown/mousemove/mouseup 实现
- 缩放通过 wheel 事件实现
- 双击复原通过 dblclick 实现

在移动端设备上，虽然浏览器会模拟部分鼠标事件，但无法支持双指缩放等多点触控手势，用户体验不佳。需要添加原生触屏事件支持。

## Goals / Non-Goals

**Goals:**
- 在 React 和 Vue 图片渲染器中添加触屏手势支持
- 支持单指拖拽、双指缩放、双击缩放
- 确保触屏事件与鼠标事件不冲突
- 保持现有代码结构和交互逻辑

**Non-Goals:**
- 不支持三指及以上手势
- 不处理横竖屏切换的特殊优化
- 不修改其他渲染器（PDF、视频等）的触屏支持

## Decisions

### 1. 使用原生 Touch API 而非第三方手势库

**决策：** 直接使用浏览器原生的 touchstart、touchmove、touchend 事件，不引入 Hammer.js 等手势库。

**理由：**
- 项目已有 framer-motion，不需要额外引入依赖
- 所需手势逻辑简单（单指拖拽、双指缩放），原生 API 完全满足
- 减少 bundle size
- 更好的性能和控制力

**备选方案：**
- Hammer.js：功能丰富但过重（~20KB gzipped），对于简单手势场景不划算
- React Touch Events：仅适用于 React，无法复用到 Vue

### 2. 触屏与鼠标事件的共存策略

**决策：** 在同一组件中同时监听 touch 和 mouse 事件，通过标志位防止重复触发。

**理由：**
- 某些设备同时支持触摸和鼠标（如 Surface、iPad with trackpad）
- touch 事件优先级更高，触发 touch 后阻止 mouse 事件
- 使用 `e.preventDefault()` 在 touchstart 中阻止后续的 mouse 事件

**实现方式：**
```typescript
const isTouch = useRef(false);

const handleTouchStart = (e: TouchEvent) => {
  isTouch.current = true;
  e.preventDefault(); // 阻止后续 mouse 事件
  // ... 触屏逻辑
};

const handleMouseDown = (e: MouseEvent) => {
  if (isTouch.current) return; // 忽略触屏后的鼠标事件
  // ... 鼠标逻辑
};
```

### 3. 双指缩放的实现方式

**决策：** 计算两个触点间的距离变化，应用到缩放比例，并以双指中心点作为缩放原点。

**理由：**
- 符合用户直觉（双指捏合/分开）
- 与现有 wheel 缩放逻辑一致（以特定点为中心缩放）
- 可复用现有的 `clampPosition` 边界限制逻辑

**计算公式：**
```typescript
const distance = Math.hypot(
  touch1.clientX - touch2.clientX,
  touch1.clientY - touch2.clientY
);
const scale = distance / initialDistance;
const newZoom = initialZoom * scale;

// 缩放中心点为两指中点
const centerX = (touch1.clientX + touch2.clientX) / 2;
const centerY = (touch1.clientY + touch2.clientY) / 2;
```

### 4. React 与 Vue 实现的一致性

**决策：** 保持两个框架版本的手势逻辑完全一致，仅在事件绑定方式上有差异。

**理由：**
- 确保用户在不同框架版本中获得一致的体验
- 便于维护和测试
- 降低文档和支持成本

**差异点：**
- React：使用 `useEffect` + `addEventListener`（需要 passive: false）
- Vue：使用 `@touchstart.prevent` 指令或 `onMounted` + 原生监听

## Risks / Trade-offs

### 风险 1：触屏事件的 passive 模式冲突

**风险：** 现代浏览器默认 touch 事件为 passive: true 以优化滚动性能，调用 `preventDefault()` 会报警告。

**缓解措施：** 显式注册 `{ passive: false }` 监听器，与现有 wheel 事件处理方式一致。

### 风险 2：多点触控计算误差

**风险：** touchmove 事件频繁触发，距离计算可能产生抖动，导致缩放不平滑。

**缓解措施：**
- 添加最小距离变化阈值（如 5px）
- 使用 requestAnimationFrame 节流更新

### 风险 3：与浏览器默认手势冲突

**风险：** 某些浏览器（如 Safari）对双指缩放有默认行为，可能与自定义手势冲突。

**缓解措施：**
- 添加 CSS：`touch-action: none;` 到容器元素
- 在 touchstart 中调用 `preventDefault()`

### Trade-off：触屏时禁用部分浏览器功能

**影响：** `touch-action: none` 会禁用浏览器的默认滚动、缩放等手势。

**接受理由：** 图片预览器是全屏或固定容器的独立组件，不需要浏览器默认滚动。用户期望完全自定义的交互体验。

## Migration Plan

无需迁移，新增功能向下兼容。

**部署步骤：**
1. 在开发环境测试各种移动设备和浏览器
2. 确认不影响现有鼠标交互
3. 发布新版本，用户更新依赖即可获得触屏支持

**回滚策略：** 如发现严重问题，可快速移除 touch 事件监听器，恢复仅鼠标交互。

## Open Questions

1. 是否需要为三指手势预留扩展点？
   → 暂不考虑，YAGNI 原则
2. 是否需要添加触摸反馈（如震动、视觉提示）？
   → 暂不需要，保持简洁
