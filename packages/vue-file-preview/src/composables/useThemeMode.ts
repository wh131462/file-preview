import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue';
import type { Theme } from '@eternalheart/file-preview-core';

export function useThemeMode(theme: Ref<Theme>): ComputedRef<'dark' | 'light'> {
  const systemDark = ref(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  );
  let cleanup: (() => void) | undefined;

  watch(
    theme,
    (value) => {
      cleanup?.();
      cleanup = undefined;
      if (value !== 'auto' || typeof window === 'undefined') return;

      const media = window.matchMedia('(prefers-color-scheme: dark)');
      systemDark.value = media.matches;
      const handler = (event: MediaQueryListEvent) => { systemDark.value = event.matches; };
      media.addEventListener('change', handler);
      cleanup = () => media.removeEventListener('change', handler);
    },
    { immediate: true },
  );

  onBeforeUnmount(() => cleanup?.());

  return computed(() => theme.value === 'auto' ? (systemDark.value ? 'dark' : 'light') : theme.value);
}
