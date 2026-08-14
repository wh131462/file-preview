export function createScrollLock() {
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

  return { lock, unlock };
}
