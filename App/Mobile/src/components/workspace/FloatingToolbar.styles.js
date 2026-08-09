import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  // Wrapper a pantalla completa: centra verticalmente el toolbar sin
  // depender de transforms con porcentajes (no soportados en RN).
  wrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  column: {
    alignItems: 'center',
    gap: 14,
  },

  // Panel desplegado — translúcido a propósito (pedido explícito): deja ver
  // el ReaderCard detrás en vez de taparlo con una superficie sólida.
  panel: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 24,
    paddingVertical: 12,
    gap: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  buttonActive: {
    backgroundColor: '#C69200',
    shadowColor: '#C69200',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonInactive: {
    backgroundColor: 'rgba(242,242,242,0.85)',
  },

  // Handle siempre visible, opaco a propósito — es el ancla fija que
  // pliega/despliega el panel, tiene que verse igual de bien con el panel
  // abierto o cerrado.
  toggle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E2E2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
});

export default styles;
