## 1. 更新主目录 README

- [x] 1.1 统一 README.md 中所有 emoji 为 CDN 形式（替换 native emoji 为 `<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/..." />`）
- [x] 1.2 在「🧩 Custom Renderers」章节补充工具栏事件驱动原理概述（`ToolbarEventEmitter` / `onToolbarChange` 机制）
- [x] 1.3 在「🧩 Custom Renderers」章节补充 renderer 懒加载说明（`lazy.tsx|.ts` 注册和代码分割原理）
- [x] 1.4 统一 README.zh-CN.md 中所有 emoji 为 CDN 形式
- [x] 1.5 在 README.zh-CN.md 的「🧩 自定义渲染器」章节同步补充工具栏事件驱动和懒加载说明（与英文版内容对齐）

## 2. 更新 React 包文档

- [x] 2.1 在 packages/react-file-preview/README.md 的「Custom Renderers」章节新增「Event-Driven Toolbar Updates」子章节（包含 `ToolbarEventEmitter` + `useImperativeHandle` 完整示例）
- [x] 2.2 在「Custom Renderers」章节新增「Renderer Lazy Loading」子章节（包含 `lazy.tsx` 注册流程和 `FilePreviewContent.tsx` 导入示例）
- [x] 2.3 在「Custom Renderers」章节新增「i18n Integration」子章节（包含 `useTranslator()` hook 用法和代码示例）
- [x] 2.4 在「Custom Renderers」章节新增「Theme Adaptation」子章节（包含语义 token 表格、`useResolvedTheme()` 用法和正确/错误写法对比示例）
- [x] 2.5 在 packages/react-file-preview/README.zh-CN.md 同步新增四个子章节（与英文版内容对齐，仅语言不同）

## 3. 更新 Vue 包文档

- [x] 3.1 在 packages/vue-file-preview/README.md 的「Custom Renderers」章节新增「Event-Driven Toolbar Updates」子章节（包含 Vue 3 Composition API + `defineExpose` 完整示例）
- [x] 3.2 在「Custom Renderers」章节新增「Renderer Lazy Loading」子章节（包含 `lazy.ts` 注册流程和 `FilePreviewContent.vue` 导入示例）
- [x] 3.3 在「Custom Renderers」章节新增「i18n Integration」子章节（包含 `useTranslator()` composable 用法，区分模板和 script 两种使用方式）
- [x] 3.4 在「Custom Renderers」章节新增「Theme Adaptation」子章节（包含语义 token 表格、`useResolvedTheme()` 用法、`var(--fp-*)` 变量用法和正确/错误写法对比示例）
- [x] 3.5 在 packages/vue-file-preview/README.zh-CN.md 同步新增四个子章节（与英文版内容对齐，仅语言不同）

## 4. 更新 VitePress 文档站

- [x] 4.1 检查 packages/docs/guide/ 目录是否存在架构相关文档（如 `architecture.md`）
- [x] 4.2 如存在架构文档，同步补充工具栏事件驱动、懒加载、i18n、主题四个子章节
- [x] 4.3 检查 packages/docs/api/ 目录是否存在自定义 renderer API 文档（如 `custom-renderers.md`）
- [x] 4.4 如存在 API 文档，同步 React/Vue 包 README 中新增的四个子章节内容
- [x] 4.5 检查 packages/docs/api/types.md 是否包含 renderer 相关类型，如包含则补充 `ToolbarEventEmitter`、`onToolbarChange` 等新类型说明
- [x] 4.6 如存在中文版文档（`.zh-CN.md`），同步更新中文版本

## 5. 更新 support-type skill

- [x] 5.1 在 .claude/skills/support-type/SKILL.md 的「强制检查清单」后新增 § 3.5「工具栏配置规范」章节（包含目录约定、`ToolbarItem` 类型、`RendererHandle` 命名规范、React/Vue 并行示例、接入"五件事"、参考实现表格、硬性禁止列表）
- [x] 5.2 新增 § 3.6「Renderer 懒加载与代码分割」章节（包含懒加载强制约束、React `lazy.tsx` 和 Vue `lazy.ts` 注册流程、`FilePreviewContent` 导入约束、自检步骤、硬性禁止列表）
- [x] 5.3 新增 § 3.7「i18n 国际化」章节（包含字典权威源、新增文件类型必做清单、Key 命名规范、参数化插值、不翻译内容列表、React/Vue 用法差异、参考实现表格、硬性禁止列表）
- [x] 5.4 新增 § 3.8「Light / Dark 主题适配」章节（包含设计 token 总表、主题豁免场景、三方库主题切换、Renderer 写法约束、旧字面色映射表、必做自检清单、硬性禁止列表）
- [x] 5.5 新增 § 3.9「依赖外部化与体积预算」章节（包含核心约束、标准流程、已外部化依赖清单、core 包例外说明、体积预算表格、硬性禁止列表）
- [x] 5.6 更新底部「硬性禁止」章节，补充 8 条新约束（i18n、主题、懒加载、依赖相关）

## 6. 验证与自检

- [x] 6.1 检查所有 README 的 emoji 是否统一为 CDN 形式
- [x] 6.2 检查 React/Vue 包 README 的四个新子章节是否包含完整代码示例
- [x] 6.3 检查中英文文档内容是否对齐（结构一致，仅语言不同）
- [x] 6.4 检查 support-type skill 的 § 3.5-3.9 是否包含 React/Vue 并行示例和硬性禁止列表
- [x] 6.5 运行 `pnpm build` 确认文档更新不影响构建
