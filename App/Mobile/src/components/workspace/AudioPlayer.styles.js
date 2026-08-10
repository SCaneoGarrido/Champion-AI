import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#ECE7E2',
    borderRadius: 20,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#B98A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(185,138,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E2E2E',
  },
  listenBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#B98A00',
  },
  listenBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  track: {
    height: 16,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(139,106,0,0.18)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B98A00',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6B6B',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
    flexShrink: 1,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B98A00',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default styles;
