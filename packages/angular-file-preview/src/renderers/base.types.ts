import type { ToolbarGroup } from './toolbar.types';

export interface RendererHandle {
  getToolbarGroups: () => ToolbarGroup[];
  onToolbarChange?: (listener: () => void) => (() => void);
}

export class ToolbarEventEmitter {
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
