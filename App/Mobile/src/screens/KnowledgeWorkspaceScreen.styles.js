import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F4F2',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B6A00',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#B98A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Document Info ───────────────────────────────────────────────────────────
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  documentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  documentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E2E2E',
    marginTop: 2,
  },

  // ── Cuerpo (ReaderCard) ─────────────────────────────────────────────────────
  // position: 'relative' es el ancla del wrapper absoluto del FloatingToolbar
  // (ver FloatingToolbar.styles.js) — lo centra dentro del área de lectura,
  // no de la pantalla completa (que incluiría el header y el bottom toolbar).
  body: {
    flex: 1,
    paddingHorizontal: 20,
    position: 'relative',
  },

  // ── Estados de carga / error ─────────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 14,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6B6B',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    backgroundColor: 'rgba(185,138,0,0.1)',
    borderRadius: 12,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B98A00',
  },

  // ── Bottom Toolbar ──────────────────────────────────────────────────────────
  bottomToolbar: {
    height: 82,
    backgroundColor: '#ECE7E2',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  bottomToolbarSide: {
    flexDirection: 'row',
    gap: 20,
  },
  bottomIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default styles;
