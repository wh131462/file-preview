## ADDED Requirements

### Requirement: Unified state management with useReducer
系统必须使用 useReducer 统一管理所有渲染器状态，替代分散的 useState 调用。

#### Scenario: State initialization
- **WHEN** 组件首次挂载
- **THEN** 所有渲染器状态初始化为默认值（zoom: 1, rotation: 0, currentPage: 1 等）

#### Scenario: State reset on file change
- **WHEN** currentIndex 改变（切换文件）
- **THEN** 所有渲染器状态重置为初始值，无遗漏任何状态字段

#### Scenario: Zoom state update
- **WHEN** 用户触发缩放操作（放大/缩小）
- **THEN** 通过 dispatch({ type: 'SET_ZOOM', payload: newZoom }) 更新 zoom 状态

#### Scenario: PDF page state update
- **WHEN** 用户滚动 PDF 页面
- **THEN** 通过 dispatch({ type: 'SET_PDF_PAGE', payload: pageNumber }) 更新 currentPage 状态

#### Scenario: EPUB chapter state update
- **WHEN** EPUB 渲染器触发章节变化回调
- **THEN** 通过 dispatch({ type: 'SET_EPUB_CHAPTER', payload: { current, total } }) 更新 epub 状态

### Requirement: Type-safe state structure
渲染器状态必须使用类型化的数据结构，按功能分组。

#### Scenario: Common state grouping
- **WHEN** 访问通用状态（zoom、rotation）
- **THEN** 通过 state.common.zoom 和 state.common.rotation 访问

#### Scenario: File-type specific state grouping
- **WHEN** 访问特定文件类型状态（如 PDF）
- **THEN** 通过 state.pdf.currentPage、state.pdf.totalPages、state.pdf.showOutline 访问

#### Scenario: Invalid state access
- **WHEN** 尝试访问不存在的状态字段
- **THEN** TypeScript 编译时报错，防止运行时错误

### Requirement: Action type safety
所有状态更新必须通过类型化的 action 进行，禁止直接修改状态。

#### Scenario: Typed action dispatch
- **WHEN** 调用 dispatch(action)
- **THEN** action 的 type 和 payload 必须符合 RendererAction 联合类型

#### Scenario: Invalid action type
- **WHEN** 尝试 dispatch 不存在的 action type
- **THEN** TypeScript 编译时报错

#### Scenario: Invalid action payload
- **WHEN** action payload 类型不匹配
- **THEN** TypeScript 编译时报错
