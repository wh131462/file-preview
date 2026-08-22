import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileCode,
  File as FileIcon,
  ChevronRight,
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import type { LucideIconData } from 'lucide-angular';
import { formatFileSize, getFileType, type ZipTreeNode } from '../../fp-core';

@Component({
  selector: 'afp-zip-tree-item',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (node().isDir) {
      <div>
        <button
          type="button"
          class="tree-row dir-row"
          [style]="padStyle()"
          (click)="toggle.emit(node().path)"
          (mouseenter)="handleEnter($event)"
          (mouseleave)="leave.emit()"
        >
          <i-lucide
            [img]="chevronRight"
            class="afp-w-3.5 afp-h-3.5 afp-flex-shrink-0 afp-transition-transform"
            [class.afp-rotate-90]="isOpen()"
          />
          <i-lucide
            [img]="isOpen() ? folderOpen : folder"
            class="afp-w-4 afp-h-4 afp-flex-shrink-0 afp-text-amber-300/80"
          />
          <span class="afp-truncate afp-flex-1 afp-min-w-0">{{ node().name || '/' }}</span>
        </button>
        @if (isOpen() && node().children) {
          @for (child of node().children; track child.path) {
            <afp-zip-tree-item
              [node]="child"
              [depth]="depth() + 1"
              [selectedPath]="selectedPath()"
              [expanded]="expanded()"
              (toggle)="toggle.emit($event)"
              (select)="select.emit($event)"
              (hover)="hover.emit($event)"
              (leave)="leave.emit()"
            />
          }
        }
      </div>
    } @else {
      <button
        type="button"
        class="tree-row file-row"
        [class.selected]="isSelected()"
        [style]="padStyle()"
        (click)="select.emit(node())"
        (mouseenter)="handleEnter($event)"
        (mouseleave)="leave.emit()"
      >
        <span class="afp-w-3.5 afp-h-3.5 afp-flex-shrink-0"></span>
        <i-lucide [img]="fileIcon()" class="afp-w-4 afp-h-4 afp-flex-shrink-0 afp-text-fg-tertiary" />
        <span class="afp-flex-1 afp-truncate afp-min-w-0">{{ node().name }}</span>
        <span class="afp-text-xs afp-text-fg-disabled afp-flex-shrink-0 afp-ml-2">{{ formatFileSize(node().size) }}</span>
      </button>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .tree-row {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding-top: 0.375rem;
      padding-bottom: 0.375rem;
      padding-right: 0.5rem;
      text-align: left;
      font-size: 0.875rem;
      background: transparent;
      border: 0;
      cursor: pointer;
    }
    .dir-row {
      color: var(--fp-fg-secondary);
    }
    .file-row {
      color: var(--fp-fg-secondary);
    }
    .tree-row:hover {
      background: var(--fp-surface-1);
    }
    .file-row.selected {
      background: var(--fp-line);
      color: var(--fp-fg-inverse);
    }
  `],
})
export class ZipTreeItem {
  node = input.required<ZipTreeNode>();
  depth = input.required<number>();
  selectedPath = input<string | null>(null);
  expanded = input.required<Set<string>>();

  toggle = output<string>();
  select = output<ZipTreeNode>();
  hover = output<{ text: string; rect: DOMRect }>();
  leave = output<void>();

  protected readonly chevronRight = ChevronRight;
  protected readonly folder = Folder;
  protected readonly folderOpen = FolderOpen;
  protected readonly formatFileSize = formatFileSize;

  readonly padStyle = computed(() => ({ paddingLeft: `${this.depth() * 14 + 10}px` }));
  readonly isOpen = computed(() => this.expanded().has(this.node().path));
  readonly isSelected = computed(() => this.selectedPath() === this.node().path);
  readonly fileIcon = computed<LucideIconData>(() => {
    const name = this.node().name;
    const ft = getFileType({ id: '', name, url: '', type: '' });
    if (ft === 'image') return FileImage;
    if (ft === 'text' || ft === 'markdown' || ft === 'json' || ft === 'csv' || ft === 'xml' || ft === 'subtitle') {
      return (name.endsWith('.md') || name.endsWith('.markdown')) ? FileText : FileCode;
    }
    return FileIcon;
  });

  handleEnter(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.hover.emit({ text: this.node().name || '/', rect });
  }
}
