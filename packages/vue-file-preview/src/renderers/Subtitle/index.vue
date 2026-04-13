<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Subtitles } from 'lucide-vue-next';
import {
  parseSubtitle,
  formatSubtitleTime,
  fetchTextUtf8,
  type SubtitleParseResult,
} from '@eternalheart/file-preview-core';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const text = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);

const getFormat = (fileName: string): 'srt' | 'vtt' | undefined => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'vtt') return 'vtt';
  if (ext === 'srt') return 'srt';
  return undefined;
};

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    text.value = await fetchTextUtf8(props.url);
  } catch (err) {
    console.error(err);
    error.value = '字幕文件加载失败';
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
</script>

<template>
  <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div
      class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-white/20 vfp-border-t-white vfp-rounded-full vfp-animate-spin"
    />
  </div>

  <div
    v-else-if="error || !parsed"
    class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full"
  >
    <div class="vfp-text-white/70 vfp-text-center">
      <p class="vfp-text-lg">{{ error || '字幕解析失败' }}</p>
    </div>
  </div>

  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto vfp-p-4 md:vfp-p-8">
    <div
      class="vfp-max-w-full md:vfp-max-w-4xl vfp-mx-auto vfp-bg-white/5 vfp-backdrop-blur-sm vfp-rounded-2xl vfp-border vfp-border-white/10 vfp-overflow-hidden"
    >
      <div
        class="vfp-flex vfp-items-center vfp-gap-2 md:vfp-gap-3 vfp-px-4 vfp-py-3 md:vfp-px-6 md:vfp-py-4 vfp-bg-white/5 vfp-border-b vfp-border-white/10"
      >
        <Subtitles class="vfp-w-4 vfp-h-4 md:vfp-w-5 md:vfp-h-5 vfp-text-white/70 vfp-flex-shrink-0" />
        <span class="vfp-text-white vfp-font-medium vfp-text-sm md:vfp-text-base vfp-truncate">{{ fileName }}</span>
        <span class="vfp-ml-auto vfp-text-xs vfp-text-white/50 vfp-uppercase vfp-flex-shrink-0">
          {{ parsed.format }} · {{ parsed.cues.length }} cues
        </span>
      </div>

      <ol class="cues">
        <li v-for="(cue, i) in parsed.cues" :key="'cue-' + i" class="cue-row">
          <div class="cue-id">{{ cue.id ?? i + 1 }}</div>
          <div class="cue-body">
            <div class="cue-time">
              {{ formatSubtitleTime(cue.start) }} → {{ formatSubtitleTime(cue.end) }}
            </div>
            <div class="cue-text">{{ cue.text }}</div>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.cues {
  list-style: none;
  margin: 0;
  padding: 0;
}
.cues > li + li {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.cue-row {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  transition: background-color 0.15s;
}
@media (min-width: 768px) {
  .cue-row {
    gap: 1.25rem;
    padding: 1rem 1.5rem;
  }
}
.cue-row:hover {
  background: rgba(255, 255, 255, 0.05);
}
.cue-id {
  flex-shrink: 0;
  width: 2.5rem;
  text-align: right;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding-top: 0.125rem;
  font-variant-numeric: tabular-nums;
}
.cue-body {
  flex: 1;
  min-width: 0;
}
.cue-time {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  margin-bottom: 0.25rem;
  font-variant-numeric: tabular-nums;
}
.cue-text {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  white-space: pre-wrap;
  word-break: break-word;
}
@media (min-width: 768px) {
  .cue-text {
    font-size: 1rem;
  }
}
</style>
