# 支持的文件类型

React File Preview 支持多种常见的文件格式预览。

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

- **EPUB** - `.epub`

### 特性

- 基于 epub.js 渲染
- 左右翻页（按钮 / 键盘方向键）
- 章节自动分页与页码显示
- 自适应屏幕宽度

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

## JSON

- **JSON** - `.json`

### 特性

- 自动格式化缩进
- 语法高亮

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
- `video` - 视频文件
- `audio` - 音频文件
- `markdown` - Markdown 文件
- `json` - JSON 文件
- `csv` - CSV/TSV 文件
- `xml` - XML 文件
- `subtitle` - SRT / VTT / LRC / ELRC / ASS / SSA / TTML 字幕与歌词文件
- `zip` - ZIP 压缩包
- `text` - 其他文本和代码文件
- `unsupported` - 不支持的类型

