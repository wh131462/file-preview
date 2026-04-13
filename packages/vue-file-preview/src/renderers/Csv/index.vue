<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { FileSpreadsheet } from 'lucide-vue-next';
import { parseCsv, guessCsvDelimiter, fetchTextUtf8, type CsvParseResult } from '@eternalheart/file-preview-core';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const text = ref<string>('');
const loading = ref(true);
const error = ref<string | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    text.value = await fetchTextUtf8(props.url);
  } catch (err) {
    console.error(err);
    error.value = 'CSV 文件加载失败';
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, load, { immediate: true });

const parsed = computed<CsvParseResult | null>(() => {
  if (!text.value) return null;
  try {
    return parseCsv(text.value, { delimiter: guessCsvDelimiter(props.fileName) });
  } catch (err) {
    console.error(err);
    return null;
  }
});

const label = computed(() => (parsed.value?.delimiter === '\t' ? 'TSV' : 'CSV'));
const columns = computed(() =>
  parsed.value ? Array.from({ length: parsed.value.columnCount }, (_, i) => i) : []
);
const hasHeader = computed(() => !!parsed.value?.header.length);
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
      <p class="vfp-text-lg">{{ error || 'CSV 解析失败' }}</p>
    </div>
  </div>

  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto vfp-p-4 md:vfp-p-8">
    <div
      class="vfp-max-w-full md:vfp-max-w-6xl vfp-mx-auto vfp-bg-white/5 vfp-backdrop-blur-sm vfp-rounded-2xl vfp-border vfp-border-white/10 vfp-overflow-hidden"
    >
      <div
        class="vfp-flex vfp-items-center vfp-gap-2 md:vfp-gap-3 vfp-px-4 vfp-py-3 md:vfp-px-6 md:vfp-py-4 vfp-bg-white/5 vfp-border-b vfp-border-white/10"
      >
        <FileSpreadsheet class="vfp-w-4 vfp-h-4 md:vfp-w-5 md:vfp-h-5 vfp-text-white/70 vfp-flex-shrink-0" />
        <span class="vfp-text-white vfp-font-medium vfp-text-sm md:vfp-text-base vfp-truncate">{{ fileName }}</span>
        <span class="vfp-ml-auto vfp-text-xs vfp-text-white/50 vfp-uppercase vfp-flex-shrink-0">
          {{ label }} · {{ parsed.rows.length }} rows · {{ parsed.columnCount }} cols
        </span>
      </div>

      <div class="vfp-overflow-auto vfp-text-sm vfp-text-white/90">
        <table class="csv-table">
          <thead v-if="hasHeader">
            <tr>
              <th v-for="c in columns" :key="'h-' + c">{{ parsed.header[c] ?? '' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in parsed.rows" :key="'r-' + ri" :class="{ odd: ri % 2 === 1 }">
              <td v-for="c in columns" :key="'c-' + ri + '-' + c">{{ row[c] ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.csv-table {
  width: 100%;
  border-collapse: collapse;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.csv-table thead {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}
.csv-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}
.csv-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  white-space: pre-wrap;
  word-break: break-word;
}
.csv-table tbody tr.odd {
  background: rgba(255, 255, 255, 0.05);
}
</style>
