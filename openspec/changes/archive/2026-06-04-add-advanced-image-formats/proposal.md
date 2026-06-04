## Why

当前 `file-preview` 仅支持浏览器原生图片格式（JPEG/PNG/GIF/WebP/SVG/BMP/ICO），**无法预览苹果设备的默认照片格式 HEIC/HEIF**，这是用户反馈最强烈的痛点。此外，现代图片格式（AVIF）、专业场景格式（TIFF/RAW/PSD）也完全缺失。主要问题：

1. **苹果生态断层**：iPhone/iPad 从 iOS 11 起默认拍摄 HEIC 格式，用户直接上传照片时浏览器无法原生显示，导致预览失败。
2. **现代格式缺位**：AVIF 作为新一代高压缩比格式，部分现代浏览器已支持，但项目未做兼容检测。
3. **专业场景缺失**：设计师（PSD）、摄影师（RAW）、扫描文档（TIFF）等专业用户无法使用本库。

本提案采取**渐进式按需加载**策略：通过动态 import 第三方解码库（heic2any、tiff.js、ag-psd 等），保持核心包体积不变，仅在用户实际预览这些格式时才下载对应解码器。

## What Changes

- **新增图片格式支持**（Phase 1 高优先级）：
  - **HEIC/HEIF** (`.heic`, `.heif`)：基于 `heic2any` (WASM) 解码为 JPEG Blob，复用现有 `<img>` 渲染器
  - **AVIF** (`.avif`)：检测浏览器原生支持 → 原生渲染 / WASM 降级（`avif.js`）
  - **TIFF** (`.tif`, `.tiff`)：基于 `tiff.js` 解码，支持多页 TIFF 翻页
- **新增图片格式支持**（Phase 2 中优先级）：
  - **RAW** (`.cr2`, `.nef`, `.arw`, `.dng`, `.raf`, `.orf`)：提取嵌入的 JPEG 缩略图快速预览，可选完整解码（`raw.js`）
  - **PSD** (`.psd`)：基于 `ag-psd` 解析并渲染合并图层
- **新增图片格式支持**（Phase 3 低优先级，按需实现）：
  - **JPEG 2000** (`.jp2`, `.jpx`)：Safari 原生支持，其他浏览器用 `openjpeg.js` WASM 解码
- **架构变更**：
  - 新增 `packages/file-preview-core/src/loaders/` 目录，每种格式一个独立 loader（`heicLoader.ts`、`tiffLoader.ts` 等）
  - 统一 `ImageDecoder` 接口：`needsDecode()` 检测、`decode()` 转 Blob、`getMetadata()` 元信息
  - 解码逻辑在 Web Worker 中执行（HEIC/RAW/PSD 等耗时操作），避免阻塞主线程
  - 所有解码库通过动态 `import()` 按需加载，不打入主 bundle
- **MIME 类型扩展**：在 `packages/file-preview-core/src/utils/mimeTypes.ts` 中新增扩展名到 MIME 映射（`image/heic`、`image/avif`、`image/tiff` 等）
- **UI 增强**：
  - HEIC/RAW 等慢解码格式显示"正在解码..."进度提示
  - 多页 TIFF 复用 PDF 翻页器 UI
  - RAW 格式显示"这是预览缩略图"提示 + "加载完整版"按钮
- **文档更新**：`packages/docs/guide/supported-types.md` 新增上述格式说明，标注浏览器兼容性与性能特征

## Capabilities

### New Capabilities
- `advanced-image-formats`: 扩展图片预览能力，支持 HEIC/HEIF、AVIF、TIFF、RAW、PSD、JPEG 2000 等非浏览器原生格式，通过 WASM 解码库按需加载实现

### Modified Capabilities
<!-- 不修改已有 spec，仅增量扩展 image 类型的格式覆盖范围 -->

## Impact

- **代码影响**：
  - `packages/file-preview-core/src/utils/mimeTypes.ts`：新增 10+ 种 MIME 类型映射
  - `packages/file-preview-core/src/loaders/`：新增 6 个 loader 文件（heicLoader.ts、avifLoader.ts、tiffLoader.ts、rawLoader.ts、psdLoader.ts、jp2Loader.ts）
  - `packages/file-preview-core/src/renderers/ImageRenderer.tsx`（React）/ `.vue`（Vue）：改造为先检测格式 → 需要解码则调用 loader → 生成 Blob URL 喂给 `<img>`
  - `packages/file-preview-core/src/workers/imageDecoder.worker.ts`：新增 Web Worker 处理耗时解码
  - `packages/*/package.json`：`devDependencies` 新增类型声明包（`@types/heic2any` 等），**不新增 runtime dependencies**（解码库动态加载）
- **依赖影响**：
  - **解码库作为常规 `dependencies`**：`heic2any`、`utif`、`ag-psd`、`@jsquash/avif`、`@jsquash/jpeg2000` 加入 React / Vue 两个包的 `dependencies`，与现有重型依赖（`pdfjs-dist`、`mammoth` 等）统一策略
  - **主 bundle 体积零增量**：所有解码库通过动态 `import()` 与 vite `external` 按需加载，不进入首屏 chunk
  - 不引入新 peer 依赖
- **API 影响**：
  - 主入口 API 完全兼容（`FilePreviewModal`/`Embed`/`Content` props 不变）
  - 新增可选 prop `decoderConfig?: { cdnBase?: string; preferNative?: boolean }`，允许用户指定解码库 CDN 地址或强制使用原生渲染
  - **无 BREAKING**：已有用户代码无需修改，升级后自动获得新格式支持
- **性能影响**：
  - HEIC 首次解码需 500ms-2s（取决于图片分辨率），后续同格式复用已加载的解码器
  - RAW 完整解码可能超过 5s，默认仅显示嵌入缩略图（< 200ms）
  - 动态 import 首次需下载解码器（280KB-2MB gzipped），浏览器缓存后无额外开销
- **文档影响**：
  - `packages/docs/guide/supported-types.md`：新增"高级图片格式"章节，列出格式、性能特征、浏览器兼容性
  - README：新增"可选依赖"说明，给出 CDN 配置示例
