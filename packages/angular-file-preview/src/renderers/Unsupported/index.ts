import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FileQuestion, Download } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { LocaleService, getFallbackTranslator } from '../../di/locale.service';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-unsupported-renderer',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div class="afp-flex afp-flex-col afp-items-center afp-justify-center afp-w-full afp-h-full afp-p-6 afp-gap-4">
      <div class="afp-w-20 afp-h-20 afp-rounded-full afp-bg-surface-2 afp-flex afp-items-center afp-justify-center">
        <i-lucide [img]="fileQuestion" class="afp-w-10 afp-h-10 afp-text-fg-secondary" />
      </div>
      <div class="afp-text-fg-primary afp-text-center">
        <p class="afp-text-lg afp-font-medium afp-mb-2">{{ fileName() }}</p>
        <p class="afp-text-fg-secondary">{{ t('common.unsupported_preview', { type: fileType() }) }}</p>
      </div>
      <button
        type="button"
        class="afp-flex afp-items-center afp-gap-2 afp-px-4 afp-py-2 afp-bg-surface-2 hover:afp-bg-surface-3 afp-backdrop-blur-sm afp-rounded-lg afp-text-fg-primary afp-font-medium afp-transition-all"
        (click)="download.emit()"
      >
        <i-lucide [img]="downloadIcon" class="afp-w-5 afp-h-5" />
        {{ t('common.download') }}
      </button>
    </div>
  `,
})
export class UnsupportedRenderer implements RendererHandle {
  fileName = input.required<string>();
  fileType = input.required<string>();
  download = output<void>();

  protected readonly fileQuestion = FileQuestion;
  protected readonly downloadIcon = Download;
  private readonly locale = inject(LocaleService, { optional: true });
  protected readonly t = this.locale?.t() ?? getFallbackTranslator();

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }
}
