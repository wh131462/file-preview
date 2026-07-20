## REMOVED Requirements

### Requirement: Renderer 子路径入口
**Reason**: 当前发布包仅承诺根入口和统一样式入口；renderer 子路径从未进入实际 `exports`，继续保留会形成虚假公共 API 承诺。

**Migration**: 高级使用者通过 `customRenderers` 扩展能力；内置 renderer 保持内部实现，不作为稳定子路径 API。

### Requirement: CSS 拆分与按需加载
**Reason**: 当前 React/Vue 包均发布统一 `lib/index.css`，没有 renderer 级 CSS 入口；独立 CSS 会扩大构建和发布契约。

**Migration**: 使用者继续通过 `@eternalheart/*-file-preview/style.css` 导入完整样式。

## MODIFIED Requirements

### Requirement: 使用者零额外配置即可使用全部 renderer
使用者执行 `npm install @eternalheart/react-file-preview`（或 Vue 对应包）后 SHALL 能使用全部 renderer，无需安装框架包 `dependencies` 已声明的额外依赖；WOFF2 SHALL 使用浏览器原生 FontFace 路径，不依赖 `wawoff2`。

#### Scenario: pnpm 严格模式下零配置使用 Font renderer
- **WHEN** 使用者在 pnpm 严格模式项目中预览 WOFF2 字体
- **THEN** 浏览器 MUST 通过原生 FontFace 完成预览
- **AND** 用户项目 MUST NOT 安装或配置 `wawoff2`

#### Scenario: pnpm 严格模式下零配置使用 Msg renderer
- **WHEN** 使用者在 pnpm 严格模式项目中预览 MSG 文件
- **THEN** Msg renderer MUST 能解析并展示文件
- **AND** 用户项目 MUST NOT 手动配置 `stream` 或 `@kenjiuno/msgreader`

#### Scenario: monorepo 示例不需要依赖别名
- **WHEN** 检查 React 与 Vue 示例的 Vite 配置
- **THEN** `resolve.alias` MUST NOT 包含 renderer 依赖的补丁别名

## REMOVED Requirements

### Requirement: tree-shake 副作用保护
**Reason**: 该要求包含已经移除的 wawoff2 Worker 设计，且当前构建不再依赖该状态描述。

**Migration**: WOFF2 使用 FontFace；其余依赖按当前 Vite 配置和 size-limit 验证。

