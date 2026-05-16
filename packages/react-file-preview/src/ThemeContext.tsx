import React, { createContext, useContext } from 'react';

/** 已解析的主题（auto 在 FilePreviewContent 里被解析过） */
export type ResolvedTheme = 'dark' | 'light';

const ThemeContext = createContext<ResolvedTheme | null>(null);

export interface ThemeProviderProps {
  theme: ResolvedTheme;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ theme, children }) => {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

/**
 * 获取已解析的主题（'dark' | 'light'）。
 * Provider 之外默认 'dark'（保持组件历史默认行为）。
 *
 * renderer 需要切第三方库的 theme prop（如 react-syntax-highlighter 的 style、
 * shiki 的 theme 选项）时使用；不要用它做 className 分支 —— class 由 CSS 变量
 * 通过根容器 [data-theme] 自动切换。
 */
export function useResolvedTheme(): ResolvedTheme {
  return useContext(ThemeContext) ?? 'dark';
}
