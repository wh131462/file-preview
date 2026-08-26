import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  Type,
  untracked,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { RendererLoading } from '../../renderers/RendererLoading';
import type { RendererHandle } from '../../renderers/base.types';
import type { RendererLoader } from '../../renderers/lazy';

@Component({
  selector: 'afp-renderer-outlet',
  standalone: true,
  imports: [RendererLoading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <afp-renderer-loading />
    }
    <ng-container #host />
  `,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  styles: `
    :host { display: block; width: 100%; height: 100%; }
    :host > * { display: block; width: 100%; height: 100%; }
  `,
})
export class RendererOutlet {
  loader = input<RendererLoader | null>(null);
  componentType = input<Type<unknown> | null>(null);
  inputs = input<Record<string, unknown>>({});
  handleChange = output<RendererHandle | null>();

  @ViewChild('host', { read: ViewContainerRef, static: true })
  private host!: ViewContainerRef;

  readonly loading = signal(true);
  private ref: ComponentRef<unknown> | null = null;
  private loadedKey = '';
  private seq = 0;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => this.clear());

    effect(() => {
      const loader = this.loader();
      const cmp = this.componentType();
      const inputs = this.inputs();
      untracked(() => {
        void this.sync(loader, cmp, inputs);
      });
    });
  }

  private async sync(
    loader: RendererLoader | null,
    cmp: Type<unknown> | null,
    inputs: Record<string, unknown>,
  ): Promise<void> {
    const key = cmp ? `type:${cmp.name}` : loader ? `loader:${loader.name}` : '';
    if (!loader && !cmp) {
      this.clear();
      this.loading.set(false);
      this.handleChange.emit(null);
      return;
    }

    if (key !== this.loadedKey || !this.ref) {
      const current = ++this.seq;
      this.loading.set(true);
      this.clear();
      try {
        const type = cmp ?? (await loader!());
        if (current !== this.seq) return;
        this.ref = this.host.createComponent(type);
        this.loadedKey = key;
        this.applyInputs(inputs);
        this.loading.set(false);
        this.emitHandle();
      } catch (err) {
        console.error('[file-preview] renderer load failed:', err);
        if (current !== this.seq) return;
        this.loading.set(false);
        this.handleChange.emit(null);
      }
      return;
    }

    this.applyInputs(inputs);
    this.emitHandle();
  }

  private applyInputs(inputs: Record<string, unknown>): void {
    if (!this.ref) return;
    for (const [key, value] of Object.entries(inputs)) {
      this.ref.setInput(key, value);
    }
  }

  private emitHandle(): void {
    const inst = this.ref?.instance as RendererHandle | undefined;
    if (inst && typeof inst.getToolbarGroups === 'function') {
      this.handleChange.emit(inst);
    } else {
      this.handleChange.emit(null);
    }
  }

  private clear(): void {
    this.ref?.destroy();
    this.ref = null;
    this.loadedKey = '';
    this.host?.clear();
  }
}
