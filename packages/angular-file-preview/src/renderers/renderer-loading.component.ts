import { Component } from '@angular/core';
import { injectTranslator } from '../inject/translator';

@Component({
  selector: 'afp-renderer-loading',
  standalone: true,
  template: `
    <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full afp-text-fg-muted">
      <div class="afp-flex afp-flex-col afp-items-center afp-gap-3">
        <div class="afp-w-8 afp-h-8 afp-rounded-full afp-border-2 afp-border-fg-muted afp-border-t-transparent afp-animate-spin"></div>
        <span class="afp-text-sm">{{ t('common.loading') || 'Loading...' }}</span>
      </div>
    </div>
  `,
})
export class RendererLoadingComponent {
  private readonly translator = injectTranslator();
  readonly t = this.translator.t;
}
