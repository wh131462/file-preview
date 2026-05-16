<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchTextUtf8 } from '@eternalheart/file-preview-core';
import { useTranslator } from '../../composables/useTranslator';

const props = defineProps<{
  url: string;
  fileName: string;
}>();

const { t } = useTranslator();

const data = ref<unknown>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const loadJson = async () => {
  loading.value = true;
  error.value = null;
  try {
    const text = await fetchTextUtf8(props.url);
    data.value = JSON.parse(text);
  } catch (err) {
    console.error(err);
    error.value = t.value('json.load_failed');
  } finally {
    loading.value = false;
  }
};

watch(() => props.url, loadJson, { immediate: true });
</script>

<template>
  <div v-if="loading" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-w-12 vfp-h-12 vfp-border-4 vfp-border-line-strong vfp-border-t-spinner-head vfp-rounded-full vfp-animate-spin" />
  </div>

  <div v-else-if="error" class="vfp-flex vfp-items-center vfp-justify-center vfp-w-full vfp-h-full">
    <div class="vfp-text-fg-secondary vfp-text-center">
      <p class="vfp-text-lg">{{ error }}</p>
    </div>
  </div>

  <div v-else class="vfp-w-full vfp-h-full vfp-overflow-auto vfp-bg-code-bg vfp-py-3 vfp-pr-4">
    <JsonNode :value="data" :depth="0" :default-expanded="true" />
  </div>
</template>

<!-- 递归 JSON 节点组件 -->
<script lang="ts">
import { defineComponent, h, inject, computed, type PropType } from 'vue';
import { ChevronRight, ChevronDown } from 'lucide-vue-next';
import { createTranslator, type Translator } from '@eternalheart/file-preview-core';
import { LOCALE_KEY } from '../../i18n/localeKey';
import { useResolvedTheme, type ResolvedTheme } from '../../composables/useResolvedTheme';

export default defineComponent({ name: 'JsonRenderer' });

interface JsonColors {
  key: string;
  string: string;
  number: string;
  keyword: string;
  bracket: string;   // { } [ ]
  colon: string;     // :
  collapsed: string; // "N items / N keys" 折叠提示
  arrow: string;     // 折叠箭头
}

// VSCode Dark Plus / GitHub Light 两套配色，与 shiki 的 dark-plus / github-light 主题保持一致
const DARK_COLORS: JsonColors = {
  key: '#9cdcfe',
  string: '#ce9178',
  number: '#b5cea8',
  keyword: '#569cd6',
  bracket: '#d4d4d4',
  colon: 'rgb(255 255 255 / 0.6)',
  collapsed: 'rgb(255 255 255 / 0.4)',
  arrow: 'rgb(255 255 255 / 0.5)',
};

const LIGHT_COLORS: JsonColors = {
  key: '#005cc5',
  string: '#032f62',
  number: '#005cc5',
  keyword: '#d73a49',
  bracket: '#24292e',
  colon: 'rgb(23 23 23 / 0.6)',
  collapsed: 'rgb(23 23 23 / 0.45)',
  arrow: 'rgb(23 23 23 / 0.55)',
};

function pickColors(theme: ResolvedTheme): JsonColors {
  return theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
}

function renderValue(value: unknown, colors: JsonColors) {
  if (value === null) return h('span', { class: 'json-null', style: { color: colors.keyword } }, 'null');
  if (value === undefined) return h('span', { class: 'json-null', style: { color: colors.keyword } }, 'undefined');
  if (typeof value === 'boolean') return h('span', { style: { color: colors.keyword } }, String(value));
  if (typeof value === 'number') return h('span', { style: { color: colors.number } }, String(value));
  if (typeof value === 'string') return h('span', { style: { color: colors.string } }, `"${value}"`);
  return h('span', { style: { color: colors.bracket } }, String(value));
}

function renderPrimitiveLine(
  keyName: string | undefined,
  value: unknown,
  indent: number,
  colors: JsonColors,
  override?: string,
) {
  return h('div', { class: 'json-row', style: { paddingLeft: `${indent}px` } }, [
    h('span', { class: 'json-arrow-placeholder' }),
    keyName !== undefined
      ? h('span', { class: 'json-key', style: { color: colors.key } }, [
          `"${keyName}"`,
          h('span', { style: { color: colors.colon } }, ': '),
        ])
      : null,
    override
      ? h('span', { style: { color: colors.bracket } }, override)
      : renderValue(value, colors),
  ]);
}

const JsonNode = defineComponent({
  name: 'JsonNode',
  props: {
    keyName: { type: String, default: undefined },
    value: { type: null as unknown as PropType<unknown>, required: true },
    depth: { type: Number, required: true },
    defaultExpanded: { type: Boolean, default: false },
  },
  setup(props) {
    const expanded = ref(props.defaultExpanded);
    const toggle = () => { expanded.value = !expanded.value; };
    const injected = inject(LOCALE_KEY, null);
    const tFunc = computed<Translator>(() => injected?.t.value ?? createTranslator({ locale: 'zh-CN' }));
    const resolvedTheme = useResolvedTheme();
    const colors = computed<JsonColors>(() => pickColors(resolvedTheme.value));
    return { expanded, toggle, tFunc, colors };
  },
  render() {
    const { keyName, value, depth, expanded, toggle, tFunc, colors } = this;
    const indent = depth * 20;

    // 基本类型
    if (value === null || value === undefined || typeof value !== 'object') {
      return renderPrimitiveLine(keyName, value, indent, colors);
    }

    const isArr = Array.isArray(value);
    const entries = isArr ? (value as unknown[]) : Object.entries(value as Record<string, unknown>);
    const count = entries.length;
    const open = isArr ? '[' : '{';
    const close = isArr ? ']' : '}';

    // 空对象/数组
    if (count === 0) {
      return renderPrimitiveLine(keyName, null, indent, colors, `${open}${close}`);
    }

    const children = [];

    // 折叠行
    children.push(
      h('div', {
        class: 'json-row json-toggle',
        style: { paddingLeft: `${indent}px` },
        onClick: toggle,
      }, [
        h('span', { class: 'json-arrow', style: { color: colors.arrow } }, [
          h(expanded ? ChevronDown : ChevronRight, { class: 'vfp-w-3.5 vfp-h-3.5' }),
        ]),
        keyName !== undefined
          ? h('span', { class: 'json-key', style: { color: colors.key } }, [
              `"${keyName}"`,
              h('span', { style: { color: colors.colon } }, ': '),
            ])
          : null,
        h('span', { style: { color: colors.bracket } }, open),
        !expanded
          ? h('span', { class: 'json-collapsed', style: { color: colors.collapsed } }, [
              isArr ? `${count} ${tFunc('json.items')}` : `${count} ${tFunc('json.keys')}`,
              h('span', { style: { color: colors.bracket } }, ` ${close}`),
            ])
          : null,
      ])
    );

    // 子节点
    if (expanded) {
      if (isArr) {
        (value as unknown[]).forEach((item, i) => {
          children.push(
            h(JsonNode, { key: i, value: item, depth: depth + 1, defaultExpanded: depth < 1 })
          );
        });
      } else {
        Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
          children.push(
            h(JsonNode, { key: k, keyName: k, value: v, depth: depth + 1, defaultExpanded: depth < 1 })
          );
        });
      }
      children.push(
        h('div', { class: 'json-row', style: { paddingLeft: `${indent + 20}px` } }, [
          h('span', { style: { color: colors.bracket } }, close),
        ])
      );
    }

    return h('div', null, children);
  },
});
</script>

<style>
.vfp-root .json-row {
  display: flex;
  align-items: flex-start;
  padding-top: 1px;
  padding-bottom: 1px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.4;
}
.vfp-root .json-toggle {
  cursor: pointer;
  user-select: none;
}
.vfp-root .json-toggle:hover {
  background: var(--fp-surface-1);
}
.vfp-root .json-arrow {
  width: 16px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vfp-root .json-arrow-placeholder {
  width: 16px;
  height: 20px;
  flex-shrink: 0;
}
.vfp-root .json-key {
  flex-shrink: 0;
}
.vfp-root .json-collapsed {
  margin-left: 4px;
}
.vfp-root .json-null {
  font-style: italic;
}
</style>
