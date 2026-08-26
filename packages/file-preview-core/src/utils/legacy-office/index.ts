import { legacyDocToHtml, parseLegacyDoc } from './doc';
import { legacyPptToHtml, parseLegacyPpt } from './ppt';

export type { LegacyDocPreview, LegacyDocTheme } from './doc';
export type {
  LegacyPptPreview,
  LegacyPptSlide,
  LegacyPptTheme,
  LegacyPptTable,
  LegacyPptSize,
} from './ppt';
export type { LegacyXlsWorkbook, LegacyXlsSheet, LegacyXlsCell, LegacyXlsMerge } from './xls';
export { legacyDocToHtml, parseLegacyDoc } from './doc';
export { legacyPptToHtml, parseLegacyPpt } from './ppt';
export { parseLegacyXls, convertLegacyXlsToSpreadsheetData, isLegacyXls } from './xls';

export async function renderLegacyDocHtml(data: ArrayBuffer): Promise<string> {
  return legacyDocToHtml(parseLegacyDoc(data));
}

export async function renderLegacyPptHtml(data: ArrayBuffer): Promise<string> {
  return legacyPptToHtml(parseLegacyPpt(data));
}
