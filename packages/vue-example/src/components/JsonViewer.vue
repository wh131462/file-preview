<script setup lang="ts">
import { ref, watch } from 'vue';
import { Code } from 'lucide-vue-next';

const props = defineProps<{
  file: { url: string; name: string };
}>();

const content = ref<string>('加载中...');

const load = async () => {
  try {
    const res = await fetch(props.file.url);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      content.value = JSON.stringify(json, null, 2);
    } catch {
      content.value = text;
    }
  } catch (err) {
    content.value = `加载失败: ${(err as Error).message}`;
  }
};

watch(() => props.file.url, load, { immediate: true });
</script>

<template>
  <div class="w-full h-full flex items-center justify-center p-8">
    <div class="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-full overflow-auto">
      <div class="flex items-center gap-2 mb-4 text-blue-400">
        <Code class="w-5 h-5" />
        <h3 class="font-semibold">JSON 文件预览 (Vue)</h3>
      </div>
      <pre class="text-sm text-gray-300 whitespace-pre-wrap break-words">{{ content }}</pre>
    </div>
  </div>
</template>
