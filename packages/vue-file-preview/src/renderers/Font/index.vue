<template>
  <div class="vfp-flex vfp-flex-col vfp-w-full vfp-h-full vfp-overflow-hidden">
    <!-- 加载中 -->
    <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
      <div class="vfp-text-fg-secondary">{{ t('font.loading') }}</div>
    </div>

    <!-- 错误态 -->
    <RendererError v-else-if="error || !metadata" :message="error || t('font.parse_failed')" />

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
import RendererError from '../RendererError.vue';

interface FontMetadata {
  family: string;
  subfamily: string;
  version: string;
  designer: string;
  glyphCount: number;
  format: string;
}

type RenderMode = 'fontface' | 'canvas';

// 字体文件魔数：用首 4 字节判断格式，比扩展名更可靠
const MAGIC_WOFF2 = 0x774f4632; // 'wOF2'
const MAGIC_WOFF = 0x774f4646;  // 'wOFF'
const MAGIC_OTTO = 0x4f54544f;  // 'OTTO'
const MAGIC_TTF1 = 0x00010000;
const MAGIC_TRUE = 0x74727565;  // 'true'

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

onMounted(async () => {
  // 只有 URL 有效时才加载（避免空字符串或已 revoke 的 blob URL）
  if (!props.url) return;

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
      const flat = rawNames[key] as { en?: string; 'zh-Hans'?: string } | undefined;
      return flat?.en || flat?.['zh-Hans'] || '';
    };

    const meta: FontMetadata = {
      family: pickName('fontFamily') || pickName('postScriptName') || 'Unknown',
      subfamily: pickName('fontSubfamily'),
      version: pickName('version'),
      designer: pickName('designer'),
      glyphCount: fontData.numGlyphs || 0,
      format: formatLabel(magic, props.url),
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
