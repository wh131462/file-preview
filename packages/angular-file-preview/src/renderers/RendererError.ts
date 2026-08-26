import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AlertCircle } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'afp-renderer-error',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
      <div class="afp-text-center">
        @if (showIcon()) {
          <div class="afp-w-12 afp-h-12 afp-mx-auto afp-mb-3 afp-rounded-full afp-flex afp-items-center afp-justify-center"
               style="background: color-mix(in srgb, #ef4444 10%, transparent)">
            <i-lucide [img]="alertCircle" class="afp-w-6 afp-h-6" style="color: #f87171" />
          </div>
        }
        <p class="afp-text-base afp-font-medium afp-text-fg-primary afp-mb-1">{{ message() }}</p>
        @if (detail()) {
          <p class="afp-text-xs afp-text-fg-tertiary">{{ detail() }}</p>
        }
      </div>
    </div>
  `,
})
export class RendererError {
  message = input.required<string>();
  detail = input<string | undefined>(undefined);
  showIcon = input(true);
  protected readonly alertCircle = AlertCircle;
}
