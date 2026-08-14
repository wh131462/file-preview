import { Component, input, output } from '@angular/core';
import { LucideAngularModule, FileQuestion, Download } from 'lucide-angular';
import { injectTranslator } from '../../inject/translator';
import type { RendererHandle } from '../base.types';
import type { ToolbarGroup } from '../toolbar.types';

@Component({
  selector: 'afp-unsupported-renderer',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="afp-flex afp-flex-col afp-items-center afp-justify-center afp-w-full afp-h-full afp-p-6 afp-gap-4">
      <div class="afp-w-20 afp-h-20 afp-rounded-full afp-bg-surface-2 afp-flex afp-items-center afp-justify-center">
        <lucide-icon [img]="fileQuestion" class="afp-w-10 afp-h-10 afp-text-fg-secondary" />
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
        <lucide-icon [img]="downloadIcon" class="afp-w-5 afp-h-5" />
        {{ t('common.download') }}
      </button>
    </div>
  `,
})
export class UnsupportedRendererComponent implements RendererHandle {
  readonly fileName = input.required<string>();
  readonly fileType = input.required<string>();
  readonly download = output<void>();

  readonly fileQuestion = FileQuestion;
  readonly downloadIcon = Download;

  private readonly translator = injectTranslator();
  readonly t = this.translator.t;

  getToolbarGroups(): ToolbarGroup[] {
    return [];
  }
}
