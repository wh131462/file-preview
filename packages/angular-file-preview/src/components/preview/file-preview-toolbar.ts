import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Download, X } from 'lucide-angular';
import type { Translator } from '../../fp-core';
import type { ToolbarGroup } from '../../renderers/toolbar.types';
import { ToolbarButton } from './toolbar-button';

@Component({
  selector: 'afp-file-preview-toolbar',
  standalone: true,
  imports: [ToolbarButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="afp-flex-shrink-0 afp-z-10 afp-backdrop-blur-md afp-border-b afp-bg-surface-toolbar afp-border-line"
      style="padding-top: env(safe-area-inset-top, 0px)"
    >
      <div class="afp-flex afp-items-center afp-justify-between afp-px-3 md:afp-px-5 afp-py-1.5 md:afp-py-2.5">
        <div class="afp-flex afp-items-center afp-flex-1 afp-min-w-0 afp-mr-2 md:afp-mr-3">
          <h2 class="afp-font-medium afp-text-xs md:afp-text-sm afp-truncate afp-text-fg-primary">
            {{ fileName() }}
          </h2>
          <span
            class="afp-text-xs afp-ml-2 afp-flex-shrink-0 afp-text-fg-muted"
            aria-live="polite"
            aria-atomic="true"
          >
            {{ currentIndex() + 1 }}/{{ totalFiles() }}
          </span>
        </div>

        <div class="afp-flex afp-items-center afp-gap-1 md:afp-hidden afp-flex-shrink-0">
          @for (group of actionGroups(); track $index; let last = $last) {
            @for (item of group.items; track $index) {
              @if (item.type === 'button') {
                <afp-toolbar-button
                  [icon]="item.icon"
                  [label]="item.tooltip"
                  [onClick]="item.action"
                  [disabled]="!!item.disabled"
                  [active]="!!item.active"
                  [ariaKeyshortcuts]="item.ariaKeyshortcuts"
                />
              }
            }
          }
        </div>

        <div class="afp-hidden md:afp-flex afp-items-center afp-gap-1 afp-flex-shrink-0">
          @for (group of toolGroups(); track $index; let last = $last) {
            @for (item of group.items; track $index) {
              @if (item.type === 'button') {
                <afp-toolbar-button
                  [icon]="item.icon"
                  [label]="item.tooltip"
                  [onClick]="item.action"
                  [disabled]="!!item.disabled"
                  [active]="!!item.active"
                  [ariaKeyshortcuts]="item.ariaKeyshortcuts"
                />
              } @else {
                <span
                  class="afp-text-xs afp-text-center afp-font-medium afp-tabular-nums afp-text-fg-tertiary"
                  [style.minWidth]="item.minWidth || 'auto'"
                >
                  {{ item.content }}
                </span>
              }
            }
            @if (!last || actionGroups().length > 0) {
              <div class="afp-w-px afp-h-4 afp-mx-1 afp-bg-divide"></div>
            }
          }
          @for (group of actionGroups(); track $index) {
            @for (item of group.items; track $index) {
              @if (item.type === 'button') {
                <afp-toolbar-button
                  [icon]="item.icon"
                  [label]="item.tooltip"
                  [onClick]="item.action"
                  [disabled]="!!item.disabled"
                  [active]="!!item.active"
                  [ariaKeyshortcuts]="item.ariaKeyshortcuts"
                />
              }
            }
          }
        </div>
      </div>

      @if (toolGroups().length > 0) {
        <div class="afp-flex afp-items-center afp-gap-1 afp-px-3 afp-pb-1.5 afp-overflow-x-auto scrollbar-hide md:afp-hidden">
          @for (group of toolGroups(); track $index; let first = $first) {
            @if (!first) {
              <div class="afp-w-px afp-h-4 afp-mx-0.5 afp-bg-divide"></div>
            }
            @for (item of group.items; track $index) {
              @if (item.type === 'button') {
                <afp-toolbar-button
                  [icon]="item.icon"
                  [label]="item.tooltip"
                  [onClick]="item.action"
                  [disabled]="!!item.disabled"
                  [active]="!!item.active"
                  [ariaKeyshortcuts]="item.ariaKeyshortcuts"
                />
              } @else {
                <span
                  class="afp-text-xs afp-text-center afp-font-medium afp-tabular-nums afp-text-fg-tertiary"
                  [style.minWidth]="item.minWidth || 'auto'"
                >
                  {{ item.content }}
                </span>
              }
            }
          }
        </div>
      }
    </div>
  `,
})
export class FilePreviewToolbar {
  fileName = input.required<string>();
  currentIndex = input.required<number>();
  totalFiles = input.required<number>();
  toolGroups = input<ToolbarGroup[]>([]);
  t = input.required<Translator>();
  showClose = input(true);
  showDownload = input(true);
  download = output<void>();
  close = output<void>();

  protected readonly downloadIcon = Download;
  protected readonly closeIcon = X;

  readonly actionGroups = computed<ToolbarGroup[]>(() => {
    const groups: ToolbarGroup[] = [];
    const t = this.t();
    if (this.showDownload()) {
      groups.push({
        items: [
          {
            type: 'button',
            icon: Download,
            tooltip: t('accessibility.downloadFile') || t('common.download'),
            action: () => this.download.emit(),
          },
        ],
      });
    }
    if (this.showClose()) {
      groups.push({
        items: [
          {
            type: 'button',
            icon: X,
            tooltip: t('accessibility.closePreview') || t('common.close'),
            action: () => this.close.emit(),
            ariaKeyshortcuts: 'Escape',
          },
        ],
      });
    }
    return groups;
  });
}
