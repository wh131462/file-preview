import { useState, useEffect, useMemo } from 'react';
import { Subtitles } from 'lucide-react';
import { parseSubtitle, formatSubtitleTime, fetchTextUtf8, type SubtitleParseResult } from '@eternalheart/file-preview-core';

interface SubtitleRendererProps {
  url: string;
  fileName: string;
}

const getFormat = (fileName: string): 'srt' | 'vtt' | undefined => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'vtt') return 'vtt';
  if (ext === 'srt') return 'srt';
  return undefined;
};

export const SubtitleRenderer: React.FC<SubtitleRendererProps> = ({ url, fileName }) => {
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
        setError('字幕文件加载失败');
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
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-w-12 rfp-h-12 rfp-border-4 rfp-border-white/20 rfp-border-t-white rfp-rounded-full rfp-animate-spin" />
      </div>
    );
  }

  if (error || !parsed) {
    return (
      <div className="rfp-flex rfp-items-center rfp-justify-center rfp-w-full rfp-h-full">
        <div className="rfp-text-white/70 rfp-text-center">
          <p className="rfp-text-lg">{error || '字幕解析失败'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rfp-w-full rfp-h-full rfp-overflow-auto rfp-p-4 md:rfp-p-8">
      <div className="rfp-max-w-full md:rfp-max-w-4xl rfp-mx-auto rfp-bg-white/5 rfp-backdrop-blur-sm rfp-rounded-2xl rfp-border rfp-border-white/10 rfp-overflow-hidden">
        <div className="rfp-flex rfp-items-center rfp-gap-2 md:rfp-gap-3 rfp-px-4 rfp-py-3 md:rfp-px-6 md:rfp-py-4 rfp-bg-white/5 rfp-border-b rfp-border-white/10">
          <Subtitles className="rfp-w-4 rfp-h-4 md:rfp-w-5 md:rfp-h-5 rfp-text-white/70 rfp-flex-shrink-0" />
          <span className="rfp-text-white rfp-font-medium rfp-text-sm md:rfp-text-base rfp-truncate">{fileName}</span>
          <span className="rfp-ml-auto rfp-text-xs rfp-text-white/50 rfp-uppercase rfp-flex-shrink-0">
            {parsed.format} · {parsed.cues.length} cues
          </span>
        </div>

        <ol className="rfp-divide-y rfp-divide-white/5">
          {parsed.cues.map((cue, i) => (
            <li
              key={`cue-${i}`}
              className="rfp-px-4 rfp-py-3 md:rfp-px-6 md:rfp-py-4 rfp-flex rfp-gap-3 md:rfp-gap-5 hover:rfp-bg-white/5 rfp-transition-colors"
            >
              <div className="rfp-flex-shrink-0 rfp-w-10 rfp-text-right rfp-text-white/40 rfp-text-xs rfp-font-mono rfp-tabular-nums rfp-pt-0.5">
                {cue.id ?? i + 1}
              </div>
              <div className="rfp-flex-1 rfp-min-w-0">
                <div className="rfp-text-xs rfp-font-mono rfp-text-white/50 rfp-mb-1 rfp-tabular-nums">
                  {formatSubtitleTime(cue.start)} → {formatSubtitleTime(cue.end)}
                </div>
                <div className="rfp-text-sm md:rfp-text-base rfp-text-white/90 rfp-whitespace-pre-wrap rfp-break-words">
                  {cue.text}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
