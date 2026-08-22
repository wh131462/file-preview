/**
 * Legacy Excel .xls (BIFF5 / BIFF8) parser.
 * Reads the OLE Workbook/Book stream and extracts sheet values for spreadsheet preview.
 */
import { isOleCompoundFile, readOleStreamAny } from './ole';
import type { XSheetData } from '../excelDataConverter';

const BOF = 0x0809;
const EOF = 0x000a;
const CONTINUE = 0x003c;
const SST = 0x00fc;
const LABELSST = 0x00fd;
const LABEL = 0x0204;
const RSTRING = 0x00d6;
const NUMBER = 0x0203;
const RK = 0x027e;
const MULRK = 0x00bd;
const BOOLERR = 0x0205;
const FORMULA = 0x0006;
const STRING = 0x0207;
const INTEGER = 0x0202;
const BOUNDSHEET = 0x0085;
const XF = 0x00e0;
const MERGECELLS = 0x00e5;
const COLINFO = 0x007d;
const ROW = 0x0208;

const DT_WORKSHEET = 0x0010;
const DATE_IFMTS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58,
]);

const EXCEL_ERRORS = ['#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A'];

export interface LegacyXlsCell {
  row: number;
  col: number;
  text: string;
}

export interface LegacyXlsMerge {
  rowFirst: number;
  rowLast: number;
  colFirst: number;
  colLast: number;
}

export interface LegacyXlsSheet {
  name: string;
  hidden: boolean;
  cells: LegacyXlsCell[];
  merges: LegacyXlsMerge[];
  colWidths: Map<number, number>;
  rowHeights: Map<number, number>;
}

export interface LegacyXlsWorkbook {
  sheets: LegacyXlsSheet[];
}

interface BiffRecord {
  type: number;
  data: Uint8Array;
}

interface BoundSheet {
  name: string;
  hidden: boolean;
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function isRawBiff(bytes: Uint8Array): boolean {
  if (bytes.length < 4) {
    return false;
  }
  const type = viewOf(bytes).getUint16(0, true);
  return type === 0x0009 || type === 0x0209 || type === 0x0409 || type === 0x0809;
}

export function isLegacyXls(data: ArrayBuffer | Uint8Array): boolean {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (isOleCompoundFile(bytes)) {
    return !!readOleStreamAny(bytes, ['Workbook', 'Book']);
  }
  return isRawBiff(bytes);
}

function readRecords(bytes: Uint8Array): BiffRecord[] {
  const view = viewOf(bytes);
  const records: BiffRecord[] = [];
  let offset = 0;
  while (offset + 4 <= bytes.length) {
    const type = view.getUint16(offset, true);
    const len = view.getUint16(offset + 2, true);
    offset += 4;
    const end = Math.min(offset + len, bytes.length);
    records.push({ type, data: bytes.subarray(offset, end) });
    offset = end;
  }
  return records;
}

class SstReader {
  private readonly parts: Uint8Array[];
  private pi = 0;
  private po = 0;

  constructor(parts: Uint8Array[]) {
    this.parts = parts.filter((p) => p.length > 0);
  }

  get done(): boolean {
    return this.pi >= this.parts.length;
  }

  private get cur(): Uint8Array {
    return this.parts[this.pi];
  }

  private advancePart(): boolean {
    this.pi += 1;
    this.po = 0;
    return this.pi < this.parts.length;
  }

  readU8(): number {
    while (!this.done && this.po >= this.cur.length) {
      if (!this.advancePart()) {
        throw new Error('SST underflow');
      }
    }
    if (this.done) {
      throw new Error('SST underflow');
    }
    return this.cur[this.po++];
  }

  readU16(): number {
    const lo = this.readU8();
    const hi = this.readU8();
    return lo | (hi << 8);
  }

  readU32(): number {
    return this.readU16() | (this.readU16() << 16);
  }

  skip(n: number): void {
    let left = n;
    while (left > 0 && !this.done) {
      if (this.po >= this.cur.length) {
        if (!this.advancePart()) {
          break;
        }
        continue;
      }
      const take = Math.min(left, this.cur.length - this.po);
      this.po += take;
      left -= take;
    }
  }

  readChars(count: number, compressed: boolean): string {
    let out = '';
    let left = count;
    while (left > 0 && !this.done) {
      if (this.po >= this.cur.length) {
        if (!this.advancePart()) {
          break;
        }
        compressed = (this.readU8() & 1) === 0;
        continue;
      }
      if (compressed) {
        const take = Math.min(left, this.cur.length - this.po);
        for (let i = 0; i < take; i++) {
          out += String.fromCharCode(this.cur[this.po++]);
        }
        left -= take;
      } else {
        const take = Math.min(left, Math.floor((this.cur.length - this.po) / 2));
        if (take <= 0) {
          if (!this.advancePart()) {
            break;
          }
          compressed = (this.readU8() & 1) === 0;
          continue;
        }
        const dv = new DataView(this.cur.buffer, this.cur.byteOffset + this.po, take * 2);
        for (let i = 0; i < take; i++) {
          out += String.fromCharCode(dv.getUint16(i * 2, true));
        }
        this.po += take * 2;
        left -= take;
      }
    }
    return out;
  }

  readXlString(): string {
    const cch = this.readU16();
    const flags = this.readU8();
    const compressed = (flags & 1) === 0;
    const rich = (flags & 0x04) !== 0;
    const asian = (flags & 0x08) !== 0;
    const cRun = rich ? this.readU16() : 0;
    const cbExt = asian ? this.readU32() : 0;
    const text = this.readChars(cch, compressed);
    if (cRun) {
      this.skip(cRun * 4);
    }
    if (cbExt) {
      this.skip(cbExt);
    }
    return text;
  }
}

function parseSst(first: Uint8Array, continues: Uint8Array[]): string[] {
  const reader = new SstReader([first, ...continues]);
  reader.readU32();
  const unique = reader.readU32();
  const strings: string[] = [];
  for (let i = 0; i < unique && !reader.done; i++) {
    try {
      strings.push(reader.readXlString());
    } catch {
      break;
    }
  }
  return strings;
}

function readUnicode(data: Uint8Array, offset: number, biff8: boolean): string {
  if (offset >= data.length) {
    return '';
  }
  if (!biff8) {
    const cch = data[offset];
    let out = '';
    for (let i = 0; i < cch && offset + 1 + i < data.length; i++) {
      out += String.fromCharCode(data[offset + 1 + i]);
    }
    return out;
  }
  const cch = data[offset];
  const flags = data[offset + 1] ?? 0;
  const compressed = (flags & 1) === 0;
  let pos = offset + 2;
  let out = '';
  if (compressed) {
    for (let i = 0; i < cch && pos < data.length; i++) {
      out += String.fromCharCode(data[pos++]);
    }
  } else {
    const view = viewOf(data);
    for (let i = 0; i < cch && pos + 1 < data.length; i++) {
      out += String.fromCharCode(view.getUint16(pos, true));
      pos += 2;
    }
  }
  return out;
}

function decodeRk(rk: number): number {
  let value: number;
  if (rk & 0x02) {
    value = rk >> 2;
  } else {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint32(4, rk & 0xfffffffc, true);
    value = view.getFloat64(0, true);
  }
  return rk & 0x01 ? value / 100 : value;
}

function excelSerialToDate(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 86400000));
}

function formatNumber(value: number, ifmt: number | undefined): string {
  if (ifmt !== undefined && DATE_IFMTS.has(ifmt) && Number.isFinite(value)) {
    const date = excelSerialToDate(value);
    if (!Number.isNaN(date.getTime())) {
      return Math.abs(value % 1) < 1e-9 ? date.toLocaleDateString() : date.toLocaleString();
    }
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(value);
}

function formatBoolErr(value: number, isError: number): string {
  if (isError) {
    return EXCEL_ERRORS[value] ?? `#ERR${value}`;
  }
  return value ? 'TRUE' : 'FALSE';
}

function readFormulaValue(data: Uint8Array, ifmt: number | undefined): string | { pendingString: true } | null {
  if (data.length < 14) {
    return null;
  }
  if (data[12] === 0xff && data[13] === 0xff) {
    const kind = data[6];
    if (kind === 0) {
      return { pendingString: true };
    }
    if (kind === 1) {
      return data[8] ? 'TRUE' : 'FALSE';
    }
    if (kind === 2) {
      return EXCEL_ERRORS[data[8]] ?? `#ERR${data[8]}`;
    }
    return '';
  }
  const num = viewOf(data).getFloat64(6, true);
  return formatNumber(num, ifmt);
}

function colLetter(col: number): string {
  let n = col + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function mergeRef(merge: LegacyXlsMerge): string {
  return `${colLetter(merge.colFirst)}${merge.rowFirst + 1}:${colLetter(merge.colLast)}${merge.rowLast + 1}`;
}

function parseBoundSheet(data: Uint8Array, biff8: boolean): BoundSheet {
  const hidden = data.length > 4 ? (data[4] & 0x03) !== 0 : false;
  return {
    name: readUnicode(data, 6, biff8) || 'Sheet',
    hidden,
  };
}

function parseSheetRecords(
  records: BiffRecord[],
  start: number,
  sst: string[],
  xfIfmt: number[],
  name: string,
  hidden: boolean
): { sheet: LegacyXlsSheet; next: number } {
  const sheet: LegacyXlsSheet = {
    name,
    hidden,
    cells: [],
    merges: [],
    colWidths: new Map(),
    rowHeights: new Map(),
  };
  let pendingFormula: { row: number; col: number } | null = null;
  let i = start;
  for (; i < records.length; i++) {
    const { type, data } = records[i];
    const view = viewOf(data);
    if (type === EOF) {
      return { sheet, next: i + 1 };
    }
    if (type === LABELSST && data.length >= 10) {
      const row = view.getUint16(0, true);
      const col = view.getUint16(2, true);
      const isst = view.getUint32(6, true);
      sheet.cells.push({ row, col, text: sst[isst] ?? '' });
      pendingFormula = null;
      continue;
    }
    if ((type === LABEL || type === RSTRING) && data.length >= 8) {
      const row = view.getUint16(0, true);
      const col = view.getUint16(2, true);
      const cch = view.getUint16(6, true);
      const flags = data[8];
      let text = '';
      if (flags === undefined) {
        for (let p = 8; p < data.length && text.length < cch; p++) {
          text += String.fromCharCode(data[p]);
        }
      } else if ((flags & 1) === 0) {
        for (let p = 9; p < data.length && text.length < cch; p++) {
          text += String.fromCharCode(data[p]);
        }
      } else {
        for (let p = 9; p + 1 < data.length && text.length < cch; p += 2) {
          text += String.fromCharCode(view.getUint16(p, true));
        }
      }
      sheet.cells.push({ row, col, text });
      pendingFormula = null;
      continue;
    }
    if (type === NUMBER && data.length >= 14) {
      const row = view.getUint16(0, true);
      const col = view.getUint16(2, true);
      const ixfe = view.getUint16(4, true);
      sheet.cells.push({ row, col, text: formatNumber(view.getFloat64(6, true), xfIfmt[ixfe]) });
      pendingFormula = null;
      continue;
    }
    if (type === INTEGER && data.length >= 8) {
      const row = view.getUint16(0, true);
      const col = view.getUint16(2, true);
      sheet.cells.push({ row, col, text: String(view.getUint16(6, true)) });
      pendingFormula = null;
      continue;
    }
    if (type === RK && data.length >= 10) {
      const row = view.getUint16(0, true);
      const col = view.getUint16(2, true);
      const ixfe = view.getUint16(4, true);
      sheet.cells.push({ row, col, text: formatNumber(decodeRk(view.getUint32(6, true)), xfIfmt[ixfe]) });
      pendingFormula = null;
      continue;
    }
    if (type === MULRK && data.length >= 6) {
      const row = view.getUint16(0, true);
      const colFirst = view.getUint16(2, true);
      const body = data.length - 6;
      const count = Math.floor(body / 6);
      for (let n = 0; n < count; n++) {
        const base = 4 + n * 6;
        const ixfe = view.getUint16(base, true);
        const rk = view.getUint32(base + 2, true);
        sheet.cells.push({
          row,
          col: colFirst + n,
          text: formatNumber(decodeRk(rk), xfIfmt[ixfe]),
        });
      }
      pendingFormula = null;
      continue;
    }
    if (type === BOOLERR && data.length >= 8) {
      const row = view.getUint16(0, true);
      const col = view.getUint16(2, true);
      sheet.cells.push({ row, col, text: formatBoolErr(data[6], data[7]) });
      pendingFormula = null;
      continue;
    }
    if (type === FORMULA && data.length >= 14) {
      const row = view.getUint16(0, true);
      const col = view.getUint16(2, true);
      const ixfe = view.getUint16(4, true);
      const value = readFormulaValue(data, xfIfmt[ixfe]);
      if (value && typeof value === 'object') {
        pendingFormula = { row, col };
      } else if (value !== null) {
        sheet.cells.push({ row, col, text: value });
        pendingFormula = null;
      }
      continue;
    }
    if (type === STRING && pendingFormula && data.length >= 3) {
      const cch = view.getUint16(0, true);
      const flags = data[2];
      let text = '';
      if ((flags & 1) === 0) {
        for (let p = 3; p < data.length && text.length < cch; p++) {
          text += String.fromCharCode(data[p]);
        }
      } else {
        for (let p = 3; p + 1 < data.length && text.length < cch; p += 2) {
          text += String.fromCharCode(view.getUint16(p, true));
        }
      }
      sheet.cells.push({ row: pendingFormula.row, col: pendingFormula.col, text });
      pendingFormula = null;
      continue;
    }
    if (type === MERGECELLS && data.length >= 2) {
      const count = view.getUint16(0, true);
      for (let n = 0; n < count; n++) {
        const base = 2 + n * 8;
        if (base + 8 > data.length) {
          break;
        }
        sheet.merges.push({
          rowFirst: view.getUint16(base, true),
          rowLast: view.getUint16(base + 2, true),
          colFirst: view.getUint16(base + 4, true),
          colLast: view.getUint16(base + 6, true),
        });
      }
      continue;
    }
    if (type === COLINFO && data.length >= 6) {
      const colFirst = view.getUint16(0, true);
      const colLast = view.getUint16(2, true);
      const coldx = view.getUint16(4, true);
      const px = Math.max(20, Math.round((coldx / 256) * 7.5));
      for (let col = colFirst; col <= colLast; col++) {
        sheet.colWidths.set(col, px);
      }
      continue;
    }
    if (type === ROW && data.length >= 8) {
      const row = view.getUint16(0, true);
      const twips = view.getUint16(6, true);
      if (twips > 0) {
        sheet.rowHeights.set(row, Math.max(16, Math.round(twips / 15)));
      }
    }
  }
  return { sheet, next: i };
}

function parseBiffWorkbook(bytes: Uint8Array): LegacyXlsWorkbook {
  const records = readRecords(bytes);
  let biff8 = true;
  const sst: string[] = [];
  const bounds: BoundSheet[] = [];
  const xfIfmt: number[] = [];

  let i = 0;
  if (records[0]?.type === BOF) {
    const bof = records[0].data;
    if (bof.length >= 2) {
      biff8 = viewOf(bof).getUint16(0, true) >= 0x0600;
    }
    i = 1;
  }

  while (i < records.length) {
    const rec = records[i];
    if (rec.type === BOF) {
      break;
    }
    if (rec.type === SST) {
      const continues: Uint8Array[] = [];
      let j = i + 1;
      while (j < records.length && records[j].type === CONTINUE) {
        continues.push(records[j].data);
        j += 1;
      }
      sst.push(...parseSst(rec.data, continues));
      i = j;
      continue;
    }
    if (rec.type === BOUNDSHEET) {
      bounds.push(parseBoundSheet(rec.data, biff8));
    } else if (rec.type === XF && rec.data.length >= 4) {
      xfIfmt.push(viewOf(rec.data).getUint16(2, true));
    }
    i += 1;
  }

  const sheets: LegacyXlsSheet[] = [];
  let sheetIndex = 0;
  while (i < records.length) {
    const rec = records[i];
    if (rec.type !== BOF) {
      i += 1;
      continue;
    }
    const dt = rec.data.length >= 4 ? viewOf(rec.data).getUint16(2, true) : DT_WORKSHEET;
    const meta = bounds[sheetIndex];
    sheetIndex += 1;
    if (dt !== DT_WORKSHEET) {
      while (i < records.length && records[i].type !== EOF) {
        i += 1;
      }
      i += 1;
      continue;
    }
    const parsed = parseSheetRecords(
      records,
      i + 1,
      sst,
      xfIfmt,
      meta?.name || `Sheet${sheets.length + 1}`,
      meta?.hidden ?? false
    );
    sheets.push(parsed.sheet);
    i = parsed.next;
  }

  if (!sheets.length) {
    sheets.push({
      name: 'Sheet1',
      hidden: false,
      cells: [],
      merges: [],
      colWidths: new Map(),
      rowHeights: new Map(),
    });
  }

  return { sheets };
}

export function parseLegacyXls(data: ArrayBuffer | Uint8Array): LegacyXlsWorkbook {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const stream = isOleCompoundFile(bytes)
    ? readOleStreamAny(bytes, ['Workbook', 'Book'])
    : isRawBiff(bytes)
      ? bytes
      : null;
  if (!stream?.length) {
    throw new Error('Not a legacy Excel workbook');
  }
  return parseBiffWorkbook(stream);
}

export function convertLegacyXlsToSpreadsheetData(workbook: LegacyXlsWorkbook): XSheetData[] {
  return workbook.sheets.map((sheet) => {
    const rows: XSheetData['rows'] = {};
    const cols: Record<string, { width?: number } | number> = {};
    const merges: string[] = [];
    const mergeMap = new Map<string, [number, number]>();
    let maxCol = 0;

    for (const merge of sheet.merges) {
      merges.push(mergeRef(merge));
      mergeMap.set(`${merge.rowFirst},${merge.colFirst}`, [
        merge.rowLast - merge.rowFirst,
        merge.colLast - merge.colFirst,
      ]);
    }

    for (const [col, width] of sheet.colWidths) {
      cols[String(col)] = { width };
      if (col > maxCol) {
        maxCol = col;
      }
    }

    for (const cell of sheet.cells) {
      if (cell.row < 0 || cell.col < 0) {
        continue;
      }
      const key = String(cell.row);
      const row = rows[key] ?? { cells: {} };
      const merge = mergeMap.get(`${cell.row},${cell.col}`);
      row.cells[String(cell.col)] = merge
        ? { text: cell.text, merge }
        : { text: cell.text };
      const height = sheet.rowHeights.get(cell.row);
      if (height) {
        row.height = height;
      }
      rows[key] = row;
      if (cell.col > maxCol) {
        maxCol = cell.col;
      }
    }

    for (const [row, height] of sheet.rowHeights) {
      const key = String(row);
      if (!rows[key]) {
        rows[key] = { cells: {}, height };
      } else if (!rows[key].height) {
        rows[key].height = height;
      }
    }

    cols.len = Math.max(maxCol + 1, 26) as unknown as number;

    return {
      name: sheet.name,
      merges,
      rows,
      cols,
    };
  });
}
