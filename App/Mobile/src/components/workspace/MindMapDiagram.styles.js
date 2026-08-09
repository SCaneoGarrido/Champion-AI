import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Guía vertical continua del árbol — mismo patrón que un tree-view de
  // explorador de archivos (indentación + línea), sin conectores en L que
  // requieran medir posiciones absolutas entre hermanos (frágil en RN).
  childrenGuide: {
    marginLeft: 15,
    paddingLeft: 17,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(185,138,0,0.28)',
    marginTop: 10,
    gap: 10,
  },

  chevronBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronSpacer: {
    width: 22,
  },

  chip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipRoot: {
    backgroundColor: '#B98A00',
  },
  chipDepth1: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#B98A00',
  },
  chipDepth2: {
    backgroundColor: '#F3F2F1',
  },
  chipDepth3: {
    backgroundColor: 'transparent',
  },

  textRoot: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  textDepth1: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E2E2E',
  },
  textDepth2: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444444',
  },
  textDepth3: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B6B6B',
  },

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
});

export default styles;
