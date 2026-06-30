import type { ToolbarGroup } from './toolbar.types';

/**
 * 渲染器统一接口
 * 所有渲染器通过 defineExpose 暴露此接口，让主组件获取工具栏配置
 */
export interface RendererHandle {
  /**
   * 获取当前渲染器的工具栏配置
   * 返回的配置会随渲染器内部状态变化而更新
   */
  getToolbarGroups: () => ToolbarGroup[];

  /**
   * 订阅工具栏变化事件（可选）
   *
   * 当渲染器内部状态变化导致工具栏需要更新时，会调用传入的 listener 回调。
   * 返回一个取消订阅的函数，调用后将停止接收事件通知。
   *
   * 使用事件机制可以实现实时工具栏更新，避免轮询带来的性能开销。
   * 如果渲染器不实现此方法，主组件会自动回退到轮询机制。
   *
   * @param listener - 工具栏变化时的回调函数
   * @returns 取消订阅的函数
   *
   * @example
   * ```typescript
   * // 在渲染器中实现
   * const emitter = new ToolbarEventEmitter();
   *
   * defineExpose({
   *   getToolbarGroups: () => [...],
   *   onToolbarChange: (listener) => emitter.subscribe(listener)
   * });
   *
   * // 状态变化时通知
   * watch(zoom, () => {
   *   emitter.notify();
   * });
   * ```
   */
  onToolbarChange?: (listener: () => void) => (() => void);
}

/**
 * 轻量级工具栏事件发射器
 * 用于渲染器内部管理工具栏变化事件的订阅和通知
 */
export class ToolbarEventEmitter {
  private listeners = new Set<() => void>();

  /**
   * 订阅工具栏变化事件
   * @param listener - 事件回调函数
   * @returns 取消订阅的函数
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有订阅者工具栏已变化
   */
  notify(): void {
    this.listeners.forEach(fn => fn());
  }
}
