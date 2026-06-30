# SUPERSEDED

**Status:** Superseded (废弃)
**Archived:** 2026-06-30
**Superseded by:** `2026-06-30-refactor-toolbar-event-system`

## 废弃原因

该 change 的实现目标已被新 change `refactor-toolbar-event-system` 完全覆盖并超越：

1. **原 change 目标**：重构 `FilePreviewContent` 组件，把状态管理下放到各个渲染器（轮询机制）
2. **新 change 目标**：在前者基础上，进一步改用事件驱动机制（淘汰轮询），并完成所有渲染器迁移

## 进度状态

- 任务完成度：57/84 (~68%)
- 未完成的工作均在新 change 中以更优方式实现

## 相关文档

- 新 change 设计：`openspec/changes/archive/2026-06-30-refactor-toolbar-event-system/design.md`
- 同步后的 spec：`openspec/specs/renderer-toolbar-events/spec.md`

## 保留原因

保留此归档以追溯架构演进历史。如需查看原始设计意图与决策记录，请参考本目录下的 `proposal.md` 和 `design.md`。
