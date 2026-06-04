## Why

当前 `react-file-preview` 与 `vue-file-preview` 把 `wawoff2`、`@kenjiuno/msgreader`、`opentype.js` 等"特殊"依赖声明为 `external`,导致两个问题:(1) pnpm 严格模式的使用者项目里,Vite 解析 `lib/index.mjs` 中的裸模块说明符会失败;(2) `iconv-lite`(`msgreader` 依赖) 在浏览器引用 Node 内置 `stream`,触发 Vite 警告。当前 example 端通过 `resolve.alias` 把这些问题绕过去,但**真实安装的使用者无法享受这层绕过**,违反"零配置"承诺。

## What Changes

- 将下列依赖从两个库的 `rollupOptions.external` 中**移除**,改为打进对应 renderer 的 lazy chunk(仅 ESM 产物):
  - `@kenjiuno/msgreader`
  - `wawoff2`
  - `opentype.js`
- 在 `react-file-preview` 与 `vue-file-preview` 各新建 `src/shims/stream-stub.ts`,并在两个库的 `vite.config.ts` 的 `resolve.alias` 中把 `stream` 指向该 stub(让库构建时消除 `iconv-lite` 残留的 `stream` 引用)
- ESM `rollupOptions.treeshake.moduleSideEffects` 标记 `wawoff2` 与 `@kenjiuno/msgreader` 为有副作用,防止 Rollup tree-shake 误删 wawoff2 的 decompress 包装层
- CJS 产物保留现有 `external` 列表与 `inlineDynamicImports: true` 行为(CJS 主要服务 Node SSR,不会触发字体/MSG 预览),避免单文件体积膨胀
- 验证并视情况移除 `jpeg2000`、`@cornerstonejs/codec-openjpeg` 在两个库的 external 声明(`file-preview-core` 已通过 `?worker&inline` 处理),若产物体积无明显变化即清理
- 删除两个 example 的 `vite.config.ts` 中所有 `jpeg2000`、`@cornerstonejs/codec-openjpeg`、`wawoff2`、`stream` 的 alias,**只保留** `@eternalheart/*` 的 lib 入口 alias(monorepo dev 必需)
- 删除 `packages/example/src/shims/stream-stub.ts` 与 `packages/vue-example/src/shims/stream-stub.ts`(已被库内同名文件取代)

不变项:
- `pdfjs-dist`、`exceljs`、`mammoth`、`docx-preview`、`pptx-preview`、`video.js`、`shiki`、`katex`、`foliate-js`、`x-data-spreadsheet` 等保持 `external` 不变
- 所有相关包仍保留在两个库的 `package.json#dependencies` 中
- 不引入 `peerDependencies` / `optionalDependencies`
- `file-preview-core` 构建配置不动

## Capabilities

### New Capabilities

(无)

### Modified Capabilities

- `bundle-optimization`: 「重型依赖外部化」要求需要拆分:`wawoff2` / `@kenjiuno/msgreader` / `opentype.js` 不再 external,改为打进 renderer 异步 chunk;新增对 `stream` 模块在库构建时被 stub 化的要求;新增"使用者零额外配置"作为可验证场景。

## Impact

代码:
- `packages/react-file-preview/vite.config.ts`(移除 external 项 + 增加 stream alias + treeshake 副作用配置)
- `packages/vue-file-preview/vite.config.ts`(同上)
- `packages/react-file-preview/src/shims/stream-stub.ts`(新增)
- `packages/vue-file-preview/src/shims/stream-stub.ts`(新增)
- `packages/example/vite.config.ts`(清理 alias)
- `packages/vue-example/vite.config.ts`(清理 alias)
- `packages/example/src/shims/stream-stub.ts`(删除)
- `packages/vue-example/src/shims/stream-stub.ts`(删除)

依赖:
- 不新增 / 不移除任何 npm 依赖项
- 两个库的 `dependencies` 列表保持现状

产物:
- ESM `lib/index.mjs` 主入口体积**不变或微增**(仅多出几行 chunk 引导代码)
- ESM 新增 / 调整 `lib/chunks/Font-*.mjs`、`lib/chunks/Msg-*.mjs` 等 lazy chunk,体积合计 ≈ 600–800 KB(主要为 wawoff2 wasm base64,只在用户访问字体/MSG 文件时下载)
- CJS `lib/index.cjs` 体积不变(仍 external)

API / 行为:
- 公共 API 零变化,无 BREAKING
- 使用者无需任何额外安装或配置

风险:
- wawoff2 历史上 tree-shake 会丢失 decompress 包装层,需通过 `moduleSideEffects` 显式保护,且**必须**在改动后实际预览字体文件验证
- pnpm 严格模式下 Vite 预构建可能仍有边角解析问题,需要在 example 端清空 alias 后端到端验证
