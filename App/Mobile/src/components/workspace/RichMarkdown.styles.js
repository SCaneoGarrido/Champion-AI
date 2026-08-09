// Estilos para react-native-markdown-display — claves = tipos de nodo del
// AST de markdown-it (heading1..6, strong, em, bullet_list, etc.), no son
// StyleSheet.create de RN puro (la librería las pasa tal cual a sus <Text>/
// <View> internos, por eso van como objeto plano, no ViewStyle tipado).
const markdownStyles = {
  body: {
    fontSize: 18,
    lineHeight: 30,
    color: '#444444',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 14,
  },
  heading1: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E2E2E',
    marginTop: 8,
    marginBottom: 10,
  },
  heading2: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2E2E2E',
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8B6A00',
    marginTop: 12,
    marginBottom: 6,
  },
  heading4: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B6A00',
    marginTop: 10,
    marginBottom: 6,
  },
  strong: {
    fontWeight: '700',
    color: '#2E2E2E',
  },
  em: {
    fontStyle: 'italic',
  },
  bullet_list: {
    marginBottom: 14,
  },
  ordered_list: {
    marginBottom: 14,
  },
  list_item: {
    marginBottom: 6,
    flexDirection: 'row',
  },
  bullet_list_icon: {
    marginRight: 8,
    color: '#B98A00',
  },
  code_inline: {
    backgroundColor: '#F3F2F1',
    color: '#8B6A00',
    paddingHorizontal: 4,
    borderRadius: 4,
    fontFamily: 'Courier',
  },
  code_block: {
    backgroundColor: '#F3F2F1',
    padding: 12,
    borderRadius: 12,
    fontFamily: 'Courier',
  },
  fence: {
    backgroundColor: '#F3F2F1',
    padding: 12,
    borderRadius: 12,
    fontFamily: 'Courier',
  },
  link: {
    color: '#B98A00',
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: '#F4F2F1',
    borderLeftWidth: 4,
    borderLeftColor: '#B98A00',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginVertical: 10,
  },
  hr: {
    backgroundColor: '#ECECEC',
    height: 1,
    marginVertical: 16,
  },
};

export default markdownStyles;
