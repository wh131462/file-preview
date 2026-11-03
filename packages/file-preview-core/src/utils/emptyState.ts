/**
 * 空内容判定与提示策略（框架无关，React / Vue / Angular 共用）
 *
 * 默认行为是「原生展示」：文本类内容为空时保持空白，不插入任何占位内容。
 * 需要通过 `emptyHint` 显式开启提示，文案取 `t('file.empty')`，可用 `messages` 覆盖。
 */

/**
 * 空内容提示策略
 * - `auto`：按类型取默认值。文本类（内容即文件内容）保持空白；结构化类型（需解析产出内容）显示提示
 * - `always`：强制显示提示
 * - `never`：一律保持空白
 */
export type EmptyHintMode = 'auto' | 'always' | 'never';

/**
 * 空内容类型
 * - `textual`：文件内容本身就是渲染结果（text / json 等）
 * - `structured`：内容必须由解析器产出，空输入时解析器无输出（xlsx / pptx 等）
 */
export type EmptyContentKind = 'textual' | 'structured';

/**
 * 判断文本内容是否为空：仅含空白字符（含 BOM、换行、空格）视为空。
 * `null` / `undefined` / `''` 均视为空。
 */
export function isEmptyContent(text: string | null | undefined): boolean {
  if (text === null || text === undefined) return true;
  return text.trim().length === 0;
}

/**
 * 计算是否展示空内容提示（不负责判定内容是否为空）。
 */
export function resolveEmptyHint(
  mode: EmptyHintMode | undefined,
  kind: EmptyContentKind,
): boolean {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  // auto：结构化类型没有原生空白可看，默认提示；文本类保持原生空白
  return kind === 'structured';
}
