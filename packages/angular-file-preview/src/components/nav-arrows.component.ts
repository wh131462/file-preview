import {
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'afp-nav-arrows',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (hasPrev()) {
      <button
        type="button"
        [style.opacity]="visible() ? 1 : 0"
        [style.transform]="visible() ? 'translateY(-50%)' : 'translateY(-50%) translateX(-20px)'"
        [style.pointer-events]="visible() ? 'auto' : 'none'"
        style="transition: opacity 0.2s, transform 0.2s"
        class="afp-absolute afp-z-20 afp-left-2 md:afp-left-4 afp-top-1/2 afp-w-10 afp-h-10 md:afp-w-12 md:afp-h-12 afp-rounded-full afp-backdrop-blur-xl afp-border afp-flex afp-items-center afp-justify-center afp-transition-colors afp-shadow-2xl afp-bg-surface-nav afp-border-line hover:afp-bg-surface-nav-hover afp-text-fg-primary"
        (click)="prev.emit()"
        (mouseenter)="show()"
      >
        <lucide-icon [img]="chevronLeft" class="afp-w-5 afp-h-5 md:afp-w-6 md:afp-h-6" />
      </button>
    }
    @if (hasNext()) {
      <button
        type="button"
        [style.opacity]="visible() ? 1 : 0"
        [style.transform]="visible() ? 'translateY(-50%)' : 'translateY(-50%) translateX(20px)'"
        [style.pointer-events]="visible() ? 'auto' : 'none'"
        style="transition: opacity 0.2s, transform 0.2s"
        class="afp-absolute afp-z-20 afp-right-2 md:afp-right-4 afp-top-1/2 afp-w-10 afp-h-10 md:afp-w-12 md:afp-h-12 afp-rounded-full afp-backdrop-blur-xl afp-border afp-flex afp-items-center afp-justify-center afp-transition-colors afp-shadow-2xl afp-bg-surface-nav afp-border-line hover:afp-bg-surface-nav-hover afp-text-fg-primary"
        (click)="next.emit()"
        (mouseenter)="show()"
      >
        <lucide-icon [img]="chevronRight" class="afp-w-5 afp-h-5 md:afp-w-6 md:afp-h-6" />
      </button>
    }
  `,
})
export class NavArrowsComponent {
  readonly containerEl = input<HTMLElement | null>(null);
  readonly hasPrev = input(false);
  readonly hasNext = input(false);
  readonly resetKey = input(0);

  readonly prev = output<void>();
  readonly next = output<void>();

  readonly chevronLeft = ChevronLeft;
  readonly chevronRight = ChevronRight;
  readonly visible = signal(true);

  private readonly NAV_HIDE_DELAY = 2000;
  private hideTimer: number | null = null;
  private attached: HTMLElement | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      if (this.hideTimer !== null) clearTimeout(this.hideTimer);
      this.detach();
    });
    this.scheduleHide();
  }

  show = (): void => {
    if (!this.visible()) this.visible.set(true);
    this.scheduleHide();
  };

  ngOnChanges(): void {
    const el = this.containerEl();
    this.attach(el ?? null);
    this.visible.set(true);
    this.scheduleHide();
  }

  private scheduleHide() {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.visible.set(false), this.NAV_HIDE_DELAY);
  }

  private detach() {
    if (this.attached) {
      this.attached.removeEventListener('mousemove', this.show);
      this.attached = null;
    }
  }

  private attach(el: HTMLElement | null) {
    if (this.attached === el) return;
    this.detach();
    if (el) {
      el.addEventListener('mousemove', this.show);
      this.attached = el;
    }
  }
}
