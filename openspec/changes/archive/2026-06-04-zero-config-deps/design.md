## Context

`@eternalheart/react-file-preview` 与 `@eternalheart/vue-file-preview` 现行构建策略中,把 `wawoff2`、`@kenjiuno/msgreader`、`opentype.js`、`jpeg2000`、`@cornerstonejs/codec-openjpeg` 等"特殊"依赖声明为 Rollup `external`,产物中保留 `import("wawoff2")` 等裸模块说明符。这套策略在 npm/yarn 默认 hoisting 场景下能正常工作(用户的根 `node_modules` 里会有这些包),但在 **pnpm 严格模式**下,Vite 预构建从用户项目根目录解析裸模块说明符会失败 — 因为用户没在自己的 `package.json` 里显式声明这些 transitive deps。

此外,`@kenjiuno/msgreader` 间接依赖 `iconv-lite`,后者在浏览器中会 `require('stream')`,触发 Vite "Module 'stream' has been externalized" 警告。

当前 monorepo 内的 `example` 和 `vue-example` 通过 `vite.config.ts` 的 `resolve.alias` 把这些问题绕开了(把裸模块说明符显式指向 `vue-file-preview/node_modules/...`,把 `stream` 指向本地 stub),但真实安装库的使用者无法享受这层绕过。

约束:
- **用户零配置**:不允许要求使用者修改自己的 `vite.config.ts` 或 `package.json`
- **不引入 `peerDependencies` / `optionalDependencies`**
- **不新增 npm 依赖**
- **不改 `file-preview-core` 构建**:core 已通过 `?worker&inline` 把 `jpeg2000`+`openjpeg` 内联进 worker base64,工作正常
- **不破坏 CJS 兼容**:CJS 产物因 `inlineDynamicImports: true`,所有 chunk 会被内联,需避免体积膨胀

## Goals / Non-Goals

**Goals:**

- 使用者执行 `npm install @eternalheart/{react,vue}-file-preview` 后,无需任何额外配置即可在任意 pnpm/npm/yarn 项目里使用全部 renderer
- ESM 产物保持按需加载:重型依赖跟随对应 renderer chunk lazy-load
- 主入口 `lib/index.mjs` 体积不显著变化
- 库内构建时消除 `stream` 模块的解析告警

**Non-Goals:**

- 不优化 CJS 产物体积(继续 inline)
- 不改动 `pdfjs-dist`、`exceljs`、`mammoth`、`docx-preview`、`pptx-preview`、`video.js`、`shiki`、`katex`、`foliate-js`、`x-data-spreadsheet` 等"常见且容易被用户独立安装"的依赖的 external 状态
- 不重写任何 renderer 业务逻辑
- 不调整 `file-preview-core` 的产物形态

## Decisions

### 决策 1:从 ESM external 移除 `@kenjiuno/msgreader` / `wawoff2` / `opentype.js`

**做法**:把这三个包从 `rollupOptions.output[0].external`(ESM 输出) 中移除。Rollup 会随对应 renderer(`Msg/index.tsx` / `Font/index.tsx`) 的动态 `import()` 边界自动拆分 chunk(`chunks/Msg-*.mjs`、`chunks/Font-*.mjs`),把这些包打进对应 chunk。

**为什么不打进主 bundle**:主 bundle 体积约束 ≤ 80 KB / ≤ 60 KB(见 `bundle-optimization` spec),wawoff2 单包就 600 KB+。

**为什么不打进 worker base64**:wawoff2 不是 worker 形态,它是同步 JS API;`@kenjiuno/msgreader` 也不是 worker。它们天然适合按 chunk 拆分。

**替代方案对比**:
- ❌ 维持 external + 让用户配置:违背"零配置"目标
- ❌ 维持 external + 文档说明:在 pnpm 严格模式下用户体验差
- ❌ 全部 external + 改成 peerDependencies:违背"不引入 peerDependencies"约束
- ✅ 从 ESM external 移除,打进 lazy chunk

### 决策 2:CJS 输出继续 external 这些包

**做法**:Rollup `output` 数组分别配置 — ESM 输出移除 external,CJS 输出维持原 external 列表。

**为什么**:CJS 因 `inlineDynamicImports: true`,所有 lazy chunk 会被合并进 `lib/index.cjs`。若 CJS 也 bundle 这些包,单文件膨胀严重。CJS 使用场景以 Node SSR 为主,SSR 不会触发字体 / MSG 预览(浏览器交互场景),保持 external 不影响实际可用性。

**Vite 兼容性确认点**:Vite lib mode 下 `rollupOptions.output` 为数组形式时,每个 output entry 可独立设置 `external` 选项 — 这是 Rollup 原生支持的特性。需在实施时验证 Vite 没有覆写这一行为。

### 决策 3:`stream` 模块通过库内 alias 替换为空 stub

**做法**:
- 在 `packages/react-file-preview/src/shims/stream-stub.ts` 与 `packages/vue-file-preview/src/shims/stream-stub.ts` 各新建一个空导出的 stub(沿用 example 端现行实现)
- 在两个库的 `vite.config.ts` 的 `resolve.alias` 添加 `stream: resolve(__dirname, 'src/shims/stream-stub.ts')`

**生效条件**:`stream` 引用必须出现在被 bundle 的模块里(即决策 1 把 msgreader bundle 之后,`iconv-lite` 的 `require('stream')` 才会被库构建扫到并 alias)。若 msgreader 仍 external,该 alias 不会生效 — 这也解释了为什么决策 1 与决策 3 必须同时落地。

**为什么不用 `define` 或 `rollupOptions.external` 排除 stream**:`stream` 是 Node 内置模块,Rollup external 后产物里仍是 `require('stream')`,运行时浏览器无法解析。alias 到 stub 才能彻底消除引用。

### 决策 4:wawoff2 / msgreader 标记为有副作用,防止 tree-shake 误删

**做法**:在 ESM 输出的 `rollupOptions.treeshake` 中:

```ts
treeshake: {
  moduleSideEffects: (id) => /node_modules\/(wawoff2|@kenjiuno\/msgreader)\//.test(id),
}
```

**为什么**:既有 vite.config.ts 注释明确写出 `wawoff2` 历史上被 tree-shake 后 decompress 包装层会丢失,导致解压挂死。bundle 进 chunk 后,必须显式保护。

### 决策 5:`jpeg2000` / `@cornerstonejs/codec-openjpeg` 暂保持 external,实施时验证

**做法**:不在这个 change 里调整这两个包的 external 状态。在实施时,先做最小改动 + 构建产物对比;若发现两个库的产物里**实际上没有任何对它们的引用**(因为 `file-preview-core` 已经 `?worker&inline` 处理),则在最后一步清理这两条 external 声明,**不再需要**对应的 example 端 alias。

**为什么分阶段**:这两个包的 external 声明可能只是冗余 — 移除它们不影响产物,但需要通过构建产物体积、grep 验证。先解决主要问题(wawoff2/msgreader/stream),最后验证清理。

### 决策 6:example 端 alias 清理顺序与库构建对齐

**做法**:必须先完成库 vite.config.ts 改动 + 构建出新 lib → 再清理 example 端 alias → 再启动 example dev/build 验证。
- 若先清理 example alias 再改库,example 一定会因为找不到 wawoff2 而启动失败,无法验证
- 顺序错了不会有功能损失,但会浪费一轮排错时间

## Risks / Trade-offs

[Risk] **wawoff2 tree-shake 丢失 decompress 包装层** → 通过 `moduleSideEffects` 显式保护,改动后**必须**用真实字体文件端到端预览验证。验证方法:在 example 中加载一个 `.woff2` 或 `.ttf` 文件,确认渲染成功。

[Risk] **Rollup `output[].external` 数组形式 Vite 兼容性** → 实施时若发现 Vite lib mode 把数组 external 忽略,fallback 方案:用 `vite.config.ts` 的 `mode` 条件判断,通过 `process.env` 切换两次构建(`build:esm` / `build:cjs`),每次只产一个格式。需在实施过程中先做单点验证再大改。

[Risk] **lazy chunk 体积偏大(Font chunk ~600 KB)** → 这是 wawoff2 wasm base64 的固有体积,无法压缩。用户首次访问字体文件时下载,可接受;后续浏览器缓存。

[Risk] **`iconv-lite` 在浏览器除 `stream` 外仍有 Node 模块引用(如 `buffer`)** → 若构建时还出现其他 Node 内置模块的 externalized 警告,需追加对应 alias。属于实施过程中发现并增量解决,不阻塞主路径。

[Risk] **pnpm 严格模式下 monorepo 内 example 解析失败** → 若 example 在改动后启动失败,说明 vite 在 dev 模式下从 example 根目录解析裸模块说明符。备选方案:在 example 的 `package.json` 显式声明 `"wawoff2": "*"` 等(注:这与"用户零配置"无关,只是 dev 体验)。**这条 fallback 不影响发布后的真实用户**。

[Risk] **CJS 与 ESM 行为分叉带来心智负担** → 在 vite.config.ts 注释中明确写出"为何 ESM bundle / CJS external",降低后续维护误读。

## Migration Plan

按以下顺序分四步实施,每一步独立可验证、可回滚:

1. **stream alias 单点落地**(最小风险):移 stub 进库内,加 alias,删 example 端 stream alias 与 stub 文件。构建 + 启动 example 验证 msg 文件预览。
2. **msgreader 出 external**:从 ESM external 移除 `@kenjiuno/msgreader`,加 `moduleSideEffects` 配置;构建 + 端到端预览 .msg 文件。
3. **wawoff2 + opentype.js 出 external**:重点验证字体预览。同时删 example 端对应 alias。
4. **清理冗余的 jpeg2000 / openjpeg external**:grep 产物,确认无引用后从 external 移除并删 example 端对应 alias;若仍有引用则保留现状。

每步完成后跑 `pnpm build` + `pnpm dev` 在 example/vue-example 双端口验证。

回滚策略:每步对应独立的代码改动,可用 `git revert` 单步回退。

## Open Questions

- Vite 5 lib mode 下,`rollupOptions.output: [{external: [...]}, {external: [...]}]` 的形式是否被原样透传给 Rollup?若被 Vite 拍平,需要走 `process.env` 双次构建的退路。**计划在 task 阶段做最小复现验证。**
- 验证 jpeg2000/openjpeg external 是否冗余时,具体 grep 模式与判定阈值。**计划在 task 4 中明确为"产物 `lib/**/*.mjs` 中 grep 不到对应包名"即视为可清理**。
