import { StyleSheet } from 'react-native';

const defaults = {
  error: '#ba1a1a',
  sttAccent: '#3B82F6',
  primary: '#7c5800',
  outline: '#827562',
};

export function createAudioRecorderStyles(colors = {}) {
  const c = { ...defaults, ...colors };
  return StyleSheet.create({
    wrap: { width: '100%' },
    error: { color: c.error, fontSize: 12, marginBottom: 8, fontWeight: '600' },
    ok: { color: c.outline, fontSize: 11, marginBottom: 8, fontWeight: '600' },
    primaryBtn: {
      marginTop: 4,
      backgroundColor: c.sttAccent,
      borderRadius: 14,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
    stopBtn: {
      marginTop: 4,
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    stopBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    btnDisabled: { opacity: 0.6 },
  });
}

const styles = createAudioRecorderStyles();
export default styles;
