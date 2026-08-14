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
} from '@eternalheart/file-preview-core';

import type {
  PreviewFile,
  Locale,
  Translator,
} from '@eternalheart/file-preview-core';
import type { Type } from '@angular/core';
import type { ToolbarGroup } from './renderers/toolbar.types';

export interface ToolbarAction {
  icon: unknown;
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
  render: (file: PreviewFile, ctx?: CustomRendererContext) => Type<unknown>;
  getToolbarGroups?: (
    file: PreviewFile,
    ctx: CustomRendererContext,
  ) => ToolbarGroup[];
  events?: readonly string[];
}
