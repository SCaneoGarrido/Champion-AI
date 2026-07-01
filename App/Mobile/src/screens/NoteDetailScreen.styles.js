import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  modal: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: '#fcf9f8',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,196,174,0.2)',
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212,196,174,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1a',
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
    color: '#827562',
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
    backgroundColor: 'rgba(201,146,10,0.1)',
    borderRadius: 12,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#c9920a',
  },

  // ── Scroll ───────────────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
    gap: 12,
  },

  // ── Sección colapsable ───────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,196,174,0.15)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(212,196,174,0.12)',
    marginHorizontal: 18,
  },
  sectionBody: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 22,
    color: '#1a1a1a',
  },
  emptyText: {
    fontSize: 13,
    color: '#827562',
    fontStyle: 'italic',
  },

  // ── Mapa Mental ──────────────────────────────────────────────────────────────
  mindMapRoot: { gap: 10 },
  mindMapNode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  mindMapBullet: {
    fontSize: 13,
    color: '#c9920a',
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 1,
  },
  mindMapLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  mindMapChildren: { gap: 6, marginTop: 6 },
  mindMapChildNode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 16,
  },
  mindMapChildBullet: {
    fontSize: 11,
    color: '#c9920a',
    lineHeight: 20,
    marginTop: 1,
  },
  mindMapChildLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 20,
    color: '#504534',
    fontWeight: '600',
  },
  mindMapGrandchildren: { gap: 4, marginTop: 4 },
  mindMapGrandchildNode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 32,
  },
  mindMapGrandchildBullet: {
    fontSize: 10,
    color: '#827562',
    lineHeight: 18,
    marginTop: 1,
  },
  mindMapGrandchildLabel: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    color: '#827562',
    fontWeight: '500',
  },
});

export default styles;
