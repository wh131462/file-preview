<template>
  <div ref="wrapperRef" class="vfp-w-full">
    <canvas v-if="renderMode === 'canvas'" ref="canvasRef" class="vfp-block" />
    <div
      v-else
      class="vfp-w-full vfp-text-fg-primary vfp-whitespace-pre-wrap vfp-break-words"
      :style="{
        fontFamily: 'PreviewFont, sans-serif',
        fontSize: `${fontSize}px`,
        lineHeight: 1.4,
      }"
    >{{ text }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

type RenderMode = 'fontface' | 'canvas';

// 用宽松的接口避免 opentype.js 类型定义瑕疵导致的 vue-tsc 报错
interface OpentypeFontLike {
  getAdvanceWidth: (text: string, fontSize: number) => number;
  getPath: (text: string, x: number, y: number, fontSize: number) => { fill: string | null; draw: (ctx: CanvasRenderingContext2D) => void };
}

const props = defineProps<{
  font: OpentypeFontLike | null;
  text: string;
  fontSize: number;
  renderMode: RenderMode;
  theme: 'dark' | 'light';
}>();

const wrapperRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

let resizeObserver: ResizeObserver | null = null;

const drawCanvas = () => {
  const wrapper = wrapperRef.value;
  const canvas = canvasRef.value;
  if (!wrapper || !canvas || props.renderMode !== 'canvas' || !props.font) return;

  const containerWidth = wrapper.clientWidth || 600;
  const dpr = window.devicePixelRatio || 1;
  const lineHeight = props.fontSize * 1.4;
  const fillColor = props.theme === 'light' ? '#1f2937' : '#f3f4f6';

  const font = props.font;

  // 按容器宽度做软换行：先按 \n 拆段，再按字宽贪心断行
  const wrapLine = (line: string): string[] => {
    if (!line) return [''];
    const result: string[] = [];
    let buf = '';
    for (const ch of Array.from(line)) {
      const next = buf + ch;
      const w = font.getAdvanceWidth(next, props.fontSize);
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
  props.text.split('\n').forEach((seg) => {
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
    const path = font.getPath(line, 0, props.fontSize + idx * lineHeight, props.fontSize);
    path.fill = fillColor;
    path.draw(ctx);
  });
};

const setupObserver = () => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (props.renderMode !== 'canvas') return;
  if (typeof ResizeObserver === 'undefined') return;
  const wrapper = wrapperRef.value;
  if (!wrapper) return;
  resizeObserver = new ResizeObserver(() => drawCanvas());
  resizeObserver.observe(wrapper);
};

onMounted(() => {
  if (props.renderMode === 'canvas') {
    drawCanvas();
    setupObserver();
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

watch(
  () => [props.text, props.fontSize, props.renderMode, props.theme, props.font],
  () => {
    if (props.renderMode === 'canvas') {
      requestAnimationFrame(() => {
        drawCanvas();
        setupObserver();
      });
    }
  },
);
</script>
