## 里程碑 M1：基础设施搭建

### 任务 1.1：定义 ImageDecoder 接口与类型系统
**估时**：1h  
**文件**：`packages/file-preview-core/src/loaders/types.ts`

- [x] 定义 `ImageDecoder` 接口（`needsDecode`、`decode`、`getMetadata`）
- [x] 定义 `DecodeOptions` 类型（`fullQuality`、`outputFormat`、`onProgress`）
- [x] 定义 `ImageMetadata` 类型（`width`、`height`、`pageCount`、`format`、`exif?`）
- [x] 导出 `LoaderRegistry` 类型（格式到 loader 的映射）

---

### 任务 1.2：扩展 MIME 类型映射
**估时**：30min  
**文件**：`packages/file-preview-core/src/utils/mimeTypes.ts`

- [x] 新增 HEIC/HEIF 扩展名映射：`.heic` → `image/heic`，`.heif` → `image/heif`
- [x] 新增 AVIF 映射：`.avif` → `image/avif`
- [x] 新增 TIFF 映射：`.tif`、`.tiff` → `image/tiff`
- [x] 新增 RAW 格式映射：`.cr2` → `image/x-canon-cr2`，`.nef` → `image/x-nikon-nef`，`.arw` → `image/x-sony-arw`，`.dng` → `image/x-adobe-dng`，`.raf` → `image/x-fuji-raf`，`.orf` → `image/x-olympus-orf`
- [x] 新增 PSD 映射：`.psd` → `image/vnd.adobe.photoshop`
- [x] 新增 JPEG 2000 映射：`.jp2`、`.jpx`、`.j2k` → `image/jp2`

---

### 任务 1.3：实现 loader 注册与调度机制
**估时**：1.5h  
**文件**：`packages/file-preview-core/src/loaders/registry.ts`

- [x] 实现 `LoaderRegistry` 类：
  - `register(mimeType: string, loader: ImageDecoder)` 方法
  - `getLoader(mimeType: string): ImageDecoder | null` 方法
  - `hasLoader(mimeType: string): boolean` 方法
- [x] 实现 `getLoaderForMimeType(mimeType: string): Promise<ImageDecoder | null>`：
  - 根据 MIME type 动态 import 对应 loader
  - 缓存已加载的 loader 实例
- [x] 实现格式检测辅助函数 `detectImageFormat(file: File | PreviewFile): Promise<string>`：
  - 优先使用 file.type
  - fallback 到扩展名推断
  - 必要时读取文件头魔数（HEIC/TIFF）

---

### 任务 1.4：实现 HEIC loader（Phase 1 最高优）
**估时**：2h  
**文件**：`packages/file-preview-core/src/loaders/heicLoader.ts`

- [x] 实现 `needsDecode(mimeType: string): Promise<boolean>`：
  - HEIC 格式始终返回 `true`（浏览器均不原生支持）
- [x] 实现 `decode(file: Blob | ArrayBuffer, options?: DecodeOptions): Promise<Blob>`：
  - 动态 `import('heic2any')`
  - 调用 `heic2any({ blob, toType: 'image/jpeg', quality: 0.9 })`
  - 捕获异常：MODULE_NOT_FOUND → 提示安装，DRM 保护 → 提示"文件受保护"
- [x] 实现 `getMetadata(file: Blob | ArrayBuffer): Promise<ImageMetadata>`（可选，暂返回空对象）
- [x] 错误处理：
  - 库加载失败 → `new Error('heic2any 未安装，请运行: npm install heic2any')`
  - 解码失败 → `new Error('HEIC 解码失败，文件可能损坏或受 DRM 保护')`

---

### 任务 1.5：改造 ImageRenderer 支持解码流程
**估时**：2.5h  
**文件**：
- `packages/react-file-preview/src/renderers/ImageRenderer.tsx`
- `packages/vue-file-preview/src/renderers/ImageRenderer.vue`

**React 版本**：
- [x] 新增状态：`const [decoding, setDecoding] = useState(false)`、`const [decodeProgress, setDecodeProgress] = useState(0)`、`const [decodeError, setDecodeError] = useState<string | null>(null)`
- [x] 在 `useEffect` 中增加解码逻辑：
  ```typescript
  const mimeType = await detectImageFormat(file);
  const loader = await getLoaderForMimeType(mimeType);
  
  if (loader && await loader.needsDecode(mimeType)) {
    setDecoding(true);
    try {
      const fileBlob = file instanceof Blob ? file : await fetch(file.url).then(r => r.blob());
      const decodedBlob = await loader.decode(fileBlob, { 
        onProgress: setDecodeProgress 
      });
      const blobUrl = URL.createObjectURL(decodedBlob);
      setImageSrc(blobUrl);
    } catch (err) {
      setDecodeError(err.message);
    } finally {
      setDecoding(false);
    }
  } else {
    setImageSrc(file.url); // 原生支持
  }
  ```
- [x] 在 JSX 中显示解码状态界面
  ```tsx
  {decoding && (
    <div className="rfp-decoding-overlay">
      <Loader2 className="animate-spin" />
      <p>正在解码... {decodeProgress}%</p>
    </div>
  )}
  {decodeError && (
    <div className="rfp-error">
      <AlertCircle />
      <p>{decodeError}</p>
    </div>
  )}
  ```
- [x] cleanup：`useEffect` 返回函数中 `URL.revokeObjectURL(blobUrl)`

**Vue 版本**：
- [x] 同步实现相同逻辑（使用 `ref`、`onMounted`、`watchEffect`）
- [x] 保持 UI 与 React 版本一致

---

### 任务 1.6：添加解码 UI 组件样式
**估时**：1h  
**文件**：
- `packages/react-file-preview/src/renderers/ImageRenderer.css`
- `packages/vue-file-preview/src/renderers/ImageRenderer.css`

- [x] 新增 `.rfp-decoding-overlay` 样式（半透明遮罩 + 居中 spinner）
- [x] 新增 `.rfp-error` 样式（错误提示框，红色边框 + 图标）
- [x] 新增进度条样式（可选，若 `onProgress` 回调可用）

---

### 任务 1.7：单元测试 - heicLoader
**估时**：1.5h  
**文件**：`packages/file-preview-core/tests/loaders/heicLoader.test.ts`

- [x] 测试 `needsDecode('image/heic')` 返回 `true`
- [x] 测试 `decode()` 成功解码（mock `heic2any`）
- [x] 测试库未安装时抛出正确错误
- [x] 测试 DRM 保护文件抛出正确错误
- [x] 测试解码进度回调被正确调用

---

### 任务 1.8：集成测试 - HEIC 渲染
**估时**：1h  
**文件**：`packages/example/src/examples/HeicExample.tsx`

- [x] 创建示例页面，上传 HEIC 文件
- [x] 验证"正在解码..."提示显示
- [x] 验证解码后图片正确渲染
- [x] 验证缩放/旋转/平移功能正常
- [x] 验证错误提示（使用损坏的 HEIC 文件）

---

## 里程碑 M2：Phase 1 格式完成（AVIF、TIFF）

### 任务 2.1：实现 AVIF loader（带原生支持检测）
**估时**：2h  
**文件**：`packages/file-preview-core/src/loaders/avifLoader.ts`

- [x] 实现浏览器支持度检测：
  ```typescript
  async function supportsAVIF(): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlm...'; // 1x1 测试图片
    });
  }
  ```
- [x] 实现 `needsDecode(mimeType: string): Promise<boolean>`：
  - 缓存检测结果（全局变量）
  - 返回 `!(await supportsAVIF())`
- [x] 实现 `decode(file: Blob | ArrayBuffer): Promise<Blob>`：
  - 动态 `import('avif')`（仅不支持时加载）
  - 解码为 PNG Blob
- [x] 单元测试：mock `Image` 加载行为

---

### 任务 2.2：实现 TIFF loader（含多页支持）
**估时**：3h  
**文件**：`packages/file-preview-core/src/loaders/tiffLoader.ts`

- [x] 实现 `decode(file: Blob | ArrayBuffer, options?: DecodeOptions & { page?: number }): Promise<Blob>`：
  - 动态 `import('tiff')`
  - 解析 TIFF，提取指定页（默认第 1 页）
  - 渲染到 Canvas → `canvas.toBlob('image/png')`
- [x] 实现 `getMetadata(file: Blob | ArrayBuffer): Promise<ImageMetadata>`：
  - 返回 `{ pageCount, width, height, format: 'tiff' }`
- [x] 单元测试：
  - 单页 TIFF 解码
  - 多页 TIFF 提取指定页
  - `getMetadata()` 返回正确页数

---

### 任务 2.3：ImageRenderer 支持多页 TIFF 翻页
**估时**：2h  
**文件**：
- `packages/react-file-preview/src/renderers/ImageRenderer.tsx`
- `packages/vue-file-preview/src/renderers/ImageRenderer.vue`

- [x] 新增状态：`const [currentPage, setCurrentPage] = useState(1)`、`const [totalPages, setTotalPages] = useState(1)`
- [x] 解码 TIFF 时调用 `getMetadata()` 获取页数
- [x] 页码切换时重新调用 `decode(fileBlob, { page: currentPage })`
- [x] 实现页面缓存（最多 10 页）：
  ```typescript
  const pageCache = useRef<Map<number, string>>(new Map()); // page → blobUrl
  ```
- [x] 渲染翻页器（复用 PDF 的 `PageNavigator` 组件）

---

### 任务 2.4：实现 Web Worker 解码（仅 HEIC）
**估时**：2.5h  
**文件**：`packages/file-preview-core/src/workers/imageDecoder.worker.ts`

- [x] 创建 Worker 入口：
  ```typescript
  self.onmessage = async ({ data }) => {
    const { type, buffer, options } = data;
    const loader = await getLoaderForMimeType(type);
    const result = await loader.decode(buffer, options);
    const arrayBuffer = await result.arrayBuffer();
    self.postMessage({ success: true, data: arrayBuffer, mimeType: result.type });
  };
  ```
- [x] 在 `ImageRenderer` 中启动 Worker（仅 HEIC 格式）：
  ```typescript
  if (mimeType === 'image/heic') {
    const worker = new Worker(new URL('../workers/imageDecoder.worker.ts', import.meta.url), { type: 'module' });
    // ... postMessage 与 onmessage 处理
  }
  ```
- [x] 错误处理：Worker 崩溃时显示"解码失败，设备内存不足"
- [x] 测试：验证 Worker 中解码不阻塞主线程（用 Performance API 测量）

---

### 任务 2.5：更新文档 - Phase 1 格式
**估时**：1h  
**文件**：`packages/docs/guide/supported-types.md`

- [x] 在"图片格式"章节下新增"高级图片格式"子章节
- [x] 添加格式列表：
  ```markdown
  ### 高级图片格式（需额外解码库）
  
  - **HEIC/HEIF** - `.heic`, `.heif`（Apple 设备默认格式，解码时间 0.5-2s）
  - **AVIF** - `.avif`（现代浏览器部分原生支持，不支持时自动降级）
  - **TIFF** - `.tif`, `.tiff`（支持多页，常见于扫描文档）
  
  #### 特性
  - 自动检测浏览器支持度，按需加载解码库
  - HEIC 解码在 Web Worker 中执行，不阻塞 UI
  - 多页 TIFF 支持翻页（类似 PDF）
  ```
- [x] 添加性能说明与浏览器兼容性表格

---

### 任务 2.6：Beta 测试准备
**估时**：1.5h

- [x] 在 `package.json` 中添加 `optionalDependencies`：
  ```json
  "optionalDependencies": {
    "heic2any": "^0.0.4",
    "tiff": "^6.1.0",
    "avif": "^0.1.0"
  }
  ```
- [x] 更新 README：新增"可选依赖"章节，说明动态加载机制
- [x] 更新 CHANGELOG：新增 `1.4.0-beta.1` 条目
- [x] 发布到 npm dist-tag `next`：`pnpm publish --tag next`
- [x] 在 GitHub Discussion 发布测试邀请

---

## 里程碑 M3：Phase 2 格式完成（RAW、PSD）

### 任务 3.1：实现 RAW loader（缩略图模式）
**估时**：3h  
**文件**：`packages/file-preview-core/src/loaders/rawLoader.ts`

- [x] 实现快速缩略图提取：
  ```typescript
  async function extractThumbnail(file: ArrayBuffer): Promise<Blob> {
    // 解析 EXIF，提取嵌入的 JPEG 缩略图（通常在 IFD1）
    const dataView = new DataView(file);
    // ... 解析 TIFF 头 + IFD 结构
    const jpegOffset = /* ... */;
    const jpegLength = /* ... */;
    return new Blob([file.slice(jpegOffset, jpegOffset + jpegLength)], { type: 'image/jpeg' });
  }
  ```
- [x] 实现完整解码（可选）：
  ```typescript
  async function decodeFullQuality(file: ArrayBuffer): Promise<Blob> {
    const rawjs = await import('raw.js');
    const image = await rawjs.decode(file);
    // 渲染到 Canvas → PNG
  }
  ```
- [x] `decode()` 方法根据 `options.fullQuality` 选择模式
- [x] 错误处理：不支持的相机型号 → 提示"该相机型号暂不支持"

---

### 任务 3.2：ImageRenderer 支持 RAW"加载完整版"按钮
**估时**：2h  
**文件**：
- `packages/react-file-preview/src/renderers/ImageRenderer.tsx`
- `packages/vue-file-preview/src/renderers/ImageRenderer.vue`

- [x] 检测到 RAW 格式时，默认 `fullQuality: false` 解码
- [x] 显示提示条：
  ```tsx
  <div className="rfp-quality-notice">
    ⚠️ 这是预览缩略图（非完整像素）
    <button onClick={loadFullQuality}>加载完整版</button>
  </div>
  ```
- [x] `loadFullQuality()` 方法：
  - 显示进度条（`onProgress` 回调）
  - 调用 `decode(fileBlob, { fullQuality: true })`
  - 替换当前图片源
  - 隐藏提示条

---

### 任务 3.3：实现 PSD loader
**估时**：2.5h  
**文件**：`packages/file-preview-core/src/loaders/psdLoader.ts`

- [x] 实现 `decode(file: Blob | ArrayBuffer): Promise<Blob>`：
  - 动态 `import('ag-psd')`
  - 调用 `readPsd(arrayBuffer, { skipCompositeImageData: false })`
  - 提取 `psd.canvas` 或手动合并图层
  - 转 PNG Blob
- [x] `getMetadata()` 返回尺寸与图层数（仅显示，不暴露图层详情）
- [x] 错误处理：带蒙版/调整图层时在 UI 显示"部分效果可能与 Photoshop 不一致"

---

### 任务 3.4：单元测试 - RAW 与 PSD loaders
**估时**：2h  
**文件**：
- `packages/file-preview-core/tests/loaders/rawLoader.test.ts`
- `packages/file-preview-core/tests/loaders/psdLoader.test.ts`

- [x] RAW：测试缩略图提取、完整解码、进度回调
- [x] PSD：测试图层合并、元数据提取、错误处理

---

### 任务 3.5：集成测试 - RAW 与 PSD 渲染
**估时**：1.5h  
**文件**：`packages/example/src/examples/AdvancedImageExample.tsx`

- [x] 测试上传 `.cr2` 文件（Canon RAW）
- [x] 验证缩略图快速显示（< 500ms）
- [x] 验证"加载完整版"按钮点击后完整图片渲染
- [x] 测试上传 `.psd` 文件，验证合并图层正确显示

---

### 任务 3.6：性能测试与优化
**估时**：2h

- [x] 使用 Lighthouse / WebPageTest 测量各格式解码时间：
  - HEIC 4000x3000：目标 < 2s
  - TIFF 10 页：目标每页 < 200ms
  - RAW 缩略图：目标 < 500ms
  - PSD 5 图层：目标 < 1.5s
- [x] 若超标，优化：
  - 增加 Worker 并发数（最多 2 个）
  - 降低输出质量（JPEG quality: 0.85）
  - 限制最大解码尺寸（如 RAW 完整版最多 8000x8000）

---

### 任务 3.7：更新文档 - Phase 2 格式
**估时**：45min  
**文件**：`packages/docs/guide/supported-types.md`

- [x] 添加 RAW 与 PSD 格式说明
- [x] 添加"缩略图 vs 完整版"对比表格
- [x] 添加支持的相机型号列表（引用 raw.js 官方文档链接）

---

### 任务 3.8：发布正式版 1.4.0
**估时**：1h

- [x] 更新 `package.json` 版本号为 `1.4.0`
- [x] 更新 CHANGELOG：新增完整特性列表 + 性能数据
- [x] 发布到 npm：`pnpm publish`
- [x] 在 GitHub 创建 Release（附测试报告与 breaking changes 说明）
- [x] 更新文档站点（deploy docs）

---

## 里程碑 M4：Phase 3 可选格式（JPEG 2000）

### 任务 4.1：实现 JPEG 2000 loader
**估时**：2h  
**文件**：`packages/file-preview-core/src/loaders/jp2Loader.ts`

- [x] 检测 Safari 原生支持（User-Agent + 测试图片）
- [x] 不支持时动态加载 `openjpeg.js` (WASM)
- [x] 解码为 PNG Blob

---

### 任务 4.2：评估 JPEG XL / DDS / KTX 支持优先级
**估时**：1h

- [x] 收集用户反馈（GitHub Issues / Discord）
- [x] 评估库成熟度与体积成本
- [x] 决定是否实现（若需求量 < 5 则暂不实现）

---

## 依赖关系

- M1.1-M1.3 必须在 M1.4 之前完成（基础设施先行）
- M1.4 与 M1.5 可并行（loader 与 renderer 改造）
- M2.1、M2.2 可并行（AVIF 与 TIFF loader 独立）
- M2.4（Web Worker）依赖 M1.4（HEIC loader）
- M3.1、M3.3 可并行（RAW 与 PSD loader 独立）
- M4 完全独立，可按需延后

---

## 总估时

- **M1（基础设施 + HEIC）**：~11.5h
- **M2（AVIF + TIFF + Worker + 文档）**：~12h
- **M3（RAW + PSD + 性能优化 + 发布）**：~14.5h
- **M4（JPEG 2000，可选）**：~3h

**总计**：~41h（约 5 个工作日，单人 full-time）
