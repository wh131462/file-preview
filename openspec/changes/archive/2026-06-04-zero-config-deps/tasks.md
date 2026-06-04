## 1. 准备:基线验证

- [x] 1.1 ~~在 `master` 分支当前状态执行 `pnpm -r build`,记录两个库 `lib/` 体积基线(用于改后对比)~~ — 用户决定跳过,直接对照 `bundle-optimization` spec 硬上限
- [x] 1.2 ~~执行 `pnpm --filter @eternalheart/react-file-preview-example dev` 与 `pnpm --filter @eternalheart/vue-file-preview-example dev`,在两端各预览一次 `.msg` / `.woff2` / `.jp2` 文件,确认基线行为正常~~ — 用户决定跳过

## 2. Step 1 — stream alias 单点落地

- [x] 2.1 新建 `packages/react-file-preview/src/shims/stream-stub.ts`,内容与 `packages/example/src/shims/stream-stub.ts` 一致
- [x] 2.2 新建 `packages/vue-file-preview/src/shims/stream-stub.ts`,内容与 `packages/vue-example/src/shims/stream-stub.ts` 一致
- [x] 2.3 在 `packages/react-file-preview/vite.config.ts` 添加 `resolve.alias`,把 `stream` 指向 `src/shims/stream-stub.ts`
- [x] 2.4 在 `packages/vue-file-preview/vite.config.ts` 添加 `resolve.alias`,把 `stream` 指向 `src/shims/stream-stub.ts`
- [x] 2.5 执行 `pnpm --filter @eternalheart/react-file-preview build` 与 `pnpm --filter @eternalheart/vue-file-preview build`,确认构建无 `stream externalized` 警告 — 两包均构建成功无警告;注意 Step 1 单独时 msgreader 仍 external,真正验证 alias 生效在 Step 2 完成后
- [x] 2.6 删除 `packages/example/vite.config.ts` 中的 `stream` alias
- [x] 2.7 删除 `packages/vue-example/vite.config.ts` 中的 `stream` alias
- [x] 2.8 删除 `packages/example/src/shims/stream-stub.ts` 与 `packages/vue-example/src/shims/stream-stub.ts`(以及空目录)
- [ ] 2.9 在两个 example 启动 dev,预览 `.msg` 文件验证 msgreader 工作正常,Vite 控制台无 `stream` 相关警告 — **等待用户验证**(预期:此时 stream 警告可能仍出现,因为库内 alias 在 Step 1 + Step 2 联合下才彻底生效;用户验证 msg 渲染正常即可)

## 3. Step 2 — `@kenjiuno/msgreader` 移出 ESM external

- [x] 3.1 ~~验证 `rollupOptions.output: [{external: [...]}, {external: [...]}]` 数组形式是否被 Vite lib mode 透传给 Rollup~~ — 用户决定跳过,直接走 mode 方案
- [x] 3.2 ~~改用 `process.env.LIB_FORMAT` 在 `vite.config.ts` 做条件构建~~ — 改用 Vite 原生 `--mode esm` / `--mode cjs`(跨平台,无需新依赖);`vite.config.ts` 重构为 `defineConfig(({ mode }) => ...)`,`package.json` 脚本改为 `vite build --mode esm && vite build --mode cjs`
- [x] 3.3 在 `packages/react-file-preview/vite.config.ts` 把 `@kenjiuno/msgreader` 从 ESM external 列表中移除(CJS external 保留)
- [x] 3.4 在 `packages/vue-file-preview/vite.config.ts` 同步移除
- [x] 3.5 在两个库的 ESM 输出 `rollupOptions` 中添加 `treeshake.moduleSideEffects`,把 `@kenjiuno/msgreader` 标记为有副作用
- [x] 3.6 构建两个库,grep 确认 `lib/index.mjs` 中 `@kenjiuno/msgreader` 不再以裸 import 出现,而 `lib/chunks/*` 中包含其实现代码 — Msg chunk 体积 ~323 KB(gzip ~187 KB),含 msgreader + iconv-lite
- [x] 3.7 grep 确认 `lib/index.cjs` 仍以 `require("@kenjiuno/msgreader")` 形式存在
- [ ] 3.8 在 example 端预览 `.msg` 文件,验证 chunk 加载与渲染均正常 — **等待用户验证**

## 4. Step 3 — `wawoff2` 与 `opentype.js` 移出 ESM external

- [x] 4.1 在 `packages/react-file-preview/vite.config.ts` 把 `wawoff2`(含正则)与 `opentype.js` 从 ESM external 移除(CJS external 保留)
- [x] 4.2 在 `packages/vue-file-preview/vite.config.ts` 同步移除
- [x] 4.3 在两个库的 ESM `treeshake.moduleSideEffects` 中追加 `wawoff2`
- [x] 4.4 构建两个库,grep 确认 `lib/index.mjs` 不再 import `wawoff2` / `opentype.js`,实现代码出现在 Font chunk(`index-BQYtMaOU.mjs` / `index-NWePG5AL.mjs`,约 2 MB,gzip 788 KB)— 注意:wawoff2 主线程不直接 import,只通过 `?worker&inline` 间接打入 Font chunk
- [x] 4.5 grep 确认 `lib/index.cjs` 仍 require `opentype.js`(`wawoff2` 主线程不 import,故 CJS 也无 require,符合预期)
- [x] 4.6 删除 `packages/example/vite.config.ts` 中 `wawoff2` 的 alias
- [x] 4.7 删除 `packages/vue-example/vite.config.ts` 中 `wawoff2` 的 alias
- [ ] 4.8 重启两个 example dev,**重点**预览一个 `.woff2` 与一个 `.ttf` 文件,确认 wawoff2 解压未被 tree-shake 破坏、字形渲染正常 — **等待用户验证**

## 5. Step 4 — 验证并清理 `jpeg2000` / `@cornerstonejs/codec-openjpeg` 的冗余 external

- [x] 5.1 在 step 3 完成后的 `lib/` 中 grep `jpeg2000` 与 `@cornerstonejs/codec-openjpeg`,确认无任何引用(`file-preview-core` 已通过 `?worker&inline` 全部内联到 jp2Loader chunk base64)
- [x] 5.2 从 `packages/react-file-preview/vite.config.ts` 与 `packages/vue-file-preview/vite.config.ts` 的 external 列表移除这两项
- [x] 5.3 删除 `packages/example/vite.config.ts` 与 `packages/vue-example/vite.config.ts` 中对应的 alias
- [ ] 5.4 重新构建两个库 + 启动两个 example dev,预览一个 `.jp2` 文件确认渲染正常 — **等待用户验证**(已构建无 jp2/openjpeg 残留)

## 6. 体积与产物校验

- [x] 6.1 ESM 主入口 React 0.32 KB / Vue 0.31 KB (gzip),远低于 spec 的 80 KB / 60 KB 限制 ✓
- [x] 6.2 ESM 全量产物 gzip 总和 React/Vue ≈ 1.4 MB,**超过** spec 原 800 KB / 500 KB 限制 — 已与用户对齐,提高至 3 MB(gzip),下一步同步更新 spec
- [x] 6.3 `lib/index.cjs` 体积:React 4.5 MB(gzip 1.15 MB)、Vue 4.5 MB(gzip 1.15 MB) — 主要因 `inlineDynamicImports: true` 把 jp2Loader/Font worker base64 内联进 CJS,这是 CJS 单文件分发的代价

## 7. 端到端使用者场景验证(可选,需用户授权)

- [ ] 7.1 在临时目录用 `pnpm create vite@latest` 新建一个 React + Vite + pnpm 严格模式项目,`pnpm add file:packages/react-file-preview/...tgz`(用 `pnpm pack` 生成的 tarball),验证预览 `.woff2` / `.msg` 文件零配置工作 — **跳过(需用户授权后再做)**
- [ ] 7.2 同 7.1,对 Vue 包做一遍 — **跳过(需用户授权后再做)**

## 8. 收尾

- [x] 8.1 检查 `packages/example/vite.config.ts` 与 `packages/vue-example/vite.config.ts`,确认 `resolve.alias` 仅剩 `@eternalheart/*` 入口 alias ✓
- [x] 8.2 在两个库的 `vite.config.ts` 顶部添加注释,说明 "ESM bundle / CJS external" 双分叉策略的原因(链接到本 change)— 已加,见各文件 line 17-23 注释块
- [x] 8.3 跑 `openspec validate zero-config-deps`,确认 change 校验通过 — `Change 'zero-config-deps' is valid` ✓
- [ ] 8.4 跑一次 `pnpm -r build` 全量构建,确认无回归 — **等待用户决定是否需要全量跑**
