import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import type { LucideIconData } from 'lucide-angular';

@Component({
  selector: 'afp-toolbar-button',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [disabled]="disabled()"
      [attr.aria-label]="label()"
      [attr.aria-pressed]="active()"
      [attr.aria-keyshortcuts]="ariaKeyshortcuts() || null"
      [attr.aria-disabled]="disabled()"
      [attr.data-tooltip]="label()"
      class="toolbar-btn"
      [class.active]="active()"
      (click)="onClick()()"
    >
      <i-lucide [img]="icon()" class="afp-w-4 afp-h-4" />
    </button>
  `,
  styles: [`
    :host { display: contents; }
    .toolbar-btn {
      position: relative;
      padding: 0.5rem;
      border-radius: 0.375rem;
      transition: all 0.15s;
      user-select: none;
      color: var(--fp-fg-primary);
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    @media (min-width: 768px) {
      .toolbar-btn { padding: 0.375rem; }
    }
    .toolbar-btn:hover { background: var(--fp-surface-2); }
    .toolbar-btn:active { background: var(--fp-surface-3); }
    .toolbar-btn.active,
    .toolbar-btn.active:hover,
    .toolbar-btn.active:active { background: var(--fp-surface-3); }
    .toolbar-btn:disabled {
      color: var(--fp-fg-disabled);
      cursor: not-allowed;
    }
    .toolbar-btn[data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      margin-top: 6px;
      padding: 4px 8px;
      background: var(--fp-fg-primary);
      color: var(--fp-fg-inverse);
      font-size: 12px;
      line-height: 1.5;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      z-index: 50;
    }
    .toolbar-btn[data-tooltip]::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 100%;
      transform: translateX(-50%);
      margin-top: 2px;
      border: 4px solid transparent;
      border-bottom-color: var(--fp-fg-primary);
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      z-index: 50;
    }
    .toolbar-btn[data-tooltip]:hover::after,
    .toolbar-btn[data-tooltip]:hover::before {
      opacity: 1;
      visibility: visible;
    }
    @media (max-width: 1023px) {
      .toolbar-btn[data-tooltip]::after,
      .toolbar-btn[data-tooltip]::before {
        display: none !important;
      }
    }
  `],
})
export class ToolbarButton {
  icon = input.required<LucideIconData>();
  label = input.required<string>();
  onClick = input.required<() => void>();
  disabled = input(false);
  active = input(false);
  ariaKeyshortcuts = input<string | undefined>(undefined);
}
