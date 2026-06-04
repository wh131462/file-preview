import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parse } from 'opentype.js';
import type { Font as OpentypeFont } from 'opentype.js';
import { useTranslator } from '../../i18n/LocaleContext';
import { useFetcher } from '../../RequestContext';
import { useResolvedTheme } from '../../ThemeContext';
import { RendererError } from '../RendererError';

// 字体文件魔数：用首 4 字节判断格式，比扩展名更可靠
const MAGIC_WOFF2 = 0x774f4632; // 'wOF2'
const MAGIC_WOFF = 0x774f4646;  // 'wOFF'
const MAGIC_OTTO = 0x4f54544f;  // 'OTTO' (OTF/CFF)
const MAGIC_TTF1 = 0x00010000;  // TTF
const MAGIC_TRUE = 0x74727565;  // 'true' (TTF on macOS)

type DetectedFormat = 'woff2' | 'woff' | 'otf' | 'ttf' | 'unknown';

const detectMagic = (buf: ArrayBuffer): DetectedFormat => {
  if (buf.byteLength < 4) return 'unknown';
  const m = new DataView(buf).getUint32(0);
  if (m === MAGIC_WOFF2) return 'woff2';
  if (m === MAGIC_WOFF) return 'woff';
  if (m === MAGIC_OTTO) return 'otf';
  if (m === MAGIC_TTF1 || m === MAGIC_TRUE) return 'ttf';
  return 'unknown';
};

export interface FontRendererProps {
  url: string;
}

interface FontMetadata {
  family: string;
  subfamily: string;
  version: string;
  designer: string;
  glyphCount: number;
  format: string;
}

const DEFAULT_SAMPLES = {
  latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 .,;:!?@#$%&*()[]{}',
  chinese: '春夏秋冬东南西北天地人和风雨雷电山水日月',
  mixed: 'The Quick Brown Fox Jumps Over The Lazy Dog\n敏捷的棕色狐狸跳过了懒狗',
};

const SIZES = [72, 48, 36, 24, 18];

// 渲染模式：FontFace 用原生字体渲染，Canvas 用 opentype.js 软渲染（兼容浏览器拒绝的字体）
type RenderMode = 'fontface' | 'canvas';

export const FontRenderer: React.FC<FontRendererProps> = ({ url }) => {
  const t = useTranslator();
  const fetcher = useFetcher();
  const resolvedTheme = useResolvedTheme();
  const [font, setFont] = useState<OpentypeFont | null>(null);
  const [metadata, setMetadata] = useState<FontMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [renderMode, setRenderMode] = useState<RenderMode>('fontface');
  const fontFaceRef = useRef<FontFace | null>(null);

  useEffect(() => {
    // 只有 URL 有效时才加载（避免空字符串或已 revoke 的 blob URL）
    if (!url) return;

    let mounted = true;

    const loadFont = async () => {
      try {
        setLoading(true);
        setError(null);

        // 使用 fetcher 替代原生 fetch（支持鉴权）
        const response = await fetcher(url);
        if (!response.ok) {
          throw new Error('Failed to load font file');
        }
        const arrayBuffer = await response.arrayBuffer();

        if (!mounted) return;

        // 为 FontFace 克隆一份 ArrayBuffer，避免 opentype.js 的 parse 影响其状态
        const faceBuffer = arrayBuffer.slice(0);

        // 用魔数检测真实格式
        const magic = detectMagic(arrayBuffer);

        // woff2 需先解压为 ttf 才能交给 opentype.js（opentype.js 不内置 Brotli）
        // FontFace 那一路仍用原始 woff2 buffer，浏览器原生解压更快
        let parseBuffer: ArrayBuffer = arrayBuffer;
        if (magic === 'woff2') {
          // 用变量包裹 import 说明符，绕开 Rollup 的静态分析，让 'wawoff2' 始终作为运行时 external
          // （直接 import('wawoff2') 在 vite/rollup 多 output 模式下会被错误地内联打包并丢失 decompress 包装层）
          const pkg = 'wawoff2';
          const wawoff2 = (await import(/* @vite-ignore */ pkg)) as { decompress: (b: Uint8Array) => Promise<Uint8Array> };
          const woff2Bytes = new Uint8Array(arrayBuffer);
          const ttfBytes = await wawoff2.decompress(woff2Bytes);
          // 显式拷贝到独立 ArrayBuffer，避开 TS 对 Uint8Array.buffer 的 SharedArrayBuffer 联合类型
          const ttfArrayBuffer = new ArrayBuffer(ttfBytes.byteLength);
          new Uint8Array(ttfArrayBuffer).set(ttfBytes);
          parseBuffer = ttfArrayBuffer;
          if (!mounted) return;
        }

        // 解析字体文件（opentype.js 容忍度高于浏览器 OTS）
        // parse 返回值与官方 Font 类型存在不一致（opentype.js 类型定义瑕疵），用 unknown 二次转换
        const fontData = parse(parseBuffer) as unknown as OpentypeFont;

        if (!fontData) {
          throw new Error('Font data is invalid');
        }

        // 提取元数据
        // opentype.js 2.x 的 names 结构为 { windows: {...}, macintosh: {...}, unicode: {...} }，
        // 字段被嵌在 platform 表下。优先 windows，其次 macintosh，再 unicode，最后回退到 1.x 平铺结构。
        const rawNames = (fontData.names || {}) as unknown as Record<string, unknown>;
        const platformTables = ['windows', 'macintosh', 'unicode']
          .map((k) => rawNames[k])
          .filter((t): t is Record<string, { en?: string; 'zh-Hans'?: string }> => !!t && typeof t === 'object');
        const pickName = (key: string): string => {
          for (const table of platformTables) {
            const entry = table[key];
            const val = entry?.en || entry?.['zh-Hans'];
            if (val) return val;
          }
          // 1.x 兼容
          const flat = rawNames[key] as { en?: string; 'zh-Hans'?: string } | undefined;
          return flat?.en || flat?.['zh-Hans'] || '';
        };

        const meta: FontMetadata = {
          family: pickName('fontFamily') || pickName('postScriptName') || 'Unknown',
          subfamily: pickName('fontSubfamily'),
          version: pickName('version'),
          designer: pickName('designer'),
          glyphCount: fontData.numGlyphs || 0,
          format: formatLabel(magic, url),
        };

        if (!mounted) return;
        setFont(fontData);
        setMetadata(meta);

        // 尝试用 FontFace API 加载字体（浏览器原生渲染，性能好）
        // 失败时降级到 Canvas 软渲染（opentype.js 容忍度更高）
        try {
          const face = new FontFace('PreviewFont', faceBuffer);
          await face.load();
          if (!mounted) return;
          document.fonts.add(face);
          fontFaceRef.current = face;
          setRenderMode('fontface');
        } catch (faceErr) {
          // 浏览器拒绝该字体（通常是 OTS sanitizer 校验失败），降级到 Canvas 渲染
          console.warn('[FontRenderer] FontFace API rejected, fallback to Canvas:', faceErr);
          if (!mounted) return;
          setRenderMode('canvas');
        }

        if (mounted) setLoading(false);
      } catch (err) {
        if (!mounted) return;
        // 字体解析错误通常是文件损坏或格式不支持，用 warn 级别记录
        console.warn('[FontRenderer] Failed to load font:', err instanceof Error ? err.message : String(err));
        setError(t('font.parse_failed'));
        setLoading(false);
      }
    };

    loadFont();

    return () => {
      mounted = false;
      if (fontFaceRef.current) {
        document.fonts.delete(fontFaceRef.current);
        fontFaceRef.current = null;
      }
    };
  }, [url, fetcher, t]);

  const detectFormat = (url: string): string => {
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || '';
    const formatMap: Record<string, string> = {
      ttf: 'TrueType (TTF)',
      otf: 'OpenType (OTF)',
      woff: 'Web Open Font Format (WOFF)',
      woff2: 'Web Open Font Format 2 (WOFF2)',
    };
    return formatMap[ext] || 'TTF';
  };

  // 魔数能识别就用魔数标签，识别不出再回退到扩展名
  const formatLabel = (magic: DetectedFormat, url: string): string => {
    const labels: Record<DetectedFormat, string | null> = {
      woff2: 'Web Open Font Format 2 (WOFF2)',
      woff: 'Web Open Font Format (WOFF)',
      otf: 'OpenType (OTF)',
      ttf: 'TrueType (TTF)',
      unknown: null,
    };
    return labels[magic] ?? detectFormat(url);
  };

  if (loading) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-fg-secondary">{t('font.loading')}</div>
      </div>
    );
  }

  if (error || !font || !metadata) {
    return <RendererError message={error || t('font.parse_failed')} />;
  }

  const displayText = customText || DEFAULT_SAMPLES.mixed;

  return (
    <div className="rfp-flex rfp-flex-col rfp-w-full rfp-h-full rfp-overflow-hidden rfp-min-w-0">
      {/* 元数据区 */}
      <div className="rfp-flex-shrink-0 rfp-px-6 rfp-py-4 rfp-bg-surface-1 rfp-border-b rfp-border-line-weak rfp-min-w-0">
        <div className="rfp-grid rfp-grid-cols-2 rfp-gap-x-6 rfp-gap-y-2 rfp-text-sm rfp-min-w-0">
          <div className="rfp-flex rfp-items-center rfp-gap-2 rfp-min-w-0">
            <span className="rfp-text-fg-tertiary rfp-flex-shrink-0">{t('font.meta.family')}:</span>
            <span className="rfp-text-fg-primary rfp-font-semibold rfp-truncate">{metadata.family}</span>
          </div>
          {metadata.subfamily && (
            <div className="rfp-flex rfp-items-center rfp-gap-2 rfp-min-w-0">
              <span className="rfp-text-fg-tertiary rfp-flex-shrink-0">{t('font.meta.subfamily')}:</span>
              <span className="rfp-text-fg-primary rfp-truncate">{metadata.subfamily}</span>
            </div>
          )}
          <div className="rfp-flex rfp-items-center rfp-gap-2 rfp-min-w-0">
            <span className="rfp-text-fg-tertiary rfp-flex-shrink-0">{t('font.meta.format')}:</span>
            <span className="rfp-text-fg-primary rfp-truncate">{metadata.format}</span>
          </div>
          <div className="rfp-flex rfp-items-center rfp-gap-2 rfp-min-w-0">
            <span className="rfp-text-fg-tertiary rfp-flex-shrink-0">{t('font.meta.glyphs')}:</span>
            <span className="rfp-text-fg-primary rfp-truncate">{metadata.glyphCount}</span>
          </div>
          {metadata.designer && (
            <div className="rfp-flex rfp-items-center rfp-gap-2 rfp-min-w-0">
              <span className="rfp-text-fg-tertiary rfp-flex-shrink-0">{t('font.meta.designer')}:</span>
              <span className="rfp-text-fg-primary rfp-truncate">{metadata.designer}</span>
            </div>
          )}
          {metadata.version && (
            <div className="rfp-flex rfp-items-center rfp-gap-2 rfp-min-w-0">
              <span className="rfp-text-fg-tertiary rfp-flex-shrink-0">{t('font.meta.version')}:</span>
              <span className="rfp-text-fg-primary rfp-truncate">{metadata.version}</span>
            </div>
          )}
        </div>
      </div>

      {/* 预览区 */}
      <div className="rfp-flex-1 rfp-overflow-auto rfp-min-w-0">
        <div className="rfp-px-6 rfp-py-6 rfp-space-y-8 rfp-min-w-0">
          {/* 自定义输入框 */}
          <div className="rfp-min-w-0">
            <label className="rfp-block rfp-text-xs rfp-text-fg-tertiary rfp-mb-2">
              {t('font.sample_text_placeholder')}
            </label>
            <textarea
              className="rfp-block rfp-w-full rfp-box-border rfp-px-3 rfp-py-2.5 rfp-bg-surface-2 rfp-text-fg-primary rfp-text-sm rfp-leading-relaxed rfp-border rfp-border-line rfp-rounded-md rfp-resize-y focus:rfp-outline-none focus:rfp-border-line-strong"
              rows={2}
              placeholder={t('font.sample_text_placeholder')}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              style={{ minHeight: '64px', maxHeight: '160px' }}
            />
          </div>

          {/* 多字号展示 */}
          <div className="rfp-space-y-6 rfp-min-w-0">
            {SIZES.map((size) => (
              <div key={size} className="rfp-space-y-2 rfp-min-w-0">
                <div className="rfp-text-xs rfp-text-fg-tertiary">{size}px</div>
                <FontPreviewLine
                  font={font}
                  text={displayText}
                  fontSize={size}
                  renderMode={renderMode}
                  theme={resolvedTheme}
                />
              </div>
            ))}
          </div>

          {/* 字符集样例 */}
          <div className="rfp-space-y-6 rfp-pt-6 rfp-border-t rfp-border-line-weak rfp-min-w-0">
            <div className="rfp-min-w-0">
              <div className="rfp-text-sm rfp-text-fg-tertiary rfp-mb-3">Latin Alphabet</div>
              <FontPreviewLine
                font={font}
                text={DEFAULT_SAMPLES.latin}
                fontSize={24}
                renderMode={renderMode}
                theme={resolvedTheme}
              />
            </div>

            <div className="rfp-min-w-0">
              <div className="rfp-text-sm rfp-text-fg-tertiary rfp-mb-3">Chinese Characters</div>
              <FontPreviewLine
                font={font}
                text={DEFAULT_SAMPLES.chinese}
                fontSize={24}
                renderMode={renderMode}
                theme={resolvedTheme}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FontPreviewLineProps {
  font: OpentypeFont;
  text: string;
  fontSize: number;
  renderMode: RenderMode;
  theme: 'dark' | 'light';
}

// 单行字体预览：FontFace 模式用 div + CSS font-family（自动换行），
// Canvas 模式用 opentype.js 软渲染并按容器宽度自动断行
const FontPreviewLine: React.FC<FontPreviewLineProps> = ({ font, text, fontSize, renderMode, theme }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCanvas = useCallback(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas || renderMode !== 'canvas') return;

    const containerWidth = wrapper.clientWidth || 600;
    const dpr = window.devicePixelRatio || 1;
    const lineHeight = fontSize * 1.4;
    const fillColor = theme === 'light' ? '#1f2937' : '#f3f4f6';

    // 按容器宽度做软换行：先按 \n 拆段，再按字宽贪心断行
    const wrapLine = (line: string): string[] => {
      if (!line) return [''];
      const result: string[] = [];
      let buf = '';
      for (const ch of Array.from(line)) {
        const next = buf + ch;
        const w = font.getAdvanceWidth(next, fontSize);
        if (w > containerWidth && buf) {
          result.push(buf);
          buf = ch;
        } else {
          buf = next;
        }
      }
      if (buf) result.push(buf);
      return result;
    };

    const wrappedLines: string[] = [];
    text.split('\n').forEach((seg) => {
      wrapLine(seg).forEach((l) => wrappedLines.push(l));
    });

    const width = containerWidth;
    const height = lineHeight * wrappedLines.length + 4;

    // 高 DPI 适配
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    wrappedLines.forEach((line, idx) => {
      const path = font.getPath(line, 0, fontSize + idx * lineHeight, fontSize);
      path.fill = fillColor;
      path.draw(ctx);
    });
  }, [font, text, fontSize, renderMode, theme]);

  useEffect(() => {
    if (renderMode !== 'canvas') return;
    drawCanvas();
    // 容器尺寸变化时重绘
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => drawCanvas());
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [drawCanvas, renderMode]);

  if (renderMode === 'canvas') {
    return (
      <div ref={wrapperRef} className="rfp-w-full">
        <canvas ref={canvasRef} className="rfp-block" />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="rfp-w-full rfp-text-fg-primary rfp-whitespace-pre-wrap rfp-break-words"
      style={{
        fontFamily: 'PreviewFont, sans-serif',
        fontSize: `${fontSize}px`,
        lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  );
};
