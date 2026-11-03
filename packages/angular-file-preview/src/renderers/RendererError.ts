import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AlertCircle } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'afp-renderer-error',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'afp-block afp-w-full afp-h-full' },
  template: `
    <div class="afp-renderer-error">
      <div class="afp-renderer-error-content">
        @if (showIcon()) {
          <div class="afp-w-12 afp-h-12 afp-rounded-full afp-flex afp-items-center afp-justify-center"
               style="background: color-mix(in srgb, #ef4444 10%, transparent)">
            <i-lucide [img]="alertCircle" class="afp-w-6 afp-h-6" style="color: #f87171" />
          </div>
        }
        <div>
          <p class="afp-renderer-error-text">{{ message() }}</p>
          @if (detail()) {
            <p class="afp-renderer-error-detail">{{ detail() }}</p>
          }
        </div>
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
