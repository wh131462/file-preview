import type { ToolbarGroup } from './toolbar.types';

/**
 * 渲染器统一接口
 *
 * 所有渲染器都应通过 forwardRef 暴露此接口，使主组件能够：
 * 1. 获取工具栏配置（必需）
 * 2. 订阅工具栏状态变化（可选，用于实时更新）
 */
export interface RendererHandle {
  /**
   * 获取当前工具栏配置
   *
   * @returns 工具栏按钮组配置数组
   */
  getToolbarGroups: () => ToolbarGroup[];

  /**
   * 订阅工具栏状态变化事件（可选）
   *
   * 当渲染器内部状态变化导致工具栏需要更新时，会调用所有订阅的监听器。
   * 这比轮询更高效，能实现实时更新（~1ms 延迟 vs 100ms 轮询延迟）。
   *
   * @param listener - 状态变化时的回调函数
   * @returns 取消订阅的函数，调用后将停止接收通知
   *
   * @example
   * ```typescript
   * const unsubscribe = rendererRef.current?.onToolbarChange?.(() => {
   *   const groups = rendererRef.current.getToolbarGroups();
   *   setToolbarGroups(groups);
   * });
   *
   * // 组件卸载时清理订阅
   * return () => unsubscribe?.();
   * ```
   */
  onToolbarChange?: (listener: () => void) => (() => void);
}
