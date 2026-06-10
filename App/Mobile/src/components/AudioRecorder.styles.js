/**
 * Estilos del componente AudioRecorder (React Native StyleSheet).
 * En RN no hay CSS: equivalencia de “hoja aparte” frente al JSX.
 */
import { StyleSheet } from 'react-native';

export const audioRecorderColors = {
  error: '#ba1a1a',
  sttAccent: '#3B82F6',
  primary: '#7c5800',
  outline: '#827562',
};

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  error: {
    color: audioRecorderColors.error,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  ok: {
    color: audioRecorderColors.outline,
    fontSize: 11,
    marginBottom: 8,
    fontWeight: '600',
  },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: audioRecorderColors.sttAccent,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  stopBtn: {
    marginTop: 4,
    backgroundColor: audioRecorderColors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stopBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: { opacity: 0.6 },
});

export default styles;
