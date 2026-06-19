import { useState, useCallback, useRef } from 'react';

/**
 * Toast efímero cross-platform.
 * Devuelve { show, message, visible } — renderiza <ToastBanner> en la pantalla.
 */
export function useToast(defaultDuration = 2400) {
  const [state, setState] = useState({ visible: false, message: '' });
  const timerRef = useRef(null);

  const show = useCallback((message, duration) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ visible: true, message });
    timerRef.current = setTimeout(() => setState({ visible: false, message: '' }), duration ?? defaultDuration);
  }, [defaultDuration]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState({ visible: false, message: '' });
  }, []);

  return { show, hide, visible: state.visible, message: state.message };
}
