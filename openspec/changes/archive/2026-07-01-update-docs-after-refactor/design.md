## Context

项目已完成以下核心重构（commit 参考：`acb2e09` toolbar 重构、`bc7064a` / `fe76570` i18n、`62443d0` React 懒加载、`a691c95` Vue 懒加载）：

1. **工具栏架构**：从布尔变量（`showZoomControls` 等）切换为数据驱动的 `ToolbarGroup[]` 模型，toolbar 配置沉到各 renderer 伴生文件（`toolbar.tsx|.ts`）
2. **Renderer 懒加载**：所有 renderer 通过 `lazy.tsx|.ts` 注册，主入口保持极小体积（React gzip ≤ 80 KB / Vue ≤ 60 KB）
3. **i18n 体系**：字典权威源在 `file-preview-core/src/i18n/messages/`，React 和 Vue 通过 `useTranslator` 消费，禁止硬编码文案
4. **主题系统**：通过 CSS 变量定义语义化 token（`--fp-fg-primary` 等），Tailwind 暴露为类（`text-fg-primary` 等），支持 `'auto' | 'dark' | 'light'` 三种模式

当前文档存在以下问题：
- 主 README 图标风格不一致（部分 emoji 未统一为 CDN 形式）
- React/Vue 包 README 未提及工具栏事件驱动、懒加载机制、i18n 集成、主题适配等新架构
- VitePress docs 未同步架构变更
- `support-type` skill 描述的流程与当前实现脱节（缺少 toolbar 伴生文件、lazy 注册、i18n 字典、主题 token 等步骤）

## Goals / Non-Goals

**Goals:**
- 统一主 README 图标风格为 CDN emoji（`<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/..." />`）
- 在 React/Vue 包 README 的「Custom Renderers」或「API Reference」章节补充：
  - 工具栏事件驱动更新机制（`onToolbarChange` / `ToolbarEventEmitter`）
  - Renderer 懒加载与代码分割（`lazy.tsx|.ts` 注册流程）
  - i18n 集成（`useTranslator()` hook/composable）
  - 主题适配（语义化 token、`useResolvedTheme()`）
- 更新 VitePress docs 中相关章节（如 `guide/architecture.md` 或 `api/custom-renderers.md`，如存在）
- 更新 `support-type` skill，补充以下步骤：
  - § 3.5 工具栏配置规范（toolbar 伴生文件、`ToolbarGroup[]` 数据模型）
  - § 3.6 懒加载注册（`lazy.tsx|.ts` 强制流程）
  - § 3.7 i18n 字典（`zh-CN.ts` + `en-US.ts` 同步更新）
  - § 3.8 主题适配（语义 token、`useResolvedTheme()`）
  - § 3.9 依赖外部化（`dependencies` + `vite.config.ts` external）

**Non-Goals:**
- 不改变代码实现
- 不新增功能
- 不调整文档结构（保持现有章节顺序）
- 不翻译未覆盖的语言（仅更新已有的中英文版本）

## Decisions

### 1. 图标风格统一为 CDN emoji
**决策**：所有 README 的 emoji 改为 `<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/<hex>.svg" width="X" height="X" alt="emoji" />`  
**理由**：GitHub 在不同系统下 native emoji 渲染不一致，CDN 方案保证视觉统一  
**替代方案**：保留 native emoji — 被拒绝，因跨平台显示差异大

### 2. 新架构内容插入位置
**决策**：  
- React/Vue 包 README：在现有「Custom Renderers」章节末尾新增「Event-Driven Toolbar Updates」「Renderer Lazy Loading」「i18n Integration」「Theme Adaptation」四个子章节
- 主 README：在「🧩 Custom Renderers」章节同步补充工具栏事件驱动与懒加载说明（已有迁移示例，补充原理）

**理由**：「Custom Renderers」是开发者扩展入口，新架构约束应在此集中说明  
**替代方案**：独立章节 — 被拒绝，会导致文档过于分散

### 3. Support-type skill 更新策略
**决策**：在现有「强制检查清单」后新增 § 3.5 - 3.9 五个子章节，每个章节包含：
- 约定（目录结构、命名规范）
- React 和 Vue 的并行示例
- 硬性禁止列表（`❌ 禁止...`）

**理由**：skill 文档是 AI 执行约束的单一来源，必须与代码实践 1:1 对齐  
**替代方案**：分散到各 renderer 示例 — 被拒绝，AI 无法聚合隐式约束

### 4. VitePress docs 同步范围
**决策**：仅更新已存在的架构相关章节（如 `guide/architecture.md`），不新建文档  
**理由**：本次聚焦文档同步，新建文档属于增量功能  
**替代方案**：新建完整架构文档 — 延后到独立 change

## Risks / Trade-offs

### 风险 1: 文档更新不完整导致开发者混淆
**缓解**：在每个包的 README 顶部新增「⚠️ 最近更新」通知块，列出架构变更点和对应章节链接

### 风险 2: Skill 文档过长影响 AI 上下文效率
**缓解**：保持 § 3.5 - 3.9 每节 ≤ 150 行，用表格和代码块压缩描述

### 风险 3: 图标 CDN 失效
**缓解**：jsdelivr 是 GitHub 官方推荐 CDN，备选方案在 README 底部注释中预留 unpkg 链接

### Trade-off: 中英文文档同步维护成本
**接受**：项目已有双语文档传统，放弃会导致国际用户体验下降
