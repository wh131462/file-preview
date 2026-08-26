import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ChevronLeft, ChevronRight } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import type { Translator } from '../../fp-core';

const NAV_HIDE_DELAY = 2000;

@Component({
  selector: 'afp-nav-arrows',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasPrev()) {
      <button
        type="button"
        class="afp-absolute afp-z-20 afp-left-2 md:afp-left-4 afp-top-1/2 afp-w-10 afp-h-10 md:afp-w-12 md:afp-h-12 afp-rounded-full afp-backdrop-blur-xl afp-border afp-flex afp-items-center afp-justify-center afp-shadow-2xl afp-bg-surface-nav afp-border-line hover:afp-bg-surface-nav-hover afp-text-fg-primary"
        [style.opacity]="visible() ? 1 : 0"
        [style.transform]="visible() ? 'translateY(-50%)' : 'translateY(-50%) translateX(-20px)'"
        [style.pointerEvents]="visible() ? 'auto' : 'none'"
        [style.transition]="'opacity 0.2s, transform 0.2s'"
        [attr.aria-label]="t()('accessibility.previousFile')"
        aria-keyshortcuts="ArrowLeft"
        (click)="prev.emit()"
        (mouseenter)="show()"
      >
        <i-lucide [img]="chevronLeft" class="afp-w-5 afp-h-5 md:afp-w-6 md:afp-h-6" />
      </button>
    }
    @if (hasNext()) {
      <button
        type="button"
        class="afp-absolute afp-z-20 afp-right-2 md:afp-right-4 afp-top-1/2 afp-w-10 afp-h-10 md:afp-w-12 md:afp-h-12 afp-rounded-full afp-backdrop-blur-xl afp-border afp-flex afp-items-center afp-justify-center afp-shadow-2xl afp-bg-surface-nav afp-border-line hover:afp-bg-surface-nav-hover afp-text-fg-primary"
        [style.opacity]="visible() ? 1 : 0"
        [style.transform]="visible() ? 'translateY(-50%)' : 'translateY(-50%) translateX(20px)'"
        [style.pointerEvents]="visible() ? 'auto' : 'none'"
        [style.transition]="'opacity 0.2s, transform 0.2s'"
        [attr.aria-label]="t()('accessibility.nextFile')"
        aria-keyshortcuts="ArrowRight"
        (click)="next.emit()"
        (mouseenter)="show()"
      >
        <i-lucide [img]="chevronRight" class="afp-w-5 afp-h-5 md:afp-w-6 md:afp-h-6" />
      </button>
    }
  `,
})
export class NavArrows {
  container = input<HTMLElement | null>(null);
  hasPrev = input(false);
  hasNext = input(false);
  resetKey = input(0);
  t = input.required<Translator>();
  prev = output<void>();
  next = output<void>();

  protected readonly chevronLeft = ChevronLeft;
  protected readonly chevronRight = ChevronRight;
  readonly visible = signal(true);

  private hideTimer: number | null = null;
  private attached: HTMLElement | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearTimer();
      this.detach();
    });

    effect(() => {
      this.attach(this.container());
    });

    effect(() => {
      this.resetKey();
      this.visible.set(true);
      this.scheduleHide();
    });
  }

  show = (): void => {
    if (!this.visible()) this.visible.set(true);
    this.scheduleHide();
  };

  private scheduleHide(): void {
    this.clearTimer();
    this.hideTimer = window.setTimeout(() => this.visible.set(false), NAV_HIDE_DELAY);
  }

  private clearTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private detach(): void {
    if (this.attached) {
      this.attached.removeEventListener('mousemove', this.show);
      this.attached = null;
    }
  }

  private attach(el: HTMLElement | null): void {
    if (this.attached === el) return;
    this.detach();
    if (el) {
      el.addEventListener('mousemove', this.show);
      this.attached = el;
    }
  }
}
