import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { configurePdfWorker } from '@eternalheart/vue-file-preview';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

// 配置 PDF.js
if (import.meta.env.PROD) {
  configurePdfWorker(pdfjsLib, {
    workerSrc: '/file-preview/vue/pdfjs/pdf.worker.min.mjs',
    cMapUrl: '/file-preview/vue/pdfjs/cmaps/',
    cMapPacked: true,
  });
} else {
  configurePdfWorker(pdfjsLib);
}

createApp(App).mount('#app');
