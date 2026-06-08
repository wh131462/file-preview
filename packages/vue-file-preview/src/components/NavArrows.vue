<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

interface Props {
  /** 父级内容容器 DOM（mousemove 监听挂到它身上） */
  containerRef: HTMLDivElement | null;
  hasPrev: boolean;
  hasNext: boolean;
  /** 用于触发"显示并重置定时器"的外部信号,通常传 currentIndex */
  resetKey: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ prev: []; next: [] }>();

const NAV_HIDE_DELAY = 2000;
const visible = ref(true);
let hideTimer: number | null = null;

const scheduleHide = () => {
  if (hideTimer !== null) clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    visible.value = false;
  }, NAV_HIDE_DELAY);
};

const show = () => {
  if (!visible.value) visible.value = true;
  scheduleHide();
};

let attached: HTMLDivElement | null = null;
const detach = () => {
  if (attached) {
    attached.removeEventListener('mousemove', show);
    attached = null;
  }
};
const attach = (el: HTMLDivElement | null) => {
  if (attached === el) return;
  detach();
  if (el) {
    el.addEventListener('mousemove', show);
    attached = el;
  }
};

watch(() => props.containerRef, (el) => attach(el), { immediate: true });
watch(() => props.resetKey, () => {
  visible.value = true;
  scheduleHide();
});

onMounted(() => {
  scheduleHide();
});

onBeforeUnmount(() => {
  if (hideTimer !== null) clearTimeout(hideTimer);
  detach();
});
</script>

<template>
  <button
    v-if="hasPrev"
    :style="{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(-50%)' : 'translateY(-50%) translateX(-20px)',
      pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 0.2s, transform 0.2s',
    }"
    class="vfp-absolute vfp-z-20 vfp-left-2 md:vfp-left-4 vfp-top-1/2 vfp-w-10 vfp-h-10 md:vfp-w-12 md:vfp-h-12 vfp-rounded-full vfp-backdrop-blur-xl vfp-border vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors vfp-shadow-2xl vfp-bg-surface-nav vfp-border-line hover:vfp-bg-surface-nav-hover vfp-text-fg-primary"
    @click="emit('prev')"
    @mouseenter="show"
  >
    <ChevronLeft class="vfp-w-5 vfp-h-5 md:vfp-w-6 md:vfp-h-6" />
  </button>

  <button
    v-if="hasNext"
    :style="{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(-50%)' : 'translateY(-50%) translateX(20px)',
      pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 0.2s, transform 0.2s',
    }"
    class="vfp-absolute vfp-z-20 vfp-right-2 md:vfp-right-4 vfp-top-1/2 vfp-w-10 vfp-h-10 md:vfp-w-12 md:vfp-h-12 vfp-rounded-full vfp-backdrop-blur-xl vfp-border vfp-flex vfp-items-center vfp-justify-center vfp-transition-colors vfp-shadow-2xl vfp-bg-surface-nav vfp-border-line hover:vfp-bg-surface-nav-hover vfp-text-fg-primary"
    @click="emit('next')"
    @mouseenter="show"
  >
    <ChevronRight class="vfp-w-5 vfp-h-5 md:vfp-w-6 md:vfp-h-6" />
  </button>
</template>
