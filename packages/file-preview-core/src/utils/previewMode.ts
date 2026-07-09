// 预览运行模式：modal(弹窗) 或 embed(嵌入)
export type PreviewMode = 'modal' | 'embed';

/**
 * 计算关闭按钮的实际显隐值（框架无关，React / Vue 两端共用）。
 * - 显式传入 showClose 时以其为准
 * - 未传时按 mode 取默认值：modal 显示，embed 隐藏
 */
export function resolveShowClose(
  mode: PreviewMode | undefined,
  showClose?: boolean,
): boolean {
  if (showClose !== undefined) return showClose;
  return mode === 'modal';
}
