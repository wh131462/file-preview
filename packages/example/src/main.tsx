import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configurePdfjs } from '@eternalheart/react-file-preview'

// 配置 PDF.js
// 开发环境使用 CDN，生产环境使用本地静态文件
if (import.meta.env.PROD) {
  // 生产环境：使用本地静态文件（通过 vite-plugin-static-copy 复制）
  configurePdfjs({
    workerSrc: '/file-preview/pdfjs/pdf.worker.min.mjs',
    cMapUrl: '/file-preview/pdfjs/cmaps/',
    cMapPacked: true
  })
} else {
  // 开发环境：使用 CDN（默认配置）
  configurePdfjs()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

