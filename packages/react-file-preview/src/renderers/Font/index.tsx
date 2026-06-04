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

// 元数据状态：loading（解析中）/ ready（成功）/ unavailable（不支持解析或解析失败）
type MetadataStatus = 'loading' | 'ready' | 'unavailable';

export const FontRenderer: React.FC<FontRendererProps> = ({ url }) => {
  const t = useTranslator();
  const fetcher = useFetcher();
  const resolvedTheme = useResolvedTheme();
  const [font, setFont] = useState<OpentypeFont | null>(null);
  const [metadata, setMetadata] = useState<FontMetadata | null>(null);
  const [metadataStatus, setMetadataStatus] = useState<MetadataStatus>('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [renderMode, setRenderMode] = useState<RenderMode>('fontface');
  const fontFaceRef = useRef<FontFace | null>(null);

  useEffect(() => {
    if (!url) return;

    let mounted = true;

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

    // 任务 A：FontFace 原生加载（浏览器对 WOFF2 原生支持，无需 wawoff2 解压）
    const loadFontFace = async (faceBuffer: ArrayBuffer): Promise<void> => {
      try {
        const face = new FontFace('PreviewFont', faceBuffer);
        await face.load();
        if (!mounted) return;
        document.fonts.add(face);
        fontFaceRef.current = face;
        setRenderMode('fontface');
      } catch (faceErr) {
        console.warn('[FontRenderer] FontFace API rejected, fallback to Canvas:', faceErr);
        if (!mounted) return;
        setRenderMode('canvas');
        throw faceErr;
      }
    };

    // 任务 B：opentype 元数据解析。WOFF2 由浏览器原生渲染即可,不解析元数据
    // （opentype.js 不支持 Brotli;独立解压链路引入 emscripten wasm 与挂死风险,代价过大)
    const loadMetadata = async (
      arrayBuffer: ArrayBuffer,
      magic: DetectedFormat,
    ): Promise<void> => {
      if (magic === 'woff2') {
        // 直接标记为不可用,但保留 format 信息
        throw new Error('WOFF2 metadata parsing intentionally skipped');
      }

      const fontData = parse(arrayBuffer) as unknown as OpentypeFont;
      if (!fontData) {
        throw new Error('Font data is invalid');
      }

      // opentype.js 2.x 的 names 嵌在 platform 表下,优先 windows / macintosh / unicode,再回退 1.x 平铺
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
      setMetadataStatus('ready');
    };

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setMetadataStatus('loading');

        const response = await fetcher(url);
        if (!response.ok) {
          throw new Error('Failed to load font file');
        }
        const arrayBuffer = await response.arrayBuffer();
        if (!mounted) return;

        const faceBuffer = arrayBuffer.slice(0);
        const magic = detectMagic(arrayBuffer);

        // 并行启动 FontFace 与 opentype 解析
        const facePromise = loadFontFace(faceBuffer);
        const metadataPromise = loadMetadata(arrayBuffer, magic);

        await facePromise.catch(() => {
          // FontFace 失败由 metadata 兜底
        });
        if (!mounted) return;
        setLoading(false);

        try {
          await metadataPromise;
        } catch (metaErr) {
          if (!mounted) return;
          // WOFF2 是“按设计跳过”，其他格式失败才需要 warn
          if (magic !== 'woff2') {
            console.warn(
              '[FontRenderer] Metadata parse failed, font is still rendered via FontFace:',
              metaErr instanceof Error ? metaErr.message : String(metaErr),
            );
          }
          setMetadataStatus('unavailable');
          setMetadata({
            family: 'Unknown',
            subfamily: '',
            version: '',
            designer: '',
            glyphCount: 0,
            format: formatLabel(magic, url),
          });
        }
      } catch (err) {
        if (!mounted) return;
        console.warn(
          '[FontRenderer] Failed to load font:',
          err instanceof Error ? err.message : String(err),
        );
        setError(t('font.load_failed'));
        setLoading(false);
        setMetadataStatus('unavailable');
      }
    };

    run();

    return () => {
      mounted = false;
      if (fontFaceRef.current) {
        document.fonts.delete(fontFaceRef.current);
        fontFaceRef.current = null;
      }
    };
  }, [url, fetcher, t]);

  if (loading) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-fg-secondary">{t('font.loading')}</div>
      </div>
    );
  }

  if (error || !metadata) {
    return <RendererError message={error || t('font.parse_failed')} />;
  }

  const displayText = customText || DEFAULT_SAMPLES.mixed;
  const metadataLoadingLabel = t('font.metadata_loading');
  const metadataUnavailableLabel = t('font.metadata_unavailable');
  const showMetaPlaceholder = metadataStatus !== 'ready';
  const metaPlaceholder = metadataStatus === 'loading' ? metadataLoadingLabel : metadataUnavailableLabel;
  // Canvas 模式必须有 font 才能绘制；没有 font（如 WOFF2 跳过解析）只能保留 FontFace 路径
  const canRenderCanvas = renderMode === 'canvas' && !!font;

  return (
    <div className="rfp-flex rfp-flex-col rfp-w-full rfp-h-full rfp-overflow-hidden rfp-min-w-0">
      {/* 元数据区 */}
      <div className="rfp-flex-shrink-0 rfp-px-6 rfp-py-4 rfp-bg-surface-1 rfp-border-b rfp-border-line-weak rfp-min-w-0">
        <div className="rfp-grid rfp-grid-cols-2 rfp-gap-x-6 rfp-gap-y-2 rfp-text-sm rfp-min-w-0">
          <div className="rfp-flex rfp-items-center rfp-gap-2 rfp-min-w-0">
            <span className="rfp-text-fg-tertiary rfp-flex-shrink-0">{t('font.meta.family')}:</span>
            <span className="rfp-text-fg-primary rfp-font-semibold rfp-truncate">
              {showMetaPlaceholder ? metaPlaceholder : metadata.family}
            </span>
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
            <span className="rfp-text-fg-primary rfp-truncate">
              {showMetaPlaceholder ? metaPlaceholder : metadata.glyphCount}
            </span>
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
                  renderMode={canRenderCanvas ? 'canvas' : 'fontface'}
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
                renderMode={canRenderCanvas ? 'canvas' : 'fontface'}
                theme={resolvedTheme}
              />
            </div>

            <div className="rfp-min-w-0">
              <div className="rfp-text-sm rfp-text-fg-tertiary rfp-mb-3">Chinese Characters</div>
              <FontPreviewLine
                font={font}
                text={DEFAULT_SAMPLES.chinese}
                fontSize={24}
                renderMode={canRenderCanvas ? 'canvas' : 'fontface'}
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
  font: OpentypeFont | null;
  text: string;
  fontSize: number;
  renderMode: RenderMode;
  theme: 'dark' | 'light';
}

const FontPreviewLine: React.FC<FontPreviewLineProps> = ({ font, text, fontSize, renderMode, theme }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawCanvas = useCallback(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas || renderMode !== 'canvas' || !font) return;

    const containerWidth = wrapper.clientWidth || 600;
    const dpr = window.devicePixelRatio || 1;
    const lineHeight = fontSize * 1.4;
    const fillColor = theme === 'light' ? '#1f2937' : '#f3f4f6';

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
