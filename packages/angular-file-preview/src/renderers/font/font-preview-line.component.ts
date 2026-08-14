import {
  afterNextRender,
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
  getPath: (
    text: string,
    x: number,
    y: number,
    fontSize: number,
  ) => { fill: string | null; draw: (ctx: CanvasRenderingContext2D) => void };
}

@Component({
  selector: 'afp-font-preview-line',
  standalone: true,
  template: `
    <div #wrapperRef class="afp-w-full">
      @if (renderMode() === 'canvas') {
        <canvas #canvasRef class="afp-block"></canvas>
      } @else {
        <div
          class="afp-w-full afp-text-fg-primary afp-whitespace-pre-wrap afp-break-words"
          [style.font-family]="'PreviewFont, sans-serif'"
          [style.font-size.px]="fontSize()"
          [style.line-height]="1.4"
        >{{ text() }}</div>
      }
    </div>
  `,
})
export class FontPreviewLineComponent {
  readonly font = input<OpentypeFontLike | null>(null);
  readonly text = input.required<string>();
  readonly fontSize = input.required<number>();
  readonly renderMode = input.required<RenderMode>();
  readonly theme = input.required<'dark' | 'light'>();

  readonly wrapperRef = viewChild<ElementRef<HTMLDivElement>>('wrapperRef');
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasRef');

  private resizeObserver: ResizeObserver | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (this.renderMode() === 'canvas') {
        this.drawCanvas();
        this.setupObserver();
      }
    });

    effect(() => {
      void this.text();
      void this.fontSize();
      void this.renderMode();
      void this.theme();
      void this.font();
      if (this.renderMode() === 'canvas') {
        requestAnimationFrame(() => {
          this.drawCanvas();
          this.setupObserver();
        });
      }
    });

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });
  }

  private drawCanvas() {
    const wrapper = this.wrapperRef()?.nativeElement;
    const canvas = this.canvasRef()?.nativeElement;
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

  private setupObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.renderMode() !== 'canvas') return;
    if (typeof ResizeObserver === 'undefined') return;
    const wrapper = this.wrapperRef()?.nativeElement;
    if (!wrapper) return;
    this.resizeObserver = new ResizeObserver(() => this.drawCanvas());
    this.resizeObserver.observe(wrapper);
  }
}
