/**
 * Legacy PowerPoint .ppt (97–2003) parser — structured slide HTML preview.
 * Properly detects slide boundaries AND extracts embedded images.
 */
import { readOleStream, u8ToDataView } from './ole';

const RT_SLIDE_LIST_WITH_TEXT = 0x0ff0;
const RT_TEXT_CHARS_ATOM = 0x0fa0;
const RT_STYLE_TEXT_PROP = 0x0fa1;
const RT_TEXT_BYTES_ATOM = 0x0fa8;
const RT_TEXT_HEADER_ATOM = 0x0f9f;
const RT_SLIDE_PERSIST_ATOM = 0x03f3;
const RT_COLOR_SCHEME_ATOM = 0x07f0;
const RT_FONT_ENTITY_ATOM = 0x0fb7;
const RT_TX_MASTER_STYLE = 0x0fa3;
const RT_OFFICE_ART_FOPT = 0xf00b;
const OFFICE_ART_FILL_COLOR = 0x0181;

// Office Art record types for images
const RT_DOCUMENT_ATOM = 0x03e9;
const RT_SLIDE = 0x03ee;
const RT_MAIN_MASTER = 0x03f8;
/** OfficeArtFSP — shape type lives in the record instance field. */
const RT_OFFICE_ART_FSP = 0xf00a;
const OFFICE_ART_FILL_TYPE = 0x0180;
const OFFICE_ART_FILL_BACK_COLOR = 0x0183;
const OFFICE_ART_FILL_ANGLE = 0x018b;
const OFFICE_ART_FILL_FOCUS = 0x018c;
const FILL_SOLID = 0;
const FILL_SHADE = 4;
const RT_OFFICE_ART_SPGR = 0xf003;
const RT_OFFICE_ART_SP = 0xf004;
const RT_OFFICE_ART_CHILD_ANCHOR = 0xf00f;
const RT_OFFICE_ART_CLIENT_ANCHOR = 0xf010;
const MSO_PICTURE_FRAME = 75;
const MSO_RECTANGLE = 1;

const BLIP_JPEG = 0xf01d;
const BLIP_JPEG_ALT = 0xf02a;
const BLIP_PNG = 0xf01e;
const BLIP_DIB = 0xf01f;
const BLIP_TIFF = 0xf029;


const TX_TITLE = 0;
const TX_BODY = 1;
const TX_NOTES = 2;
const TX_OTHER = 4;
const TX_CENTER_BODY = 5;
const TX_CENTER_TITLE = 6;
const TX_HALF_BODY = 7;
const TX_QUARTER_BODY = 8;

export type PptTextRole = 'title' | 'subtitle' | 'body' | 'meta' | 'kicker';
export type PptSlideLayout = 'hero' | 'section' | 'content' | 'image' | 'table';
export type PptShapeKind = 'title' | 'subtitle' | 'body' | 'meta' | 'image' | 'table';

export interface LegacyPptImage {
  data: string;
  width?: number;
  height?: number;
  alt?: string;
  mimeType?: string;
}

export interface LegacyPptTextBlock {
  role: PptTextRole;
  text: string;
  textType?: number;
}

export interface LegacyPptTable {
  cols: number;
  rows: number;
  cells: string[][];
}

export interface LegacyPptSlide {
  index: number;
  layout: PptSlideLayout;
  blocks: LegacyPptTextBlock[];
  images?: LegacyPptImage[];
  table?: LegacyPptTable;
  shapes?: LegacyPptShape[];
  theme?: LegacyPptTheme;
}

export interface LegacyPptTheme {
  brand: string;
  onBrand: string;
  surface: string;
  title: string;
  body: string;
  accent: string;
  background?: string;
  font?: string;
  titleFont?: string;
  bodyFont?: string;
  titleSize?: number;
  bodySize?: number;
}

export interface LegacyPptSize {
  width: number;
  height: number;
}

export interface LegacyPptBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LegacyPptParagraph {
  text: string;
  indent: number;
}

export interface LegacyPptShape {
  kind: PptShapeKind;
  box: LegacyPptBox;
  center?: boolean;
  narrow?: boolean;
  wash?: boolean;
  shadow?: boolean;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  text?: string;
  paragraphs?: LegacyPptParagraph[];
  image?: LegacyPptImage;
  table?: LegacyPptTable;
}

export interface LegacyPptPreview {
  slides: LegacyPptSlide[];
  theme: LegacyPptTheme;
  size: LegacyPptSize;
}

interface RecordHeader {
  ver: number;
  instance: number;
  type: number;
  len: number;
  headerSize: number;
}

function readRecordHeader(view: DataView, offset: number): RecordHeader | null {
  if (offset + 8 > view.byteLength) return null;
  const recVerInstance = view.getUint16(offset, true);
  const type = view.getUint16(offset + 2, true);
  const len = view.getUint32(offset + 4, true);
  const maxLen = Math.max(0, view.byteLength - offset - 8);
  return {
    ver: recVerInstance & 0x0f,
    instance: recVerInstance >> 4,
    type,
    len: Math.min(len >>> 0, maxLen),
    headerSize: 8,
  };
}

function decodeTextChars(bytes: Uint8Array): string {
  const view = u8ToDataView(bytes);
  let out = '';
  let i = 0;
  if (bytes.length >= 2 && view.getUint16(0, true) === 0xFEFF) i = 2;
  for (; i + 1 < bytes.length; i += 2) {
    const c = view.getUint16(i, true);
    if (c === 0x000d || c === 0x000b || c === 0x000c) out += '\n';
    else if (c === 0x0007 || c === 0x0009) out += '\t';
    else if (c >= 0x20 && c < 0xD800) out += String.fromCharCode(c);
    else if (c >= 0xE000 && c <= 0xFFFD) out += String.fromCharCode(c);
  }
  return cleanText(out);
}

function decodeTextBytes(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === 0x0d || c === 0x0b || c === 0x0c) out += '\n';
    else if (c === 0x07 || c === 0x09) out += '\t';
    else if (c >= 0x20) out += String.fromCharCode(c);
  }
  return cleanText(out);
}

function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeTextCharsRaw(bytes: Uint8Array): string {
  const view = u8ToDataView(bytes);
  let out = '';
  let i = 0;
  if (bytes.length >= 2 && view.getUint16(0, true) === 0xFEFF) i = 2;
  for (; i + 1 < bytes.length; i += 2) {
    const c = view.getUint16(i, true);
    if (c === 0x000d) out += '\n';
    else if (c === 0x000b || c === 0x000c) out += '\n';
    else if (c === 0x0007 || c === 0x0009) out += '\t';
    else if (c >= 0x20 && c < 0xD800) out += String.fromCharCode(c);
    else if (c >= 0xE000 && c <= 0xFFFD) out += String.fromCharCode(c);
  }
  return out.replace(/\u0000/g, '');
}

function decodeTextBytesRaw(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c === 0x0d || c === 0x0b || c === 0x0c) out += '\n';
    else if (c === 0x07 || c === 0x09) out += '\t';
    else if (c >= 0x20) out += String.fromCharCode(c);
  }
  return out.replace(/\u0000/g, '');
}

function pfExtraSize(masks: number): number {
  let n = 0;
  if (masks & 0x0000000f) n += 2;
  if (masks & 0x00000010) n += 2;
  if (masks & 0x00000020) n += 4;
  if (masks & 0x00000040) n += 2;
  if (masks & 0x00000080) n += 2;
  if (masks & 0x00000100) n += 2;
  if (masks & 0x00000200) n += 2;
  if (masks & 0x00000400) n += 2;
  if (masks & 0x00000800) n += 2;
  if (masks & 0x00001000) n += 2;
  if (masks & 0x00002000) n += 2;
  if (masks & 0x00004000) n += 2;
  if (masks & 0x00010000) n += 2;
  if (masks & 0x000e0000) n += 2;
  if (masks & 0x00100000) n += 2;
  return n;
}

function parsePfRuns(style: Uint8Array, textLen: number): { runs: { count: number; indent: number }[]; end: number } {
  const view = u8ToDataView(style);
  const runs: { count: number; indent: number }[] = [];
  let offset = 0;
  let covered = 0;
  while (offset + 10 <= style.length && covered < textLen) {
    const count = view.getUint32(offset, true);
    const indent = view.getUint16(offset + 4, true);
    const masks = view.getUint32(offset + 6, true);
    if (count === 0 || count > 0x10000 || indent > 8) break;
    offset += 10;
    if (masks & 0x00008000) {
      if (offset + 2 > style.length) break;
      const tabs = view.getUint16(offset, true);
      offset += 2 + tabs * 4;
    }
    const extra = pfExtraSize(masks);
    if (offset + extra > style.length) break;
    offset += extra;
    runs.push({ count, indent });
    covered += count;
  }
  return { runs, end: offset };
}

function cfExtraSize(masks: number): number {
  let n = 0;
  if (masks & 0x000002e7) n += 2;
  if (masks & 0x00003c00) n += 2;
  if (masks & 0x00010000) n += 2;
  if (masks & 0x00020000) n += 2;
  if (masks & 0x00040000) n += 4;
  if (masks & 0x00080000) n += 2;
  if (masks & 0x00200000) n += 4;
  if (masks & 0x00400000) n += 2;
  if (masks & 0x00800000) n += 2;
  if (masks & 0x01000000) n += 2;
  return n;
}

function findRgbColor(style: Uint8Array): Rgb | undefined {
  for (let i = 0; i + 4 <= style.length; i += 2) {
    if (style[i + 3] === 0xfe) return { r: style[i], g: style[i + 1], b: style[i + 2] };
  }
  return undefined;
}

function readCfColor(style: Uint8Array, start: number, end: number, scheme?: Rgb[]): Rgb | undefined {
  let schemeColor: Rgb | undefined;
  for (let i = start; i + 4 <= end; i += 2) {
    const idx = style[i + 3];
    if (idx === 0xfe) return { r: style[i], g: style[i + 1], b: style[i + 2] };
    if (idx <= 7 && scheme?.[idx] && !schemeColor) schemeColor = scheme[idx];
  }
  return schemeColor;
}

function parseCfStyle(
  style: Uint8Array,
  textLen: number,
  pfEnd: number,
  scheme?: Rgb[],
  fontCount = 0,
): { color?: Rgb; shadow: boolean; size?: number; font?: number } {
  const view = u8ToDataView(style);
  let offset = pfEnd;
  let covered = 0;
  let color: Rgb | undefined;
  let shadow = false;
  let size: number | undefined;
  let font: number | undefined;
  while (offset + 8 <= style.length && covered < textLen) {
    const count = view.getUint32(offset, true);
    const masks = view.getUint32(offset + 4, true);
    if (count === 0 || count > 0x10000) break;
    offset += 8;
    const extra = cfExtraSize(masks);
    if (offset + extra > style.length) break;
    if (masks & 0x00000010) shadow = true;
    let fieldAt = offset;
    if (masks & 0x000002e7) fieldAt += 2;
    if (masks & 0x00003c00) fieldAt += 2;
    if (masks & 0x00010000) {
      const idx = view.getUint16(fieldAt, true);
      if (idx < fontCount && font == null) font = idx;
      fieldAt += 2;
    }
    if (masks & 0x00400000) fieldAt += 2;
    if (masks & 0x00020000) {
      const raw = view.getUint16(fieldAt, true);
      if (raw >= 12 && raw <= 200 && !size) size = raw > 96 ? raw / 2 : raw;
      fieldAt += 2;
    }
    if (masks & 0x00040000) {
      const next = readCfColor(style, fieldAt, Math.min(style.length, offset + extra + 8), scheme);
      if (next && !color) color = next;
    }
    offset += extra;
    covered += count;
  }
  if (!shadow) {
    for (let i = 0; i + 8 <= style.length; i += 2) {
      const masks = view.getUint32(i + 4, true);
      const count = view.getUint32(i, true);
      if (count > 0 && count <= 0x10000 && (masks & 0x00000010) && (masks & 0x00040000)) {
        shadow = true;
        break;
      }
    }
  }
  const scanned = scanCfFields(style, fontCount);
  return {
    color: findRgbColor(style) ?? color,
    shadow,
    size: size ?? scanned.size,
    font: font ?? scanned.font ?? findFontNearColor(style, fontCount),
  };
}

function styleParagraphs(rawText: string, style: Uint8Array | null): LegacyPptParagraph[] {
  const parts = rawText.split('\n');
  if (parts.length && parts[parts.length - 1] === '') parts.pop();
  if (!parts.length) return [];
  const runs = style?.length ? parsePfRuns(style, rawText.length).runs : [];
  let pos = 0;
  let runIdx = 0;
  let runEnd = runs[0]?.count ?? Number.POSITIVE_INFINITY;
  return parts.map(part => {
    while (runIdx + 1 < runs.length && pos >= runEnd) {
      runIdx += 1;
      runEnd += runs[runIdx].count;
    }
    const indent = runs[runIdx]?.indent ?? 0;
    pos += part.length + 1;
    return { text: part.replace(/[ \t]+$/g, '').replace(/^[ \t]+/, ''), indent };
  });
}

function isByline(text: string): boolean {
  const t = text.trim();
  return /^(by|from|with|featuring|presented by)\s+/i.test(t) ||
    /^[\w\s]+,\s*(phd|md|esq|jr|sr|ii|iii|iv)$/i.test(t);
}

function isPlaceholder(text: string): boolean {
  const t = text.trim();
  return /^(click to (edit|add)|double[- ]click|placeholder|^title$|^subtitle$|^text$|^slide title$|^body text$)/i.test(t) ||
    /^\[.*\]$/.test(t) ||
    t.length === 0;
}

function isNoise(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^[\s*•·▪◦\-–—]+$/u.test(t)) return true;
  if (t.length <= 2 && !/[a-zA-Z0-9\u00C0-\u024F]/u.test(t)) return true;
  return false;
}

function detectSpecialRole(text: string): PptTextRole | null {
  const t = text.trim();
  // Section labels inside a content slide — not whole-slide titles
  if (/^(ingredients|preparation|directions|instructions|method|steps)\s*$/i.test(t)) {
    return 'kicker';
  }
  if (
    /^\d+\s*(minutes|mins|hr|hours)\b/i.test(t) ||
    /^serves\b/i.test(t) ||
    /^\d+\s*(minutes|mins)\s*[•·]\s*serves\b/i.test(t)
  ) {
    return 'meta';
  }
  if (
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(t) ||
    /^www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(t) ||
    /^https?:\/\//i.test(t)
  ) {
    return 'meta';
  }
  return null;
}

// Color handling
interface Rgb { r: number; g: number; b: number; }
interface ParsedScheme { colors: Rgb[]; score: number; }

function rgbToCss(c: Rgb): string {
  return `#${[c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function cssFontFamily(name?: string): string | undefined {
  if (!name) return undefined;
  const safe = name.replace(/["';]/g, '').trim();
  if (!safe) return undefined;
  const generic = /times|roman|georgia|garamond|antiqua|mincho|serif/i.test(safe)
    ? 'serif'
    : /wingdings|symbol/i.test(safe)
      ? 'fantasy'
      : 'sans-serif';
  return `'${safe}',${generic}`;
}

function isCjkFace(name?: string): boolean {
  return !!name && /gothic|mincho|droid|simsun|nsimsun|mingliu|pming|gulim|batang|malgun|meiryo|hiragino|微软|宋体|黑体|ゴシック/i.test(name);
}

function scanCfFields(
  style: Uint8Array,
  fontCount: number,
): { font?: number; size?: number } {
  const view = u8ToDataView(style);
  let font: number | undefined;
  let size: number | undefined;
  for (let i = 0; i + 8 <= style.length; i += 2) {
    const count = view.getUint32(i, true);
    const masks = view.getUint32(i + 4, true);
    if (count === 0 || count > 0x2000) continue;
    if (!(masks & 0x00030000) && !(masks & 0x000002e7)) continue;
    const extra = cfExtraSize(masks);
    if (!extra || i + 8 + extra > style.length) continue;
    let fieldAt = i + 8;
    if (masks & 0x000002e7) fieldAt += 2;
    if (masks & 0x00003c00) fieldAt += 2;
    if (masks & 0x00010000 && fieldAt + 2 <= style.length) {
      const idx = view.getUint16(fieldAt, true);
      if (idx < fontCount && font == null) font = idx;
      fieldAt += 2;
    }
    if (masks & 0x00400000) fieldAt += 2;
    if (masks & 0x00020000 && fieldAt + 2 <= style.length) {
      const raw = view.getUint16(fieldAt, true);
      if (raw >= 12 && raw <= 96 && !size) size = raw;
    }
  }
  return { font, size };
}

function findFontNearColor(style: Uint8Array, fontCount: number): number | undefined {
  for (let i = 4; i + 4 <= style.length; i += 2) {
    if (style[i + 3] !== 0xfe) continue;
    const idx = style[i - 2] | (style[i - 1] << 8);
    if (idx < fontCount) return idx;
  }
  return undefined;
}

function resolveFontIndex(
  cfFont: number | undefined,
  masterFont: number | undefined,
  fonts: string[],
  preferTitle: boolean,
): number {
  const usable = (idx?: number) => {
    if (idx == null || !fonts[idx]) return undefined;
    if (isCjkFace(fonts[idx]) && fonts.some(name => name && !isCjkFace(name))) return undefined;
    return idx;
  };
  return usable(cfFont) ?? usable(masterFont) ?? defaultFontIndex(fonts, preferTitle);
}

function defaultFontIndex(fonts: string[], preferTitle: boolean): number {
  const order = preferTitle ? [1, 0, 2, 5] : [0, 1, 2, 5];
  for (const i of order) {
    if (fonts[i] && !isCjkFace(fonts[i])) return i;
  }
  const found = fonts.findIndex(name => name && !isCjkFace(name));
  return found >= 0 ? found : 0;
}

function ptToCqi(pt: number, slideWidth: number): number {
  const width = slideWidth > 20 ? slideWidth : 5760;
  return (pt * 800) / width;
}

function chroma(c: Rgb): number {
  return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
}

function luminance(c: Rgb): number {
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

function isNearWhite(c: Rgb): boolean {
  return luminance(c) > 0.88 && chroma(c) < 40;
}

function isNearBlack(c: Rgb): boolean {
  return luminance(c) < 0.14;
}

function contrastOn(bg: Rgb): Rgb {
  return luminance(bg) > 0.55 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
}

function isLikelyHyperlinkBlue(c: Rgb): boolean {
  return c.b >= 140 && c.b > c.r + 30 && c.b > c.g + 20 && c.r < 150;
}

function brandScore(colors: Rgb[]): number {
  let score = 0;
  // Score chromatic scheme slots (MS-PPT order). No hue bias — brand comes from the file.
  for (const [i, weight] of [
    [1, 2.2],
    [6, 2.0],
    [7, 1.8],
    [0, 1.6],
    [4, 1.4],
    [5, 1.2],
    [3, 0.8],
  ] as const) {
    const c = colors[i];
    if (!c || isNearWhite(c) || isNearBlack(c)) continue;
    let s = chroma(c) * weight;
    if (isLikelyHyperlinkBlue(c)) s *= 0.05;
    score += s;
  }
  return score;
}

function parseSchemeColors(payload: Uint8Array): Rgb[] | null {
  if (payload.length < 32) return null;
  const colors: Rgb[] = [];
  for (let i = 0; i < 8; i++) {
    const o = i * 4;
    colors.push({ r: payload[o], g: payload[o + 1], b: payload[o + 2] });
  }
  return colors;
}

function parseSchemeAtom(payload: Uint8Array): ParsedScheme | null {
  const colors = parseSchemeColors(payload);
  if (!colors) return null;
  const score = brandScore(colors);
  if (score === 0) return null;
  return { colors, score };
}

function colorRefToRgb(value: number): Rgb {
  return { r: value & 0xff, g: (value >> 8) & 0xff, b: (value >> 16) & 0xff };
}

function collectArtFillColors(payload: Uint8Array): Rgb[] {
  const out: Rgb[] = [];
  const count = Math.floor(payload.length / 6);
  const view = u8ToDataView(payload);
  for (let i = 0; i < count; i++) {
    const opid = view.getUint16(i * 6, true);
    const propId = opid & 0x3fff;
    const isBlip = (opid & 0x8000) !== 0;
    const isComplex = (opid & 0x4000) !== 0;
    if (isBlip || isComplex) continue;
    if (propId === OFFICE_ART_FILL_COLOR) {
      const value = view.getUint32(i * 6 + 2, true);
      const c = colorRefToRgb(value);
      if (!isNearWhite(c) && !isNearBlack(c) && chroma(c) >= 25 && !isLikelyHyperlinkBlue(c)) {
        out.push(c);
      }
    }
  }
  return out;
}

/** White canvas only when the file has no explicit slide/master fill. */
const FALLBACK_SURFACE: Rgb = { r: 255, g: 255, b: 255 };

function themeFromColors(colors: Rgb[], fill?: SlideFill | null): LegacyPptTheme {
  const surface = fill?.surface ?? FALLBACK_SURFACE;
  const title = colors[3] ?? colors[1] ?? { r: 0, g: 0, b: 0 };
  const body = colors[1] ?? { r: 0, g: 0, b: 0 };
  const brand = colors[4] ?? title;
  const accent = colors[5] ?? brand;
  return {
    brand: rgbToCss(brand),
    onBrand: rgbToCss(colors[1] ?? contrastOn(brand)),
    surface: rgbToCss(surface),
    title: rgbToCss(title),
    body: rgbToCss(body),
    accent: rgbToCss(accent),
    background: fill?.css ?? rgbToCss(surface),
  };
}

function buildTheme(schemes: ParsedScheme[], artFills: Rgb[] = []): LegacyPptTheme {
  const colors = schemes[0]?.colors;
  if (!colors) {
    const fill = artFills[0]
      ? { css: rgbToCss(artFills[0]), surface: artFills[0] }
      : null;
    return themeFromColors([], fill);
  }
  return themeFromColors(colors);
}

function classifyLayout(
  blocks: LegacyPptTextBlock[],
  hasImages = false,
  hasTable = false,
): PptSlideLayout {
  if (hasTable) return 'table';

  const title = blocks.find(b => b.role === 'title');
  const subtitle = blocks.find(b => b.role === 'subtitle');
  const body = blocks.filter(b => b.role === 'body' || b.role === 'kicker' || b.role === 'meta');
  const titleText = (title?.text ?? '').trim();
  const bodyLen = body.reduce((n, b) => n + b.text.length, 0);
  const words = titleText.split(/\s+/).filter(Boolean);
  const lines = titleText.split(/\n/).map(l => l.trim()).filter(Boolean);

  if (hasImages && bodyLen === 0 && !subtitle) return 'image';

  // Title + byline / stacked title → hero
  if (title && subtitle && bodyLen < 100) return 'hero';
  if (title && bodyLen < 40 && lines.length >= 2) return 'hero';
  if (title && bodyLen === 0 && !subtitle && words.length >= 2 && words.length <= 4 && titleText.length <= 36) {
    return 'hero';
  }

  // Single short title, no body → section divider ("Recipes")
  if (title && bodyLen === 0 && !subtitle && words.length <= 3 && titleText.length <= 28) {
    return 'section';
  }

  return 'content';
}

function normalizeSlideBlocks(blocks: LegacyPptTextBlock[]): LegacyPptTextBlock[] {
  const cleaned = blocks
    .filter(b => !isNoise(b.text) && !isPlaceholder(b.text))
    .map(b => ({ ...b }));

  if (!cleaned.length) return cleaned;

  // 1) Seed roles from MS-PPT text types
  for (const b of cleaned) {
    if (isByline(b.text)) {
      b.role = 'subtitle';
    } else if (b.textType === TX_TITLE || b.textType === TX_CENTER_TITLE) {
      b.role = 'title';
    } else if (b.textType === TX_CENTER_BODY) {
      b.role = 'subtitle';
    } else {
      b.role = 'body';
    }
  }

  // If we somehow got a byline as the only title and a short center-body/title-like block, prefer that
  {
    const titles = cleaned.filter(b => b.role === 'title');
    const bylineTitle = titles.find(b => isByline(b.text));
    const realTitle = cleaned.find(
      b =>
        b.role !== 'subtitle' &&
        !isByline(b.text) &&
        b.text.length <= 40 &&
        !b.text.includes('\n') &&
        (b.textType === TX_CENTER_BODY || b.textType === TX_TITLE || b.textType === TX_BODY)
    );
    if (bylineTitle && realTitle && bylineTitle !== realTitle) {
      bylineTitle.role = 'subtitle';
      realTitle.role = 'title';
    }
  }

  // 3) Mid-slide section labels (Ingredients / Preparation) → kicker;
  //    never steal the only/first title-typed block.
  const titleTyped = cleaned.filter(
    b => b.textType === TX_TITLE || b.textType === TX_CENTER_TITLE || b.role === 'title'
  );
  for (const b of cleaned) {
    const special = detectSpecialRole(b.text);
    if (!special) continue;
    if (special === 'kicker' && titleTyped.length === 1 && titleTyped[0] === b) {
      // Keep as title — e.g. lone "Recipes" / "Contact" slide
      b.role = 'title';
      continue;
    }
    if (special === 'kicker' && (b.textType === TX_TITLE || b.textType === TX_CENTER_TITLE) && cleaned.indexOf(b) === 0) {
      b.role = 'title';
      continue;
    }
    b.role = special;
  }

  // 4) Ensure one non-byline title
  let title = cleaned.find(b => b.role === 'title' && !isByline(b.text));
  if (!title) {
    // Prefer short first line of a multi-line body block
    const firstBody = cleaned.find(b => b.role === 'body');
    if (firstBody && firstBody.text.includes('\n')) {
      const [head, ...rest] = firstBody.text.split(/\n/).map(l => l.trim()).filter(Boolean);
      if (head && head.length <= 48 && rest.length) {
        firstBody.role = 'title';
        firstBody.text = head;
        title = firstBody;
        const restText = rest.join('\n');
        const metaLine = detectSpecialRole(rest[0] || '');
        if (metaLine === 'meta' && rest.length >= 1) {
          cleaned.splice(cleaned.indexOf(firstBody) + 1, 0, {
            role: 'meta',
            text: rest[0],
          });
          const after = rest.slice(1).join('\n');
          if (after) {
            cleaned.splice(cleaned.indexOf(firstBody) + 2, 0, { role: 'body', text: after });
          }
        } else if (restText) {
          cleaned.splice(cleaned.indexOf(firstBody) + 1, 0, { role: 'body', text: restText });
        }
      }
    }
    if (!title) {
      const candidate =
        cleaned.find(b => b.role === 'body' && b.text.length <= 60 && !b.text.includes('\n')) ??
        cleaned.find(b => !isByline(b.text) && b.role !== 'meta');
      if (candidate) {
        candidate.role = 'title';
        title = candidate;
      }
    }
  }

  // 5) Demote extra titles
  let seenTitle = false;
  for (const b of cleaned) {
    if (b.role === 'title') {
      if (seenTitle) b.role = 'body';
      else seenTitle = true;
    }
  }

  // 6) Promote short follow-up / byline to subtitle
  title = cleaned.find(b => b.role === 'title');
  const afterTitle = cleaned.filter(b => b !== title && b.role !== 'kicker' && b.role !== 'meta');
  if (title && afterTitle.length >= 1) {
    const first = afterTitle[0];
    if (first.role === 'subtitle' || isByline(first.text)) {
      first.role = 'subtitle';
    } else if (
      first.role === 'body' &&
      first.text.length <= 60 &&
      !first.text.includes('\n') &&
      afterTitle.length === 1
    ) {
      first.role = 'subtitle';
    }
  }

  // 7) Only one subtitle
  let seenSub = false;
  for (const b of cleaned) {
    if (b.role === 'subtitle') {
      if (seenSub) b.role = 'body';
      else seenSub = true;
    }
  }

  // 8) Swap if title is byline
  const t = cleaned.find(b => b.role === 'title');
  const s = cleaned.find(b => b.role === 'subtitle');
  if (t && s && isByline(t.text) && !isByline(s.text)) {
    t.role = 'subtitle';
    s.role = 'title';
  }

  return cleaned.filter(b => !isNoise(b.text));
}

function finalizeSlide(
  blocks: LegacyPptTextBlock[],
  index: number,
  images: LegacyPptImage[] = [],
  table?: LegacyPptTable,
  shapes?: LegacyPptShape[],
  theme?: LegacyPptTheme,
): LegacyPptSlide | null {
  const normalized = normalizeSlideBlocks(blocks);
  if (!normalized.length && !images.length && !table && !shapes?.length) return null;
  return {
    index,
    layout: classifyLayout(normalized, images.length > 0, !!table),
    blocks: normalized,
    images: images.length > 0 ? images : undefined,
    table,
    shapes: shapes?.length ? shapes : undefined,
    theme,
  };
}

// ============================================================
// IMAGE EXTRACTION — Pictures OLE stream + slide PictureFrames
// ============================================================

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function mimeForBlipType(type: number): string | null {
  switch (type) {
    case BLIP_JPEG:
    case BLIP_JPEG_ALT:
      return 'image/jpeg';
    case BLIP_PNG:
      return 'image/png';
    case BLIP_DIB:
      return 'image/bmp';
    case BLIP_TIFF:
      return 'image/tiff';
    default:
      return null;
  }
}

/** UID count for OfficeArtBlipJPEG/PNG — MS-ODRAW instance 0x46A/0x6E0 → 1, 0x46B/0x6E1 → 2. */
function blipUidCount(instance: number, type: number): number {
  if (type === BLIP_JPEG || type === BLIP_JPEG_ALT) {
    return instance === 0x46b || instance === 0x6e1 ? 2 : 1;
  }
  if (type === BLIP_PNG) {
    return instance === 0x6e1 ? 2 : 1;
  }
  return 1;
}

function findBitmapPayload(raw: Uint8Array, uidCount: number): Uint8Array | null {
  // Bitmap blip: rgbUid×N + tag(1) + file bytes
  const prefix = 16 * uidCount + 1;
  if (prefix < raw.length) {
    const slice = raw.subarray(prefix);
    if (
      (slice[0] === 0xff && slice[1] === 0xd8) ||
      (slice[0] === 0x89 && slice[1] === 0x50) ||
      (slice[0] === 0x42 && slice[1] === 0x4d)
    ) {
      return slice;
    }
  }
  // Fallback: scan for signatures
  for (let off = 0; off < Math.min(64, raw.length - 3); off++) {
    if (raw[off] === 0xff && raw[off + 1] === 0xd8 && raw[off + 2] === 0xff) {
      return raw.subarray(off);
    }
    if (
      raw[off] === 0x89 &&
      raw[off + 1] === 0x50 &&
      raw[off + 2] === 0x4e &&
      raw[off + 3] === 0x47
    ) {
      return raw.subarray(off);
    }
  }
  return null;
}

/**
 * Embedded bitmaps live in the OLE "Pictures" stream as OfficeArtBlip records.
 * Slots stay 1-based (pib) even when a metafile/undecodable blip is skipped.
 */
function extractPicturesFromOle(data: ArrayBuffer): (LegacyPptImage | null)[] {
  const pics = readOleStream(data, 'Pictures');
  if (!pics?.length) return [];

  const view = u8ToDataView(pics);
  const images: (LegacyPptImage | null)[] = [];
  let offset = 0;

  while (offset + 8 <= pics.length) {
    const verInst = view.getUint16(offset, true);
    const type = view.getUint16(offset + 2, true);
    const len = view.getUint32(offset + 4, true);
    const instance = verInst >> 4;
    const payloadStart = offset + 8;
    const payloadEnd = Math.min(payloadStart + len, pics.length);

    if (len === 0 || payloadEnd <= payloadStart) break;

    let image: LegacyPptImage | null = null;
    const mime = mimeForBlipType(type);
    if (mime && payloadEnd - payloadStart > 32) {
      const raw = pics.subarray(payloadStart, payloadEnd);
      const bitmap = findBitmapPayload(raw, blipUidCount(instance, type));
      if (bitmap && bitmap.length > 64) {
        image = {
          data: `data:${mime};base64,${bytesToBase64(bitmap)}`,
          alt: `Image ${images.length + 1}`,
          mimeType: mime,
        };
      }
    }
    images.push(image);
    offset = payloadEnd;
  }

  return images;
}

/**
 * Parse one RT_Slide payload into text blocks (TextHeader + TextChars/Bytes).
 */
function parseSlideContainerText(payload: Uint8Array): LegacyPptTextBlock[] {
  const blocks: LegacyPptTextBlock[] = [];
  let pendingType: number | null = null;

  const walk = (start: number, end: number) => {
    const view = u8ToDataView(payload);
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      const payloadData = payload.subarray(payloadStart, payloadEnd);

      if (header.type === RT_TEXT_HEADER_ATOM) {
        if (payloadData.length >= 4) {
          pendingType = new DataView(payloadData.buffer, payloadData.byteOffset, 4).getUint32(0, true);
        } else if (payloadData.length >= 2) {
          pendingType = new DataView(payloadData.buffer, payloadData.byteOffset, 2).getUint16(0, true);
        }
      } else if (header.type === RT_TEXT_CHARS_ATOM || header.type === RT_TEXT_BYTES_ATOM) {
        const text =
          header.type === RT_TEXT_CHARS_ATOM
            ? decodeTextChars(payloadData)
            : decodeTextBytes(payloadData);
        if (text && pendingType !== TX_NOTES && !isNoise(text) && !isPlaceholder(text)) {
          blocks.push({
            role: 'body',
            text,
            textType: pendingType ?? undefined,
          });
        }
        pendingType = null;
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(payloadStart, payloadEnd);
      }

      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };

  walk(0, payload.length);
  return blocks;
}

interface TableCellBox {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
}

function clusterAxis(values: number[], tol: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) {
    if (!out.length || Math.abs(v - out[out.length - 1]) > tol) out.push(v);
  }
  return out;
}

function nearestAxisIndex(axis: number[], value: number): number {
  let best = 0;
  let dist = Math.abs(axis[0] - value);
  for (let i = 1; i < axis.length; i++) {
    const next = Math.abs(axis[i] - value);
    if (next < dist) {
      dist = next;
      best = i;
    }
  }
  return best;
}

function boxesToTable(boxes: TableCellBox[]): LegacyPptTable | null {
  if (boxes.length < 4) return null;
  const xs = clusterAxis(boxes.map(b => b.x), 48);
  const ys = clusterAxis(boxes.map(b => b.y), 48);
  if (xs.length < 2 || ys.length < 2) return null;
  if (boxes.length < xs.length * ys.length * 0.5) return null;

  const cells = ys.map(() => xs.map(() => ''));
  for (const box of boxes) {
    const col = nearestAxisIndex(xs, box.x);
    const row = nearestAxisIndex(ys, box.y);
    if (box.text) cells[row][col] = box.text;
  }
  return { cols: xs.length, rows: ys.length, cells };
}

function parseShapeBox(payload: Uint8Array): TableCellBox | null {
  const view = u8ToDataView(payload);
  let shapeType = -1;
  let x = 0;
  let y = 0;
  let w = 0;
  let h = 0;
  let hasBox = false;
  let text = '';

  const walk = (start: number, end: number) => {
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      const data = payload.subarray(payloadStart, payloadEnd);

      if (header.type === RT_OFFICE_ART_FSP) {
        shapeType = header.instance;
      } else if (header.type === RT_OFFICE_ART_CHILD_ANCHOR && data.length >= 16) {
        const dv = u8ToDataView(data);
        const left = dv.getInt32(0, true);
        const top = dv.getInt32(4, true);
        const right = dv.getInt32(8, true);
        const bottom = dv.getInt32(12, true);
        x = left;
        y = top;
        w = right - left;
        h = bottom - top;
        hasBox = true;
      } else if (header.type === RT_OFFICE_ART_CLIENT_ANCHOR && data.length >= 8) {
        const dv = u8ToDataView(data);
        const top = dv.getInt16(0, true);
        const left = dv.getInt16(2, true);
        const right = dv.getInt16(4, true);
        const bottom = dv.getInt16(6, true);
        x = left;
        y = top;
        w = right - left;
        h = bottom - top;
        hasBox = true;
      } else if (header.type === RT_TEXT_CHARS_ATOM || header.type === RT_TEXT_BYTES_ATOM) {
        text = header.type === RT_TEXT_CHARS_ATOM ? decodeTextChars(data) : decodeTextBytes(data);
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(payloadStart, payloadEnd);
      }

      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };

  walk(0, payload.length);
  if (!hasBox || shapeType !== MSO_RECTANGLE || w < 48 || h < 24) return null;
  return { x, y, w, h, text };
}

function extractTableFromSlide(payload: Uint8Array): { table: LegacyPptTable; box: { l: number; t: number; r: number; b: number } } | null {
  const view = u8ToDataView(payload);
  const groups: TableCellBox[][] = [];

  const collectSpgr = (start: number, end: number): TableCellBox[] => {
    const cells: TableCellBox[] = [];
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      const data = payload.subarray(payloadStart, payloadEnd);

      if (header.type === RT_OFFICE_ART_SP) {
        const box = parseShapeBox(data);
        if (box) cells.push(box);
      } else if (header.type === RT_OFFICE_ART_SPGR) {
        const nested = collectSpgr(payloadStart, payloadEnd);
        if (nested.length >= 4) groups.push(nested);
      } else if (header.ver === 0x0f && header.len > 0) {
        cells.push(...collectSpgr(payloadStart, payloadEnd));
      }

      offset = payloadEnd;
      if (header.len === 0) break;
    }
    return cells;
  };

  const walk = (start: number, end: number) => {
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      if (header.type === RT_OFFICE_ART_SPGR) {
        const cells = collectSpgr(payloadStart, payloadEnd);
        if (cells.length >= 4) groups.push(cells);
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(payloadStart, payloadEnd);
      }
      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };

  walk(0, payload.length);

  let best: { table: LegacyPptTable; box: { l: number; t: number; r: number; b: number } } | null = null;
  for (const group of groups) {
    const table = boxesToTable(group);
    if (!table) continue;
    if (best && table.rows * table.cols <= best.table.rows * best.table.cols) continue;
    best = {
      table,
      box: {
        l: Math.min(...group.map(b => b.x)),
        t: Math.min(...group.map(b => b.y)),
        r: Math.max(...group.map(b => b.x + b.w)),
        b: Math.max(...group.map(b => b.y + b.h)),
      },
    };
  }
  return best;
}

function filterTableCellBlocks(
  blocks: LegacyPptTextBlock[],
  table: LegacyPptTable,
): LegacyPptTextBlock[] {
  const cells = new Set(table.cells.flat().map(t => t.trim()).filter(Boolean));
  if (!cells.size) return blocks;
  return blocks.filter(b => !cells.has(b.text.trim()));
}

interface SlideFill {
  css: string;
  surface: Rgb;
}

interface RawSlideShape {
  shapeType: number;
  box: { l: number; t: number; r: number; b: number } | null;
  text: string;
  rawText: string;
  textType: number | null;
  pib: number | null;
  style: Uint8Array | null;
  fillType: number | null;
  fillColor: number | null;
  fillBackColor: number | null;
  fillAngle: number | null;
  fillFocus: number | null;
}

function pct(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 10000) / 100;
}

function toBox(
  raw: { l: number; t: number; r: number; b: number },
  size: LegacyPptSize,
): LegacyPptBox | null {
  const w = raw.r - raw.l;
  const h = raw.b - raw.t;
  if (w < 16 || h < 12) return null;
  return {
    x: pct(raw.l, size.width),
    y: pct(raw.t, size.height),
    w: pct(w, size.width),
    h: pct(h, size.height),
  };
}

function resolveArtColor(value: number, scheme?: Rgb[]): Rgb | undefined {
  const flags = (value >>> 24) & 0xff;
  if (flags & 0x08) return scheme?.[value & 0xff];
  return { r: value & 0xff, g: (value >> 8) & 0xff, b: (value >> 16) & 0xff };
}

function fillFromShape(shape: RawSlideShape, scheme?: Rgb[]): SlideFill | null {
  if (shape.fillColor == null && shape.fillType == null) return null;
  const color = shape.fillColor != null ? resolveArtColor(shape.fillColor, scheme) : undefined;
  const back = shape.fillBackColor != null ? resolveArtColor(shape.fillBackColor, scheme) : undefined;
  const fillType = shape.fillType ?? FILL_SOLID;
  if (fillType >= FILL_SHADE && fillType <= 8 && color && back) {
    return {
      css: `linear-gradient(180deg, ${rgbToCss(color)} 0%, ${rgbToCss(back)} 100%)`,
      surface: color,
    };
  }
  if (color) return { css: rgbToCss(color), surface: color };
  return null;
}

function collectBackgroundFill(shapes: RawSlideShape[], scheme?: Rgb[]): SlideFill | null {
  for (const shape of shapes) {
    if (shape.box) continue;
    const fill = fillFromShape(shape, scheme);
    if (fill) return fill;
  }
  return null;
}

function schemesEqual(a?: Rgb[] | null, b?: Rgb[] | null): boolean {
  if (!a?.length || !b?.length || a.length < 8 || b.length < 8) return false;
  return a.every((c, i) => c.r === b[i].r && c.g === b[i].g && c.b === b[i].b);
}

function parseRawShape(payload: Uint8Array): RawSlideShape {
  const view = u8ToDataView(payload);
  const shape: RawSlideShape = {
    shapeType: -1,
    box: null,
    text: '',
    rawText: '',
    textType: null,
    pib: null,
    style: null,
    fillType: null,
    fillColor: null,
    fillBackColor: null,
    fillAngle: null,
    fillFocus: null,
  };

  const walk = (start: number, end: number) => {
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      const data = payload.subarray(payloadStart, payloadEnd);

      if (header.type === RT_OFFICE_ART_FSP) {
        shape.shapeType = header.instance;
      } else if (header.type === RT_OFFICE_ART_CHILD_ANCHOR && data.length >= 16) {
        const dv = u8ToDataView(data);
        shape.box = {
          l: dv.getInt32(0, true),
          t: dv.getInt32(4, true),
          r: dv.getInt32(8, true),
          b: dv.getInt32(12, true),
        };
      } else if (header.type === RT_OFFICE_ART_CLIENT_ANCHOR && data.length >= 8) {
        const dv = u8ToDataView(data);
        shape.box = {
          t: dv.getInt16(0, true),
          l: dv.getInt16(2, true),
          r: dv.getInt16(4, true),
          b: dv.getInt16(6, true),
        };
      } else if (header.type === RT_OFFICE_ART_FOPT) {
        const dv = u8ToDataView(data);
        const count = Math.floor(data.length / 6);
        for (let i = 0; i < count; i++) {
          const opid = dv.getUint16(i * 6, true);
          const propId = opid & 0x3fff;
          const value = dv.getUint32(i * 6 + 2, true);
          if (propId === 0x0104) shape.pib = value & 0xffff;
          else if (propId === OFFICE_ART_FILL_TYPE) shape.fillType = value;
          else if (propId === OFFICE_ART_FILL_COLOR) shape.fillColor = value;
          else if (propId === OFFICE_ART_FILL_BACK_COLOR) shape.fillBackColor = value;
          else if (propId === OFFICE_ART_FILL_ANGLE) shape.fillAngle = value;
          else if (propId === OFFICE_ART_FILL_FOCUS) shape.fillFocus = value;
        }
      } else if (header.type === RT_TEXT_HEADER_ATOM && data.length >= 4) {
        shape.textType = new DataView(data.buffer, data.byteOffset, 4).getUint32(0, true);
      } else if (header.type === RT_TEXT_CHARS_ATOM || header.type === RT_TEXT_BYTES_ATOM) {
        shape.rawText =
          header.type === RT_TEXT_CHARS_ATOM ? decodeTextCharsRaw(data) : decodeTextBytesRaw(data);
        shape.text = cleanText(shape.rawText);
      } else if (header.type === RT_STYLE_TEXT_PROP) {
        shape.style = data;
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(payloadStart, payloadEnd);
      }

      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };

  walk(0, payload.length);
  return shape;
}

function collectRawShapes(payload: Uint8Array): RawSlideShape[] {
  const view = u8ToDataView(payload);
  const shapes: RawSlideShape[] = [];
  const walk = (start: number, end: number) => {
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      if (header.type === RT_OFFICE_ART_SP) {
        shapes.push(parseRawShape(payload.subarray(payloadStart, payloadEnd)));
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(payloadStart, payloadEnd);
      }
      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };
  walk(0, payload.length);
  return shapes;
}

function collectFonts(stream: Uint8Array): string[] {
  const view = u8ToDataView(stream);
  const fonts: string[] = [];
  const walk = (start: number, end: number) => {
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      if (header.type === RT_FONT_ENTITY_ATOM) {
        const data = stream.subarray(payloadStart, payloadEnd);
        let name = '';
        for (let i = 0; i + 1 < Math.min(64, data.length); i += 2) {
          const c = data[i] | (data[i + 1] << 8);
          if (!c) break;
          name += String.fromCharCode(c);
        }
        if (name) fonts[header.instance] = name;
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(payloadStart, payloadEnd);
      }
      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };
  walk(0, stream.length);
  return fonts;
}

interface MasterTypeStyle {
  font?: number;
  size?: number;
}

function collectMasterTypeStyles(stream: Uint8Array, fontCount: number): MasterTypeStyle[] {
  const view = u8ToDataView(stream);
  const out: MasterTypeStyle[] = [];
  const walk = (start: number, end: number) => {
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      if (header.type === RT_TX_MASTER_STYLE) {
        const data = stream.subarray(payloadStart, payloadEnd);
        const parsed = scanCfFields(data, fontCount);
        let hint: number | undefined;
        const view = u8ToDataView(data);
        for (let i = 0; i + 2 <= data.length; i += 2) {
          const raw = view.getUint16(i, true);
          if (raw >= 20 && raw <= 72) hint = raw;
        }
        const prev = out[header.instance];
        if (parsed.font != null || parsed.size || hint) {
          out[header.instance] = {
            font: prev?.font ?? parsed.font,
            size: prev?.size ?? parsed.size ?? hint,
          };
        }
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(payloadStart, payloadEnd);
      }
      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };
  walk(0, stream.length);
  return out;
}

function applyTypeface(theme: LegacyPptTheme, fonts: string[], masters: MasterTypeStyle[]): LegacyPptTheme {
  const title = masters[TX_TITLE] ?? masters[TX_CENTER_TITLE];
  const body = masters[TX_BODY] ?? masters[TX_CENTER_BODY];
  const titleIdx =
    title?.font != null && !isCjkFace(fonts[title.font])
      ? title.font
      : defaultFontIndex(fonts, true);
  const bodyIdx =
    body?.font != null && !isCjkFace(fonts[body.font])
      ? body.font
      : defaultFontIndex(fonts, false);
  const titleFont = cssFontFamily(fonts[titleIdx] ?? fonts[0]);
  const bodyFont = cssFontFamily(fonts[bodyIdx] ?? fonts[0]);
  return {
    ...theme,
    font: bodyFont ?? titleFont,
    titleFont: titleFont ?? bodyFont,
    bodyFont: bodyFont ?? titleFont,
    titleSize: title?.size,
    bodySize: body?.size,
  };
}

function collectSlideScheme(payload: Uint8Array): Rgb[] | null {
  const view = u8ToDataView(payload);
  let found: Rgb[] | null = null;
  const walk = (start: number, end: number) => {
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      if (header.type === RT_COLOR_SCHEME_ATOM) {
        const colors = parseSchemeColors(payload.subarray(payloadStart, payloadEnd));
        if (colors) found = colors;
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(payloadStart, payloadEnd);
      }
      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };
  walk(0, payload.length);
  return found;
}

function themeFromScheme(
  scheme: Rgb[] | undefined,
  fallback: LegacyPptTheme,
  fill?: SlideFill | null,
): LegacyPptTheme {
  if (!scheme?.length && !fill) return fallback;
  return themeFromColors(scheme ?? [], fill);
}

function boxesOverlap(
  a: { l: number; t: number; r: number; b: number },
  b: { l: number; t: number; r: number; b: number },
): number {
  const x = Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l));
  const y = Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const inter = x * y;
  const area = Math.min((a.r - a.l) * (a.b - a.t), (b.r - b.l) * (b.b - b.t));
  return area > 0 ? inter / area : 0;
}

function resolvePicture(
  pib: number | null,
  pictures: (LegacyPptImage | null)[],
  used: Set<number>,
): LegacyPptImage | undefined {
  if (pib && pictures[pib - 1]) {
    used.add(pib - 1);
    return pictures[pib - 1] ?? undefined;
  }
  for (let i = 0; i < pictures.length; i++) {
    if (pictures[i] && !used.has(i)) {
      used.add(i);
      return pictures[i] ?? undefined;
    }
  }
  return undefined;
}

function kindFromTextType(textType: number | null, text: string, box: LegacyPptBox): PptShapeKind {
  if (textType === TX_TITLE || textType === TX_CENTER_TITLE) return 'title';
  if (textType === TX_CENTER_BODY || textType === TX_HALF_BODY || textType === TX_QUARTER_BODY) {
    if (textType === TX_CENTER_BODY) {
      const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
      const short = text.length <= 80 && lines.length <= 3 && lines.every(l => l.length <= 48);
      if (short) return 'subtitle';
    }
    return 'body';
  }
  if (
    textType === TX_OTHER &&
    (box.h <= 6 || box.y >= 88 || /^https?:\/\//i.test(text) || /^www\./i.test(text))
  ) {
    return 'meta';
  }
  const special = detectSpecialRole(text);
  if (special === 'meta') return 'meta';
  return 'body';
}

function buildSlideShapes(
  payload: Uint8Array,
  pictures: (LegacyPptImage | null)[],
  size: LegacyPptSize,
  usedPics: Set<number>,
  scheme?: Rgb[],
  fonts: string[] = [],
  masters: MasterTypeStyle[] = [],
): { shapes: LegacyPptShape[]; images: LegacyPptImage[]; table?: LegacyPptTable } {
  const extracted = extractTableFromSlide(payload);
  const table = extracted?.table;
  const cellTexts = new Set(table?.cells.flat().map(t => t.trim()).filter(Boolean) ?? []);
  const raw = collectRawShapes(payload);
  const shapes: LegacyPptShape[] = [];
  const images: LegacyPptImage[] = [];

  if (table && extracted) {
    const pctBox = toBox(extracted.box, size);
    if (pctBox) shapes.push({ kind: 'table', box: pctBox, table });
  }

  const kept: RawSlideShape[] = [];
  for (const shape of raw) {
    if (!shape.box) continue;
    if (shape.textType === TX_NOTES) continue;
    if (table && cellTexts.has(shape.text.trim())) continue;
    if (shape.shapeType === 20 && (shape.box.r - shape.box.l < 8 || shape.box.b - shape.box.t < 8)) {
      continue;
    }
    const dup = kept.find(
      prev =>
        prev.text &&
        prev.text === shape.text &&
        prev.box &&
        boxesOverlap(prev.box, shape.box!) >= 0.55,
    );
    if (dup) continue;
    kept.push(shape);
  }

  for (const shape of kept) {
    const box = toBox(shape.box!, size);
    if (!box) continue;

    if (shape.shapeType === MSO_PICTURE_FRAME || shape.pib) {
      const image = resolvePicture(shape.pib, pictures, usedPics);
      if (image) {
        images.push(image);
        shapes.push({ kind: 'image', box, image });
      }
      if (!shape.text || isNoise(shape.text) || isPlaceholder(shape.text)) continue;
    }

    if (!shape.text || isNoise(shape.text) || isPlaceholder(shape.text)) continue;
    const kind = kindFromTextType(shape.textType, shape.text, box);
    const paragraphs = styleParagraphs(shape.rawText || shape.text, shape.style);
    const pfEnd = shape.style?.length ? parsePfRuns(shape.style, (shape.rawText || shape.text).length).end : 0;
    const cf = shape.style?.length
      ? parseCfStyle(shape.style, (shape.rawText || shape.text).length, pfEnd, scheme, fonts.length)
      : { color: undefined, shadow: false, size: undefined, font: undefined };
    const fallbackColor = kind === 'title' ? scheme?.[3] : scheme?.[1];
    const fg = cf.color ?? fallbackColor ?? { r: 0, g: 0, b: 0 };
    const typeKey =
      shape.textType ?? (kind === 'title' ? TX_TITLE : kind === 'subtitle' ? TX_CENTER_BODY : TX_BODY);
    const master = masters[typeKey] ?? (kind === 'title' ? masters[TX_TITLE] : masters[TX_BODY]);
    const fontIdx = resolveFontIndex(cf.font, master?.font, fonts, kind === 'title');
    const fontSize =
      kind === 'title' && cf.size != null && cf.size < 20
        ? master?.size ?? cf.size
        : cf.size ?? master?.size;
    shapes.push({
      kind,
      box,
      center:
        shape.textType === TX_CENTER_TITLE ||
        (shape.textType === TX_CENTER_BODY && kind === 'subtitle') ||
        (kind === 'title' && !cf.shadow),
      narrow: box.w < 42,
      shadow: cf.shadow || undefined,
      color: rgbToCss(fg),
      fontSize,
      fontFamily: cssFontFamily(fonts[fontIdx] ?? fonts[0]),
      text: shape.text,
      paragraphs: paragraphs.length ? paragraphs : undefined,
    });
  }

  return { shapes, images, table };
}

function readSlideSize(stream: Uint8Array): LegacyPptSize {
  const view = u8ToDataView(stream);
  const walk = (start: number, end: number): LegacyPptSize | null => {
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      if (header.type === RT_DOCUMENT_ATOM && header.len >= 8) {
        const dv = u8ToDataView(stream.subarray(payloadStart, payloadEnd));
        const width = Math.abs(dv.getInt32(0, true)) || 4;
        const height = Math.abs(dv.getInt32(4, true)) || 3;
        return { width, height };
      }
      if (header.ver === 0x0f && header.len > 0) {
        const nested = walk(payloadStart, payloadEnd);
        if (nested) return nested;
      }
      offset = payloadEnd;
      if (header.len === 0) break;
    }
    return null;
  };
  return walk(0, stream.length) ?? { width: 4, height: 3 };
}

/**
 * Build slides from RT_Slide containers (correct order for pictures + in-slide text).
 */
function parseSlidesFromDocument(
  stream: Uint8Array,
  pictures: (LegacyPptImage | null)[],
  size: LegacyPptSize,
  fallbackTheme: LegacyPptTheme,
  fonts: string[] = [],
  typeStyles: MasterTypeStyle[] = [],
): LegacyPptSlide[] {
  const view = u8ToDataView(stream);
  const slides: LegacyPptSlide[] = [];
  const masters: { scheme: Rgb[] | null; fill: SlideFill | null }[] = [];
  const slidePayloads: Uint8Array[] = [];
  const usedPics = new Set<number>();

  const walk = (start: number, end: number) => {
    let offset = start;
    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;
      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      const payload = stream.subarray(payloadStart, payloadEnd);

      if (header.type === RT_MAIN_MASTER) {
        const scheme = collectSlideScheme(payload);
        const raw = collectRawShapes(payload);
        masters.push({ scheme, fill: collectBackgroundFill(raw, scheme ?? undefined) });
      } else if (header.type === RT_SLIDE) {
        slidePayloads.push(payload);
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(payloadStart, payloadEnd);
      }

      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };

  walk(0, stream.length);

  for (const payload of slidePayloads) {
    const scheme = collectSlideScheme(payload);
    const raw = collectRawShapes(payload);
    let fill = collectBackgroundFill(raw, scheme ?? undefined);
    if (!fill && scheme) {
      const master = masters.find(m => schemesEqual(m.scheme, scheme));
      if (master) {
        fill = master.fill ?? (scheme[0] ? { css: rgbToCss(scheme[0]), surface: scheme[0] } : null);
      }
    }
    const theme = applyTypeface(themeFromScheme(scheme ?? undefined, fallbackTheme, fill), fonts, typeStyles);
    const built = buildSlideShapes(
      payload,
      pictures,
      size,
      usedPics,
      scheme ?? undefined,
      fonts,
      typeStyles,
    );
    const rawBlocks = parseSlideContainerText(payload);
    const blocks = built.table ? filterTableCellBlocks(rawBlocks, built.table) : rawBlocks;
    const slide = finalizeSlide(
      blocks,
      slides.length + 1,
      built.images,
      built.table,
      built.shapes,
      theme,
    );
    if (slide) slides.push(slide);
  }

  return slides;
}

// ============================================================
// PARSER
// ============================================================

/**
 * Parse slides from a SlideListWithText payload.
 * Each SlidePersistAtom marks the start of a new slide.
 */
function parseSlideListWithText(payload: Uint8Array): LegacyPptSlide[] {
  const slides: LegacyPptSlide[] = [];
  let currentBlocks: LegacyPptTextBlock[] = [];
  let pendingType: number | null = null;
  let inSlide = false;

  const flushSlide = () => {
    if (currentBlocks.length) {
      const slide = finalizeSlide(currentBlocks, slides.length + 1, []);
      if (slide) slides.push(slide);
    }
    currentBlocks = [];
    pendingType = null;
    inSlide = false;
  };

  const walk = (data: Uint8Array, start: number, end: number) => {
    const view = u8ToDataView(data);
    let offset = start;

    while (offset + 8 <= end) {
      const header = readRecordHeader(view, offset);
      if (!header) break;

      const payloadStart = offset + header.headerSize;
      const payloadEnd = Math.min(payloadStart + header.len, end);
      const payloadData = data.subarray(payloadStart, payloadEnd);

      if (header.type === RT_SLIDE_PERSIST_ATOM) {
        flushSlide();
        inSlide = true;
      } else if (header.type === RT_TEXT_HEADER_ATOM) {
        if (payloadData.length >= 4) {
          pendingType = new DataView(payloadData.buffer, payloadData.byteOffset, 4).getUint32(0, true);
        } else if (payloadData.length >= 2) {
          pendingType = new DataView(payloadData.buffer, payloadData.byteOffset, 2).getUint16(0, true);
        }
      } else if (header.type === RT_TEXT_CHARS_ATOM || header.type === RT_TEXT_BYTES_ATOM) {
        if (!inSlide && slides.length === 0) {
          inSlide = true;
        }
        const text =
          header.type === RT_TEXT_CHARS_ATOM
            ? decodeTextChars(payloadData)
            : decodeTextBytes(payloadData);

        if (text && pendingType !== TX_NOTES && !isNoise(text) && !isPlaceholder(text)) {
          currentBlocks.push({
            role: 'body',
            text,
            textType: pendingType ?? undefined,
          });
        }
        pendingType = null;
      } else if (header.ver === 0x0f && header.len > 0) {
        walk(data, payloadStart, payloadEnd);
      }

      offset = payloadEnd;
      if (header.len === 0) break;
    }
  };

  walk(payload, 0, payload.length);
  flushSlide();

  return slides;
}

/** Recurse into MS-PPT containers — ColorSchemeAtom lives under Document/Master/Slide. */
function collectThemeFromRecords(
  data: Uint8Array,
  start: number,
  end: number,
  schemes: ParsedScheme[],
  artFills: Rgb[],
): void {
  const view = u8ToDataView(data);
  let offset = start;
  while (offset + 8 <= end) {
    const header = readRecordHeader(view, offset);
    if (!header) break;

    const payloadStart = offset + header.headerSize;
    const payloadEnd = Math.min(payloadStart + header.len, end);
    const payload = data.subarray(payloadStart, payloadEnd);

    if (header.type === RT_COLOR_SCHEME_ATOM) {
      const scheme = parseSchemeAtom(payload);
      if (scheme) schemes.push(scheme);
    } else if (header.type === RT_OFFICE_ART_FOPT) {
      artFills.push(...collectArtFillColors(payload));
    } else if (header.ver === 0x0f && header.len > 0) {
      collectThemeFromRecords(data, payloadStart, payloadEnd, schemes, artFills);
    }

    offset = payloadEnd;
    if (header.len === 0) break;
  }
}

export function parseLegacyPpt(data: ArrayBuffer): LegacyPptPreview {
  const stream = readOleStream(data, 'PowerPoint Document');
  if (!stream?.length) {
    throw new Error('Not a valid PowerPoint .ppt (missing PowerPoint Document stream)');
  }

  const schemes: ParsedScheme[] = [];
  const artFills: Rgb[] = [];
  collectThemeFromRecords(stream, 0, stream.length, schemes, artFills);

  const pictures = extractPicturesFromOle(data);
  const fonts = collectFonts(stream);
  const masters = collectMasterTypeStyles(stream, fonts.length);
  const fallbackTheme = applyTypeface(buildTheme(schemes, artFills), fonts, masters);
  const size = readSlideSize(stream);
  let allSlides = parseSlidesFromDocument(stream, pictures, size, fallbackTheme, fonts, masters);

  // Fallback: SlideListWithText only (rare decks without RT_Slide text)
  if (!allSlides.length) {
    const lists: { instance: number; slides: LegacyPptSlide[] }[] = [];
    const collectLists = (start: number, end: number) => {
      const view = u8ToDataView(stream);
      let offset = start;
      while (offset + 8 <= end) {
        const header = readRecordHeader(view, offset);
        if (!header) break;
        const payloadStart = offset + header.headerSize;
        const payloadEnd = Math.min(payloadStart + header.len, end);
        const payload = stream.subarray(payloadStart, payloadEnd);
        if (header.type === RT_SLIDE_LIST_WITH_TEXT) {
          const slides = parseSlideListWithText(payload);
          if (slides.length) lists.push({ instance: header.instance, slides });
        } else if (header.ver === 0x0f && header.len > 0) {
          collectLists(payloadStart, payloadEnd);
        }
        offset = payloadEnd;
        if (header.len === 0) break;
      }
    };
    collectLists(0, stream.length);
    allSlides =
      lists.find(l => l.instance === 0)?.slides ??
      [...lists].sort((a, b) => b.slides.length - a.slides.length)[0]?.slides ??
      parseSlideListWithText(stream);
  }

  if (!allSlides.length) {
    throw new Error('Could not extract slides from .ppt');
  }

  allSlides.forEach((s, i) => {
    s.index = i + 1;
    s.layout = classifyLayout(s.blocks, !!(s.images?.length), !!s.table);
  });

  return {
    slides: allSlides,
    theme: fallbackTheme,
    size,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderTitle(text: string, className: string): string {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return `<h2 class="${className}">${escapeHtml(text)}</h2>`;
  }
  return `<h2 class="${className}">${lines.map(l => escapeHtml(l)).join('<br />')}</h2>`;
}

function renderTable(table: LegacyPptTable): string {
  if (!table.rows || !table.cols) return '';
  const first = table.cells[0] ?? [];
  const hasHead = first.some(c => c.trim());
  const head = hasHead ? first : null;
  const body = hasHead ? table.cells.slice(1) : table.cells;
  const cell = (value: string, tag: 'th' | 'td') =>
    `<${tag}>${value.trim() ? escapeHtml(value) : '&nbsp;'}</${tag}>`;
  const thead = head
    ? `<thead><tr>${head.map(c => cell(c, 'th')).join('')}</tr></thead>`
    : '';
  const tbody = `<tbody>${body
    .map(row => `<tr>${row.map(c => cell(c, 'td')).join('')}</tr>`)
    .join('')}</tbody>`;
  return `<div class="legacy-ppt__table-wrap"><table class="legacy-ppt__table">${thead}${tbody}</table></div>`;
}

function renderParagraphs(paragraphs: LegacyPptParagraph[]): string {
  const items = paragraphs.map(p => {
    const lvl = Math.max(0, Math.min(p.indent, 4));
    if (!p.text) {
      return `<li class="legacy-ppt__li--gap" data-lvl="${lvl}"></li>`;
    }
    const text = p.text.replace(/^([•·▪◦\-*–—]|\d+[.)])\s+/, '');
    return `<li data-lvl="${lvl}">${escapeHtml(text)}</li>`;
  });
  if (!items.length) return '';
  return `<ul class="legacy-ppt__list">${items.join('')}</ul>`;
}

function renderShapeBody(text: string, paragraphs?: LegacyPptParagraph[]): string {
  if (paragraphs && paragraphs.length >= 2) {
    return renderParagraphs(paragraphs);
  }
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length >= 2 && lines.every(l => l.length <= 160)) {
    const items = lines
      .map(l => l.replace(/^([•·▪◦\-*–—]|\d+[.)])\s+/, ''))
      .map(l => `<li>${escapeHtml(l)}</li>`)
      .join('');
    return `<ul class="legacy-ppt__list">${items}</ul>`;
  }
  return renderBody(text);
}

function renderBody(text: string): string {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return '';

  const parts: string[] = [];
  let listBuf: string[] = [];

  const flushList = () => {
    if (!listBuf.length) return;
    const items = listBuf.map(l => l.replace(/^([•·▪◦\-*–—]|\d+[.)])\s+/, '')).map(l => `<li>${escapeHtml(l)}</li>`).join('');
    parts.push(`<ul class="legacy-ppt__list">${items}</ul>`);
    listBuf = [];
  };

  for (const line of lines) {
    if (/^(ingredients|preparation|directions|instructions|method|steps)\s*$/i.test(line)) {
      flushList();
      parts.push(`<h3 class="legacy-ppt__kicker">${escapeHtml(line)}</h3>`);
      continue;
    }
    if (
      /^\d+\s*(minutes|mins|hr|hours)\b/i.test(line) ||
      /^serves\b/i.test(line) ||
      (/[•·]/.test(line) && line.length < 48 && /serves|minutes|mins/i.test(line))
    ) {
      flushList();
      parts.push(`<p class="legacy-ppt__meta">${escapeHtml(line)}</p>`);
      continue;
    }
    if (/^([•·▪◦\-*–—]|\d+[.)]|Item\s+\d+)\s*/i.test(line) || /^Item\s+\d+$/i.test(line)) {
      listBuf.push(line);
      continue;
    }
    flushList();
    parts.push(`<p class="legacy-ppt__text">${escapeHtml(line)}</p>`);
  }
  flushList();
  return parts.join('');
}

function renderBlock(block: LegacyPptTextBlock): string {
  switch (block.role) {
    case 'title': return renderTitle(block.text, 'legacy-ppt__title');
    case 'subtitle': return `<p class="legacy-ppt__subtitle">${escapeHtml(block.text)}</p>`;
    case 'kicker': return `<h3 class="legacy-ppt__kicker">${escapeHtml(block.text)}</h3>`;
    case 'meta': return `<p class="legacy-ppt__meta">${escapeHtml(block.text)}</p>`;
    default: return renderBody(block.text);
  }
}

function renderImages(images: LegacyPptImage[]): string {
  if (!images?.length) return '';
  if (images.length === 1) {
    const img = images[0];
    return `<div class="legacy-ppt__media"><img src="${img.data}" alt="${escapeHtml(img.alt || 'Slide image')}" class="legacy-ppt__image" loading="lazy" /></div>`;
  }
  const items = images
    .map(
      (img, idx) =>
        `<img src="${img.data}" alt="${escapeHtml(img.alt || `Slide image ${idx + 1}`)}" class="legacy-ppt__image" loading="lazy" />`
    )
    .join('');
  return `<div class="legacy-ppt__media"><div class="legacy-ppt__gallery legacy-ppt__gallery--${Math.min(images.length, 4)}">${items}</div></div>`;
}

function themeVars(theme: LegacyPptTheme, slideWidth = 5760): string {
  const vars = [
    `--ppt-brand:${theme.brand}`,
    `--ppt-on-brand:${theme.onBrand}`,
    `--ppt-surface:${theme.surface}`,
    `--ppt-title:${theme.title}`,
    `--ppt-body:${theme.body}`,
    `--ppt-accent:${theme.accent}`,
    `--ppt-bg:${theme.background ?? theme.surface}`,
  ];
  if (theme.font) vars.push(`--ppt-font:${theme.font}`);
  if (theme.titleFont) vars.push(`--ppt-title-font:${theme.titleFont}`);
  if (theme.bodyFont) vars.push(`--ppt-body-font:${theme.bodyFont}`);
  if (theme.titleSize) vars.push(`--ppt-title-size:${ptToCqi(theme.titleSize, slideWidth)}cqi`);
  if (theme.bodySize) vars.push(`--ppt-body-size:${ptToCqi(theme.bodySize, slideWidth)}cqi`);
  return vars.join(';');
}

function boxStyle(box: LegacyPptBox): string {
  return `left:${box.x}%;top:${box.y}%;width:${box.w}%;height:${box.h}%`;
}

function renderShape(shape: LegacyPptShape, slideWidth: number): string {
  const center = shape.center ? ' legacy-ppt__shape--center' : '';
  const narrow = shape.narrow ? ' legacy-ppt__shape--narrow' : '';
  const wash = shape.wash ? ' legacy-ppt__shape--wash' : '';
  const shadow = shape.shadow ? ' legacy-ppt__shape--shadow' : '';
  const fontSize = shape.fontSize ? `;font-size:${ptToCqi(shape.fontSize, slideWidth)}cqi` : '';
  const fontFamily = shape.fontFamily ? `;font-family:${shape.fontFamily}` : '';
  const style = `${boxStyle(shape.box)}${shape.color ? `;color:${shape.color}` : ''}${fontSize}${fontFamily}`;
  if (shape.kind === 'image' && shape.image) {
    return `<div class="legacy-ppt__shape legacy-ppt__shape--image${wash}" style="${style}"><img src="${shape.image.data}" alt="${escapeHtml(shape.image.alt || 'Slide image')}" class="legacy-ppt__image" loading="lazy" /></div>`;
  }
  if (shape.kind === 'table' && shape.table) {
    return `<div class="legacy-ppt__shape legacy-ppt__shape--table" style="${style}">${renderTable(shape.table)}</div>`;
  }
  if (!shape.text) return '';
  const inner =
    shape.kind === 'title'
      ? renderTitle(shape.text, 'legacy-ppt__title')
      : shape.kind === 'subtitle'
        ? `<p class="legacy-ppt__subtitle">${escapeHtml(shape.text).replace(/\n/g, '<br />')}</p>`
        : shape.kind === 'meta'
          ? `<p class="legacy-ppt__meta">${escapeHtml(shape.text)}</p>`
          : renderShapeBody(shape.text, shape.paragraphs);
  return `<div class="legacy-ppt__shape legacy-ppt__shape--${shape.kind}${center}${narrow}${shadow}" style="${style}">${inner}</div>`;
}

function renderFlowSlide(slide: LegacyPptSlide): string {
  const blocksHtml = slide.blocks.map(renderBlock).join('');
  const tableHtml = slide.table ? renderTable(slide.table) : '';
  const imagesHtml = renderImages(slide.images || []);
  return `${blocksHtml}${tableHtml}${imagesHtml}`;
}

export function legacyPptToHtml(preview: LegacyPptPreview): string {
  const theme = preview.theme;
  const size = preview.size ?? { width: 4, height: 3 };
  const themeStyle = `${themeVars(theme, size.width)};--ppt-ratio:${size.width} / ${size.height}${theme.font ? `;font-family:${theme.font}` : ''}`;

  const slidesHtml = preview.slides.map(slide => {
    const layoutClass = `legacy-ppt__slide--${slide.layout}`;
    const hasShapes = !!(slide.shapes && slide.shapes.length);
    const hasImages = slide.images && slide.images.length > 0;
    const imageClass = hasImages ? ' legacy-ppt__slide--has-image' : '';
    const positionedClass = hasShapes ? ' legacy-ppt__slide--positioned' : '';
    const slideTheme = slide.theme ? themeVars(slide.theme, size.width) : '';
    const canvas = hasShapes
      ? slide.shapes!.map(shape => renderShape(shape, size.width)).join('')
      : `<div class="legacy-ppt__frame" aria-hidden="true"></div><div class="legacy-ppt__content">${renderFlowSlide(slide)}</div>`;

    return `<section class="legacy-ppt__slide ${layoutClass}${imageClass}${positionedClass}" style="${slideTheme}" aria-label="Slide ${slide.index}">
      <div class="legacy-ppt__viewport">
        <div class="legacy-ppt__canvas">
          ${canvas}
        </div>
      </div>
    </section>`;
  }).join('');

  return `<article class="legacy-ppt" style="${themeStyle}">${slidesHtml}</article>`;
}