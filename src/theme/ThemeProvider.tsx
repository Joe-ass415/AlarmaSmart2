import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

import { darkTheme, lightTheme, type AppTheme } from './tokens';

const ThemeContext = createContext<AppTheme>(lightTheme('mint'));

export type ThemeProviderProps = PropsWithChildren<{
  colorScheme: 'light' | 'dark';
  accent: 'mint' | 'violet' | 'sky' | 'amber' | 'coral';
}>;

export function ThemeProvider({ colorScheme, accent, children }: ThemeProviderProps) {
  const theme = useMemo(() => (colorScheme === 'dark' ? darkTheme(accent) : lightTheme(accent)), [colorScheme, accent]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
