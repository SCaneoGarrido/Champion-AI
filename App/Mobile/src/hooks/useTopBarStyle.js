import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Estilo dinámico para top bars respetando notch / status bar */
export function useTopBarStyle(extraTop = 12) {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + extraTop,
    minHeight: insets.top + extraTop + 48,
  };
}
