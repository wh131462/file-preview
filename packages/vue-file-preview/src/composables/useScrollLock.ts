import { onMounted, onUnmounted } from 'vue';

/**
 * 锁定 body 滚动 (用于 Modal)
 */
export function useScrollLock(enabled: () => boolean) {
  let originalOverflow = '';
  let originalPaddingRight = '';
  let locked = false;

  const lock = () => {
    if (locked || typeof document === 'undefined') return;
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    locked = true;
  };

  const unlock = () => {
    if (!locked || typeof document === 'undefined') return;
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
    locked = false;
  };

  onMounted(() => {
    if (enabled()) lock();
  });

  onUnmounted(() => {
    unlock();
  });

  return { lock, unlock };
}
