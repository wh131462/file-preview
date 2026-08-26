import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocaleService, getFallbackTranslator } from '../di/locale.service';

@Component({
  selector: 'afp-renderer-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full afp-text-fg-muted">
      <div class="afp-flex afp-flex-col afp-items-center afp-gap-3">
        <div class="afp-w-8 afp-h-8 afp-rounded-full afp-border-2 afp-border-fg-muted afp-border-t-transparent afp-animate-spin"></div>
        <span class="afp-text-sm">{{ t('common.loading') }}</span>
      </div>
    </div>
  `,
})
export class RendererLoading {
  private readonly locale = inject(LocaleService, { optional: true });
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();
}
