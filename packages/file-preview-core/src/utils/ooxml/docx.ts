/**
 * Read fonts / sizes / colors from a .docx (styles.xml + theme).
 * HTML conversion is done by mammoth in the framework renderers.
 */
import { loadZip } from '../zipReader';
import { attr, deepKids, kid, parseXml, type XmlNode } from './xml';
import { findZipEntry, readZipTextLoose } from './zip';

export interface DocxTheme {
  font?: string;
  size?: number;
  color?: string;
  titleFont?: string;
  titleSize?: number;
  titleColor?: string;
  headingFont?: string;
  heading1Size?: number;
  heading2Size?: number;
  heading3Size?: number;
  heading3Color?: string;
  linkColor?: string;
}

export const DOCX_MAMMOTH_STYLE_MAP = [
  "p[style-name='Title'] => h1.ooxml-doc__title:fresh",
  "p[style-name='Heading 1'] => h1.ooxml-doc__heading.ooxml-doc__heading--h1:fresh",
  "p[style-name='Heading 2'] => h2.ooxml-doc__heading.ooxml-doc__heading--h2:fresh",
  "p[style-name='Heading 3'] => h3.ooxml-doc__heading.ooxml-doc__heading--h3:fresh",
  "r[style-name='Internet Link'] => a.ooxml-doc__link",
  "r[style-name='Hyperlink'] => a.ooxml-doc__link",
];

interface RunChp {
  font?: string;
  size?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

interface StyleRec {
  id: string;
  name: string;
  basedOn?: string;
  rPr?: RunChp;
}

const THEME_SLOT: Record<string, string> = {
  dark1: 'dk1',
  light1: 'lt1',
  dark2: 'dk2',
  light2: 'lt2',
  accent1: 'accent1',
  accent2: 'accent2',
  accent3: 'accent3',
  accent4: 'accent4',
  accent5: 'accent5',
  accent6: 'accent6',
  hyperlink: 'hlink',
  followedhyperlink: 'folHlink',
};

function firstFont(raw?: string): string | undefined {
  if (!raw) return undefined;
  const name = raw.split(';')[0].trim();
  return name || undefined;
}

function cssFont(name: string): string {
  const safe = name.replace(/['"\\]/g, '');
  const generic = /arial|helvetica|calibri|candara|segoe|verdana|tahoma|trebuchet|gill|sans/i.test(
    safe
  )
    ? 'sans-serif'
    : /consolas|courier|mono/i.test(safe)
      ? 'monospace'
      : 'serif';
  return `'${safe}',${generic}`;
}

function hexColor(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.replace('#', '').trim();
  if (!v || /^(auto|none)$/i.test(v)) return undefined;
  if (/^[0-9a-fA-F]{3,8}$/.test(v)) return `#${v.length === 3 || v.length === 4 ? v : v.slice(0, 6)}`;
  return undefined;
}

function mixToward(hex: string, toward: [number, number, number], amount: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const t = Math.min(1, Math.max(0, amount));
  const ch = (c: number, d: number) => Math.round(c + (d - c) * t);
  return `#${[ch(r, toward[0]), ch(g, toward[1]), ch(b, toward[2])]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

function onOff(node: XmlNode | undefined): boolean | undefined {
  if (!node) return undefined;
  const val = (attr(node, 'val') ?? '').toLowerCase();
  if (val === '0' || val === 'false' || val === 'off') return false;
  return true;
}

function childAttr(parent: XmlNode | undefined, childName: string, name: string): string | undefined {
  if (!parent) return undefined;
  const child = kid(parent, childName);
  return child ? attr(child, name) : undefined;
}

function mergeChp(...parts: Array<RunChp | undefined>): RunChp {
  const out: RunChp = {};
  for (const part of parts) {
    if (!part) continue;
    if (part.font) out.font = part.font;
    if (part.size != null) out.size = part.size;
    if (part.color) out.color = part.color;
    if (part.bold != null) out.bold = part.bold;
    if (part.italic != null) out.italic = part.italic;
    if (part.underline != null) out.underline = part.underline;
  }
  return out;
}

function parseThemeColors(xml: string | null): Record<string, string> {
  const colors: Record<string, string> = {};
  if (!xml) return colors;
  const scheme = deepKids(parseXml(xml), 'clrScheme')[0];
  if (!scheme) return colors;
  for (const slot of scheme.children) {
    const srgb = kid(slot, 'srgbClr');
    const sys = kid(slot, 'sysClr');
    const val = hexColor(srgb ? attr(srgb, 'val') : sys ? attr(sys, 'lastClr') : undefined);
    if (val) colors[slot.name] = val;
  }
  return colors;
}

function resolveThemeColor(
  themeColors: Record<string, string>,
  themeColor?: string,
  tint?: string,
  shade?: string
): string | undefined {
  if (!themeColor) return undefined;
  const slot = THEME_SLOT[themeColor.toLowerCase()] ?? themeColor;
  let hex = themeColors[slot];
  if (!hex) return undefined;
  if (tint) hex = mixToward(hex, [255, 255, 255], parseInt(tint, 16) / 255);
  if (shade) hex = mixToward(hex, [0, 0, 0], parseInt(shade, 16) / 255);
  return hex;
}

function parseRpr(rPr: XmlNode | undefined, themeColors: Record<string, string>): RunChp {
  if (!rPr) return {};
  const fonts = kid(rPr, 'rFonts');
  const color = kid(rPr, 'color');
  const sz = kid(rPr, 'sz') ?? kid(rPr, 'szCs');
  const underline = kid(rPr, 'u');
  const chp: RunChp = {
    font: firstFont(
      fonts
        ? attr(fonts, 'ascii') ?? attr(fonts, 'hAnsi') ?? attr(fonts, 'cs') ?? attr(fonts, 'eastAsia')
        : undefined
    ),
    size: sz ? Number(attr(sz, 'val')) / 2 : undefined,
    color:
      hexColor(color ? attr(color, 'val') : undefined) ??
      resolveThemeColor(
        themeColors,
        color ? attr(color, 'themeColor') : undefined,
        color ? attr(color, 'themeTint') : undefined,
        color ? attr(color, 'themeShade') : undefined
      ),
    bold: onOff(kid(rPr, 'b')),
    italic: onOff(kid(rPr, 'i')),
  };
  if (underline) {
    const val = (attr(underline, 'val') ?? 'single').toLowerCase();
    chp.underline = val !== 'none' && val !== 'false' && val !== '0';
  }
  if (!chp.size || Number.isNaN(chp.size)) delete chp.size;
  return chp;
}

function parseStyles(xml: string | null, themeColors: Record<string, string>): {
  styles: Map<string, StyleRec>;
  defaults: RunChp;
} {
  const styles = new Map<string, StyleRec>();
  let defaults: RunChp = {};
  if (!xml) return { styles, defaults };
  const root = parseXml(xml);
  const docDefaults = deepKids(root, 'rPrDefault')[0];
  defaults = parseRpr(docDefaults ? kid(docDefaults, 'rPr') ?? docDefaults : undefined, themeColors);
  for (const node of deepKids(root, 'style')) {
    const id = attr(node, 'styleId');
    if (!id) continue;
    styles.set(id, {
      id,
      name: childAttr(node, 'name', 'val') ?? id,
      basedOn: childAttr(node, 'basedOn', 'val'),
      rPr: parseRpr(kid(node, 'rPr'), themeColors),
    });
  }
  return { styles, defaults };
}

function resolveStyle(
  styles: Map<string, StyleRec>,
  cache: Map<string, RunChp>,
  id?: string
): RunChp {
  if (!id) return {};
  const cached = cache.get(id);
  if (cached) return cached;
  const rec = styles.get(id);
  if (!rec) {
    cache.set(id, {});
    return {};
  }
  const parent = rec.basedOn && rec.basedOn !== id ? resolveStyle(styles, cache, rec.basedOn) : {};
  const merged = mergeChp(parent, rec.rPr);
  cache.set(id, merged);
  return merged;
}

function findStyleId(styles: Map<string, StyleRec>, name: string): string | undefined {
  const want = name.toLowerCase();
  for (const rec of styles.values()) {
    if (rec.name.toLowerCase() === want || rec.id.toLowerCase() === want.replace(/\s+/g, '')) {
      return rec.id;
    }
  }
  return undefined;
}

export function docxThemeToCssVars(theme: DocxTheme): Record<string, string> {
  const style: Record<string, string> = { 'line-height': '1.8' };
  if (theme.font) {
    style['font-family'] = theme.font;
    style['--docx-font'] = theme.font;
  }
  if (theme.size) {
    style['font-size'] = `${theme.size}pt`;
    style['--docx-size'] = `${theme.size}pt`;
  }
  if (theme.color) {
    style.color = theme.color;
    style['--docx-color'] = theme.color;
  }
  if (theme.titleFont) style['--docx-title-font'] = theme.titleFont;
  if (theme.titleSize) style['--docx-title-size'] = `${theme.titleSize}pt`;
  if (theme.titleColor) style['--docx-title-color'] = theme.titleColor;
  if (theme.headingFont) style['--docx-heading-font'] = theme.headingFont;
  if (theme.heading1Size) style['--docx-h1-size'] = `${theme.heading1Size}pt`;
  if (theme.heading2Size) style['--docx-h2-size'] = `${theme.heading2Size}pt`;
  if (theme.heading3Size) style['--docx-h3-size'] = `${theme.heading3Size}pt`;
  if (theme.heading3Color) style['--docx-h3-color'] = theme.heading3Color;
  if (theme.linkColor) style['--docx-link'] = theme.linkColor;
  return style;
}

export async function readDocxTheme(data: ArrayBuffer): Promise<DocxTheme> {
  const zip = await loadZip(data);
  if (!findZipEntry(zip, 'word/document.xml')) {
    throw new Error('Not a valid .docx (missing word/document.xml)');
  }
  const [stylesXml, themeXml] = await Promise.all([
    readZipTextLoose(zip, 'word/styles.xml'),
    readZipTextLoose(zip, 'theme1.xml'),
  ]);
  const themeColors = parseThemeColors(themeXml);
  const { styles, defaults } = parseStyles(stylesXml, themeColors);
  const cache = new Map<string, RunChp>();
  const pick = (name: string) =>
    mergeChp(defaults, resolveStyle(styles, cache, findStyleId(styles, name)));
  const normal = pick('Normal');
  const title = pick('Title');
  const h1 = pick('Heading 1');
  const h2 = pick('Heading 2');
  const h3 = pick('Heading 3');
  const link = mergeChp(
    resolveStyle(styles, cache, 'InternetLink'),
    resolveStyle(styles, cache, 'Hyperlink')
  );
  return {
    font: normal.font ? cssFont(normal.font) : undefined,
    size: normal.size,
    color: normal.color,
    titleFont: title.font ? cssFont(title.font) : undefined,
    titleSize: title.size,
    titleColor: title.color,
    headingFont: h1.font ? cssFont(h1.font) : undefined,
    heading1Size: h1.size,
    heading2Size: h2.size,
    heading3Size: h3.size,
    heading3Color: h3.color,
    linkColor: link.color,
  };
}
