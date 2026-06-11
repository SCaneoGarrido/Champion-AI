import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

export function useThemedScreenStyles(baseStyles, mergeFn) {
  const { colors } = useTheme();
  return useMemo(() => mergeFn(baseStyles, colors), [baseStyles, colors, mergeFn]);
}
