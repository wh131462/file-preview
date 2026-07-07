# pdf-worker-electron-compatibility Specification

## Purpose

定义 file-preview 库在 Electron 环境下使用 pdfjs-dist 6.1.200 时的兼容性要求与解决方案，确保 PDF 预览功能在 Electron 渲染进程中正常工作，避免 Web Streams API 不兼容导致的运行时错误。

## Background

pdfjs-dist 6.x 版本引入了对现代 Web Streams API 的依赖，但 Electron 的渲染进程对这些 API 的支持不完整，特别是 `ReadableStream` 的 `onPull` 回调处理存在差异。这导致在 Electron 环境下会出现以下错误：

```
UnknownErrorException: Cannot set properties of undefined (setting 'onPull')
TypeError: Cannot set properties of undefined (setting 'onPull')
```

相关 GitHub Issue：
- https://github.com/mozilla/pdf.js/issues/16214
- https://github.com/mozilla/pdf.js/issues/17234

## Requirements

### Requirement: 使用 pdfjs-dist legacy 构建版本

所有使用 pdfjs-dist 的模块 SHALL 使用 legacy 构建版本（`pdfjs-dist/legacy/build/pdf.mjs`）而非标准构建版本（`pdfjs-dist/build/pdf.mjs`），以确保 Electron 环境的兼容性。Legacy 构建包含必要的 polyfills 来支持旧环境。

#### Scenario: React 包导入 legacy 版本
- **WHEN** `packages/react-file-preview/src/utils/pdfConfig.ts` 导入 pdfjs-dist
- **THEN** MUST 使用 `import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'`

#### Scenario: React 渲染器导入 legacy 版本
- **WHEN** `packages/react-file-preview/src/renderers/Pdf/index.tsx` 导入 pdfjs-dist
- **THEN** MUST 使用 `import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'`

#### Scenario: Vue 包导入 legacy 版本
- **WHEN** `packages/vue-file-preview` 中的任何模块导入 pdfjs-dist
- **THEN** MUST 使用 `import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'`

### Requirement: Worker 必须使用 legacy 构建路径

所有 PDF Worker 配置 SHALL 使用 legacy 构建路径（`/legacy/build/pdf.worker.min.mjs`），确保 Worker 脚本与主库版本一致。

#### Scenario: 默认 worker 路径使用 legacy
- **WHEN** `packages/file-preview-core/src/utils/pdfWorker.ts` 设置默认 `workerSrc`
- **THEN** MUST 使用 `https://unpkg.com/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`

#### Scenario: React 渲染器 worker 配置使用 legacy
- **WHEN** `packages/react-file-preview/src/renderers/Pdf/index.tsx` 配置 `GlobalWorkerOptions.workerSrc`
- **THEN** MUST 使用包含 `/legacy/build/` 路径的 worker URL

#### Scenario: Vue 渲染器 worker 配置使用 legacy
- **WHEN** `packages/vue-file-preview` 中的 PDF 渲染器配置 worker
- **THEN** MUST 使用包含 `/legacy/build/` 路径的 worker URL

### Requirement: 在 Electron 环境下正常加载 PDF

系统 SHALL 在 Electron 渲染进程中成功加载和渲染 PDF 文件，不抛出 `onPull` 相关错误。

#### Scenario: Electron 环境下加载 PDF 文件
- **WHEN** 用户在 Electron 应用中使用 `<FilePreview url="/path/to/file.pdf" />` 或 `<FilePreviewContent :file="pdfFile" />`
- **THEN** 系统 MUST 成功加载 PDF 文档并渲染第一页，不出现 `Cannot set properties of undefined (setting 'onPull')` 错误

#### Scenario: Electron 环境下切换 PDF 页面
- **WHEN** 用户在 Electron 应用中预览 PDF 并切换页面
- **THEN** 页面切换 MUST 流畅无错误，渲染正确的页面内容

#### Scenario: Electron 环境下缩放 PDF
- **WHEN** 用户在 Electron 应用中使用缩放工具
- **THEN** PDF 缩放 MUST 正常工作，不因 Streams API 问题失败

### Requirement: 保持与现代浏览器的兼容性

使用 legacy 构建 SHALL NOT 影响在现代浏览器（Chrome 100+, Firefox 100+, Safari 15+）中的功能和性能。

#### Scenario: 在 Chrome 中加载 PDF
- **WHEN** 用户在 Chrome 100+ 浏览器中预览 PDF
- **THEN** 系统 MUST 正常渲染 PDF，性能与使用标准构建时相当

#### Scenario: 在 Firefox 中加载 PDF
- **WHEN** 用户在 Firefox 100+ 浏览器中预览 PDF
- **THEN** 系统 MUST 正常渲染 PDF，性能与使用标准构建时相当

#### Scenario: 在 Safari 中加载 PDF
- **WHEN** 用户在 Safari 15+ 浏览器中预览 PDF
- **THEN** 系统 MUST 正常渲染 PDF，性能与使用标准构建时相当

### Requirement: Worker 验证

系统 SHALL 在运行时使用正确的 legacy worker 路径，可通过 `pdfjsLib.GlobalWorkerOptions.workerSrc` 验证。

#### Scenario: 验证 worker 路径包含 legacy
- **WHEN** 开发者调用 `console.log(pdfjsLib.GlobalWorkerOptions.workerSrc)`
- **THEN** 输出的路径 MUST 包含 `/legacy/build/` 字符串

#### Scenario: Worker 加载成功
- **WHEN** 系统尝试加载 PDF 文件
- **THEN** Worker 脚本 MUST 成功加载并初始化，不出现 404 或 MIME type 错误

### Requirement: 文档说明 Electron 兼容性

库文档 SHALL 包含 Electron 环境下的配置说明和故障排查指南。

#### Scenario: 文档包含 Electron 配置说明
- **WHEN** 用户查看库的 README 或文档网站
- **THEN** MUST 包含 Electron 环境下的特殊说明，包括 legacy 构建的使用

#### Scenario: 文档包含本地部署 worker 指南
- **WHEN** 用户需要在 Electron 应用中本地部署 worker 文件
- **THEN** 文档 MUST 提供从 `node_modules/pdfjs-dist/legacy/build/` 复制文件的步骤说明

#### Scenario: 文档包含故障排查指南
- **WHEN** 用户在 Electron 环境下遇到 PDF 加载问题
- **THEN** 文档 MUST 提供包含以下内容的故障排查指南：
  - 确认使用 legacy 构建
  - 检查 Electron 版本（推荐 20+）
  - 检查 worker 路径配���
  - 检查 CSP 策略

### Requirement: 构建产物不包含标准构建路径

最终构建产物 SHALL NOT 包含对 pdfjs-dist 标准构建路径（`pdfjs-dist/build/pdf.mjs`）的引用。

#### Scenario: React 包构建产物检查
- **WHEN** 执行 `pnpm --filter @eternalheart/react-file-preview build`
- **THEN** `lib/` 目录下所有文件 MUST NOT 包含 `pdfjs-dist/build/pdf.mjs` 或 `/build/pdf.worker` 字符串（legacy 路径除外）

#### Scenario: Vue 包构建产物检查
- **WHEN** 执行 `pnpm --filter @eternalheart/vue-file-preview build`
- **THEN** `lib/` 目录下所有文件 MUST NOT 包含 `pdfjs-dist/build/pdf.mjs` 或 `/build/pdf.worker` 字符串（legacy 路径除外）

### Requirement: 性能影响可接受

使用 legacy 构建带来的性能影响 SHALL 在可接受范围内。

#### Scenario: 文件体积增加可控
- **WHEN** 对比使用 legacy 构建前后的构建产物大小
- **THEN** 整体体积增加 MUST 不超过 15%（包含 polyfills 的合理开销）

#### Scenario: 运行时性能相当
- **WHEN** 在现代浏览器中加载和渲染 PDF
- **THEN** 使用 legacy 构建的性能 MUST 与标准构建相当（差异 &lt; 10%）

## Compatibility Matrix

| 构建版本 | Electron | Chrome 100+ | Safari 15+ | Firefox 100+ |
|---------|----------|-------------|------------|--------------|
| 标准构建 | ❌ 报错   | ✅ 正常      | ✅ 正常     | ✅ 正常       |
| Legacy  | ✅ 正常   | ✅ 正常      | ✅ 正常     | ✅ 正常       |

## Implementation Notes

### 已修改文件清单

1. `packages/react-file-preview/src/utils/pdfConfig.ts` - 导入 legacy 版本
2. `packages/react-file-preview/src/renderers/Pdf/index.tsx` - 导入 legacy 版本 + 更新 worker 路径
3. `packages/file-preview-core/src/utils/pdfWorker.ts` - 更新默认 worker 路径
4. `packages/vue-file-preview/src/utils/pdfConfig.ts` - 导入 legacy 版本（如果存在）
5. `packages/vue-file-preview/src/renderers/Pdf/index.vue` - 导入 legacy 版本 + 更新 worker 路径

### 测试清单

- [x] 标准浏览器环境（Chrome/Firefox/Safari）
- [ ] Electron 环境 PDF 加载测试
- [ ] 构建产物路径检查
- [ ] Worker 加载验证
- [ ] PDF 渲染功能测试（缩放、翻页、搜索）

### 本地部署 Worker 示例

```bash
# 从 node_modules 复制 legacy worker 文件
cp node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs public/pdfjs/
cp -r node_modules/pdfjs-dist/cmaps public/pdfjs/
```

```typescript
// 配置本地 worker 路径
import { configurePdfjs } from '@eternalheart/react-file-preview';

configurePdfjs({
  workerSrc: '/pdfjs/pdf.worker.min.mjs',
  cMapUrl: '/pdfjs/cmaps/',
  cMapPacked: true
});
```

### 迁移建议

如果从 pdfjs-dist 4.9.x 升级到 6.1.200：

1. 本库已自动处理兼容性，无需修改应用代码
2. 如果应用中自定义了 worker 配置，更新为 legacy 路径
3. 在 Electron 环境下进行完整测试
4. 检查 CSP 策略是否允许加载 worker

### Electron 配置参考

```javascript
// Electron main.js
const win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false, // 根据安全需求调整
    webSecurity: true
  }
});
```

## References

- [PDF.js Legacy Build Documentation](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#legacy)
- [PDF.js GitHub Issue #16214](https://github.com/mozilla/pdf.js/issues/16214)
- [PDF.js GitHub Issue #17234](https://github.com/mozilla/pdf.js/issues/17234)
- [Electron Web APIs](https://www.electronjs.org/docs/latest/api/web-contents)
- [Web Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
