## ADDED Requirements

### Requirement: WOFF2 字体预览必须仅依赖浏览器原生 FontFace 渲染
Font Renderer SHALL 对 WOFF2 字体仅使用 `FontFace.load()` 原生渲染，MUST NOT 引入 wawoff2 / Brotli 解压 / emscripten wasm 等任何运行时解压链路。WOFF2 文件 SHALL NOT 因 wawoff2 相关逻辑导致 loading 永久挂起。

#### Scenario: WOFF2 文件秒开渲染
- **WHEN** 用户预览一个合法的 WOFF2 文件
- **THEN** 组件 SHALL 在 FontFace 加载完成（通常 1 秒内）即结束 loading 状态，并以 fontface 模式渲染多字号 / 多字符集样张

#### Scenario: WOFF2 元数据不展示
- **WHEN** 用户预览 WOFF2 文件
- **THEN** 元数据区的 family / glyphCount 字段 SHALL 显示 `font.metadata_unavailable` 占位文案，format 字段 SHALL 显示 “Web Open Font Format 2 (WOFF2)”，subfamily / version / designer 字段 SHALL 在缺省时隐藏（与既有规则一致）

#### Scenario: 库构建产物不包含 wawoff2
- **WHEN** 执行 `pnpm --filter @eternalheart/react-file-preview build` 或 `pnpm --filter @eternalheart/vue-file-preview build`
- **THEN** `lib/index.mjs` / `lib/index.cjs` 与所有 `lib/chunks/*.mjs` 中 SHALL NOT 出现 `wawoff2` / `decompress_binding` / `onRuntimeInitialized` 字面量

### Requirement: TTF / OTF / WOFF 路径必须继续提供完整元数据
Font Renderer SHALL 对 TTF / OTF / WOFF 三种格式继续使用 `opentype.js` 解析元数据，MUST 渲染 family / subfamily / version / designer / glyphCount / format 字段；同时保留 `FontFace` 优先 + `Canvas` 软渲染兜底的现有渲染模式切换逻辑。

#### Scenario: TTF / OTF / WOFF 元数据正确展示
- **WHEN** 用户预览一个 TTF / OTF / WOFF 文件
- **THEN** 元数据区 SHALL 在 opentype 解析完成后展示真实的 family / glyphCount / format 等字段，与本次变更前行为一致

#### Scenario: FontFace 被浏览器拒绝时回退 Canvas
- **WHEN** 浏览器 FontFace API 拒绝加载某个 TTF / OTF / WOFF 字体（如 OTS sanitizer 校验失败）
- **THEN** 组件 SHALL 切换到 `renderMode = 'canvas'` 并用 opentype.js 软渲染样张

### Requirement: 元数据状态机必须区分加载中与不可用
Font Renderer SHALL 暴露内部状态 `metadataStatus: 'loading' | 'ready' | 'unavailable'`：

- `loading`：FontFace 已就绪但 opentype 解析尚未完成，元数据占位显示 `font.metadata_loading`
- `ready`：opentype 解析完成，元数据展示真实字段
- `unavailable`：解析失败或被设计跳过（WOFF2 即属此类），元数据占位显示 `font.metadata_unavailable`

#### Scenario: WOFF2 直接进入 unavailable 状态
- **WHEN** 检测到字节流魔数为 `wOF2`
- **THEN** 组件 SHALL 立即将 `metadataStatus` 置为 `unavailable`，并在元数据区显示 `font.metadata_unavailable` 占位文案

#### Scenario: TTF / OTF / WOFF 元数据加载完成切换状态
- **WHEN** 非 WOFF2 字体的 opentype 解析成功
- **THEN** 组件 SHALL 把 `metadataStatus` 从 `loading` 切换为 `ready`，元数据区由占位文案切换为真实字段；无需重新挂载样张预览区

### Requirement: React 与 Vue 渲染器的 WOFF2 行为必须一致
React 包（`@eternalheart/react-file-preview`）与 Vue 包（`@eternalheart/vue-file-preview`）的 Font Renderer SHALL 在 WOFF2 路径上的状态机、占位文案、`metadataStatus` 取值上保持一致；两个包的实现差异仅限于框架特定 API（React Hooks vs Vue Composition API）。

#### Scenario: 两端 WOFF2 行为一致
- **WHEN** 同一份合法 WOFF2 文件分别在 React 与 Vue example 中被预览
- **THEN** 两端 SHALL 都在 1 秒内进入 fontface 渲染态、元数据栏均显示 `font.metadata_unavailable`、format 字段一致

#### Scenario: 两端 TTF/OTF/WOFF 行为一致
- **WHEN** 同一份 TTF / OTF / WOFF 文件被两端预览
- **THEN** 两端 SHALL 都在 opentype 解析完成后展示完整元数据，渲染模式（fontface / canvas）切换逻辑一致
