import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { configurePdfWorker } from '@eternalheart/angular-file-preview';
// @ts-expect-error pdfjs worker entry
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

if (import.meta.env.PROD) {
  configurePdfWorker(pdfjsLib, {
    workerSrc: '/file-preview/angular/pdfjs/pdf.worker.min.mjs',
    cMapUrl: '/file-preview/angular/pdfjs/cmaps/',
    cMapPacked: true,
  });
} else {
  configurePdfWorker(pdfjsLib);
}

bootstrapApplication(AppComponent).catch((err) => console.error(err));
