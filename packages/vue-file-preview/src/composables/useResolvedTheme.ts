import { provide, inject, computed, unref, type InjectionKey, type MaybeRef, type ComputedRef } from 'vue';

export type ResolvedTheme = 'dark' | 'light';

const THEME_KEY: InjectionKey<ComputedRef<ResolvedTheme>> = Symbol('vfp-resolved-theme');

/**
 * 在主组件中调用，向子树注入已解析的主题（'dark' | 'light'）
 */
export function provideResolvedTheme(theme: MaybeRef<ResolvedTheme>): void {
  const themeRef = computed<ResolvedTheme>(() => unref(theme));
  provide(THEME_KEY, themeRef);
}

/**
 * 获取已解析的主题（'dark' | 'light'）。
 * Provider 之外默认 'dark'。
 *
 * renderer 需要切第三方库的 theme 选项（如 shiki 的 theme）时使用；
 * 不要用它做 className 分支 —— class 由 CSS 变量通过根容器 [data-theme] 自动切换。
 */
export function useResolvedTheme(): ComputedRef<ResolvedTheme> {
  const injected = inject(THEME_KEY, null);
  if (injected) return injected;
  return computed<ResolvedTheme>(() => 'dark');
}
