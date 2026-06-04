/**
 * 时间文本（字幕 / 歌词）解析器
 * 支持：SRT、WebVTT、LRC、Enhanced LRC (ELRC)、ASS / SSA、TTML
 * 不依赖任何第三方库
 */

export type SubtitleFormat = 'srt' | 'vtt' | 'lrc' | 'elrc' | 'ass' | 'ssa' | 'ttml';

/** ELRC 的逐字时间戳片段 */
export interface SubtitleWord {
  /** 该词起始时间（秒） */
  start: number;
  /** 词文本 */
  text: string;
}

export interface SubtitleCue {
  /** 索引（SRT 为数字字符串；VTT 可选；其他格式可空） */
  id?: string;
  /** 起始时间（秒） */
  start: number;
  /** 结束时间（秒） */
  end: number;
  /** 纯文本（多行合并，保留换行） */
  text: string;
  /** 增强歌词（ELRC）的逐字时间戳 */
  words?: SubtitleWord[];
  /** ASS / SSA 的样式名 */
  style?: string;
}

export interface SubtitleParseResult {
  format: SubtitleFormat;
  cues: SubtitleCue[];
  /** WebVTT / ASS 的头部注释或元数据（可选） */
  header?: string;
  /** LRC / ELRC 的元数据（ti / ar / al / by / offset / length 等） */
  metadata?: Record<string, string>;
}

/**
 * 将 "HH:MM:SS,ms" 或 "HH:MM:SS.ms" 或 "MM:SS.ms" 时间戳转为秒数
 */
function parseTimestamp(ts: string): number {
  const cleaned = ts.trim().replace(',', '.');
  const parts = cleaned.split(':').map((p) => p.trim());
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return Number(m) * 60 + Number(s);
  }
  return Number(cleaned) || 0;
}

/**
 * 格式化秒数为 HH:MM:SS.mmm
 */
export function formatSubtitleTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00:00.000';
  const total = Math.floor(seconds * 1000);
  const ms = total % 1000;
  const s = Math.floor(total / 1000) % 60;
  const m = Math.floor(total / 60000) % 60;
  const h = Math.floor(total / 3600000);
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

const TIME_LINE_RE = /(\d{1,2}:)?\d{1,2}:\d{1,2}[.,]\d{1,3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{1,2}[.,]\d{1,3}/;
const LRC_TAG_RE = /^\s*\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]/;

/**
 * 自动检测格式
 */
function detectFormat(text: string): SubtitleFormat {
  const trimmed = text.replace(/^\uFEFF/, '').trimStart();
  if (/^WEBVTT/.test(trimmed)) return 'vtt';
  if (/^<\?xml/i.test(trimmed) || /<tt\b[^>]*>/i.test(trimmed)) return 'ttml';
  if (/^\[Script Info\]/im.test(trimmed) || /^Dialogue:/m.test(trimmed)) {
    // SSA 通常以 "ScriptType: v4.00" 标识，ASS 是 "v4.00+"
    if (/ScriptType:\s*v4\.00\s*$/im.test(trimmed)) return 'ssa';
    return 'ass';
  }
  if (LRC_TAG_RE.test(trimmed) || /^\[(ti|ar|al|au|by|length|offset|re|ve):/im.test(trimmed)) {
    if (/<\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?>/.test(trimmed)) return 'elrc';
    return 'lrc';
  }
  return 'srt';
}

/**
 * 解析 SRT / WebVTT
 */
function parseSrtVtt(text: string, format: 'srt' | 'vtt'): SubtitleParseResult {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');
  const cues: SubtitleCue[] = [];
  let header: string | undefined;
  let i = 0;

  if (format === 'vtt') {
    const headerLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      headerLines.push(lines[i]);
      i++;
    }
    header = headerLines.join('\n');
    while (i < lines.length && lines[i].trim() === '') i++;
  }

  while (i < lines.length) {
    while (i < lines.length && lines[i].trim() === '') i++;
    if (i >= lines.length) break;

    let id: string | undefined;
    let timeLine: string | null = null;

    if (TIME_LINE_RE.test(lines[i])) {
      timeLine = lines[i];
      i++;
    } else {
      id = lines[i].trim() || undefined;
      i++;
      if (i < lines.length && TIME_LINE_RE.test(lines[i])) {
        timeLine = lines[i];
        i++;
      } else {
        continue;
      }
    }

    if (!timeLine) continue;
    const match = timeLine.match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
    if (!match) continue;
    const start = parseTimestamp(match[1]);
    const end = parseTimestamp(match[2]);

    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i]);
      i++;
    }

    cues.push({ id, start, end, text: textLines.join('\n') });
  }

  return { format, cues, header };
}

/**
 * 解析 LRC 时间戳 [mm:ss.xx] / [mm:ss.xxx]
 */
function parseLrcStamp(min: string, sec: string, frac?: string): number {
  const m = Number(min);
  const s = Number(sec);
  let ms = 0;
  if (frac) {
    // 支持两位（厘秒）或三位（毫秒），不足右侧补 0
    const padded = (frac + '000').slice(0, 3);
    ms = Number(padded);
  }
  return m * 60 + s + ms / 1000;
}

interface LrcMetaCollector {
  metadata: Record<string, string>;
  offsetMs: number;
}

function parseLrcMeta(line: string, collector: LrcMetaCollector): boolean {
  const meta = /^\[(ti|ar|al|au|by|length|offset|re|ve):(.*)\]$/i.exec(line.trim());
  if (!meta) return false;
  const key = meta[1].toLowerCase();
  const value = meta[2].trim();
  collector.metadata[key] = value;
  if (key === 'offset') {
    const n = Number(value);
    if (!isNaN(n)) collector.offsetMs = n;
  }
  return true;
}

/**
 * 解析 LRC（基础歌词）
 */
function parseLrc(text: string): SubtitleParseResult {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');
  const collector: LrcMetaCollector = { metadata: {}, offsetMs: 0 };
  const stampRe = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  type Pre = { start: number; text: string };
  const pre: Pre[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (parseLrcMeta(line, collector)) continue;

    // 收集行首所有时间戳（一行可能对应多个时间）
    const stamps: number[] = [];
    let cursor = 0;
    stampRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = stampRe.exec(line)) !== null) {
      if (m.index !== cursor) break;
      stamps.push(parseLrcStamp(m[1], m[2], m[3]));
      cursor = m.index + m[0].length;
    }
    if (stamps.length === 0) continue;
    const lyric = line.slice(cursor).trim();
    for (const start of stamps) {
      pre.push({ start, text: lyric });
    }
  }

  pre.sort((a, b) => a.start - b.start);
  const offset = collector.offsetMs / 1000;
  const cues: SubtitleCue[] = pre.map((p, i) => {
    const start = Math.max(0, p.start - offset);
    const next = pre[i + 1];
    const end = next ? Math.max(start, next.start - offset) : start + 5;
    return { start, end, text: p.text };
  });

  return { format: 'lrc', cues, metadata: collector.metadata };
}

/**
 * 解析 ELRC（增强 LRC，支持逐字时间戳）
 */
function parseElrc(text: string): SubtitleParseResult {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');
  const collector: LrcMetaCollector = { metadata: {}, offsetMs: 0 };
  const stampRe = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  const wordRe = /<(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?>/g;

  type Pre = { start: number; raw: string };
  const pre: Pre[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (parseLrcMeta(line, collector)) continue;

    const stamps: number[] = [];
    let cursor = 0;
    stampRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = stampRe.exec(line)) !== null) {
      if (m.index !== cursor) break;
      stamps.push(parseLrcStamp(m[1], m[2], m[3]));
      cursor = m.index + m[0].length;
    }
    if (stamps.length === 0) continue;
    const raw = line.slice(cursor);
    for (const start of stamps) {
      pre.push({ start, raw });
    }
  }

  pre.sort((a, b) => a.start - b.start);
  const offset = collector.offsetMs / 1000;

  const cues: SubtitleCue[] = pre.map((p, i) => {
    const words: SubtitleWord[] = [];
    let plain = '';
    let cursor = 0;
    let pendingTime: number | null = null;
    wordRe.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = wordRe.exec(p.raw)) !== null) {
      const before = p.raw.slice(cursor, m.index);
      if (pendingTime !== null && before) {
        words.push({ start: Math.max(0, pendingTime - offset), text: before });
      }
      plain += before;
      pendingTime = parseLrcStamp(m[1], m[2], m[3]);
      cursor = m.index + m[0].length;
    }
    const tail = p.raw.slice(cursor);
    if (pendingTime !== null && tail) {
      words.push({ start: Math.max(0, pendingTime - offset), text: tail });
    }
    plain += tail;

    const start = Math.max(0, p.start - offset);
    const next = pre[i + 1];
    const end = next ? Math.max(start, next.start - offset) : start + 5;
    return {
      start,
      end,
      text: plain.trim(),
      words: words.length ? words : undefined,
    };
  });

  return { format: 'elrc', cues, metadata: collector.metadata };
}

/**
 * 解析 ASS / SSA 时间戳 H:MM:SS.cs
 */
function parseAssTime(s: string): number {
  const parts = s.trim().split(':');
  if (parts.length !== 3) return 0;
  return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2].replace(',', '.'));
}

/**
 * 解析 ASS / SSA
 */
function parseAss(text: string, format: 'ass' | 'ssa'): SubtitleParseResult {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');

  let section = '';
  let formatFields: string[] = [];
  const cues: SubtitleCue[] = [];
  const headerLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();

    const sectionMatch = /^\[([^\]]+)\]\s*$/.exec(trimmed);
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      headerLines.push(line);
      continue;
    }

    if (section !== 'events') {
      headerLines.push(line);
      continue;
    }

    const fmtMatch = /^Format:\s*(.+)$/i.exec(trimmed);
    if (fmtMatch) {
      formatFields = fmtMatch[1].split(',').map((s) => s.trim());
      continue;
    }

    const evMatch = /^(Dialogue|Comment):\s*(.+)$/i.exec(trimmed);
    if (!evMatch) continue;
    if (evMatch[1].toLowerCase() === 'comment') continue;
    if (formatFields.length === 0) continue;

    // Text 字段是最后一项，可能含逗号 → 用 split 限制次数
    const n = formatFields.length;
    const parts = evMatch[2].split(',');
    const head = parts.slice(0, n - 1);
    const tail = parts.slice(n - 1).join(',');
    const obj: Record<string, string> = {};
    formatFields.forEach((f, idx) => {
      obj[f] = idx === n - 1 ? tail : head[idx] ?? '';
    });

    const start = parseAssTime(obj.Start || '');
    const end = parseAssTime(obj.End || '');
    const cleanText = (obj.Text || '')
      .replace(/\\N/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\h/g, ' ')
      .replace(/\{[^}]*\}/g, ''); // 去掉样式覆盖码

    cues.push({ start, end, text: cleanText, style: obj.Style });
  }

  cues.sort((a, b) => a.start - b.start);

  return {
    format,
    cues,
    header: headerLines.join('\n').trim() || undefined,
  };
}

/**
 * 解析 TTML 时间值（h / m / s / ms 或 HH:MM:SS.mmm）
 */
function parseTtmlTime(value: string): number {
  const v = value.trim();
  if (!v) return 0;
  const unit = /^(\d+(?:\.\d+)?)(h|m|s|ms|f|t)$/i.exec(v);
  if (unit) {
    const n = Number(unit[1]);
    const u = unit[2].toLowerCase();
    if (u === 'h') return n * 3600;
    if (u === 'm') return n * 60;
    if (u === 'ms') return n / 1000;
    if (u === 's') return n;
    // f / t (frames / ticks) 没有上下文无法精确换算，按秒近似
    return n;
  }
  const parts = v.split(':');
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return Number(v) || 0;
}

/**
 * 解码常见 XML/HTML 实体（仅用于正则回退路径）
 */
function decodeXmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * 正则提取 TTML 的 <p> 字幕条目。
 *
 * 仅用于 DOMParser 严格 XML 解析失败时的兜底。不依赖 DOM，可避免 HTML 解析模式下
 * TTML 中自闭合 <style xml:id="..."/> 被当作 HTML <style> 而吞掉后续 <body> 的问题。
 */
function parseTtmlByRegex(text: string): SubtitleParseResult {
  const cues: SubtitleCue[] = [];
  const re = /<(?:[\w-]+:)?p\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?p\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const attrs = m[1];
    const inner = m[2];
    const beginAttr = /\bbegin\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || '';
    const endAttr = /\bend\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || '';
    const durAttr = /\bdur\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] || '';
    const start = parseTtmlTime(beginAttr);
    let end: number;
    if (endAttr) end = parseTtmlTime(endAttr);
    else if (durAttr) end = start + parseTtmlTime(durAttr);
    else end = start + 5;

    const textContent = decodeXmlEntities(
      inner.replace(/<(?:[\w-]+:)?br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
    )
      .replace(/[ \t]+/g, ' ')
      .replace(/\n /g, '\n')
      .trim();

    if (textContent || start || end) {
      cues.push({ start, end, text: textContent });
    }
  }
  cues.sort((a, b) => a.start - b.start);
  return { format: 'ttml', cues };
}

/**
 * 解析 TTML / DFXP
 *
 * 优先用 DOMParser 走严格 XML 解析。解析失败、或解析后未提取到任何 <p> 时，
 * 走正则兜底（不使用 text/html 兜底：HTML5 解析器会把 TTML 中常见的自闭合
 * <style ... /> 视作 HTML <style> 开标签，导致后续 <body> 内容被当作 CSS 吞掉）。
 */
function parseTtml(text: string): SubtitleParseResult {
  const cleaned = text.replace(/^\uFEFF/, '');

  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(cleaned, 'application/xml');
    const parserError = doc.getElementsByTagName('parsererror');
    if (parserError.length === 0) {
      const ps = doc.getElementsByTagNameNS
        ? doc.getElementsByTagNameNS('*', 'p')
        : doc.getElementsByTagName('p');
      if (ps.length > 0) {
        const cues: SubtitleCue[] = [];
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i];
          const begin = p.getAttribute('begin') || '';
          const endAttr = p.getAttribute('end') || '';
          const dur = p.getAttribute('dur') || '';
          const start = parseTtmlTime(begin);
          let end: number;
          if (endAttr) {
            end = parseTtmlTime(endAttr);
          } else if (dur) {
            end = start + parseTtmlTime(dur);
          } else {
            end = start + 5;
          }

          let textParts = '';
          p.childNodes.forEach((node) => {
            if (node.nodeType === 3) {
              textParts += node.nodeValue || '';
            } else if (node.nodeType === 1) {
              const el = node as Element;
              const local = (el.localName || el.tagName).toLowerCase();
              if (local === 'br') {
                textParts += '\n';
              } else {
                textParts += el.textContent || '';
              }
            }
          });
          const cueText = textParts.replace(/[ \t]+/g, ' ').replace(/\n /g, '\n').trim();
          if (cueText || start || end) {
            cues.push({ start, end, text: cueText });
          }
        }
        cues.sort((a, b) => a.start - b.start);
        return { format: 'ttml', cues };
      }
    }
  }

  return parseTtmlByRegex(cleaned);
}

/**
 * 解析时间文本（字幕 / 歌词）。
 * 自动识别格式，也可通过 format 参数显式指定。
 */
export function parseSubtitle(text: string, format?: SubtitleFormat): SubtitleParseResult {
  const detected = format ?? detectFormat(text);
  switch (detected) {
    case 'lrc':
      return parseLrc(text);
    case 'elrc':
      return parseElrc(text);
    case 'ass':
      return parseAss(text, 'ass');
    case 'ssa':
      return parseAss(text, 'ssa');
    case 'ttml':
      return parseTtml(text);
    case 'vtt':
      return parseSrtVtt(text, 'vtt');
    case 'srt':
    default:
      return parseSrtVtt(text, 'srt');
  }
}
