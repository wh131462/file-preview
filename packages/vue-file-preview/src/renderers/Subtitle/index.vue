<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  parseSubtitle,
  formatSubtitleTime,
  fetchTextUtf8,
  type SubtitleParseResult,
  type SubtitleFormat,
} from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import RendererError from '../RendererError.vue';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const { t } = useTranslator();
const fetcher = useFetcher();

const text = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);

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

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    text.value = await fetchTextUtf8(props.url, { fetcher: fetcher.value });
  } catch (err) {
    console.error(err);
    error.value = t.value('subtitle.load_failed');
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, load, { immediate: true });

const parsed = computed<SubtitleParseResult | null>(() => {
  if (!text.value) return null;
  try {
    return parseSubtitle(text.value, getFormat(props.fileName));
  } catch (err) {
    console.error(err);
    return null;
  }
});

const isLyric = computed(() => parsed.value?.format === 'lrc' || parsed.value?.format === 'elrc');

const meta = computed<Record<string, string>>(() => parsed.value?.metadata ?? {});

const wordTimeShort = (t: number) => formatSubtitleTime(t).slice(3, 8);
</script>

<template>
  <div
    v-if="loading"
    class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full vfp-bg-[#0f0f12]"
  >
    <div
      class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin"
    />
  </div>

  <RendererError
    v-else-if="error || !parsed"
    :message="error || t('subtitle.parse_failed')"
    class="vfp-bg-[#0f0f12]"
  />

  <div
    v-else
    class="vfp-relative vfp-w-full vfp-h-full vfp-bg-[#0f0f12]"
    :class="isLyric ? 'flavor-lyric' : 'flavor-subtitle'"
  >
    <!-- 内容滚动区 -->
    <div class="content-scroll">
      <div class="timeline">
        <div class="timeline-line" />
        <ol class="cues">
          <li v-for="(cue, i) in parsed.cues" :key="'cue-' + i" class="cue-row">
            <div class="cue-dot" />
            <div class="cue-meta">
              <span class="cue-time">{{ formatSubtitleTime(cue.start) }}</span>
              <span class="cue-arrow">→</span>
              <span class="cue-time">{{ formatSubtitleTime(cue.end) }}</span>
              <span class="cue-id">#{{ cue.id ?? i + 1 }}</span>
              <span v-if="cue.style" class="cue-style">{{ cue.style }}</span>
            </div>
            <div v-if="cue.words && cue.words.length > 0" class="cue-words">
              <span
                v-for="(word, wi) in cue.words"
                :key="'w-' + wi"
                class="cue-word"
                :title="formatSubtitleTime(word.start)"
              >
                <span class="cue-word-time">{{ wordTimeShort(word.start) }}</span>
                <span class="cue-word-text">{{ word.text }}</span>
              </span>
            </div>
            <p v-else class="cue-text" :class="{ lyric: isLyric }">{{ cue.text }}</p>
          </li>
        </ol>
      </div>
    </div>

    <!-- 右下角浮签 -->
    <div class="status-pill">
      <span>{{ parsed.cues.length }} {{ isLyric ? t('subtitle.lines') : t('subtitle.cues') }}</span>
      <template v-if="meta.length">
        <span class="dot">·</span>
        <span>{{ meta.length }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.content-scroll {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 1.5rem 1rem 4rem;
}
.status-pill {
  pointer-events: none;
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid var(--fp-line);
  font-size: 0.625rem;
  color: var(--fp-fg-tertiary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}
.dot {
  color: var(--fp-fg-disabled);
}

.timeline {
  position: relative;
}
.timeline-line {
  position: absolute;
  left: 5px;
  top: 0.5rem;
  bottom: 0.5rem;
  width: 1px;
  background: var(--fp-line-weak);
}
.cues {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.cue-row {
  position: relative;
  padding-left: 1.5rem;
}
.cue-dot {
  position: absolute;
  left: 0;
  top: 0.4rem;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  background: var(--fp-surface-3);
  border: 2px solid #0f0f12;
  transition: background-color 0.2s;
}
.flavor-lyric .cue-row:hover .cue-dot {
  background: rgb(167, 139, 250);
}
.flavor-subtitle .cue-row:hover .cue-dot {
  background: rgb(56, 189, 248);
}
.cue-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.75rem;
  margin-bottom: 0.375rem;
}
.cue-time {
  font-size: 0.6875rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--fp-fg-muted);
  font-variant-numeric: tabular-nums;
}
.cue-arrow {
  font-size: 0.6875rem;
  color: var(--fp-fg-disabled);
}
.cue-id {
  font-size: 0.625rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--fp-fg-disabled);
  font-variant-numeric: tabular-nums;
}
.cue-style {
  font-size: 0.5625rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--fp-fg-tertiary);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: var(--fp-line-weak);
  border: 1px solid var(--fp-line);
}
.cue-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.625;
  color: var(--fp-fg-primary);
  font-size: 0.875rem;
  min-height: 1.25rem;
  transition: color 0.2s;
}
.cue-text.lyric {
  font-size: 1rem;
  font-weight: 500;
}
.cue-row:hover .cue-text {
  color: #fff;
}
.cue-words {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.375rem;
  font-size: 1rem;
  color: var(--fp-fg-primary);
  line-height: 1.625;
  transition: color 0.2s;
}
.cue-row:hover .cue-words {
  color: #fff;
}
.cue-word {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
}
.cue-word-time {
  font-size: 0.5625rem;
  color: var(--fp-fg-disabled);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.cue-word-text {
  line-height: 1.4;
}
</style>
