/**
 * Legacy Word .doc (Word 97–2003) parser — structured HTML preview.
 * Improves hierarchy (title / TOC / headings / lists / tables), field links, and inline emphasis.
 */
import { readOleStream, readOleStreamAny, u8ToDataView } from './ole';

const WORD_IDENT = 0xa5ec;
const CELL_MARK = '\u001e';

export interface LegacyDocTheme {
  font: string;
  size: number;
  color: string;
  titleFont: string;
  titleSize: number;
  titleColor: string;
  headingFont: string;
  heading2Size: number;
  heading3Size: number;
  heading3Color: string;
  linkColor: string;
}

export interface LegacyDocPreview {
  paragraphs: string[];
  text: string;
  theme?: LegacyDocTheme;
  metadata?: {
    title?: string;
    author?: string;
    wordCount?: number;
  };
}

interface DocChp {
  font?: string;
  size?: number;
  color?: string;
}

const WORD_ICO = [
  '#000000',
  '#000000',
  '#0000ff',
  '#00ffff',
  '#00ff00',
  '#ff00ff',
  '#ff0000',
  '#ffff00',
  '#ffffff',
  '#000080',
  '#008080',
  '#008000',
  '#800080',
  '#800000',
  '#808000',
  '#808080',
  '#c0c0c0',
];

type ListStyle = 'ordered' | 'disc' | 'emoji';

interface ListItem {
  marker?: string;
  text: string;
}

type DocBlock =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string; level: 2 | 3 }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; style: ListStyle; items: ListItem[] }
  | { kind: 'table'; headers: string[]; rows: string[][] };

/**
 * Detect leading emoji/symbol markers from the .doc itself (no fixed glyph list).
 * Uses code-point ranges so we don't depend on Unicode property escapes in the bundle.
 */
function isEmojiCodePoint(cp: number): boolean {
  return (
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x1f600 && cp <= 0x1f64f) ||
    (cp >= 0x1f900 && cp <= 0x1f9ff) ||
    (cp >= 0x2600 && cp <= 0x27bf) || // Misc symbols + dingbats (includes ✅ U+2705)
    (cp >= 0x2300 && cp <= 0x23ff) ||
    (cp >= 0x2b50 && cp <= 0x2b55) ||
    cp === 0x3030 ||
    cp === 0x303d ||
    cp === 0x3297 ||
    cp === 0x3299
  );
}

/** Leading emoji sequence as stored in the file (pictograph + optional VS/ZWJ). */
function matchLeadingEmoji(text: string): string | null {
  if (!text) return null;
  const chars = [...text];
  const first = chars[0]?.codePointAt(0);
  if (first == null || !isEmojiCodePoint(first)) return null;

  let i = 1;
  while (i < chars.length) {
    const cp = chars[i].codePointAt(0)!;
    if (cp === 0xfe0f || cp === 0xfe0e || (cp >= 0x1f3fb && cp <= 0x1f3ff)) {
      i += 1;
      continue;
    }
    if (cp === 0x200d && i + 1 < chars.length) {
      const next = chars[i + 1].codePointAt(0)!;
      if (isEmojiCodePoint(next)) {
        i += 2;
        continue;
      }
    }
    break;
  }
  return chars.slice(0, i).join('');
}

function decodeCompressed(bytes: Uint8Array, start: number, end: number): string {
  let out = '';
  let i = start;
  while (i < end && i < bytes.length) {
    const c = bytes[i];
    if (c === 0x0d || c === 0x0b || c === 0x0c) {
      out += '\n';
    } else if (c === 0x07) {
      out += CELL_MARK;
    } else if (c === 0x09) {
      out += '\t';
    } else if (c >= 0x20 && c < 0x7F) {
      out += String.fromCharCode(c);
    }
    i++;
  }
  return out;
}

function decodeUnicode(bytes: Uint8Array, start: number, end: number): string {
  const view = u8ToDataView(bytes);
  let out = '';
  let i = start;

  if (start + 2 <= bytes.length) {
    const bom = view.getUint16(start, true);
    if (bom === 0xfeff) {
      i = start + 2;
    }
  }

  const limit = Math.min(end, bytes.length - (bytes.length % 2 === 0 ? 0 : 1));
  while (i + 1 < limit) {
    const c = view.getUint16(i, true);
    if (c === 0x000d || c === 0x000b || c === 0x000c) {
      out += '\n';
    } else if (c === 0x0007) {
      out += CELL_MARK;
    } else if (c === 0x0009) {
      out += '\t';
    } else if (c >= 0xd800 && c <= 0xdbff && i + 3 < limit) {
      // Surrogate pair (emoji outside BMP)
      const low = view.getUint16(i + 2, true);
      if (low >= 0xdc00 && low <= 0xdfff) {
        out += String.fromCharCode(c, low);
        i += 4;
        continue;
      }
    } else if (c >= 0x20 && c < 0xd800) {
      out += String.fromCharCode(c);
    } else if (c >= 0xe000 && c <= 0xfffd) {
      out += String.fromCharCode(c);
    }
    i += 2;
  }
  return out;
}

function cleanDocText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Normalize Word junk so heuristics see real text. */
function normalizeLine(text: string): string {
  return text
    .replace(/[\u200B\u2060\uFEFF]/g, '') // ZWSP / WJ / BOM (keep ZWJ for emoji sequences)
    .replace(/^\uFE0F+/g, '') // orphan variation selectors only at line start
    .replace(/[\u2028\u2029]/g, ' ')
    .replace(/\u00AD/g, '') // soft hyphen
    .replace(/[\u00A0\u202F\u2007]/g, ' ') // nbsp-ish → space
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Expand smashed paragraphs (multiple emoji checklist items jammed into one run).
 */
function expandParagraphs(paragraphs: string[]): string[] {
  const out: string[] = [];
  for (const raw of paragraphs) {
    const normalized = normalizeLine(raw);
    if (!normalized) continue;

    // Split on each leading emoji marker when several are jammed together
    const chars = [...normalized];
    const starts: number[] = [];
    for (let i = 0; i < chars.length; i++) {
      const cp = chars[i].codePointAt(0)!;
      if (!isEmojiCodePoint(cp)) continue;
      // Treat as a new item start when at beginning or preceded by whitespace
      if (i === 0 || /\s/.test(chars[i - 1])) {
        starts.push(i);
      }
    }
    if (starts.length > 1) {
      const pieces: string[] = [];
      for (let s = 0; s < starts.length; s++) {
        const from = starts[s];
        const to = s + 1 < starts.length ? starts[s + 1] : chars.length;
        const piece = chars.slice(from, to).join('').trim();
        if (piece && matchLeadingEmoji(piece)) pieces.push(piece);
      }
      if (pieces.length > 1) {
        out.push(...pieces);
        continue;
      }
    }
    out.push(normalized);
  }
  return out;
}

function paragraphsFromText(text: string): string[] {
  const base = text
    .split(/\n+/)
    .map(p => p.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);
  return expandParagraphs(base);
}

function heuristicUnicodeExtract(bytes: Uint8Array): string {
  const view = u8ToDataView(bytes);
  const chunks: string[] = [];
  let buf = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const c = view.getUint16(i, true);
    if (c === 0x000d || c === 0x000a || c === 0x000b) {
      if (buf.length >= 2) {
        chunks.push(buf);
      }
      buf = '';
      continue;
    }
    if (c === 0x0007) {
      buf += CELL_MARK;
      continue;
    }
    if (c >= 0x20 && c < 0xfffe && c !== 0xffff) {
      buf += String.fromCharCode(c);
    } else {
      if (buf.length >= 4) {
        chunks.push(buf);
      }
      buf = '';
    }
  }
  if (buf.length >= 4) {
    chunks.push(buf);
  }
  return cleanDocText(chunks.join('\n'));
}

function readFibFields(word: Uint8Array): { fc: number; lcb: number }[] | null {
  const view = u8ToDataView(word);
  if (word.length < 0x200 || view.getUint16(0, true) !== WORD_IDENT) {
    return null;
  }
  let offset = 32;
  if (offset + 2 > word.length) return null;
  const csw = view.getUint16(offset, true);
  offset += 2 + csw * 2;
  if (offset + 2 > word.length) return null;
  const cslw = view.getUint16(offset, true);
  offset += 2 + cslw * 4;
  if (offset + 2 > word.length) return null;
  const cbRgFcLcb = view.getUint16(offset, true);
  offset += 2;
  const fields: { fc: number; lcb: number }[] = [];
  for (let i = 0; i < cbRgFcLcb && offset + (i + 1) * 8 <= word.length; i++) {
    fields.push({
      fc: view.getUint32(offset + i * 8, true),
      lcb: view.getUint32(offset + i * 8 + 4, true),
    });
  }
  return fields;
}

function findClxLocation(word: Uint8Array, tableLen: number): { fcClx: number; lcbClx: number } | null {
  const fields = readFibFields(word);
  if (!fields) return null;
  for (const idx of [31, 33]) {
    const field = fields[idx];
    if (field && field.lcb >= 16 && field.fc + field.lcb <= tableLen) {
      return { fcClx: field.fc, lcbClx: field.lcb };
    }
  }
  return null;
}

function colorRefToCss(value: number): string {
  const r = value & 0xff;
  const g = (value >> 8) & 0xff;
  const b = (value >> 16) & 0xff;
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function cssFontFamily(name?: string): string | undefined {
  if (!name) return undefined;
  const safe = name.replace(/["';]/g, '').trim();
  if (!safe) return undefined;
  const generic = /times|roman|georgia|garamond|antiqua|mincho|serif/i.test(safe)
    ? 'serif'
    : 'sans-serif';
  return `'${safe}',${generic}`;
}

function icoToCss(ico: number): string | undefined {
  return WORD_ICO[ico];
}

function parseSttbFfn(data: Uint8Array): string[] {
  if (data.length < 6) return [];
  const view = u8ToDataView(data);
  let count = view.getUint16(0, true);
  let extra = view.getUint16(2, true);
  let offset = 4;
  if (count === 0xffff) {
    count = view.getUint16(2, true);
    extra = view.getUint16(4, true);
    offset = 6;
  }
  if (count < 1 || count > 128 || extra > 64) return [];
  const fonts: string[] = [];
  for (let i = 0; i < count && offset < data.length; i++) {
    const cbFfnM1 = data[offset];
    if (cbFfnM1 < 40 || offset + 1 + cbFfnM1 > data.length) return [];
    const ffn = data.subarray(offset, offset + 1 + cbFfnM1);
    let name = '';
    for (let j = 40; j + 1 < ffn.length; j += 2) {
      const c = ffn[j] | (ffn[j + 1] << 8);
      if (!c) break;
      if (c >= 32) name += String.fromCharCode(c);
    }
    fonts.push(name);
    offset += 1 + cbFfnM1 + extra;
  }
  return fonts.filter(Boolean);
}

function parseStylesheet(table: Uint8Array, field: { fc: number; lcb: number } | undefined, fonts: string[]): Map<string, DocChp> {
  const styles = new Map<string, DocChp>();
  if (!field?.lcb || field.fc + field.lcb > table.length) return styles;
  const data = table.subarray(field.fc, field.fc + field.lcb);
  const view = u8ToDataView(data);
  if (data.length < 6) return styles;
  const cbStshi = view.getUint16(0, true);
  const cstd = view.getUint16(2, true);
  const cbSTDBaseInFile = view.getUint16(4, true);
  if (cbStshi < 4 || cstd > 256 || cbSTDBaseInFile > 32) return styles;
  let offset = 2 + cbStshi;
  for (let i = 0; i < cstd && offset + 2 <= data.length; i++) {
    const cbStd = view.getUint16(offset, true);
    offset += 2;
    if (!cbStd) continue;
    if (offset + cbStd > data.length) break;
    const std = data.subarray(offset, offset + cbStd);
    offset += cbStd;
    const sv = u8ToDataView(std);
    const nameAt = Math.min(cbSTDBaseInFile, std.length);
    let name = '';
    if (nameAt + 2 <= std.length) {
      const nlen = sv.getUint16(nameAt, true);
      if (nlen > 0 && nlen < 80 && nameAt + 2 + nlen * 2 <= std.length) {
        for (let k = 0; k < nlen; k++) {
          const c = sv.getUint16(nameAt + 2 + k * 2, true);
          if (c >= 32) name += String.fromCharCode(c);
        }
      }
    }
    if (!name) continue;
    const chp: DocChp = {};
    for (let j = 0; j + 3 < std.length; j++) {
      const op = sv.getUint16(j, true);
      if (op === 0x4a43) {
        const hps = sv.getUint16(j + 2, true);
        if (hps >= 8 && hps <= 200) chp.size = hps / 2;
      } else if (op === 0x4a4f) {
        const ftc = sv.getUint16(j + 2, true);
        if (fonts[ftc]) chp.font = fonts[ftc];
      } else if (op === 0x2a42) {
        const css = icoToCss(std[j + 2]);
        if (css) chp.color = css;
      } else if (op === 0x6870 && j + 5 < std.length) {
        chp.color = colorRefToCss(sv.getUint32(j + 2, true));
      }
    }
    styles.set(name.toLowerCase(), chp);
  }
  return styles;
}

function collectFonts(table: Uint8Array, fields: { fc: number; lcb: number }[]): string[] {
  for (const field of fields) {
    if (!field.lcb || field.lcb < 48 || field.fc + field.lcb > table.length) continue;
    const fonts = parseSttbFfn(table.subarray(field.fc, field.fc + field.lcb));
    if (fonts.length >= 2) return fonts;
  }
  return [];
}

function buildDocTheme(styles: Map<string, DocChp>, fonts: string[]): LegacyDocTheme {
  const normal = styles.get('normal') ?? {};
  const title = styles.get('title') ?? styles.get('heading 1') ?? {};
  const h1 = styles.get('heading 1') ?? {};
  const h2 = styles.get('heading 2') ?? h1;
  const h3 = styles.get('heading 3') ?? h2;
  const heading = styles.get('heading') ?? h1;
  const link = styles.get('internet link') ?? styles.get('hyperlink') ?? {};
  const font = cssFontFamily(normal.font ?? fonts[0]) ?? "'Times New Roman',serif";
  const titleFont = cssFontFamily(title.font ?? normal.font ?? fonts[0]) ?? font;
  const headingFont = cssFontFamily(heading.font ?? h1.font ?? normal.font ?? fonts[0]) ?? font;
  return {
    font,
    size: normal.size ?? 12,
    color: normal.color ?? '#000000',
    titleFont,
    titleSize: title.size ?? h1.size ?? 18,
    titleColor: title.color ?? normal.color ?? '#000000',
    headingFont,
    heading2Size: h2.size ?? h1.size ?? 14,
    heading3Size: h3.size ?? 12,
    heading3Color: h3.color ?? normal.color ?? '#000000',
    linkColor: link.color ?? '#0000ff',
  };
}

function extractViaPieceTable(word: Uint8Array, table: Uint8Array): string | null {
  const clxLoc = findClxLocation(word, table.length);
  if (!clxLoc || clxLoc.fcClx + clxLoc.lcbClx > table.length) {
    return null;
  }
  const clx = table.subarray(clxLoc.fcClx, clxLoc.fcClx + clxLoc.lcbClx);
  const view = u8ToDataView(clx);
  let i = 0;
  while (i < clx.length) {
    const tag = clx[i];
    if (tag === 0x01) {
      if (i + 3 > clx.length) {
        return null;
      }
      const cbGrpprl = view.getUint16(i + 1, true);
      i += 3 + cbGrpprl;
      continue;
    }
    if (tag === 0x02) {
      break;
    }
    return null;
  }
  if (i >= clx.length || clx[i] !== 0x02 || i + 5 > clx.length) {
    return null;
  }
  const lcb = view.getUint32(i + 1, true);
  const plcPcdStart = i + 5;
  if (plcPcdStart + lcb > clx.length || lcb < 4) {
    return null;
  }
  const n = Math.floor((lcb - 4) / 12);
  if (n <= 0 || 4 * (n + 1) + 8 * n !== lcb) {
    return null;
  }
  let text = '';
  for (let p = 0; p < n; p++) {
    const cpStart = view.getUint32(plcPcdStart + p * 4, true);
    const cpEnd = view.getUint32(plcPcdStart + (p + 1) * 4, true);
    const charCount = cpEnd - cpStart;
    if (charCount <= 0 || charCount > 5_000_000) {
      continue;
    }
    const pcdOffset = plcPcdStart + 4 * (n + 1) + p * 8;
    const fcCompressed = view.getUint32(pcdOffset + 2, true);
    const fCompressed = (fcCompressed & 0x40000000) !== 0;
    const fc = fcCompressed & 0x3fffffff;
    if (fCompressed) {
      const byteFc = Math.floor(fc / 2);
      text += decodeCompressed(word, byteFc, byteFc + charCount);
    } else {
      text += decodeUnicode(word, fc, fc + charCount * 2);
    }
  }
  const cleaned = cleanDocText(text);
  return cleaned.length ? cleaned : null;
}

function extractSimpleRange(word: Uint8Array): string | null {
  const view = u8ToDataView(word);
  if (word.length < 0x20 || view.getUint16(0, true) !== WORD_IDENT) {
    return null;
  }
  const fcMin = view.getUint32(0x18, true);
  const fcMac = view.getUint32(0x1c, true);
  if (fcMac <= fcMin || fcMac > word.length) {
    return null;
  }
  const span = word.subarray(fcMin, fcMac);
  const uni = cleanDocText(decodeUnicode(span, 0, span.length));
  const cmp = cleanDocText(decodeCompressed(span, 0, span.length));
  if (uni.length >= cmp.length && uni.length > 0) {
    return uni;
  }
  return cmp.length ? cmp : null;
}

function splitCells(line: string): string[] {
  return line
    .split(CELL_MARK)
    .map(c => c.replace(/\t+/g, ' ').trim())
    .filter(Boolean);
}

function stripLeadDecor(text: string): string {
  const emoji = matchLeadingEmoji(text);
  let t = emoji ? text.slice(emoji.length) : text;
  t = t.replace(/^[\uFE0F\u200D\s]+/, '').trim();
  return t;
}

function isTocHeading(text: string): boolean {
  return /^(table of contents|contents)\s*$/i.test(stripLeadDecor(text));
}

function isNumberedSectionHeading(text: string): boolean {
  const t = stripLeadDecor(text);
  return /^\d{1,2}[.)]\s+\S.+/.test(t) && t.length < 120;
}

/** Emoji + numbered title under a letter section → h3 (marker comes from the file). */
function isEmojiNumberedHeading(text: string): boolean {
  const emoji = matchLeadingEmoji(text);
  if (!emoji) return false;
  const rest = text.slice(emoji.length).replace(/^\s+/, '');
  return /^\d{1,2}[.)]\s+\S.+/.test(rest) && text.length < 120;
}

function isLetterHeading(text: string): boolean {
  const t = stripLeadDecor(text);
  return /^[A-Z][.)]\s+\S/.test(t) && t.length < 80;
}

function isTitleCaseHeading(text: string): boolean {
  const t = stripLeadDecor(text);
  if (t.length < 3 || t.length > 60) return false;
  if (/[.!?:]$/.test(t)) return false;
  if (/^\d+[.)]/.test(t) || /^[A-Z][.)]/.test(t)) return false;
  if (isEmojiBullet(t) || isPlainBullet(t) || isArrowItem(t)) return false;
  const words = t.split(/\s+/);
  if (words.length > 8) return false;
  const titleish = words.filter(w => /^[A-Z0-9]/.test(w) || /^(and|or|of|for|to|in|a|an|the|&)$/i.test(w));
  return titleish.length >= Math.ceil(words.length * 0.7);
}

function isPlainBullet(text: string): boolean {
  return /^([-*•·▪◦–—])\s+\S/.test(text);
}

/** Bullet whose marker is whatever emoji the .doc used. */
function isEmojiBullet(text: string): boolean {
  if (isNumberedSectionHeading(text) || isEmojiNumberedHeading(text) || isTocHeading(text)) {
    return false;
  }
  const emoji = matchLeadingEmoji(text);
  if (!emoji) return false;
  const rest = text.slice(emoji.length);
  return /^\s+\S/.test(rest);
}

function isArrowItem(text: string): boolean {
  return /^[A-Za-z0-9./+-]{1,24}\s*(→|->|⇒)\s+\S/.test(text) && text.length < 100;
}

function isFormatTypeLine(text: string): boolean {
  // "PDF, DOCX (documents)" / "CSV, JSON, XML (data files)"
  return /^[A-Z0-9][A-Z0-9,/+\s-]{0,40}\([^)]{2,40}\)\s*$/.test(text) && text.length < 80;
}

function isShortListLine(text: string): boolean {
  if (text.length > 72 || /[.!?]$/.test(text)) return false;
  if (isNumberedSectionHeading(text) || isLetterHeading(text) || isTitleCaseHeading(text)) return false;
  if (isEmojiBullet(text) || isPlainBullet(text)) return false;
  if (isArrowItem(text) || isFormatTypeLine(text)) return false;
  if (text.includes(CELL_MARK) || /HYPERLINK\s+"/i.test(text)) return false;
  const words = text.split(/\s+/);
  return words.length >= 2 && words.length <= 10;
}

function splitEmojiMarker(text: string): ListItem {
  const trimmed = text.trim();
  const emoji = matchLeadingEmoji(trimmed);
  if (emoji) {
    return {
      marker: emoji,
      text: trimmed.slice(emoji.length).trim(),
    };
  }
  const space = trimmed.search(/\s/);
  if (space > 0 && space < trimmed.length - 1) {
    return {
      marker: trimmed.slice(0, space),
      text: trimmed.slice(space).trim(),
    };
  }
  return { text: trimmed.replace(/^([-*•·▪◦–—])\s+/, '') };
}

function isTocEntry(text: string): boolean {
  if (isNumberedSectionHeading(text) || isTocHeading(text) || isEmojiBullet(text)) {
    return false;
  }
  if (text.length > 100 || /[.!]$/.test(text)) {
    return false;
  }
  if (/^[IVXLCDM\d]+[.)]\s+\S/.test(text)) {
    return true;
  }
  if (/^[A-Z][.)]\s+\S/.test(text)) {
    return true;
  }
  const words = text.split(/\s+/);
  return words.length >= 2 && words.length <= 12;
}

function tryParseSmashedTypeUseCaseTable(text: string): DocBlock | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!/^file type\s+use case\b/i.test(normalized)) {
    return null;
  }
  const body = normalized.replace(/^file type\s+use case\s+/i, '');
  const typePattern =
    /(PDF|DOCX?|XLSX?|PPTX?|JPG\/PNG|JPEG|PNG|GIF|SVG|MP3\/MP4|MP3|MP4|WAV|AVI|CSV\/JSON|CSV|JSON|XML|ZIP|TXT)\b/gi;
  const matches = [...body.matchAll(typePattern)];
  if (matches.length < 2) {
    return null;
  }
  const rows: string[][] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? body.length) : body.length;
    const type = matches[i][0];
    const useCase = body.slice(start + type.length, end).trim();
    if (useCase) {
      rows.push([type, useCase]);
    }
  }
  if (rows.length < 2) {
    return null;
  }
  return { kind: 'table', headers: ['File Type', 'Use Case'], rows };
}

function collectDiscRun(
  paragraphs: string[],
  start: number,
  pred: (t: string) => boolean
): { items: ListItem[]; next: number } {
  const items: ListItem[] = [];
  let i = start;
  while (i < paragraphs.length && pred(paragraphs[i])) {
    items.push({ text: paragraphs[i].replace(/^([-*•·▪◦–—])\s+/, '') });
    i += 1;
  }
  return { items, next: i };
}

function structureParagraphs(paragraphs: string[]): DocBlock[] {
  const blocks: DocBlock[] = [];
  let i = 0;
  let seenBodySection = false;

  while (i < paragraphs.length) {
    const raw = paragraphs[i];

    if (raw.includes(CELL_MARK)) {
      const rows: string[][] = [];
      while (i < paragraphs.length && paragraphs[i].includes(CELL_MARK)) {
        const cells = splitCells(paragraphs[i]);
        if (cells.length) {
          rows.push(cells);
        }
        i += 1;
      }
      if (rows.length) {
        const colCount = Math.max(...rows.map(r => r.length));
        const normalized = rows.map(r => {
          const copy = [...r];
          while (copy.length < colCount) {
            copy.push('');
          }
          return copy;
        });
        const headers = normalized[0];
        const body = normalized.slice(1);
        blocks.push(
          body.length
            ? { kind: 'table', headers, rows: body }
            : {
                kind: 'table',
                headers: headers.map((_, idx) => `Column ${idx + 1}`),
                rows: [headers],
              }
        );
      }
      continue;
    }

    const smashed = tryParseSmashedTypeUseCaseTable(raw);
    if (smashed) {
      blocks.push(smashed);
      i += 1;
      continue;
    }

    if (i === 0) {
      blocks.push({ kind: 'title', text: raw });
      i += 1;
      continue;
    }

    if (isTocHeading(raw)) {
      blocks.push({ kind: 'heading', text: stripLeadDecor(raw), level: 2 });
      i += 1;
      const items: ListItem[] = [];
      while (i < paragraphs.length && isTocEntry(paragraphs[i])) {
        const entry = paragraphs[i]
          .replace(/^[IVXLCDM\d]+[.)]\s+/, '')
          .replace(/^[A-Z][.)]\s+/, '')
          .trim();
        if (entry) {
          items.push({ text: entry });
        }
        i += 1;
      }
      if (items.length) {
        blocks.push({ kind: 'list', style: 'ordered', items });
      }
      continue;
    }

    if (isNumberedSectionHeading(raw) && !isEmojiNumberedHeading(raw)) {
      seenBodySection = true;
      blocks.push({ kind: 'heading', text: stripLeadDecor(raw), level: 2 });
      i += 1;
      continue;
    }

    if (isEmojiNumberedHeading(raw)) {
      // Keep the document's emoji on the heading (e.g. "✅ 1. Testing…")
      blocks.push({ kind: 'heading', text: normalizeLine(raw), level: 3 });
      i += 1;
      continue;
    }

    if (isLetterHeading(raw)) {
      blocks.push({ kind: 'heading', text: stripLeadDecor(raw), level: 3 });
      i += 1;
      continue;
    }

    // After TOC / body started: short title-case lines → headings (Final Thoughts, CTA titles)
    if (seenBodySection && isTitleCaseHeading(raw)) {
      blocks.push({ kind: 'heading', text: stripLeadDecor(raw), level: 2 });
      i += 1;
      continue;
    }

    if (isEmojiBullet(raw)) {
      const items: ListItem[] = [];
      while (
        i < paragraphs.length &&
        isEmojiBullet(paragraphs[i]) &&
        !isNumberedSectionHeading(paragraphs[i])
      ) {
        items.push(splitEmojiMarker(paragraphs[i]));
        i += 1;
      }
      blocks.push({ kind: 'list', style: 'emoji', items });
      continue;
    }

    if (isPlainBullet(raw)) {
      const { items, next } = collectDiscRun(paragraphs, i, isPlainBullet);
      blocks.push({ kind: 'list', style: 'disc', items });
      i = next;
      continue;
    }

    if (isArrowItem(raw)) {
      const { items, next } = collectDiscRun(paragraphs, i, isArrowItem);
      blocks.push({ kind: 'list', style: 'disc', items });
      i = next;
      continue;
    }

    if (isFormatTypeLine(raw)) {
      const { items, next } = collectDiscRun(paragraphs, i, isFormatTypeLine);
      if (items.length >= 2) {
        blocks.push({ kind: 'list', style: 'disc', items });
        i = next;
        continue;
      }
    }

    // Short consecutive phrases after an intro colon / "ensures…" → disc list
    if (isShortListLine(raw) && i + 1 < paragraphs.length && isShortListLine(paragraphs[i + 1])) {
      const { items, next } = collectDiscRun(paragraphs, i, isShortListLine);
      if (items.length >= 2) {
        blocks.push({ kind: 'list', style: 'disc', items });
        i = next;
        continue;
      }
    }

    blocks.push({ kind: 'paragraph', text: raw });
    i += 1;
  }

  return blocks;
}

function emphasizeCheckItem(text: string): string {
  // "Speed up testing You don't…" / em-dash leads
  const dash = text.match(/^([^—–\-]{2,48})\s*[—–\-]\s+([\s\S]+)$/);
  if (dash) {
    return `<strong>${escapeHtml(dash[1].trim())}</strong> — ${formatInline(dash[2], false)}`;
  }
  const m = text.match(
    /^((?:[A-Z][\w'/&-]*)(?:\s+[A-Za-z][\w'/&-]*){0,5})\s+((?:You|Your|Avoid|Sample|They|It|This|These|A|An|The|Same|Don't|Do|Use|Try|Check|Test|Everyone|Real)\b[\s\S]*)$/
  );
  if (m) {
    return `<strong>${escapeHtml(m[1])}</strong> ${formatInline(m[2], false)}`;
  }
  const colon = text.match(/^([^:]{2,48}):\s+([\s\S]+)$/);
  if (colon) {
    return `<strong>${escapeHtml(colon[1])}</strong> ${formatInline(colon[2], false)}`;
  }
  return formatInline(text, false);
}

/** Convert Word HYPERLINK field leftovers into anchors. */
function rewriteHyperlinkFields(escaped: string): string {
  // HYPERLINK "url"display  (display may abut the closing quote)
  return escaped.replace(
    /HYPERLINK\s+&quot;([^&]+?)&quot;(\s*)([^<]*?)(?=(?:\s*HYPERLINK\s+&quot;)|$)/gi,
    (_m, url: string, _sp: string, display: string) => {
      const href = url.trim();
      const label = (display || href).trim() || href;
      if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
        return escapeHtml(`${href} ${label}`.trim());
      }
      return `<a class="legacy-doc__link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
  );
}

function formatInline(text: string, emphasizeLead = true): string {
  let s = escapeHtml(text);
  s = rewriteHyperlinkFields(s);

  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?]|$)/g, '$1<em>$2</em>');

  s = s.replace(/(\((?:also called|aka|i\.e\.,?)[^)]+\))/gi, '<em>$1</em>');

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Emphasize a short quoted importance phrase before a comma list
  s = s.replace(/\b(why [a-z0-9][a-z0-9\s-]{2,40} matter)\b/gi, '<strong>$1</strong>');

  if (emphasizeLead) {
    s = s.replace(/^([^:<]{2,48})(:\s+)/, '<strong>$1</strong>$2');
  }

  return s;
}

export function parseLegacyDoc(data: ArrayBuffer): LegacyDocPreview {
  const word = readOleStream(data, 'WordDocument');
  if (!word?.length) {
    throw new Error('Not a valid Word .doc (missing WordDocument stream)');
  }

  const table = readOleStreamAny(data, ['1Table', '0Table']) ?? new Uint8Array(0);
  const structured =
    (table.length ? extractViaPieceTable(word, table) : null) ?? extractSimpleRange(word);
  const text = structured ?? heuristicUnicodeExtract(word);
  if (!text) {
    throw new Error('Could not extract text from .doc');
  }

  const fields = readFibFields(word) ?? [];
  const fonts = table.length ? collectFonts(table, fields) : [];
  const styles = table.length ? parseStylesheet(table, fields[0], fonts) : new Map<string, DocChp>();
  const theme = buildDocTheme(styles, fonts);

  return {
    text,
    paragraphs: paragraphsFromText(text),
    theme,
  };
}

function chpStyle(parts: { font?: string; size?: number; color?: string }): string {
  const css: string[] = [];
  if (parts.font) css.push(`font-family:${parts.font}`);
  if (parts.size) css.push(`font-size:${parts.size}pt`);
  if (parts.color) css.push(`color:${parts.color}`);
  return css.join(';');
}

export function legacyDocToHtml(preview: LegacyDocPreview): string {
  const theme = preview.theme;
  const blocks = structureParagraphs(preview.paragraphs);
  const body = blocks
    .map(block => {
      switch (block.kind) {
        case 'title':
          return `<h1 class="legacy-doc__title" style="${chpStyle({
            font: theme?.titleFont,
            size: theme?.titleSize,
            color: theme?.titleColor,
          })}">${escapeHtml(block.text)}</h1>`;
        case 'heading': {
          const size = block.level === 3 ? theme?.heading3Size : theme?.heading2Size;
          const color = block.level === 3 ? theme?.heading3Color : theme?.color;
          return `<h${block.level} class="legacy-doc__heading legacy-doc__heading--h${block.level}" style="${chpStyle({
            font: theme?.headingFont,
            size,
            color,
          })}">${escapeHtml(block.text)}</h${block.level}>`;
        }
        case 'paragraph':
          return `<p class="legacy-doc__p">${formatInline(block.text)}</p>`;
        case 'list': {
          if (block.style === 'emoji') {
            const items = block.items
              .map(item => {
                const marker = item.marker ?? '•';
                const content = emphasizeCheckItem(item.text);
                return `<li class="legacy-doc__emoji-item"><span class="legacy-doc__emoji" aria-hidden="true">${marker}</span><span class="legacy-doc__emoji-text">${content}</span></li>`;
              })
              .join('');
            return `<ul class="legacy-doc__list legacy-doc__list--emoji">${items}</ul>`;
          }
          const tag = block.style === 'ordered' ? 'ol' : 'ul';
          const mod = block.style === 'ordered' ? ' legacy-doc__list--toc' : ' legacy-doc__list--disc';
          const items = block.items
            .map(item => `<li>${formatInline(item.text, false)}</li>`)
            .join('');
          return `<${tag} class="legacy-doc__list${mod}">${items}</${tag}>`;
        }
        case 'table': {
          const head = block.headers
            .map(h => `<th scope="col">${escapeHtml(h)}</th>`)
            .join('');
          const rows = block.rows
            .map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
            .join('');
          return `<div class="legacy-doc__table-wrap"><table class="legacy-doc__table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
        }
        default:
          return '';
      }
    })
    .join('');
  const articleStyle = theme
    ? chpStyle({ font: theme.font, size: theme.size, color: theme.color }) +
      `;--doc-font:${theme.font};--doc-size:${theme.size}pt;--doc-color:${theme.color};--doc-link:${theme.linkColor}`
    : '';
  return `<article class="legacy-doc" style="${articleStyle}">${body}</article>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
