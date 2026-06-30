## Context

当前实现使用 100ms 轮询机制更新工具栏：主组件定期调用 `rendererRef.current?.getToolbarGroups()` 来获取最新工具栏配置。这种方式简单但效率低下，每秒执行 10 次调用，即使渲染器状态未变化也会重新计算工具栏配置。

已完成的重构工作：
- ✅ Image、Pdf、Epub 渲染器已实现内部状态管理和 `getToolbarGroups()` 方法
- ✅ 主组件支持新旧渲染器共存（通过轮询获取新渲染器工具栏，回退到 `useToolbarConfig` 获取旧渲染器工具栏）
- ⏳ Mobi、Text、Markdown 和所有简单渲染器待完成

## Goals / Non-Goals

**Goals:**
- 消除 100ms 轮询，改用事件驱动机制
- 实现实时工具栏更新（状态变化时立即通知）
- 降低 CPU 使用率和电池消耗
- 保持 API 向后兼容，不破坏现有自定义渲染器
- 完成所有剩余渲染器的重构

**Non-Goals:**
- 不改变工具栏的 UI 展示形式
- 不修改现有的工具栏配置数据结构 `ToolbarGroup`
- 不重构 Vue 包（先完成 React 包验证，Vue 包后续同步）

## Decisions

### 1. 事件系统设计：自定义 EventEmitter vs React Context

**决策**：使用轻量级自定义 EventEmitter

**理由**：
- **React Context 的问题**：
  - 需要在渲染树中嵌套 Provider，增加组件层级
  - 所有订阅者都会在 context 值变化时重新渲染，即使不关心该变化
  - 不适合高频更新场景（如拖拽缩放时的 zoom 值）
  
- **自定义 EventEmitter 的优势**：
  - 解耦渲染器和主组件，无需共享 React 上下文
  - 订阅者可以精准监听特定事件，避免无关渲染
  - 类型安全：可以定义严格的事件类型
  - 轻量：~20 行代码，无外部依赖

**实现**：
```typescript
// 渲染器内部的事件发射器
class ToolbarEventEmitter {
  private listeners = new Set<() => void>();
  
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  notify() {
    this.listeners.forEach(fn => fn());
  }
}
```

### 2. 接口扩展：新增方法 vs 可选回调

**决策**：扩展 `RendererHandle` 接口，添加可选的 `onToolbarChange` 订阅方法

**理由**：
- **向后兼容**：现有渲染器不实现 `onToolbarChange` 时，主组件自动回退到轮询（或旧的 `useToolbarConfig`）
- **渐进式迁移**：可以逐个渲染器迁移到新机制
- **类型安全**：TypeScript 强制检查方法签名

**接口定义**：
```typescript
export interface RendererHandle {
  getToolbarGroups: () => ToolbarGroup[];
  
  // 新增：订阅工具栏变化事件
  onToolbarChange?: (listener: () => void) => (() => void);
  //                  订阅回调                 返回取消订阅函数
}
```

### 3. 主组件更新策略：立即调用 vs 批处理

**决策**：事件触发时立即调用 `getToolbarGroups()`，依赖 React 的批处理优化

**理由**：
- **React 18 自动批处理**：多个 `setState` 在同一事件循环中会自动合并为一次渲染
- **简化逻辑**：不需要手动实现防抖/节流
- **实时性**：用户操作（如缩放）时工具栏数字立即更新，体验更好

**实现**：
```typescript
useEffect(() => {
  if (!rendererRef.current?.onToolbarChange) {
    // 回退：如果渲染器不支持事件，使用轮询
    const interval = setInterval(() => {
      const groups = rendererRef.current?.getToolbarGroups() ?? [];
      setRendererToolbarGroups(groups);
    }, 100);
    return () => clearInterval(interval);
  }
  
  // 新机制：订阅事件
  const unsubscribe = rendererRef.current.onToolbarChange(() => {
    const groups = rendererRef.current?.getToolbarGroups() ?? [];
    setRendererToolbarGroups(groups);
  });
  
  // 初始化：立即获取一次
  const groups = rendererRef.current.getToolbarGroups();
  setRendererToolbarGroups(groups);
  
  return unsubscribe;
}, [fileType, currentFile]);
```

### 4. 触发时机：每次状态变化 vs 关键状态变化

**决策**：只在影响工具栏的状态变化时触发事件

**理由**：
- **避免无效更新**：例如 Image 渲染器的 `position`（拖拽位置）变化不影响工具栏，不应触发事件
- **性能优化**：减少不必要的 `getToolbarGroups()` 调用和组件重渲染
- **明确语义**：渲染器开发者清楚知道哪些状态需要通知主组件

**示例**：
```typescript
// ImageRenderer
const [zoom, setZoom] = useState(1);
const [rotation, setRotation] = useState(0);
const [position, setPosition] = useState({ x: 0, y: 0 }); // 不影响工具栏

useEffect(() => {
  // zoom 变化时通知
  emitter.notify();
}, [zoom]);

useEffect(() => {
  // rotation 变化时通知
  emitter.notify();
}, [rotation]);

// position 变化时不通知
```

### 5. 剩余渲染器重构策略：逐个迁移 vs 批量模板

**决策**：使用统一模板批量完成简单渲染器，复杂渲染器逐个处理

**理由**：
- **简单渲染器（Docx、Xlsx等）**：无状态，只需添加空的 `RendererHandle` 实现
- **复杂渲染器（Mobi、Text、Markdown）**：有状态管理，需要仔细迁移事件处理逻辑

**模板代码**：
```typescript
// 简单渲染器模板
export const DocxRenderer = forwardRef<RendererHandle, Props>((props, ref) => {
  const getToolbarGroups = useCallback(() => [], []);
  
  useImperativeHandle(ref, () => ({ getToolbarGroups }), [getToolbarGroups]);
  
  return <div>{/* 原有渲染逻辑 */}</div>;
});
```

## Risks / Trade-offs

### 1. [风险] 事件监听器未正确清理 → 内存泄漏

**缓解措施**：
- 使用 React 的 `useEffect` cleanup 函数确保组件卸载时取消订阅
- 在 `RendererHandle.onToolbarChange` 的返回值中提供 unsubscribe 函数
- 添加开发环境下的警告：检测未清理的监听器

### 2. [风险] 高频状态更新（如拖拽缩放）导致性能问题

**缓解措施**：
- 依赖 React 18 的自动批处理合并多次 `setState`
- 如果性能问题仍存在，可在渲染器内部添加节流：
  ```typescript
  const notifyThrottled = useCallback(
    throttle(() => emitter.notify(), 16), // ~60fps
    []
  );
  ```

### 3. [风险] 自定义渲染器不支持新接口

**缓解措施**：
- `onToolbarChange` 方法是**可选的**，旧渲染器自动回退到轮询
- 在文档中提供迁移指南和示例代码
- 保留轮询作为兼容层，不强制要求立即迁移

### 4. [权衡] 代码复杂度略有增加

**说明**：
- 每个渲染器需要额外 ~10 行代码管理 EventEmitter
- 主组件需要判断渲染器是否支持事件机制
- **收益远大于成本**：消除每秒 10 次轮询，实时更新，更好的用户体验

### 5. [权衡] 初期只重构 React 包

**说明**：
- Vue 包结构相同但需要单独适配（`defineExpose` vs `useImperativeHandle`）
- 先完成 React 包验证方案可行性，再同步到 Vue
- 风险：两个包短期内实现不一致，需要文档说明
