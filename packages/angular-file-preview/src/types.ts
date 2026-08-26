import type {
  PreviewFile,
  PreviewFileLink,
  PreviewFileInput,
  FileType,
  PreviewState,
  CustomRendererEventPayload,
  RequestHandler,
  RequestInitFactory,
  RequestOptions,
  Fetcher,
  ShouldFetchAsBlob,
  Locale,
  Translator,
} from './fp-core';
import type { Type } from '@angular/core';
import type { LucideIconData } from 'lucide-angular';
import type { ToolbarGroup } from './renderers/toolbar.types';

export type {
  PreviewFile,
  PreviewFileLink,
  PreviewFileInput,
  FileType,
  PreviewState,
  CustomRendererEventPayload,
  RequestHandler,
  RequestInitFactory,
  RequestOptions,
  Fetcher,
  ShouldFetchAsBlob,
};

export interface ToolbarAction {
  icon: LucideIconData;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface CustomRendererContext {
  emit: (name: string, payload?: unknown) => void;
  t: Translator;
  theme: 'dark' | 'light';
  locale: Locale;
}

export interface CustomRenderer {
  test: (file: PreviewFile) => boolean;
  /**
   * 返回一个 Angular standalone 组件。将以 inputs `{ file, ctx }` 调用。
   */
  render: (file: PreviewFile, ctx?: CustomRendererContext) => Type<unknown>;
  getToolbarGroups?: (
    file: PreviewFile,
    ctx: CustomRendererContext,
  ) => ToolbarGroup[];
  events?: readonly string[];
}
