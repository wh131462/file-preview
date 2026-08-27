import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { configurePdfWorker } from '@eternalheart/angular-file-preview';
import '@eternalheart/angular-file-preview/style.css';
import './style.css';
// @ts-expect-error pdfjs legacy build has no types here
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

if (import.meta.env.PROD) {
  configurePdfWorker(pdfjsLib, {
    workerSrc: '/file-preview/angular/pdfjs/pdf.worker.min.mjs',
    cMapUrl: '/file-preview/angular/pdfjs/cmaps/',
    cMapPacked: true,
    wasmUrl: '/file-preview/angular/pdfjs/wasm/',
  });
} else {
  configurePdfWorker(pdfjsLib);
}

bootstrapApplication(AppComponent).catch((err) => console.error(err));
