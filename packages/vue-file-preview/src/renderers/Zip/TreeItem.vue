<script setup lang="ts">
import { computed } from 'vue';
import {
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileCode,
  File as FileIcon,
  ChevronRight,
} from 'lucide-vue-next';
import { formatFileSize, getFileType, type ZipTreeNode } from '@eternalheart/file-preview-core';

const props = defineProps<{
  node: ZipTreeNode;
  depth: number;
  selectedPath: string | null;
  expanded: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'toggle', path: string): void;
  (e: 'select', node: ZipTreeNode): void;
  (e: 'hover', text: string, rect: DOMRect): void;
  (e: 'leave'): void;
}>();

const padStyle = computed(() => ({ paddingLeft: `${props.depth * 14 + 10}px` }));
const isOpen = computed(() => props.expanded.has(props.node.path));
const isSelected = computed(() => props.selectedPath === props.node.path);

const fileIcon = computed(() => {
  const ft = getFileType({ id: '', name: props.node.name, url: '', type: '' });
  if (ft === 'image') return FileImage;
  if (ft === 'text' || ft === 'markdown' || ft === 'json' || ft === 'csv' || ft === 'xml' || ft === 'subtitle') {
    return (props.node.name.endsWith('.md') || props.node.name.endsWith('.markdown')) ? FileText : FileCode;
  }
  return FileIcon;
});

const handleEnter = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  emit('hover', props.node.name || '/', rect);
};

const handleLeave = () => emit('leave');
</script>

<template>
  <div v-if="node.isDir">
    <button
      type="button"
      class="tree-row dir-row"
      :style="padStyle"
      @click="emit('toggle', node.path)"
      @mouseenter="handleEnter"
      @mouseleave="handleLeave"
    >
      <ChevronRight
        class="vfp-w-3.5 vfp-h-3.5 vfp-flex-shrink-0 vfp-transition-transform"
        :class="{ 'vfp-rotate-90': isOpen }"
      />
      <component
        :is="isOpen ? FolderOpen : Folder"
        class="vfp-w-4 vfp-h-4 vfp-flex-shrink-0 vfp-text-amber-300/80"
      />
      <span class="vfp-truncate vfp-flex-1 vfp-min-w-0">{{ node.name || '/' }}</span>
    </button>
    <template v-if="isOpen && node.children">
      <ZipTreeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :selected-path="selectedPath"
        :expanded="expanded"
        @toggle="(p) => emit('toggle', p)"
        @select="(n) => emit('select', n)"
        @hover="(t, r) => emit('hover', t, r)"
        @leave="emit('leave')"
      />
    </template>
  </div>
  <button
    v-else
    type="button"
    class="tree-row file-row"
    :class="{ selected: isSelected }"
    :style="padStyle"
    @click="emit('select', node)"
    @mouseenter="handleEnter"
    @mouseleave="handleLeave"
  >
    <span class="vfp-w-3.5 vfp-h-3.5 vfp-flex-shrink-0" />
    <component :is="fileIcon" class="vfp-w-4 vfp-h-4 vfp-flex-shrink-0 vfp-text-white/50" />
    <span class="vfp-flex-1 vfp-truncate vfp-min-w-0">{{ node.name }}</span>
    <span class="vfp-text-xs vfp-text-white/30 vfp-flex-shrink-0 vfp-ml-2">{{ formatFileSize(node.size) }}</span>
  </button>
</template>

<script lang="ts">
export default { name: 'ZipTreeItem' };
</script>

<style scoped>
.tree-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
  padding-right: 0.5rem;
  text-align: left;
  font-size: 0.875rem;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.dir-row {
  color: rgba(255, 255, 255, 0.8);
}
.file-row {
  color: rgba(255, 255, 255, 0.7);
}
.tree-row:hover {
  background: rgba(255, 255, 255, 0.05);
}
.file-row.selected {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
</style>
