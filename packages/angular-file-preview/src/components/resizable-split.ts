import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'afp-resizable-split',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #containerRef
      class="afp-w-full afp-h-full afp-flex afp-flex-col md:afp-flex-row afp-min-h-0 afp-min-w-0"
    >
      @if (isMobileTab()) {
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
      }
      <div
        [class]="leftPaneClass()"
        [style]="isMobileTab() ? null : leftStyle()"
        [hidden]="isMobileTab() && activeTab() !== 'left'"
      >
        <ng-content select="[splitLeft]" />
      </div>
      @if (!isMobileTab()) {
        <div
          role="separator"
          aria-orientation="vertical"
          class="split-divider afp-hidden md:afp-block afp-relative afp-w-1.5 afp-flex-shrink-0 afp-cursor-col-resize afp-transition-colors"
          [class.dragging]="dragging()"
          (mousedown)="onDividerDown($event)"
        >
          <span class="afp-absolute afp-inset-y-0 hit-area"></span>
        </div>
      }
      <div
        [class]="rightPaneClass()"
        [hidden]="isMobileTab() && activeTab() !== 'right'"
      >
        <ng-content select="[splitRight]" />
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .split-divider {
      background: var(--fp-line-weak);
    }
    .split-divider:hover {
      background: var(--fp-line);
    }
    .split-divider.dragging {
      background: var(--fp-line-strong);
    }
    .hit-area {
      left: -4px;
      right: -4px;
    }
  `],
})
export class ResizableSplit {
  initialLeftWidth = input(280);
  minLeftWidth = input(160);
  maxLeftWidth = input(640);
  minRightWidth = input(200);
  storageKey = input<string | undefined>(undefined);
  desktopMedia = input('(min-width: 768px)');
  mobileTabMode = input(false);
  leftTabLabel = input('文件树');
  rightTabLabel = input('预览');

  private readonly container = viewChild<ElementRef<HTMLDivElement>>('containerRef');
  private readonly destroyRef = inject(DestroyRef);

  readonly leftWidth = signal(280);
  readonly dragging = signal(false);
  readonly isDesktop = signal(false);
  readonly activeTab = signal<'left' | 'right'>('left');

  readonly isMobileTab = computed(() => this.mobileTabMode() && !this.isDesktop());
  readonly leftStyle = computed(() =>
    this.isDesktop() ? { width: `${this.leftWidth()}px` } : undefined,
  );
  readonly leftPaneClass = computed(() =>
    this.isMobileTab()
      ? 'afp-flex-1 afp-min-h-0 afp-min-w-0 afp-w-full afp-overflow-hidden'
      : 'afp-min-h-0 afp-min-w-0 afp-flex-shrink-0 afp-w-full afp-max-h-60 md:afp-h-full md:afp-max-h-none',
  );
  readonly rightPaneClass = computed(() =>
    this.isMobileTab()
      ? 'afp-flex-1 afp-min-h-0 afp-min-w-0 afp-w-full afp-overflow-hidden'
      : 'afp-flex-1 afp-min-w-0 afp-min-h-0 afp-overflow-hidden',
  );

  private storageApplied = false;

  constructor() {
    effect(() => {
      const key = this.storageKey();
      const initial = this.initialLeftWidth();
      if (!this.storageApplied) {
        this.storageApplied = true;
        if (key && typeof window !== 'undefined') {
          const saved = Number(window.localStorage.getItem(key));
          if (!isNaN(saved) && saved > 0) {
            this.leftWidth.set(saved);
            return;
          }
        }
        this.leftWidth.set(initial);
        return;
      }
      if (!key) this.leftWidth.set(initial);
    });

    effect((onCleanup) => {
      const media = this.desktopMedia();
      if (typeof window === 'undefined') return;
      const mq = window.matchMedia(media);
      const handler = () => {
        this.isDesktop.set(mq.matches);
      };
      handler();
      mq.addEventListener('change', handler);
      onCleanup(() => mq.removeEventListener('change', handler));
    });

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('mousemove', this.onMove);
      window.removeEventListener('mouseup', this.onUp);
      if (this.dragging()) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  switchTab(tab: 'left' | 'right'): void {
    this.activeTab.set(tab);
  }

  onDividerDown(e: MouseEvent): void {
    e.preventDefault();
    this.dragging.set(true);
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mouseup', this.onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  private readonly onMove = (e: MouseEvent): void => {
    const el = this.container()?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cap = rect.width - this.minRightWidth() - 6;
    const effectiveMax = Math.min(this.maxLeftWidth(), cap);
    this.leftWidth.set(Math.max(this.minLeftWidth(), Math.min(effectiveMax, x)));
  };

  private readonly onUp = (): void => {
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
        /* ignore */
      }
    }
  };
}
