<template>
  <div class="vfp-flex vfp-flex-col vfp-w-full vfp-h-full vfp-overflow-hidden">
    <!-- 加载中 -->
    <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
      <div class="vfp-text-fg-secondary">{{ t('font.loading') }}</div>
    </div>

    <!-- 错误态 -->
    <div v-else-if="error || !metadata" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
      <div class="vfp-text-fg-secondary">{{ error || t('font.parse_failed') }}</div>
    </div>

    <!-- 正常渲染 -->
    <template v-else>
      <!-- 元数据区 -->
      <div class="vfp-flex-shrink-0 vfp-px-6 vfp-py-4 vfp-bg-surface-1 vfp-border-b vfp-border-line-weak vfp-min-w-0">
        <div class="vfp-grid vfp-grid-cols-2 vfp-gap-x-6 vfp-gap-y-2 vfp-text-sm vfp-min-w-0">
          <div class="vfp-flex vfp-items-center vfp-gap-2 vfp-min-w-0">
            <span class="vfp-text-fg-tertiary vfp-flex-shrink-0">{{ t('font.meta.family') }}:</span>
            <span class="vfp-text-fg-primary vfp-font-semibold vfp-truncate">{{ metadata.family }}</span>
          </div>
          <div v-if="metadata.subfamily" class="vfp-flex vfp-items-center vfp-gap-2 vfp-min-w-0">
            <span class="vfp-text-fg-tertiary vfp-flex-shrink-0">{{ t('font.meta.subfamily') }}:</span>
            <span class="vfp-text-fg-primary vfp-truncate">{{ metadata.subfamily }}</span>
          </div>
          <div class="vfp-flex vfp-items-center vfp-gap-2 vfp-min-w-0">
            <span class="vfp-text-fg-tertiary vfp-flex-shrink-0">{{ t('font.meta.format') }}:</span>
            <span class="vfp-text-fg-primary vfp-truncate">{{ metadata.format }}</span>
          </div>
          <div class="vfp-flex vfp-items-center vfp-gap-2 vfp-min-w-0">
            <span class="vfp-text-fg-tertiary vfp-flex-shrink-0">{{ t('font.meta.glyphs') }}:</span>
            <span class="vfp-text-fg-primary vfp-truncate">{{ metadata.glyphCount }}</span>
          </div>
          <div v-if="metadata.designer" class="vfp-flex vfp-items-center vfp-gap-2 vfp-min-w-0">
            <span class="vfp-text-fg-tertiary vfp-flex-shrink-0">{{ t('font.meta.designer') }}:</span>
            <span class="vfp-text-fg-primary vfp-truncate">{{ metadata.designer }}</span>
          </div>
          <div v-if="metadata.version" class="vfp-flex vfp-items-center vfp-gap-2 vfp-min-w-0">
            <span class="vfp-text-fg-tertiary vfp-flex-shrink-0">{{ t('font.meta.version') }}:</span>
            <span class="vfp-text-fg-primary vfp-truncate">{{ metadata.version }}</span>
          </div>
        </div>
      </div>

      <!-- 预览区 -->
      <div class="vfp-flex-1 vfp-overflow-auto vfp-min-w-0">
        <div class="vfp-px-6 vfp-py-6 vfp-space-y-8 vfp-min-w-0">
          <!-- 自定义输入框 -->
          <div class="vfp-min-w-0">
            <label class="vfp-block vfp-text-xs vfp-text-fg-tertiary vfp-mb-2">
              {{ t('font.sample_text_placeholder') }}
            </label>
            <textarea
              v-model="customText"
              class="vfp-block vfp-w-full vfp-box-border vfp-px-3 vfp-py-2.5 vfp-bg-surface-2 vfp-text-fg-primary vfp-text-sm vfp-leading-relaxed vfp-border vfp-border-line vfp-rounded-md vfp-resize-y focus:vfp-outline-none focus:vfp-border-line-strong"
              rows="2"
              :placeholder="t('font.sample_text_placeholder')"
              :style="{ minHeight: '64px', maxHeight: '160px' }"
            />
          </div>

          <!-- 多字号展示 -->
          <div class="vfp-space-y-6 vfp-min-w-0">
            <div v-for="size in SIZES" :key="size" class="vfp-space-y-2 vfp-min-w-0">
              <div class="vfp-text-xs vfp-text-fg-tertiary">{{ size }}px</div>
              <FontPreviewLine
                v-if="font"
                :font="font"
                :text="displayText"
                :font-size="size"
                :render-mode="renderMode"
                :theme="resolvedTheme"
              />
            </div>
          </div>

          <!-- 字符集样例 -->
          <div class="vfp-space-y-6 vfp-pt-6 vfp-border-t vfp-border-line-weak vfp-min-w-0">
            <div class="vfp-min-w-0">
              <div class="vfp-text-sm vfp-text-fg-tertiary vfp-mb-3">Latin Alphabet</div>
              <FontPreviewLine
                v-if="font"
                :font="font"
                :text="DEFAULT_SAMPLES.latin"
                :font-size="24"
                :render-mode="renderMode"
                :theme="resolvedTheme"
              />
            </div>

            <div class="vfp-min-w-0">
              <div class="vfp-text-sm vfp-text-fg-tertiary vfp-mb-3">Chinese Characters</div>
              <FontPreviewLine
                v-if="font"
                :font="font"
                :text="DEFAULT_SAMPLES.chinese"
                :font-size="24"
                :render-mode="renderMode"
                :theme="resolvedTheme"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { parse } from 'opentype.js';
import type { Font as OpentypeFont } from 'opentype.js';
import { useTranslator } from '../../composables/useTranslator';
import { useFetcher } from '../../composables/useRequest';
import { useResolvedTheme } from '../../composables/useResolvedTheme';
import FontPreviewLine from './FontPreviewLine.vue';

interface FontMetadata {
  family: string;
  subfamily: string;
  version: string;
  designer: string;
  glyphCount: number;
  format: string;
}

type RenderMode = 'fontface' | 'canvas';

const DEFAULT_SAMPLES = {
  latin: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789 .,;:!?@#$%&*()[]{}',
  chinese: '春夏秋冬东南西北天地人和风雨雷电山水日月',
  mixed: 'The Quick Brown Fox Jumps Over The Lazy Dog\n敏捷的棕色狐狸跳过了懒狗',
};

const SIZES = [72, 48, 36, 24, 18];

const props = defineProps<{
  url: string;
}>();

const { t } = useTranslator();
const fetcher = useFetcher();
const resolvedTheme = useResolvedTheme();

const font = ref<OpentypeFont | null>(null);
const metadata = ref<FontMetadata | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const customText = ref('');
const renderMode = ref<RenderMode>('fontface');

let fontFace: FontFace | null = null;

const displayText = computed(() => customText.value || DEFAULT_SAMPLES.mixed);

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

onMounted(async () => {
  try {
    loading.value = true;
    error.value = null;

    // 使用 fetcher 替代原生 fetch（支持鉴权）
    const response = await fetcher.value(props.url);
    if (!response.ok) {
      throw new Error('Failed to load font file');
    }
    const arrayBuffer = await response.arrayBuffer();

    // 为 FontFace 克隆一份 ArrayBuffer，避免 opentype.js 的 parse 影响其状态
    const faceBuffer = arrayBuffer.slice(0);

    // 解析字体文件（opentype.js 容忍度高于浏览器 OTS）
    // parse 返回值与官方 Font 类型存在不一致（opentype.js 类型定义瑕疵），用 unknown 二次转换
    const fontData = parse(arrayBuffer) as unknown as OpentypeFont;

    if (!fontData) {
      throw new Error('Font data is invalid');
    }

    // 提取元数据
    const names = fontData.names || {};
    const meta: FontMetadata = {
      family: names.fontFamily?.en || names.fontFamily?.['zh-Hans'] || names.postScriptName?.en || 'Unknown',
      subfamily: names.fontSubfamily?.en || names.fontSubfamily?.['zh-Hans'] || '',
      version: names.version?.en || '',
      designer: names.designer?.en || '',
      glyphCount: fontData.numGlyphs || 0,
      format: detectFormat(props.url),
    };

    font.value = fontData;
    metadata.value = meta;

    // 尝试用 FontFace API 加载（浏览器原生渲染，性能好）
    // 失败时降级到 Canvas 软渲染（opentype.js 容忍度更高）
    try {
      fontFace = new FontFace('PreviewFont', faceBuffer);
      await fontFace.load();
      document.fonts.add(fontFace);
      renderMode.value = 'fontface';
    } catch (faceErr) {
      console.warn('[FontRenderer] FontFace API rejected, fallback to Canvas:', faceErr);
      renderMode.value = 'canvas';
    }

    loading.value = false;
  } catch (err) {
    console.error('[FontRenderer] Error:', err);
    error.value = err instanceof Error ? err.message : t.value('font.load_failed');
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (fontFace) {
    document.fonts.delete(fontFace);
  }
});
</script>
