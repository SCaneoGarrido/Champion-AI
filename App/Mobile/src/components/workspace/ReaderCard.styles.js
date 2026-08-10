import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
  },
  // paddingBottom/paddingRight de más (encima del padding de `card`) para que
  // el texto nunca quede debajo/al lado del FloatingToolbar anclado
  // abajo-derecha (52px de botón + 16px de offset horizontal / 20px vertical
  // — ver FloatingToolbar.styles.js). El botón necesita 52+16=68px de despeje
  // horizontal desde el borde de `card`; `card.padding` ya aporta 24, así que
  // acá hace falta sumar 44 más (no 24 — cálculo corregido).
  scrollContent: {
    paddingBottom: 84,
    paddingRight: 44,
    gap: 24,
  },

  // ── Badge + título de sección ──────────────────────────────────────────────
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F2F1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E2E2E',
    marginTop: 12,
  },

  // ── Texto enriquecido ───────────────────────────────────────────────────────
  paragraph: {
    fontSize: 18,
    lineHeight: 30,
    color: '#444444',
  },
  dropCap: {
    fontSize: 42,
    fontWeight: '700',
    color: '#8B6A00',
    lineHeight: 42,
  },

  // ── Estados vacíos ──────────────────────────────────────────────────────────
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B6B6B',
    fontStyle: 'italic',
  },

  // ── Paginación ──────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  pageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F2F1',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E2E2E',
    minWidth: 48,
    textAlign: 'center',
  },
});

export default styles;
