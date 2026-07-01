## ADDED Requirements

### Requirement: 统一图标风格为 CDN emoji
README.md 和 README.zh-CN.md 中的所有 emoji 图标 SHALL 使用 CDN 形式 `<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/<hex>.svg" width="X" height="X" alt="emoji" />`，确保跨平台视觉一致性。

#### Scenario: emoji 替换为 CDN 链接
- **WHEN** 文档中存在 native emoji（如 `✨`、`📁`、`🎨` 等）
- **THEN** 替换为对应的 CDN img 标签，保持 width/height 与周围文本协调

#### Scenario: 现有 CDN emoji 保持不变
- **WHEN** 文档中已使用 CDN emoji
- **THEN** 保持原样，不做修改

### Requirement: 补充工具栏事件驱动说明
主 README 的「🧩 Custom Renderers」章节 SHALL 在现有「Migration from Polling to Events」段落基础上，补充事件驱动原理概述（`ToolbarEventEmitter` / `onToolbarChange` 机制）。

#### Scenario: 补充事件驱动原理
- **WHEN** 用户阅读「Custom Renderers」章节
- **THEN** 能理解工具栏更新从轮询切换到事件驱动的核心机制

### Requirement: 补充懒加载机制说明
主 README 的「🧩 Custom Renderers」章节 SHALL 在事件驱动段落后新增懒加载说明，解释 `lazy.tsx|.ts` 注册如何实现代码分割和按需加载。

#### Scenario: 补充懒加载原理
- **WHEN** 用户阅读「Custom Renderers」章节
- **THEN** 能理解 renderer 懒加载的必要性和实现方式

### Requirement: 保持双语同步
README.md 和 README.zh-CN.md 的内容结构 SHALL 保持一致，仅语言不同。

#### Scenario: 中英文内容对齐
- **WHEN** 英文版新增或修改内容
- **THEN** 中文版同步更新对应章节
