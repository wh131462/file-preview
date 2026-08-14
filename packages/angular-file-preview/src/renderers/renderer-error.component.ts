import { Component, input } from '@angular/core';
import { LucideAngularModule, AlertCircle } from 'lucide-angular';

@Component({
  selector: 'afp-renderer-error',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="afp-flex afp-items-center afp-justify-center afp-w-full afp-h-full">
      <div class="afp-text-center">
        @if (showIcon()) {
          <div class="afp-w-12 afp-h-12 afp-mx-auto afp-mb-3 afp-rounded-full afp-bg-red-500/10 afp-flex afp-items-center afp-justify-center">
            <lucide-icon [img]="alertCircle" class="afp-w-6 afp-h-6 afp-text-red-400" />
          </div>
        }
        <p class="afp-text-base afp-font-medium afp-text-fg-primary afp-mb-1">
          {{ message() }}
        </p>
        @if (detail()) {
          <p class="afp-text-xs afp-text-fg-tertiary">
            {{ detail() }}
          </p>
        }
      </div>
    </div>
  `,
})
export class RendererErrorComponent {
  readonly message = input.required<string>();
  readonly detail = input<string>();
  readonly showIcon = input(true);
  readonly alertCircle = AlertCircle;
}
