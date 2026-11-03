import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FileMinus, LucideAngularModule } from 'lucide-angular';

/**
 * 空内容提示（中性态，非错误）
 *
 * 仅在 `emptyHint` 显式开启时使用；默认保持原生空白。
 * 文案由调用方传入（通常为 `t('file.empty')`），可通过 `messages` 覆盖实现自定义与多语言。
 */
@Component({
  selector: 'afp-empty-state',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
      <div class="afp-text-center">
        <div class="afp-w-12 afp-h-12 afp-mx-auto afp-mb-3 afp-rounded-full afp-bg-surface-2 afp-flex afp-items-center afp-justify-center">
          <i-lucide [img]="fileMinus" class="afp-w-6 afp-h-6 afp-text-fg-tertiary" />
        </div>
        <p class="afp-text-base afp-font-medium afp-text-fg-primary">{{ message() }}</p>
      </div>
    </div>
  `,
})
export class EmptyState {
  message = input.required<string>();
  protected readonly fileMinus = FileMinus;
}
