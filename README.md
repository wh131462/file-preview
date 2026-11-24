# Public Assets

## Favicon 图标

本目录包含网站的所有图标文件，这些文件是从 `icon.svg` 自动生成的。

### 文件列表

- `icon.svg` - 源 SVG 图标文件
- `favicon.ico` - 标准 favicon (32x32)
- `icon-16.png` - 16x16 PNG 图标
- `icon-32.png` - 32x32 PNG 图标
- `icon-48.png` - 48x48 PNG 图标
- `icon-64.png` - 64x64 PNG 图标
- `icon-128.png` - 128x128 PNG 图标
- `icon-192.png` - 192x192 PNG 图标 (PWA)
- `icon-512.png` - 512x512 PNG 图标 (PWA)
- `apple-touch-icon.png` - 180x180 Apple Touch 图标
- `manifest.json` - PWA manifest 文件

### 重新生成图标

如果需要修改图标，请编辑 `icon.svg` 文件，然后运行：

```bash
pnpm generate-favicon
```

这将自动生成所有尺寸的图标文件。

### 图标设计

图标采用渐变紫色背景，展示了一个文档图标，包含：
- 文档主体（白色）
- 折叠角（表示文件）
- 图片图标（表示图片预览）
- 播放按钮（表示视频预览）
- 文本行（表示文档预览）
- 眼睛图标（表示预览功能）

主题色：`#4F46E5` (Indigo-600)

