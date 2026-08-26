import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';

type RenderMode = 'fontface' | 'canvas';

interface OpentypeFontLike {
  getAdvanceWidth: (text: string, fontSize: number) => number;
  getPath: (text: string, x: number, y: number, fontSize: number) => { fill: string | null; draw: (ctx: CanvasRenderingContext2D) => void };
}

@Component({
  selector: 'afp-font-preview-line',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #wrapperRef class="afp-w-full">
      @if (renderMode() === 'canvas') {
        <canvas #canvasRef class="afp-block"></canvas>
      } @else {
        <div
          class="afp-w-full afp-text-fg-primary afp-whitespace-pre-wrap afp-break-words"
          [style.fontFamily]="'PreviewFont, sans-serif'"
          [style.fontSize]="fontSize() + 'px'"
          [style.lineHeight]="1.4"
        >{{ text() }}</div>
      }
    </div>
  `,
  styles: [`:host { display: block; width: 100%; }`],
})
export class FontPreviewLine {
  font = input<OpentypeFontLike | null>(null);
  text = input.required<string>();
  fontSize = input.required<number>();
  renderMode = input.required<RenderMode>();
  theme = input.required<'dark' | 'light'>();

  private readonly wrapper = viewChild<ElementRef<HTMLDivElement>>('wrapperRef');
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvasRef');
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    afterNextRender(() => {
      if (this.renderMode() === 'canvas') {
        this.drawCanvas();
        this.setupObserver();
      }
    });

    effect(() => {
      this.text();
      this.fontSize();
      this.renderMode();
      this.theme();
      this.font();
      if (this.renderMode() === 'canvas') {
        requestAnimationFrame(() => {
          this.drawCanvas();
          this.setupObserver();
        });
      }
    });

    inject(DestroyRef).onDestroy(() => this.teardownObserver());
  }

  private teardownObserver(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private drawCanvas(): void {
    const wrapper = this.wrapper()?.nativeElement;
    const canvas = this.canvas()?.nativeElement;
    const font = this.font();
    if (!wrapper || !canvas || this.renderMode() !== 'canvas' || !font) return;

    const containerWidth = wrapper.clientWidth || 600;
    const dpr = window.devicePixelRatio || 1;
    const fontSize = this.fontSize();
    const lineHeight = fontSize * 1.4;
    const fillColor = this.theme() === 'light' ? '#1f2937' : '#f3f4f6';

    const wrapLine = (line: string): string[] => {
      if (!line) return [''];
      const result: string[] = [];
      let buf = '';
      for (const ch of Array.from(line)) {
        const next = buf + ch;
        const w = font.getAdvanceWidth(next, fontSize);
        if (w > containerWidth && buf) {
          result.push(buf);
          buf = ch;
        } else {
          buf = next;
        }
      }
      if (buf) result.push(buf);
      return result;
    };

    const wrappedLines: string[] = [];
    this.text().split('\n').forEach((seg) => {
      wrapLine(seg).forEach((l) => wrappedLines.push(l));
    });

    const width = containerWidth;
    const height = lineHeight * wrappedLines.length + 4;

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    wrappedLines.forEach((line, idx) => {
      const path = font.getPath(line, 0, fontSize + idx * lineHeight, fontSize);
      path.fill = fillColor;
      path.draw(ctx);
    });
  }

  private setupObserver(): void {
    this.teardownObserver();
    if (this.renderMode() !== 'canvas') return;
    if (typeof ResizeObserver === 'undefined') return;
    const wrapper = this.wrapper()?.nativeElement;
    if (!wrapper) return;
    this.resizeObserver = new ResizeObserver(() => this.drawCanvas());
    this.resizeObserver.observe(wrapper);
  }
}
