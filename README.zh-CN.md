# File Preview

[![npm version](https://img.shields.io/npm/v/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview)
[![license](https://img.shields.io/npm/l/@eternalheart/react-file-preview.svg)](https://github.com/wh131462/file-preview/blob/master/LICENSE)
[![react-file-preview downloads](https://img.shields.io/npm/dm/@eternalheart/react-file-preview.svg?label=@eternalheart/react-file-preview)](https://www.npmjs.com/package/@eternalheart/react-file-preview)
[![vue-file-preview downloads](https://img.shields.io/npm/dm/@eternalheart/vue-file-preview.svg?label=@eternalheart/vue-file-preview)](https://www.npmjs.com/package/@eternalheart/vue-file-preview)

[English](./README.md) | 简体中文

现代化、功能丰富的文件预览组件库，**同时支持 React 和 Vue 框架**。通过共享核心和框架专用绑定，实现图片、视频、音频、PDF、Office 文档（Word、Excel、PowerPoint）、Markdown 和代码文件的预览。

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2728.svg" width="24" height="24" alt="✨" /> 核心特性

- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a8.svg" width="20" height="20" alt="🎨" /> **现代化 UI** — Apple 风格极简设计，毛玻璃效果
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c1.svg" width="20" height="20" alt="📁" /> **20+ 格式支持** — 图片、视频、音频、PDF、Office、代码、电子书等
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1fa9f.svg" width="20" height="20" alt="🪟" /> **双模式显示** — 全屏弹窗或内嵌容器两种模式
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3af.svg" width="20" height="20" alt="🎯" /> **多框架支持** — React 和 Vue 共享核心逻辑，API 一致
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="20" height="20" alt="⌨️" /> **完整交互** — 键盘导航、拖放上传、缩放旋转、自定义播放器

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f310.svg" width="24" height="24" alt="🌐" /> 快速导航

<table>
<tr>
  <td width="33%"><strong><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4d6.svg" width="20" height="20" alt="📖" /> 文档与演示</strong></td>
  <td width="33%"><strong><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e6.svg" width="20" height="20" alt="📦" /> 包与资源</strong></td>
  <td width="33%"><strong><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f6e0.svg" width="20" height="20" alt="🛠️" /> 开发与贡献</strong></td>
</tr>
<tr>
  <td>
    • <a href="https://wh131462.github.io/file-preview/docs/">完整文档</a><br>
    • <a href="https://wh131462.github.io/file-preview/">React 在线演示</a><br>
    • <a href="https://wh131462.github.io/file-preview/vue/">Vue 在线演示</a>
  </td>
  <td>
    • <a href="https://www.npmjs.com/package/@eternalheart/react-file-preview">React 包</a><br>
    • <a href="https://www.npmjs.com/package/@eternalheart/vue-file-preview">Vue 包</a><br>
    • <a href="https://github.com/wh131462/file-preview/issues">问题反馈</a>
  </td>
  <td>
    • <a href="#-项目架构">Monorepo 结构</a><br>
    • <a href="#-开发指南">开发命令</a><br>
    • <a href="https://github.com/wh131462/file-preview/blob/master/CONTRIBUTING.md">贡献指南</a>
  </td>
</tr>
</table>

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3af.svg" width="20" height="20" alt="🎯" /> 快速开始

### React

```bash
npm install @eternalheart/react-file-preview
```

```tsx
import { FilePreviewModal } from '@eternalheart/react-file-preview';
import '@eternalheart/react-file-preview/style.css';

<FilePreviewModal
  files={[file]}
  currentIndex={0}
  isOpen={true}
  onClose={() => setIsOpen(false)}
/>
```

<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f449.svg" width="16" height="16" alt="👉" style="vertical-align: middle;" /> [查看 React 完整文档](./packages/react-file-preview/README.zh-CN.md) | [在线演示](https://wh131462.github.io/file-preview/)

### Vue

```bash
npm install @eternalheart/vue-file-preview
```

```vue
<script setup>
import { FilePreviewModal } from '@eternalheart/vue-file-preview';
import '@eternalheart/vue-file-preview/style.css';
</script>

<template>
  <FilePreviewModal
    :files="[file]"
    :current-index="0"
    :is-open="true"
    @close="isOpen = false"
  />
</template>
```

<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f449.svg" width="16" height="16" alt="👉" style="vertical-align: middle;" /> [查看 Vue 完整文档](./packages/vue-file-preview/README.zh-CN.md) | [在线演示](https://wh131462.github.io/file-preview/vue/)

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e6.svg" width="20" height="20" alt="📦" /> 包概览

| 包名 | 描述 | 版本 | 文档 |
|------|------|------|------|
| [@eternalheart/react-file-preview](https://www.npmjs.com/package/@eternalheart/react-file-preview) | React 组件库 | [![npm](https://img.shields.io/npm/v/@eternalheart/react-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/react-file-preview) | [README](./packages/react-file-preview/README.zh-CN.md) |
| [@eternalheart/vue-file-preview](https://www.npmjs.com/package/@eternalheart/vue-file-preview) | Vue 3 组件库 | [![npm](https://img.shields.io/npm/v/@eternalheart/vue-file-preview.svg)](https://www.npmjs.com/package/@eternalheart/vue-file-preview) | [README](./packages/vue-file-preview/README.zh-CN.md) |
| file-preview-core | 框架无关核心 | 内部包 | - |

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4cb.svg" width="20" height="20" alt="📋" /> 支持格式

<table>
<tr>
  <th width="15%">类型</th>
  <th width="40%">格式</th>
  <th width="45%">核心功能</th>
</tr>
<tr>
  <td><strong>图片</strong></td>
  <td>JPG, PNG, GIF, WebP, SVG, BMP, ICO, AVIF, HEIC</td>
  <td>缩放 (0.1x-10x)、旋转、拖拽、鼠标滚轮缩放</td>
</tr>
<tr>
  <td><strong>视频</strong></td>
  <td>MP4, WebM, OGG, MOV, AVI, MKV, M4V, 3GP, FLV</td>
  <td>自定义播放器、进度控制、音量调节、全屏</td>
</tr>
<tr>
  <td><strong>音频</strong></td>
  <td>MP3, WAV, OGG, M4A, AAC, FLAC</td>
  <td>自定义播放器、进度条、音量控制、快进快退</td>
</tr>
<tr>
  <td><strong>文档</strong></td>
  <td>PDF, DOCX, XLSX, PPTX/PPT</td>
  <td>分页、缩放、幻灯片预览、表格查看</td>
</tr>
<tr>
  <td><strong>代码</strong></td>
  <td>JS, TS, Python, Java, C++, Go, Rust 等 40+ 语言</td>
  <td>语法高亮、主题支持、行号显示</td>
</tr>
<tr>
  <td><strong>字幕</strong></td>
  <td>SRT, WebVTT, LRC, ASS/SSA, TTML/DFXP</td>
  <td>时间轴解析、元数据提取、结构化显示</td>
</tr>
<tr>
  <td><strong>其他</strong></td>
  <td>Markdown, CSV, JSON, XML, ZIP, MSG, EPUB, 字体</td>
  <td>渲染、格式化、树形视图、字符集预览</td>
</tr>
</table>

<img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f449.svg" width="16" height="16" alt="👉" style="vertical-align: middle;" /> [查看完整格式列表和示例](https://wh131462.github.io/file-preview/docs/guide/supported-formats.html)

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3d7.svg" width="20" height="20" alt="🏗️" /> 项目架构

本项目采用 pnpm workspace monorepo 架构：

```
file-preview/
├── packages/
│   ├── file-preview-core/     # 框架无关核心（类型、文件检测、解析器）
│   ├── react-file-preview/    # React 绑定 → @eternalheart/react-file-preview
│   ├── vue-file-preview/      # Vue 绑定 → @eternalheart/vue-file-preview
│   ├── example/               # React 示例应用（部署到 GitHub Pages）
│   ├── vue-example/           # Vue 示例应用（部署到 GitHub Pages /vue）
│   └── docs/                  # VitePress 文档站
└── openspec/                  # OpenSpec 变更记录
```

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f6e0.svg" width="20" height="20" alt="🛠️" /> 开发指南

### 安装依赖

```bash
pnpm install
```

### 开发命令

```bash
# 启动开发服务器
pnpm dev              # React 示例
pnpm dev:vue          # Vue 示例
pnpm dev:docs         # 文档站

# 构建
pnpm build            # 构建所有包
pnpm build:lib        # 仅构建库
pnpm build:example    # 仅构建示例

# 预览构建产物
pnpm preview:example  # 预览示例构建
pnpm preview:docs     # 预览文档构建

# 部署和发布
pnpm deploy           # 部署示例和文档到 GitHub Pages
pnpm pub              # 发布库到 npm
```

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2328.svg" width="20" height="20" alt="⌨️" /> 键盘快捷键

| 按键 | 功能 |
|------|------|
| `ESC` | 关闭预览 |
| `←` / `→` | 切换上一个/下一个文件 |
| `鼠标滚轮` | 缩放图片（仅图片预览） |

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4c4.svg" width="20" height="20" alt="📄" /> 许可证

[MIT](./LICENSE) © [EternalHeart](https://github.com/wh131462)

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f517.svg" width="20" height="20" alt="🔗" /> 相关链接

- **GitHub**：[wh131462/file-preview](https://github.com/wh131462/file-preview)
- **文档**：[wh131462.github.io/file-preview/docs](https://wh131462.github.io/file-preview/docs/)
- **问题反馈**：[Issue Tracker](https://github.com/wh131462/file-preview/issues)
- **社区**：[Linux.do](https://linux.do/)

---

## <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4ac.svg" width="20" height="20" alt="💬" /> 社区与支持

如果这个项目对你有帮助，欢迎：

- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2b50.svg" width="16" height="16" alt="⭐" style="vertical-align: middle;" /> 给项目点个 Star
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f41b.svg" width="16" height="16" alt="🐛" style="vertical-align: middle;" /> [提交 Issue](https://github.com/wh131462/file-preview/issues) 报告问题
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4a1.svg" width="16" height="16" alt="💡" style="vertical-align: middle;" /> [提交 PR](https://github.com/wh131462/file-preview/pulls) 贡献代码
- <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4e2.svg" width="16" height="16" alt="📢" style="vertical-align: middle;" /> 分享给更多开发者
