import type { Workbook, Worksheet, Cell, Fill, Border as ExcelBorder } from 'exceljs';

// x-data-spreadsheet 数据格式类型
interface XCellStyle {
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
  };
  bgcolor?: string;
  textwrap?: boolean;
  color?: string;
  strike?: boolean;
  underline?: boolean;
  border?: {
    top?: string[];
    right?: string[];
    bottom?: string[];
    left?: string[];
  };
}

interface XCellData {
  text: string;
  style?: number;
  merge?: [number, number];
}

interface XRowData {
  height?: number;
  cells: Record<string, XCellData>;
}

interface XSheetData {
  name: string;
  styles?: XCellStyle[];
  merges?: string[];
  rows?: Record<string, XRowData>;
  cols?: Record<string, { width?: number } | number>;
}

/**
 * 将 exceljs ARGB 颜色 (如 "FF00FF00") 转换为 hex (如 "#00FF00")
 */
function argbToHex(argb: string): string {
  if (!argb) return '#000000';
  if (argb.startsWith('#')) return argb;
  if (argb.length === 8) {
    return '#' + argb.substring(2);
  }
  if (argb.length === 6) {
    return '#' + argb;
  }
  return '#000000';
}

const DEFAULT_THEME_COLORS = [
  'FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31',
  'A5A5A5', 'FFC000', '5B9BD5', '70AD47',
];

const INDEXED_COLORS = [
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080',
  '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF',
  '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696',
  '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333',
];

function applyTint(hex: string, tint: number): string {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const apply = (c: number) => {
    if (tint < 0) {
      return Math.round(c * (1 + tint));
    }
    return Math.round(c + (255 - c) * tint);
  };

  const nr = Math.min(255, Math.max(0, apply(r)));
  const ng = Math.min(255, Math.max(0, apply(g)));
  const nb = Math.min(255, Math.max(0, apply(b)));

  return nr.toString(16).padStart(2, '0')
    + ng.toString(16).padStart(2, '0')
    + nb.toString(16).padStart(2, '0');
}

function getFillColor(fill: Fill | undefined): string | undefined {
  if (!fill) return undefined;
  if (fill.type === 'pattern' && fill.pattern === 'solid') {
    const fgColor = fill.fgColor;
    if (fgColor) {
      return resolveColor(fgColor as Record<string, unknown>);
    }
  }
  return undefined;
}

function resolveColor(colorObj: Record<string, unknown> | undefined): string | undefined {
  if (!colorObj) return undefined;
  if ('argb' in colorObj && typeof colorObj.argb === 'string' && colorObj.argb) {
    return argbToHex(colorObj.argb);
  }
  if ('theme' in colorObj && typeof colorObj.theme === 'number') {
    const base = DEFAULT_THEME_COLORS[colorObj.theme] || '000000';
    const tint = ('tint' in colorObj && typeof colorObj.tint === 'number') ? colorObj.tint : 0;
    const resolved = tint !== 0 ? applyTint(base, tint) : base;
    return '#' + resolved;
  }
  if ('indexed' in colorObj && typeof colorObj.indexed === 'number') {
    const color = INDEXED_COLORS[colorObj.indexed];
    if (color) return '#' + color;
  }
  return undefined;
}

function convertBorderSide(
  border: Partial<ExcelBorder> | undefined
): string[] | undefined {
  if (!border || !border.style) return undefined;
  const color = resolveColor(border.color as Record<string, unknown>) || '#000000';
  return [border.style, color];
}

function convertCellStyle(cell: Cell): XCellStyle | null {
  const style: XCellStyle = {};
  let hasStyle = false;

  if (cell.font) {
    const font = cell.font;
    if (font.name || font.size || font.bold || font.italic) {
      hasStyle = true;
      style.font = {};
      if (font.name) style.font.name = font.name;
      if (font.size) style.font.size = font.size;
      if (font.bold) style.font.bold = true;
      if (font.italic) style.font.italic = true;
    }
    if (font.color) {
      const fontColor = resolveColor(font.color as Record<string, unknown>);
      if (fontColor) {
        hasStyle = true;
        style.color = fontColor;
      }
    }
    if (font.underline) {
      hasStyle = true;
      style.underline = true;
    }
    if (font.strike) {
      hasStyle = true;
      style.strike = true;
    }
  }

  const bgcolor = getFillColor(cell.fill);
  if (bgcolor) {
    hasStyle = true;
    style.bgcolor = bgcolor;
  }

  if (cell.alignment) {
    const align = cell.alignment;
    if (align.horizontal) {
      hasStyle = true;
      style.align = align.horizontal as 'left' | 'center' | 'right';
    }
    if (align.vertical) {
      hasStyle = true;
      style.valign = align.vertical as 'top' | 'middle' | 'bottom';
    }
    if (align.wrapText) {
      hasStyle = true;
      style.textwrap = true;
    }
  }

  if (cell.border) {
    const border: XCellStyle['border'] = {};
    let hasBorder = false;

    const sides = ['top', 'bottom', 'left', 'right'] as const;
    for (const side of sides) {
      const converted = convertBorderSide(cell.border[side]);
      if (converted) {
        border[side] = converted;
        hasBorder = true;
      }
    }

    if (hasBorder) {
      hasStyle = true;
      style.border = border;
    }
  }

  return hasStyle ? style : null;
}

function serializeStyle(style: XCellStyle): string {
  return JSON.stringify(style);
}

function getOrCreateStyleIndex(
  cell: Cell,
  styles: XCellStyle[],
  styleMap: Map<string, number>
): number {
  const style = convertCellStyle(cell);
  if (!style) return -1;

  const key = serializeStyle(style);
  const existing = styleMap.get(key);
  if (existing !== undefined) return existing;

  const index = styles.length;
  styles.push(style);
  styleMap.set(key, index);
  return index;
}

function extractCellText(cell: Cell): string {
  const value = cell.value;

  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (typeof value === 'object' && 'formula' in value) {
    const result = (value as { formula: string; result?: unknown }).result;
    if (result !== undefined && result !== null) return String(result);
    return '';
  }

  if (typeof value === 'object' && 'richText' in value) {
    const richText = (value as { richText: Array<{ text: string }> }).richText;
    return richText.map((rt) => rt.text).join('');
  }

  if (typeof value === 'object' && 'hyperlink' in value) {
    return (value as { text?: string; hyperlink: string }).text || '';
  }

  if (typeof value === 'object' && 'error' in value) {
    return String((value as { error: unknown }).error);
  }

  return String(value);
}

function parseRange(rangeStr: string): {
  top: number;
  left: number;
  bottom: number;
  right: number;
} {
  const parts = rangeStr.split(':');
  const start = parseCellAddress(parts[0]);
  const end = parts[1] ? parseCellAddress(parts[1]) : start;
  return {
    top: start.row,
    left: start.col,
    bottom: end.row,
    right: end.col,
  };
}

function parseCellAddress(addr: string): { row: number; col: number } {
  const match = addr.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: 1, col: 1 };

  const colStr = match[1];
  const row = parseInt(match[2], 10);

  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }

  return { row, col };
}

/**
 * 将 exceljs Workbook 转换为 x-data-spreadsheet 数据格式
 */
export function convertWorkbookToSpreadsheetData(
  workbook: Workbook
): XSheetData[] {
  const result: XSheetData[] = [];

  workbook.eachSheet((worksheet: Worksheet) => {
    const styles: XCellStyle[] = [];
    const styleMap = new Map<string, number>();
    const merges: string[] = [];
    const rows: Record<string, XRowData> = {};
    const cols: Record<string, { width?: number } | number> = {};

    const colCount = worksheet.columnCount;
    for (let c = 1; c <= colCount; c++) {
      const col = worksheet.getColumn(c);
      if (col.width) {
        cols[String(c - 1)] = { width: Math.round(col.width * 7.5) };
      }
    }
    cols['len'] = Math.max(colCount, 26) as unknown as number;

    const mergeMap = new Map<string, [number, number]>();
    const worksheetModel = (worksheet as any).model;
    const mergeRanges: string[] = worksheetModel?.merges || [];

    for (const rangeStr of mergeRanges) {
      merges.push(rangeStr);
      const { top, left, bottom, right } = parseRange(rangeStr);
      const rowSpan = bottom - top;
      const colSpan = right - left;
      mergeMap.set(`${top - 1},${left - 1}`, [rowSpan, colSpan]);
    }

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const rowIndex = rowNumber - 1;
      const cellsObj: Record<string, XCellData> = {};

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const colIndex = colNumber - 1;

        if (cell.isMerged && cell.master !== cell) return;

        const text = extractCellText(cell);
        const styleIndex = getOrCreateStyleIndex(cell, styles, styleMap);

        const cellData: XCellData = { text };
        if (styleIndex !== -1) cellData.style = styleIndex;

        const mergeKey = `${rowIndex},${colIndex}`;
        if (mergeMap.has(mergeKey)) {
          cellData.merge = mergeMap.get(mergeKey)!;
        }

        cellsObj[String(colIndex)] = cellData;
      });

      const rowData: XRowData = { cells: cellsObj };
      if (row.height) {
        rowData.height = Math.round(row.height * 1.333);
      }
      rows[String(rowIndex)] = rowData;
    });

    result.push({
      name: worksheet.name,
      styles,
      merges,
      rows,
      cols,
    });
  });

  return result;
}

/**
 * 将解析后的 CSV/TSV 数据转换为 x-data-spreadsheet 数据格式
 */
export function convertCsvToSpreadsheetData(
  header: string[],
  rows: string[][],
  sheetName = 'Sheet1'
): XSheetData[] {
  const hasHeader = header.length > 0;
  const headerStyle: XCellStyle = { font: { bold: true } };
  const styles: XCellStyle[] = hasHeader ? [headerStyle] : [];
  const xRows: Record<string, XRowData> = {};

  if (hasHeader) {
    const cells: Record<string, XCellData> = {};
    header.forEach((h, i) => {
      cells[String(i)] = { text: h, style: 0 };
    });
    xRows['0'] = { cells };
  }

  const offset = hasHeader ? 1 : 0;
  rows.forEach((row, ri) => {
    const cells: Record<string, XCellData> = {};
    row.forEach((val, ci) => {
      if (val !== undefined && val !== '') {
        cells[String(ci)] = { text: val };
      }
    });
    xRows[String(ri + offset)] = { cells };
  });

  return [{ name: sheetName, styles, rows: xRows }];
}
