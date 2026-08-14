import {
  Component,
  computed,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'afp-resizable-split',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div
      #containerRef
      class="afp-w-full afp-h-full afp-flex afp-flex-col md:afp-flex-row afp-min-h-0 afp-min-w-0"
    >
      @if (mobileTabMode() && !isDesktop()) {
        <div class="afp-flex afp-flex-shrink-0 afp-border-b afp-border-line-weak afp-bg-surface-toolbar">
          <button
            type="button"
            class="afp-flex-1 afp-py-2.5 afp-text-sm afp-transition-colors"
            [class.afp-text-fg-primary]="activeTab() === 'left'"
            [class.afp-border-b-2]="activeTab() === 'left'"
            [class.afp-border-fg-primary]="activeTab() === 'left'"
            [class.-afp-mb-px]="activeTab() === 'left'"
            [class.afp-text-fg-secondary]="activeTab() !== 'left'"
            (click)="switchTab('left')"
          >
            {{ leftTabLabel() }}
          </button>
          <button
            type="button"
            class="afp-flex-1 afp-py-2.5 afp-text-sm afp-transition-colors"
            [class.afp-text-fg-primary]="activeTab() === 'right'"
            [class.afp-border-b-2]="activeTab() === 'right'"
            [class.afp-border-fg-primary]="activeTab() === 'right'"
            [class.-afp-mb-px]="activeTab() === 'right'"
            [class.afp-text-fg-secondary]="activeTab() !== 'right'"
            (click)="switchTab('right')"
          >
            {{ rightTabLabel() }}
          </button>
        </div>
        <div [hidden]="activeTab() !== 'left'" class="afp-flex-1 afp-min-h-0 afp-min-w-0 afp-w-full afp-overflow-hidden">
          <ng-container *ngTemplateOutlet="leftTpl()" />
        </div>
        <div [hidden]="activeTab() !== 'right'" class="afp-flex-1 afp-min-h-0 afp-min-w-0 afp-w-full afp-overflow-hidden">
          <ng-container *ngTemplateOutlet="rightTpl()" />
        </div>
      } @else {
        <div
          class="afp-min-h-0 afp-min-w-0 afp-flex-shrink-0 afp-w-full afp-max-h-60 md:afp-h-full md:afp-max-h-none"
          [style]="leftStyle()"
        >
          <ng-container *ngTemplateOutlet="leftTpl()" />
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          class="split-divider afp-hidden md:afp-block afp-relative afp-w-1.5 afp-flex-shrink-0 afp-cursor-col-resize afp-transition-colors"
          [class.dragging]="dragging()"
          (mousedown)="onDividerDown($event)"
        >
          <span class="afp-absolute afp-inset-y-0 hit-area"></span>
        </div>
        <div class="afp-flex-1 afp-min-w-0 afp-min-h-0 afp-overflow-hidden">
          <ng-container *ngTemplateOutlet="rightTpl()" />
        </div>
      }
    </div>
  `,
  styles: [`
    .split-divider { background: var(--fp-line-weak); }
    .split-divider:hover { background: var(--fp-line); }
    .split-divider.dragging { background: var(--fp-line-strong); }
    .hit-area { left: -4px; right: -4px; }
  `],
})
export class ResizableSplitComponent {
  readonly initialLeftWidth = input(280);
  readonly minLeftWidth = input(160);
  readonly maxLeftWidth = input(640);
  readonly minRightWidth = input(200);
  readonly storageKey = input<string>();
  readonly desktopMedia = input('(min-width: 768px)');
  readonly mobileTabMode = input(false);
  readonly leftTabLabel = input('文件树');
  readonly rightTabLabel = input('预览');

  readonly left = contentChild<TemplateRef<unknown>>('left');
  readonly right = contentChild<TemplateRef<unknown>>('right');

  readonly leftTpl = computed(() => this.left() ?? null);
  readonly rightTpl = computed(() => this.right() ?? null);

  readonly leftWidth = signal(280);
  readonly dragging = signal(false);
  readonly isDesktop = signal(false);
  readonly activeTab = signal<'left' | 'right'>('left');
  readonly leftStyle = computed(() =>
    this.isDesktop() ? { width: `${this.leftWidth()}px` } : undefined,
  );

  private readonly containerRef = inject(ElementRef<HTMLElement>);
  private mq: MediaQueryList | null = null;

  constructor() {
    const key = this.storageKey();
    if (key && typeof window !== 'undefined') {
      const saved = Number(window.localStorage.getItem(key));
      this.leftWidth.set(!isNaN(saved) && saved > 0 ? saved : this.initialLeftWidth());
    } else {
      this.leftWidth.set(this.initialLeftWidth());
    }

    const mqHandler = () => {
      if (this.mq) this.isDesktop.set(this.mq.matches);
    };
    if (typeof window !== 'undefined') {
      this.mq = window.matchMedia(this.desktopMedia());
      mqHandler();
      this.mq.addEventListener('change', mqHandler);
    }

    effect(() => {
      if (!this.storageKey()) this.leftWidth.set(this.initialLeftWidth());
    });

    inject(DestroyRef).onDestroy(() => {
      this.mq?.removeEventListener('change', mqHandler);
      window.removeEventListener('mousemove', this.onMove);
      window.removeEventListener('mouseup', this.onUp);
      if (this.dragging()) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  switchTab(tab: 'left' | 'right') {
    this.activeTab.set(tab);
  }

  onDividerDown(e: MouseEvent) {
    e.preventDefault();
    this.dragging.set(true);
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mouseup', this.onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  private onMove = (e: MouseEvent) => {
    const el = this.containerRef.nativeElement.querySelector('div');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cap = rect.width - this.minRightWidth() - 6;
    const effectiveMax = Math.min(this.maxLeftWidth(), cap);
    this.leftWidth.set(Math.max(this.minLeftWidth(), Math.min(effectiveMax, x)));
  };

  private onUp = () => {
    if (!this.dragging()) return;
    this.dragging.set(false);
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('mouseup', this.onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const key = this.storageKey();
    if (key) {
      try {
        window.localStorage.setItem(key, String(this.leftWidth()));
      } catch {
        // ignore
      }
    }
  };
}
