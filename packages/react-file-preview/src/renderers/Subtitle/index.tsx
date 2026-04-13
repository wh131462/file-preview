import { useState, useEffect, useMemo } from 'react';
import {
  parseSubtitle,
  formatSubtitleTime,
  fetchTextUtf8,
  type SubtitleParseResult,
  type SubtitleFormat,
} from '@eternalheart/file-preview-core';
import { useTranslator } from '../../i18n/LocaleContext';

interface SubtitleRendererProps {
  url: string;
  fileName: string;
}

const FORMAT_BY_EXT: Record<string, SubtitleFormat> = {
  srt: 'srt',
  vtt: 'vtt',
  lrc: 'lrc',
  elrc: 'elrc',
  ass: 'ass',
  ssa: 'ssa',
  ttml: 'ttml',
  dfxp: 'ttml',
};

const getFormat = (fileName: string): SubtitleFormat | undefined => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return FORMAT_BY_EXT[ext];
};

export const SubtitleRenderer: React.FC<SubtitleRendererProps> = ({ url, fileName }) => {
  const t = useTranslator();
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setText(await fetchTextUtf8(url));
      } catch (err) {
        console.error(err);
        setError(t('subtitle.load_failed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [url]);

  const parsed: SubtitleParseResult | null = useMemo(() => {
    if (!text) return null;
    try {
      return parseSubtitle(text, getFormat(fileName));
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [text, fileName]);

  if (loading) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-bg-[#0f0f12]">
        <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
      </div>
    );
  }

  if (error || !parsed) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full rfp-bg-[#0f0f12]">
        <div className="rfp-text-white/70 rfp-text-center">
          <p className="rfp-text-lg">{error || t('subtitle.parse_failed')}</p>
        </div>
      </div>
    );
  }

  const isLyric = parsed.format === 'lrc' || parsed.format === 'elrc';
  const meta = parsed.metadata ?? {};
  const dotHover = isLyric ? 'group-hover:rfp-bg-violet-400' : 'group-hover:rfp-bg-sky-400';

  return (
    <div className="rfp-relative rfp-w-full rfp-h-full rfp-bg-[#0f0f12]">
      {/* 内容滚动区 */}
      <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-px-6 md:rfp-px-10 rfp-pt-6 rfp-pb-16 md:rfp-pb-20">
        <div className="rfp-relative rfp-max-w-5xl rfp-mx-auto">
          {/* vertical line */}
          <div className="rfp-absolute rfp-left-[5px] md:rfp-left-[7px] rfp-top-2 rfp-bottom-2 rfp-w-px rfp-bg-white/[0.08]" />

          <ol className="rfp-space-y-5 md:rfp-space-y-6">
            {parsed.cues.map((cue, i) => (
              <li key={`cue-${i}`} className="rfp-relative rfp-pl-6 md:rfp-pl-8 rfp-group">
                {/* dot */}
                <div
                  className={`rfp-absolute rfp-left-0 rfp-top-2 rfp-w-3 rfp-h-3 rfp-rounded-full rfp-bg-white/15 rfp-border-2 rfp-border-[#0f0f12] rfp-transition-colors ${dotHover}`}
                />

                <div className="rfp-flex rfp-flex-wrap rfp-items-baseline rfp-gap-x-3 rfp-gap-y-1 rfp-mb-1.5">
                  <span className="rfp-text-[11px] rfp-font-mono rfp-text-white/45 rfp-tabular-nums">
                    {formatSubtitleTime(cue.start)}
                  </span>
                  <span className="rfp-text-[11px] rfp-text-white/25">→</span>
                  <span className="rfp-text-[11px] rfp-font-mono rfp-text-white/45 rfp-tabular-nums">
                    {formatSubtitleTime(cue.end)}
                  </span>
                  <span className="rfp-text-[10px] rfp-font-mono rfp-text-white/25 rfp-tabular-nums">
                    #{cue.id ?? i + 1}
                  </span>
                  {cue.style && (
                    <span className="rfp-text-[9px] rfp-uppercase rfp-tracking-widest rfp-text-white/55 rfp-px-1.5 rfp-py-0.5 rfp-rounded rfp-bg-white/[0.06] rfp-border rfp-border-white/10">
                      {cue.style}
                    </span>
                  )}
                </div>

                {cue.words && cue.words.length > 0 ? (
                  <div className="rfp-flex rfp-flex-wrap rfp-gap-x-1.5 rfp-gap-y-1 rfp-text-base md:rfp-text-lg rfp-text-white/90 rfp-leading-relaxed group-hover:rfp-text-white rfp-transition-colors">
                    {cue.words.map((word, wi) => (
                      <span
                        key={`w-${wi}`}
                        className="rfp-inline-flex rfp-flex-col rfp-items-start"
                        title={formatSubtitleTime(word.start)}
                      >
                        <span className="rfp-text-[9px] rfp-text-white/30 rfp-font-mono rfp-leading-none rfp-tabular-nums">
                          {formatSubtitleTime(word.start).slice(3, 8)}
                        </span>
                        <span className="rfp-leading-snug">{word.text}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p
                    className={`rfp-whitespace-pre-wrap rfp-break-words rfp-leading-relaxed group-hover:rfp-text-white rfp-transition-colors rfp-text-white/90 ${
                      isLyric ? 'rfp-text-base md:rfp-text-xl rfp-font-medium' : 'rfp-text-sm md:rfp-text-base'
                    }`}
                  >
                    {cue.text}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="rfp-pointer-events-none rfp-absolute rfp-bottom-3 rfp-right-3 md:rfp-bottom-4 md:rfp-right-4 rfp-flex rfp-items-center rfp-gap-2 rfp-px-2.5 rfp-py-1 rfp-rounded-full rfp-bg-black/40 rfp-backdrop-blur rfp-border rfp-border-white/10 rfp-text-[10px] rfp-text-white/55 rfp-font-mono rfp-tabular-nums">
        <span>{parsed.cues.length} {isLyric ? t('subtitle.lines') : t('subtitle.cues')}</span>
        {meta.length && (
          <>
            <span className="rfp-text-white/20">·</span>
            <span>{meta.length}</span>
          </>
        )}
      </div>
    </div>
  );
};
