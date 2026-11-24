import { PreviewError } from './i18n';
import type { PreviewFile } from './types';

/** 失败发生的阶段：取数 / 解析 / 渲染。 */
export type PreviewErrorStage = 'request' | 'parse' | 'render';

/**
 * 加载或渲染失败时对外派发的载荷。
 * 框架无关：React / Vue / Angular 三端共用同一形状。
 */
export interface PreviewErrorPayload {
  /** 失败所属文件（顶层已按当前文件补齐）。 */
  file: PreviewFile;
  /** 失败所属文件在 files 中的索引。 */
  index: number;
  /** 原始异常（未经包装），便于宿主上报监控与自行判别。 */
  error: unknown;
  /** 失败阶段。 */
  stage: PreviewErrorStage;
  /** 框架侧补充的诊断信息（如 React ErrorInfo），其他端可能为空。 */
  cause?: unknown;
}

/**
 * 请求阶段异常标记。
 * 由 createFetcher 统一包装抛出，渲染器 catch 后无需判断即可让 stage
 * 自动推断为 'request'，避免逐个渲染器改造两侧 try/catch。
 *
 * 包装时保留内层 PreviewError 的 key/params，并覆盖 message 为原始异常信息，
 * 保证既有日志与断言（如 "Request failed: 404"）不受影响。
 */
export class PreviewRequestError extends PreviewError {
  constructor(readonly cause: unknown) {
    const inner = cause instanceof PreviewError ? cause : undefined;
    super(inner?.key ?? 'request.failed', inner?.params, cause);
    this.name = 'PreviewRequestError';
    if (cause instanceof Error && cause.message) {
      this.message = cause.message;
    }
  }
}

/**
 * 请求阶段错误的词典 key。
 *
 * 历史实现中渲染器拿到响应后自行判断 `!res.ok` 并抛出普通 `PreviewError`，
 * 这类异常不经过 createFetcher 包装，只能按 key 归入取数阶段。
 */
const REQUEST_ERROR_KEYS: ReadonlySet<string> = new Set([
  'request.failed',
  'file.load_failed',
  'file.load_failed_status',
  'common.load_failed',
]);

/**
 * 推断失败阶段：
 * - 显式传入 stage 时优先采用；
 * - 请求包装异常推断为 'request'；
 * - 响应状态类 key（HTTP 非 2xx）推断为 'request'；
 * - 其余一律视为 'parse'。
 */
export function resolveErrorStage(
  error: unknown,
  explicit?: PreviewErrorStage,
): PreviewErrorStage {
  if (explicit) return explicit;
  if (error instanceof PreviewRequestError) return 'request';
  if (error instanceof PreviewError && REQUEST_ERROR_KEYS.has(error.key)) {
    return 'request';
  }
  return 'parse';
}

/**
 * 渲染器侧最小上报口。
 * - begin(url)：标记本次加载对应的 URL，供顶层做代次校验，防止切换文件后
 *   旧渲染器的迟到回调被误归属到新文件。
 * - error(err, stage?)：上报失败，stage 缺省时按 resolveErrorStage 推断。
 */
export interface PreviewReporter {
  begin(url: string): void;
  error(error: unknown, stage?: PreviewErrorStage): void;
}

/** 未接入事件通道时的占位实现，保证渲染器可无条件调用。 */
export const noopReporter: PreviewReporter = {
  begin() {
    // no-op
  },
  error() {
    // no-op
  },
};
