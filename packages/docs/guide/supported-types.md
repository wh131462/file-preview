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
- **Go** - `.go`
- **Rust** - `.rs`
- **PHP** - `.php`
- **Ruby** - `.rb`
- **Swift** - `.swift`
- **Kotlin** - `.kt`
- **HTML** - `.html`
- **CSS/SCSS/Sass/Less** - `.css`, `.scss`, `.sass`, `.less`
- **JSON** - `.json`
- **YAML** - `.yaml`, `.yml`
- **XML** - `.xml`
- **TOML** - `.toml`
- **INI** - `.ini`, `.conf`
- **Shell** - `.sh`, `.bash`, `.zsh`
- **SQL** - `.sql`
- **CSV** - `.csv`
- **Log** - `.log`

### 特性

- 语法高亮（VS Code Dark+ 主题）
- 自动语言检测
- 行号显示

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
- `video` - 视频文件
- `audio` - 音频文件
- `markdown` - Markdown 文件
- `text` - 文本和代码文件
- `unsupported` - 不支持的类型

