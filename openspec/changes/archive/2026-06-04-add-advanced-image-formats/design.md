## Context

`file-preview` 当前仅支持 7 种浏览器原生图片格式（JPEG/PNG/GIF/WebP/SVG/BMP/ICO），通过直接设置 `<img src="...">` 实现。对于浏览器不原生支持的格式（HEIC/AVIF/TIFF/RAW/PSD/JPEG2000），需要引入第三方解码库。

核心挑战：

1. **体积敏感**：解码库体积从 50KB（tiff.js）到 2MB（raw.js）不等，不能全部打入主 bundle。
2. **性能敏感**：HEIC 解码需 500ms-2s，RAW 完整解码可能超过 5s，必须异步且不阻塞 UI。
3. **兼容性分层**：AVIF 在现代浏览器已原生支持，JPEG 2000 仅 Safari 支持，需检测后降级。
4. **多框架同步**：React 与 Vue 版本必须功能对齐（`support-type` skill 约束）。

约束：

- 主 bundle 体积增长不超过 10KB（仅类型声明 + loader 调度逻辑）。
- 保持现有 `ImageRenderer` 的缩放/旋转/平移能力。
- 必须同步覆盖 React 与 Vue 两个包。
- 解码失败时显示友好错误提示（"该格式需要额外库支持，正在加载..." / "解码失败，请检查文件"）。

## Goals / Non-Goals

**Goals:**

- 支持 HEIC/HEIF（Phase 1 最高优）、AVIF、TIFF 三种格式，覆盖苹果生态与现代浏览器。
- 支持 RAW（缩略图模式）、PSD（Phase 2），覆盖专业场景。
- 解码库按需动态加载，主 bundle 增量 ≤ 10KB gzipped。
- 解码在 Web Worker 中执行（HEIC/RAW/PSD），避免主线程卡顿。
- 提供统一的 `ImageDecoder` 接口，便于后续扩展新格式。
- 浏览器原生支持的格式（如部分浏览器的 AVIF）优先走原生渲染，不加载解码器。

**Non-Goals:**

- 不实现图层编辑（PSD）、RAW 参数调节（曝光/白平衡），仅展示最终效果。
- 不支持 DRM 保护的 HEIC（会检测并提示"该文件受保护"）。
- 不实现服务端解码（所有解码在浏览器完成）。
- 不优化已支持的 7 种原生格式的渲染逻辑。
- Phase 1 不实现 JPEG 2000 / JPEG XL / DDS / KTX（低优先级，可在 Phase 3 按需补充）。

## Decisions

### D1: 采用"统一 ImageDecoder 接口 + 格式专属 loader"架构（而非在 ImageRenderer 中硬编码）

**选择**：定义统一的 `ImageDecoder` 接口：

```typescript
interface ImageDecoder {
  /** 检测该格式是否需要解码（浏览器不原生支持） */
  needsDecode(mimeType: string): Promise<boolean>;
  
  /** 解码为浏览器可直接展示的格式（Blob 或 data URL） */
  decode(file: Blob | ArrayBuffer, options?: DecodeOptions): Promise<Blob | string>;
  
  /** 获取元数据（可选，用于显示 EXIF、尺寸等） */
  getMetadata?(file: Blob | ArrayBuffer): Promise<ImageMetadata>;
}

interface DecodeOptions {
  /** RAW 格式是否加载完整图像（默认 false，仅提取缩略图） */
  fullQuality?: boolean;
  /** 目标输出格式（默认 'image/png'） */
  outputFormat?: 'image/jpeg' | 'image/png';
  /** 进度回调（0-100） */
  onProgress?: (percent: number) => void;
}
```

每种格式一个独立 loader：`heicLoader.ts`、`avifLoader.ts`、`tiffLoader.ts`、`rawLoader.ts`、`psdLoader.ts`、`jp2Loader.ts`。

在 `ImageRenderer` 中根据 MIME 类型动态选择 loader：

```typescript
const loader = await getLoaderForMimeType(file.type);
if (loader && await loader.needsDecode(file.type)) {
  const blob = await loader.decode(fileBlob, { onProgress: setDecodeProgress });
  const blobUrl = URL.createObjectURL(blob);
  setImageSrc(blobUrl);
} else {
  setImageSrc(file.url); // 原生支持，直接渲染
}
```

**理由**：

- 解耦格式逻辑，新增格式仅需增加一个 loader 文件，无需改 ImageRenderer。
- loader 可独立测试、独立优化。
- `needsDecode()` 可运行时检测浏览器能力（如 AVIF），避免不必要的库加载。

**替代方案**：

- ❌ 在 ImageRenderer 中对每种格式硬编码 if-else：耦合度高，难维护。
- ❌ 为每种格式创建独立 Renderer（HeicRenderer、TiffRenderer）：重复缩放/旋转逻辑，且破坏 `image` 类型的统一性。

---

### D2: 解码库通过动态 import() 从 npm 包按需加载（而非 CDN）

**选择**：将解码库声明为 React / Vue 包的常规 `dependencies`（与 `pdfjs-dist`、`mammoth` 等现有重型依赖统一策略）：

```json
{
  "dependencies": {
    "heic2any": "^0.0.4",
    "utif": "^3.1.0",
    "ag-psd": "^25.0.0",
    "@jsquash/avif": "^1.4.0",
    "@jsquash/jpeg2000": "^1.1.0"
  }
}
```

在 loader 中动态 import，配合 vite 的 `external` + 代码分割，使库不会进入主 chunk：

```typescript
// heicLoader.ts
export async function decode(file: Blob): Promise<Blob> {
  const heic2any = await import('heic2any');
  const result = await heic2any.default({ blob: file, toType: 'image/jpeg' });
  return result as Blob;
}
```

**理由**：

- 与现有依赖（如 `pdfjs-dist`、`docx-preview`、`mammoth`）保持一致的策略：放在 `dependencies` 中，自动安装。
- `optionalDependencies` 实际不会被 pnpm/npm 主动安装；使用者会遇到运行时 module-not-found 错误，体验差。
- 动态 `import()` 使得未使用的格式不会被打入首屏 bundle（Vite/webpack 自动代码分割）。
- 使用者无需手动安装任何新包，升级即获得新格式支持。

**替代方案**：

- ❌ `optionalDependencies`：用户必须手动 `npm install heic2any`，BREAKING 体验。
- ❌ 从 CDN 动态加载：无法离线使用，企业内网受限。
- ❌ 打入主 bundle：体积膨胀 2-3MB，违反目标。

---

### D3: 耗时解码（HEIC/RAW/PSD）在 Web Worker 中执行（而非主线程）

**选择**：创建 `packages/file-preview-core/src/workers/imageDecoder.worker.ts`：

```typescript
import type { ImageDecoder } from '../loaders/types';

self.onmessage = async ({ data }) => {
  const { type, buffer, options } = data;
  
  try {
    const loader = await getLoaderForMimeType(type);
    const result = await loader.decode(buffer, options);
    
    // 将 Blob 转为 ArrayBuffer 传回主线程
    const arrayBuffer = await result.arrayBuffer();
    self.postMessage({ success: true, data: arrayBuffer, mimeType: result.type });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
```

在 `ImageRenderer` 中启动 worker：

```typescript
const worker = new Worker(new URL('../workers/imageDecoder.worker.ts', import.meta.url), { type: 'module' });

worker.postMessage({ type: file.type, buffer: await file.arrayBuffer() });
worker.onmessage = ({ data }) => {
  if (data.success) {
    const blob = new Blob([data.data], { type: data.mimeType });
    setImageSrc(URL.createObjectURL(blob));
  } else {
    setError(data.error);
  }
};
```

**理由**：

- HEIC 解码 WASM 计算密集，在主线程执行会卡顿 500ms-2s。
- Worker 隔离崩溃：解码失败不会影响主线程。
- 浏览器对 Worker 中的 `import()` 支持良好（Chrome/Firefox/Safari 均支持 module worker）。

**替代方案**：

- ❌ 主线程 + `setTimeout` 分片：无法真正避免卡顿，WASM 执行无法中断。
- ❌ 对所有格式都用 Worker：TIFF/AVIF 解码较快（< 100ms），Worker 通信开销反而更大。

**权衡**：仅 HEIC/RAW/PSD 用 Worker，TIFF/AVIF 在主线程执行。

---

### D4: 多页 TIFF 复用 PDF 翻页器 UI（而非创建新组件）

**选择**：在 `ImageRenderer` 中检测 TIFF 是否多页，若是则显示 PDF 翻页器的页码控制器：

```typescript
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

// 解码 TIFF 时获取页数
const metadata = await tiffLoader.getMetadata(fileBlob);
setTotalPages(metadata.pageCount);

// 切换页码时重新解码对应页
const handlePageChange = async (page: number) => {
  const blob = await tiffLoader.decode(fileBlob, { page });
  setImageSrc(URL.createObjectURL(blob));
  setCurrentPage(page);
};

return (
  <>
    <img src={imageSrc} />
    {totalPages > 1 && (
      <PageNavigator current={currentPage} total={totalPages} onChange={handlePageChange} />
    )}
  </>
);
```

**理由**：

- 复用现有 UI 组件，无需设计新交互。
- 用户已熟悉 PDF 翻页逻辑，认知负担低。
- 多页 TIFF 在扫描文档场景与 PDF 非常相似。

**替代方案**：

- ❌ 将多页 TIFF 视为"图片组"，缩略图网格显示：交互复杂，且大多数 TIFF 是文档类（非照片集）。
- ❌ 自动合并为长图：丢失分页信息，且内存占用高。

---

### D5: RAW 格式默认仅提取嵌入缩略图，完整解码需用户手动触发

**选择**：

1. 检测到 RAW 格式时，先快速提取嵌入的 JPEG 缩略图（通常 50-200KB，解码 < 200ms）。
2. 显示缩略图 + 提示条：`⚠️ 这是预览缩略图（非完整像素） [加载完整版]`。
3. 用户点击"加载完整版"后，才启动完整 RAW 解码（2-5s，可能需要下载 raw.js ~2MB）。

```typescript
const [isFullQuality, setIsFullQuality] = useState(false);

useEffect(() => {
  if (isRawFormat(file.type)) {
    // 快速模式：仅提取缩略图
    rawLoader.decode(fileBlob, { fullQuality: false }).then(setImageSrc);
  }
}, [file]);

const loadFullQuality = async () => {
  setDecoding(true);
  const blob = await rawLoader.decode(fileBlob, { fullQuality: true, onProgress: setProgress });
  setImageSrc(URL.createObjectURL(blob));
  setIsFullQuality(true);
  setDecoding(false);
};
```

**理由**：

- RAW 完整解码极慢且解码库巨大（raw.js 2MB），默认加载会严重拖累体验。
- 嵌入缩略图通常 1920x1080 或更高，满足 90% 预览需求。
- 给用户选择权（"我只是看看" vs "我要完整像素"）。

**替代方案**：

- ❌ 完全不支持 RAW：摄影师用户流失。
- ❌ 默认完整解码：首次体验极差（等待 5s + 下载 2MB）。
- ❌ 服务端解码：增加后端依赖，违反"纯前端"定位。

---

### D6: 格式检测优先级：MIME type > 扩展名 > 文件头魔数

**选择**：

```typescript
function detectImageFormat(file: File | PreviewFile): string {
  // 1. 优先使用显式指定的 MIME type
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type;
  }
  
  // 2. 从扩展名推断
  const ext = getFileExtension(file.name);
  const mimeFromExt = MIME_TYPES[ext];
  if (mimeFromExt) return mimeFromExt;
  
  // 3. 读取文件头魔数（仅对二进制格式）
  if (file instanceof Blob) {
    return await detectByMagicNumber(file);
  }
  
  return 'application/octet-stream';
}
```

魔数检测（仅必要时）：

```typescript
async function detectByMagicNumber(blob: Blob): Promise<string> {
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  
  // HEIC: ftyp heic / ftyp heix
  if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
    const brand = String.fromCharCode(...header.slice(8, 12));
    if (brand === 'heic' || brand === 'heix') return 'image/heic';
  }
  
  // TIFF: II*\0 (little-endian) 或 MM\0* (big-endian)
  if ((header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2A && header[3] === 0x00) ||
      (header[0] === 0x4D && header[1] === 0x4D && header[2] === 0x00 && header[3] === 0x2A)) {
    return 'image/tiff';
  }
  
  // ... 其他格式
  return 'application/octet-stream';
}
```

**理由**：

- MIME type 由使用者或服务器明确指定，最可靠。
- 扩展名覆盖 95% 场景，且零开销。
- 魔数检测作为 fallback，避免误判（如 `.jpg.heic` 被识别为 JPEG）。

**替代方案**：

- ❌ 只用扩展名：用户重命名文件会导致识别失败。
- ❌ 总是读魔数：增加 I/O 开销，且 URL 类型文件无法读取。

---

## Risks / Trade-offs

- **[解码库 CDN 不可达]** → 使用 `optionalDependencies` + 本地 fallback：库从 node_modules 加载，无需公网。若用户未安装，显示"该格式需安装 heic2any，运行 `npm install heic2any`"错误提示。
- **[WASM 解码器在低端设备上崩溃]** → 捕获 Worker 崩溃事件，显示"设备内存不足，无法解码该文件"；对超大文件（> 50MB）提前警告。
- **[多页 TIFF 切换页码时重复解码慢]** → 实现页面缓存：已解码的页面缓存为 Blob URL，切换时直接取缓存；限制缓存最多 10 页（超出则 LRU 淘汰）。
- **[RAW 格式种类繁多，raw.js 可能不支持某些相机]** → 在文档中列出支持的相机型号列表（raw.js 官方清单）；解码失败时提示"该相机型号暂不支持，请联系开发者"。
- **[PSD 图层效果丢失]** → 文档明确说明"仅展示合并图层，不保留图层信息与特效"；遇到带蒙版/调整图层的 PSD 时，在 UI 提示"部分效果可能与 Photoshop 不一致"。
- **[AVIF 浏览器支持度检测不准]** → 使用 `<img>` 加载测试图片检测支持度（Modernizr 方案）：
  ```typescript
  async function supportsAVIF(): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlm...'; // 1x1 像素 AVIF
    });
  }
  ```
- **[动态 import 在老旧打包器中失败]** → 在文档说明最低支持 webpack 5 / Vite 2；提供 Babel plugin 配置示例（`@babel/plugin-syntax-dynamic-import`）。

---

## Migration Plan

1. **里程碑 M1（基础设施，不发布）**：
   - 实现 `ImageDecoder` 接口定义与 loader 注册机制。
   - 实现 `heicLoader.ts`（Phase 1 最高优）。
   - 改造 `ImageRenderer`，增加"解码中..."UI 状态。
   - 单元测试：heicLoader 解码正确性、错误处理。
   - 手工测试：上传 HEIC 文件验证渲染 + 缩放/旋转。

2. **里程碑 M2（Phase 1 完成，beta 发布）**：
   - 实现 `avifLoader.ts`、`tiffLoader.ts`（含多页支持）。
   - 实现 Web Worker 解码（`imageDecoder.worker.ts`）。
   - 更新 `packages/docs/guide/supported-types.md`，新增 HEIC/AVIF/TIFF 说明。
   - 发布 `1.4.0-beta.1` 到 npm dist-tag `next`。
   - 邀请社区用户测试（GitHub Discussion / Discord）。

3. **里程碑 M3（Phase 2 完成，正式发布）**：
   - 实现 `rawLoader.ts`（缩略图模式 + 完整解码）。
   - 实现 `psdLoader.ts`。
   - 补充集成测试：覆盖 React 与 Vue 两个包的所有新格式。
   - 性能测试：确保 HEIC 解码不超过 2s（iPhone 拍摄的 4000x3000 照片）。
   - 发布 `1.4.0` 正式版。

4. **里程碑 M4（Phase 3，按需）**：
   - 实现 `jp2Loader.ts`（JPEG 2000）。
   - 根据用户反馈评估是否支持 JPEG XL / DDS / KTX。

**回滚策略**：

- 若 beta 测试发现严重兼容性问题（如某些打包器无法处理动态 import），立即 npm unpublish beta 版本。
- 正式版发布后保留 `1.3.x` 分支至少 3 个月，接受 bugfix。

---

## Open Questions

- **是否需要支持 HEIC 动态照片（Live Photo）**？→ Phase 1 不支持（需解析 MOV 流），可在 Phase 3 评估。
- **RAW 格式是否需要支持色彩配置文件（ICC Profile）**？→ Phase 2 暂不支持，raw.js 输出 sRGB；若用户反馈强烈可在 Phase 3 增强。
- **是否提供"批量转换"功能（如 HEIC → JPEG 导出）**？→ 超出"预览"范畴，建议作为独立 feature 或插件。
- **是否需要服务端解码 fallback（如 Cloudflare Images）**？→ 当前不提供，使用者可通过自定义 `requestHandler` 实现服务端转换后返回 JPEG。
