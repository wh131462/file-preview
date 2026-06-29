## Context

当前 `FilePreviewContent.tsx` 是文件预览组件的核心，负责渲染 10+ 种文件类型（图片、PDF、DOCX、视频、音频、EPUB、Mobi、ZIP 等）。组件包含：
- 16+ 个独立的 `useState` 管理不同渲染器的状态（zoom、rotation、currentPage、epubCurrent、mobiCurrent 等）
- 80+ 行的工具栏配置逻辑（第 339-426 行），通过 if-else 链判断文件类型
- 重复的状态重置逻辑（第 197-220 行），每次文件切换需要手动重置所有状态
- EPUB 和 Mobi 渲染器有相似的 ref + 状态管理模式但代码重复

**约束条件**：
- 必须保持外部 API（Props 接口）向后兼容
- 不能影响现有的自定义渲染器机制
- 需要保持 React.lazy 的动态加载特性
- 重构不能引入新的外部依赖

## Goals / Non-Goals

**Goals:**
- 将 540 行单一组件拆分为职责清晰的多个模块（< 200 行/文件）
- 统一状态管理，减少状态重置时的遗漏风险
- 提升代码可测试性（hooks 和子组件可独立测试）
- 提取可复用模式（书籍渲染器、工具栏配置），便于扩展新文件类型
- 改善类型安全和 accessibility

**Non-Goals:**
- 不修改外部 API（Props 接口保持不变）
- 不重构渲染器实现（ImageRenderer、PdfRenderer 等保持原样）
- 不改变视觉呈现和用户交互行为
- 不引入状态管理库（Redux、Zustand 等）
- 不优化渲染器性能（此次仅关注代码结构）

## Decisions

### 1. 状态管理：useReducer vs 状态管理库

**决策**：使用 `useReducer` + context-free 设计

**理由**：
- 组件级状态无需跨组件共享，useReducer 足够
- 避免引入外部依赖（Redux/Zustand），保持轻量
- Reducer 模式便于单元测试和状态回溯

**Alternatives considered**：
- ❌ **状态管理库**：过度设计，增加 bundle 体积
- ❌ **保持 useState**：无法解决状态分散和重置逻辑冗长的问题

**实现细节**：
```typescript
// types.ts
type RendererState = {
  common: { zoom: number; rotation: number };
  image: { naturalWidth: number; naturalHeight: number; resetKey: number };
  pdf: { currentPage: number; totalPages: number; showOutline: boolean };
  epub: { current: number; total: number; fullWidth: boolean };
  mobi: { current: number; total: number; fullWidth: boolean };
  zip: { stats: ZipToolbarStats | null };
  text: { wordWrap: boolean; htmlPreview: boolean };
  markdown: { viewMode: 'preview' | 'source' };
};

type RendererAction =
  | { type: 'RESET' }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PDF_PAGE'; payload: number }
  // ...
```

### 2. 工具栏配置：工厂模式 vs 配置映射

**决策**：配置映射（Registry Pattern）+ 工厂函数

**理由**：
- 消除 80 行 if-else 链，提升可读性
- 新增文件类型时只需注册配置，无需修改主组件
- 配置集中管理，便于维护

**Alternatives considered**：
- ❌ **保持 if-else**：难以扩展，违反开闭原则
- ❌ **策略模式（类）**：对 React hooks 环境不友好，过度设计

**实现细节**：
```typescript
// toolbar/registry.ts
type ToolbarConfigFactory = (
  state: RendererState,
  handlers: RendererHandlers,
  t: Translator
) => ToolbarGroup[];

const TOOLBAR_CONFIG_MAP: Partial<Record<FileType, ToolbarConfigFactory>> = {
  image: getImageToolbarGroups,
  pdf: getPdfToolbarGroups,
  epub: getEpubToolbarGroups,
  // ...
};

export function getToolbarGroups(
  fileType: FileType,
  state: RendererState,
  handlers: RendererHandlers,
  t: Translator
): ToolbarGroup[] {
  const factory = TOOLBAR_CONFIG_MAP[fileType];
  return factory ? factory(state, handlers, t) : [];
}
```

### 3. 组件拆分策略：按职责 vs 按文件类型

**决策**：按职责拆分（工具栏、渲染器容器、导航箭头）

**理由**：
- 职责单一原则，便于测试和复用
- 避免按文件类型拆分导致的代码分散

**Alternatives considered**：
- ❌ **按文件类型拆分**：会产生 10+ 个文件，增加维护成本
- ❌ **不拆分**：组件过大，违反单一职责原则

**拆分结果**：
```
components/
├── FilePreviewToolbar.tsx    # 工具栏 UI
├── FilePreviewRenderer.tsx   # 渲染器容器（Suspense + 错误边界）
└── NavArrows.tsx              # 导航箭头（已独立，保持不变）

hooks/
├── useFilePreviewState.ts    # 状态管理（reducer + actions）
├── useToolbarConfig.ts       # 工具栏配置
├── useKeyboardNavigation.ts  # 键盘导航
└── useBookRenderer.ts        # 书籍渲染器通用逻辑

toolbar/
├── registry.ts               # 工具栏配置注册
└── renderItems.tsx           # 工具栏渲染函数（提取到组件外）
```

### 4. 书籍渲染器抽象：泛型 hook vs 继承

**决策**：泛型 hook (`useBookRenderer<T>`)

**理由**：
- React hooks 范式，符合项目风格
- 类型安全（泛型约束 ref 类型）
- 避免引入 class 组件

**Alternatives considered**：
- ❌ **继承/抽象类**：不符合 React 函数组件范式
- ❌ **高阶组件**：增加组件层级，不利于调试

### 5. 类型安全改进：data 属性 vs ref 回调

**决策**：使用 `data-*` 属性标识关键 DOM 节点

**理由**：
- 避免硬编码 CSS 类名（如 `.rfp-overflow-auto`），解耦样式和逻辑
- 类型安全的选择器（`querySelector<HTMLElement>('[data-scroll-container]')`）
- 便于自动化测试

**实现细节**：
```typescript
// Before
const container = contentRef.current?.querySelector('.rfp-overflow-auto');

// After
const container = contentRef.current?.querySelector<HTMLElement>('[data-scroll-container]');
```

### 6. 错误边界位置：组件级 vs 渲染器级

**决策**：渲染器级错误边界（包裹在 Suspense 内部）

**理由**：
- 渲染器加载失败时不影响工具栏和导航
- 可提供重试机制
- 符合 React 18 错误边界最佳实践

**实现细节**：
```typescript
<Suspense fallback={<RendererLoading />}>
  <ErrorBoundary
    fallback={(error, reset) => (
      <RendererError error={error} onRetry={reset} onDownload={handleDownload} />
    )}
  >
    {/* 渲染器内容 */}
  </ErrorBoundary>
</Suspense>
```

## Risks / Trade-offs

### 1. 文件数量增加
**Risk**: 从 1 个文件拆分为 10+ 个文件，初次接触代码的开发者可能需要更多时间理解结构  
**Mitigation**: 
- 提供清晰的目录结构文档和命名规范
- 每个模块单一职责，降低单个文件复杂度
- 使用 barrel exports (`index.ts`) 简化导入路径

### 2. 迁移期间的双轨维护
**Risk**: 重构期间需要同时维护新旧代码  
**Mitigation**:
- 分阶段迁移（先 hooks → 再子组件 → 最后主组件）
- 每个阶段都保持可运行状态
- 使用 feature flag 控制新旧代码切换（如需要）

### 3. useReducer 的心智负担
**Risk**: 团队成员可能更熟悉 useState，useReducer 增加学习成本  
**Mitigation**:
- 提供清晰的 action 类型定义和注释
- 状态更新逻辑集中在 reducer 中，实际使用时只需 dispatch action
- reducer 函数可独立单元测试，降低维护成本

### 4. 性能回归风险
**Risk**: 重构可能引入不必要的 re-render  
**Mitigation**:
- 保持现有的 `useMemo`、`useCallback` 优化
- 对关键路径（图片缩放、PDF 滚动）进行性能测试
- 使用 React DevTools Profiler 验证重构前后性能

### 5. 类型安全的边界
**Risk**: 过度使用类型断言（`as`）可能掩盖真实类型错误  
**Mitigation**:
- 使用类型守卫（type guards）而非类型断言
- DOM 查询使用泛型参数（`querySelector<HTMLElement>`）
- 启用严格的 TypeScript 配置（`strict: true`）

## Migration Plan

### Phase 1: 提取 hooks（1-2 天）
1. 创建 `hooks/useFilePreviewState.ts`，实现 reducer 和 actions
2. 创建 `hooks/useBookRenderer.ts`，统一 EPUB/Mobi 逻辑
3. 创建 `hooks/useKeyboardNavigation.ts`，提取键盘事件处理
4. 在 `FilePreviewContentInner` 中逐步替换 useState 为 useReducer
5. 运行测试，确保功能无回归

### Phase 2: 提取工具栏逻辑（1 天）
1. 创建 `toolbar/registry.ts`，实现配置映射
2. 创建 `toolbar/renderItems.tsx`，提取渲染函数
3. 创建 `hooks/useToolbarConfig.ts`，封装工具栏配置逻辑
4. 替换主组件中的 80 行 if-else
5. 验证所有文件类型的工具栏显示正确

### Phase 3: 拆分子组件（1-2 天）
1. 创建 `components/FilePreviewToolbar.tsx`
2. 创建 `components/FilePreviewRenderer.tsx`（包含错误边界）
3. 重构 `FilePreviewContentInner`，使用新子组件
4. 更新导入路径，添加 barrel exports
5. 全面测试所有文件类型预览

### Phase 4: 增强 accessibility（0.5 天）
1. 为工具栏按钮添加 `aria-label`、`aria-keyshortcuts`
2. 为导航箭头添加 `aria-label`
3. 使用 `aria-live` 通知页码变化
4. 运行 accessibility 审查工具（如 axe DevTools）

### Rollback Strategy
- 每个 Phase 独立提交，可单独回滚
- 保留原始 `FilePreviewContent.tsx.backup` 直到重构完全验证
- 如发现严重问题，可快速切回旧实现（修改 exports）

### Verification
- ✅ 所有现有测试通过
- ✅ 手动测试 10+ 种文件类型预览
- ✅ 性能测试：图片缩放、PDF 滚动无明显延迟
- ✅ Accessibility 测试：键盘导航、屏幕阅读器兼容
- ✅ Bundle 体积对比：确保无显著增加

## Open Questions

1. **是否需要为新 hooks 添加单元测试？**
   - 倾向：是，特别是 `useFilePreviewState` reducer 逻辑
   - 影响：增加 1-2 天开发时间

2. **是否需要支持 Vue 版本的同步重构？**
   - 当前：仅重构 React 版本
   - 考虑：Vue 版本 (`vue-file-preview`) 是否有相同问题？

3. **工具栏配置是否需要支持外部扩展？**
   - 当前：内部配置映射
   - 考虑：是否需要暴露 `registerToolbarConfig` API 供外部注册？

4. **错误边界的错误上报机制？**
   - 当前：仅本地 console.error
   - 考虑：是否需要 `onError` 回调让用户自定义错误上报（如 Sentry）？
