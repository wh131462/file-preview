import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocaleService, getFallbackTranslator } from '../di/locale.service';

@Component({
  selector: 'afp-renderer-loading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div class="afp-renderer-loading">
      <div class="afp-renderer-loading-content">
        <div class="afp-renderer-spinner"></div>
        <span class="afp-renderer-loading-text">{{ t('common.loading') }}</span>
      </div>
    </div>
  `,
})
export class RendererLoading {
  private readonly locale = inject(LocaleService, { optional: true });
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();
}
