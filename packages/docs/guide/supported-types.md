# 支持的文件类型

File Preview 支持多种常见文件格式，React 与 Vue 版本共享类型识别和解析核心，并提供等价的预览能力。

## 图片格式

支持所有浏览器原生支持的图片格式：

- **JPEG/JPG** - `.jpg`, `.jpeg`
- **PNG** - `.png`
- **GIF** - `.gif` (支持动画)
- **WebP** - `.webp`
- **SVG** - `.svg`
- **BMP** - `.bmp`
- **ICO** - `.ico`

### 特性

- 缩放和平移（范围 0.01x - 10x）
- 旋转（顺时针/逆时针 90°）
- 鼠标滚轮缩放
- 拖拽移动

### 高级图片格式

针对浏览器不原生支持的格式，库会自动按需动态加载内置的解码引擎，主 bundle 体积零增量；运行时仅在用户实际预览对应格式时才下载解码 chunk。

- **HEIC/HEIF** - `.heic`, `.heif`
  - Apple 设备（iPhone/iPad）从 iOS 11 起的默认照片格式
  - 解码引擎：`heic2any`（解码时间 0.5-2s，取决于分辨率）
  - 优先在 Web Worker 中解码；Worker、CSP 或第三方库不兼容时自动回退主线程
- **AVIF** - `.avif`
  - 现代高压缩比格式（比 JPEG 节省 ~50% 体积）
  - Chrome 85+、Firefox 93+、Safari 16+ 已原生支持，自动检测
  - 不支持时降级到 WASM 解码（`@jsquash/avif`）
- **TIFF** - `.tif`, `.tiff`
  - 常见于扫描文档、印刷预检
  - 解码引擎：`utif`
  - 支持多页 TIFF：底部出现「上一页 / 下一页」按钮
  - 内置 LRU 缓存（最多 10 页），翻页流畅
- **RAW 相机原始格式** - `.cr2`, `.nef`, `.arw`, `.dng`, `.raf`, `.orf`
  - 支持 Canon (CR2)、Nikon (NEF)、Sony (ARW)、Adobe (DNG)、Fujifilm (RAF)、Olympus (ORF)
  - 通过解析容器结构提取嵌入的 JPEG 预览图（零额外依赖，< 500ms）
  - 当前版本不进行完整像素级解码（受浏览器端 RAW 引擎成熟度限制）
- **PSD（Adobe Photoshop）** - `.psd`
  - 解码引擎：`ag-psd`
  - 仅展示合并图层后的最终效果，不解析图层结构
  - 带蒙版 / 调整图层的 PSD 显示可能与 Photoshop 略有差异
- **JPEG 2000** - `.jp2`, `.jpx`, `.j2k`
  - Safari 原生支持，其他浏览器通过 WASM 解码（`@jsquash/jpeg2000`）
  - 常见于医学影像、地图瓦片

#### 浏览器兼容性

| 格式 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| HEIC/HEIF | WASM | WASM | WASM | WASM |
| AVIF | 原生 (85+) | 原生 (93+) | 原生 (16+) | 原生 (90+) |
| TIFF | WASM | WASM | 部分原生 | WASM |
| RAW | 嵌入预览 | 嵌入预览 | 嵌入预览 | 嵌入预览 |
| PSD | WASM | WASM | WASM | WASM |
| JPEG 2000 | WASM | WASM | 原生 | WASM |

#### 性能特征

- HEIC/RAW/PSD 优先在 Web Worker 中解码，失败时回退主线程
- TIFF/AVIF 在主线程解码；耗时取决于文件大小、设备和浏览器
- 所有解码引擎通过动态 `import()` 按需加载，未使用的格式不会进入首屏 chunk
- 解码失败时显示友好提示

## 视频格式

支持 HTML5 视频格式：

- **MP4** - `.mp4`
- **WebM** - `.webm`
- **OGG** - `.ogg`, `.ogv`
- **MOV** - `.mov`
- **AVI** - `.avi`
- **MKV** - `.mkv`
- **M4V** - `.m4v`
- **3GP** - `.3gp`
- **FLV** - `.flv`

### 特性

- 基于 Video.js 播放器
- 播放/暂停控制
- 音量调节
- 进度条
- 全屏播放

## 音频格式

支持 HTML5 音频格式：

- **MP3** - `.mp3`
- **WAV** - `.wav`
- **OGG** - `.ogg`
- **M4A** - `.m4a`
- **AAC** - `.aac`
- **FLAC** - `.flac`

### 特性

- 播放/暂停控制
- 音量调节
- 进度条
- 快进/快退（±10 秒）

## PDF 文档

- **PDF** - `.pdf`

### 特性

- 页面导航（上一页/下一页）
- 缩放控制（0.01x - 10x）
- 连续滚动浏览
- 页码显示

## Office 文档

### Word 文档

- **DOCX** - `.docx`

### Excel 表格

- **XLSX** - `.xlsx`

### PowerPoint 演示文稿

- **PPTX** - `.pptx`
- **PPT** - `.ppt`

### 特性

- 保留原始格式
- 支持图片和表格
- 响应式布局
- 显示所有工作表（Excel）
- 平铺/幻灯片两种显示模式（PowerPoint，16:9 宽高比）

## Outlook 邮件

- **MSG** - `.msg`

### 特性

- 解析邮件头信息（发件人、收件人、主题、日期）
- 邮件正文渲染
- 附件列表展示

## 电子书

### EPUB

- **EPUB** - `.epub`

#### 特性

- 基于 foliate-js 渲染，零外部 CDN 依赖
- 章节导航（目录侧栏）
- 左右翻页（按钮 / 键盘方向键）
- 章节自动分页与页码显示
- 全屏宽度 / 阅读宽度切换
- 自适应屏幕宽度

### MOBI / AZW / KF8

- **MOBI** - `.mobi`
- **AZW / AZW3** - `.azw`, `.azw3`
- **KF8** - `.kf8`

#### 特性

- 基于 foliate-js 解析与渲染（与 EPUB 共用底层）
- 与 EPUB 一致的翻页 / 目录 / 全屏宽度交互
- 不支持 DRM 保护文件，遇到 DRM 会给出明确提示

## 字体文件

- **TrueType** - `.ttf`
- **OpenType** - `.otf`
- **WOFF** - `.woff`
- **WOFF2** - `.woff2`

### 特性

- 基于 opentype.js 解析字体内部结构
- 展示完整元数据：字体家族、子系列、版本、设计师、字形数量、格式
- 多字号梯度展示（72 / 48 / 36 / 24 / 18 px）
- 自定义文本输入框，实时预览效果
- 内置拉丁字母与中文常用字字符集样例
- 双渲染策略
  - 优先使用浏览器原生 FontFace API（性能最佳）
  - 浏览器 OTS（OpenType Sanitizer）拒绝时自动降级到 Canvas 软渲染（opentype.js 容忍度更高，可显示部分浏览器原生不接受的字体）
- 容器宽度固定，长文本自动按容器宽度断行

## CAD / 3D 模型

- **DXF** - `.dxf` (AutoCAD 2D 图纸交换格式)
- **STL** - `.stl` (3D 打印标准格式，支持 ASCII 和二进制)
- **OBJ** - `.obj` (Wavefront 3D 模型)
- **GLTF** - `.gltf` (现代 Web 3D 格式，JSON 描述)
- **GLB** - `.glb` (GLTF 二进制版本)

### 特性

- 基于 Three.js 的硬件加速 3D 渲染引擎
- 交互式 3D 视图
  - 左键拖动：旋转视角
  - 右键拖动：平移视图
  - 滚轮：缩放
- 工具栏功能
  - 视图重置：恢复初始视角
  - 线框/实体切换：切换渲染模式
  - 网格显示/隐藏：辅助参考网格
  - 坐标轴显示/隐藏：XYZ 方向指示
- 自动视角调整：模型自动居中并缩放至合适大小
- 默认材质与光照
  - 环境光 + 双向定向光
  - 灰色 Phong 材质（双面渲染）
- 性能优化
  - 直接从 File 对象读取（无 blob URL 中间层）
  - 支持大型模型（百万级三角形）
  - 自动内存清理

## Markdown 文档

- **Markdown** - `.md`, `.markdown`

### 特性

- GitHub Flavored Markdown (GFM) 支持
- 代码语法高亮
- 表格支持
- 任务列表
- 自动链接

## 代码文件

支持 40+ 种编程语言的语法高亮：

- **JavaScript/TypeScript** - `.js`, `.jsx`, `.ts`, `.tsx`
- **Python** - `.py`
- **Java** - `.java`
- **C/C++** - `.c`, `.cpp`, `.h`
- **C#** - `.cs`
- **Go** - `.go`, `.mod`
- **Rust** - `.rs`
- **Lua** - `.lua`
- **Vim Script** - `.vim`
- **PHP** - `.php`
- **Ruby** - `.rb`
- **Swift** - `.swift`
- **Kotlin** - `.kt`
- **HTML** - `.html`
- **CSS/SCSS/Sass/Less** - `.css`, `.scss`, `.sass`, `.less`
- **YAML** - `.yaml`, `.yml`
- **TOML** - `.toml`
- **INI** - `.ini`, `.conf`, `.env`
- **Lock 文件** - `.lock`
- **Diff/Patch** - `.diff`, `.patch`
- **Shell** - `.sh`, `.bash`, `.zsh`
- **SQL** - `.sql`
- **Log** - `.log`

### 特性

- 语法高亮（VS Code Dark+ 主题）
- 自动语言检测
- 行号显示

## CSV / TSV 表格

- **CSV** - `.csv`
- **TSV** - `.tsv`

### 特性

- 纯前端解析，无第三方依赖
- 支持 RFC 4180 双引号转义与字段内换行
- 表格式渲染，首行自动识别为表头
- 显示行数/列数统计

## XML

- **XML** - `.xml`

### 特性

- 使用浏览器原生 `DOMParser` 做格式校验
- 自动缩进美化
- 语法高亮

## 字幕 / 歌词文件

- **SRT** - `.srt`
- **WebVTT** - `.vtt`
- **LRC** - `.lrc`（基础歌词，`[mm:ss.xx]` 行时间戳，支持 `[ti:][ar:][al:]` 等元数据）
- **Enhanced LRC** - `.elrc`（增强歌词，行内 `<mm:ss.xx>` 逐字时间戳）
- **ASS / SSA** - `.ass` / `.ssa`（Advanced SubStation Alpha，自动剥离 `\N` `\h` 与 `{...}` 样式覆盖码）
- **TTML / DFXP** - `.ttml` / `.dfxp`（W3C / Apple Music 使用的 XML 字幕，支持 `begin` / `end` / `dur` 与 `<br/>`）

### 特性

- 纯前端解析，零第三方依赖
- 自动按内容/扩展名识别格式
- 结构化 cue 列表展示（索引、时间区间、文本）
- LRC / ELRC 自动展示元数据（标题 / 艺术家 / 专辑 / 偏移……）
- ELRC 逐字时间戳以词条形式排列展示
- ASS / SSA 同步显示 Style 标签，自动应用 `offset` 偏移

## JSON / JSONC

- **JSON** - `.json`
- **JSONC (JSON with Comments)** - `.jsonc`

### 特性

- 自动格式化缩进
- 语法高亮
- **支持注释**（JSONC）
  - 单行注释 `//`
  - 多行注释 `/* */`
  - 行尾注释
  - 基于 `jsonc-parser`（Microsoft 官方，VSCode 同款）

## ZIP 压缩包

- **ZIP** - `.zip`

### 特性

- 基于 JSZip 解析压缩包目录结构
- 左侧树形目录 + 右侧内嵌预览
- 内嵌预览文本、代码（带高亮）与图片
- 其他类型可通过"下载"按钮导出为独立文件

## 纯文本

- **TXT** - `.txt`
- 其他未识别的文本文件

## 不支持的格式

对于不支持的文件格式，组件会显示一个友好的提示界面，包含：

- 文件名和大小
- 下载按钮
- 文件类型说明

## 文件类型检测

组件会按以下优先级检测文件类型：

1. **MIME 类型**：如果提供了 `type` 属性，优先使用
2. **文件扩展名**：从文件名自动推断 MIME 类型
3. **默认类型**：无法识别时标记为 `unsupported`

支持的文件类型枚举：

- `image` - 图片文件
- `pdf` - PDF 文档
- `docx` - Word 文档
- `xlsx` - Excel 表格
- `pptx` - PowerPoint 演示文稿
- `msg` - Outlook 邮件
- `epub` - EPUB 电子书
- `mobi` - MOBI / AZW / AZW3 / KF8 电子书
- `video` - 视频文件
- `audio` - 音频文件
- `markdown` - Markdown 文件
- `json` - JSON / JSONC 文件
- `csv` - CSV/TSV 文件
- `xml` - XML 文件
- `subtitle` - SRT / VTT / LRC / ELRC / ASS / SSA / TTML 字幕与歌词文件
- `zip` - ZIP 压缩包
- `text` - 其他文本和代码文件
- `font` - 字体文件（TTF / OTF / WOFF / WOFF2）
- `cad` - CAD / 3D 模型（DXF / STL / OBJ / GLTF / GLB）
- `unsupported` - 不支持的类型
