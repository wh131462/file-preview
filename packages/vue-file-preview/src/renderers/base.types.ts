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
}
