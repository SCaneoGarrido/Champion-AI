import { Platform } from 'react-native';

const monospace = Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' });

export function createMarkdownStyles(colors = {}, darkMode = false) {
  const text = colors.text || (darkMode ? '#f1f5f9' : '#1c1b1b');
  const textMuted = colors.textMuted || '#827562';
  const border = colors.border || 'rgba(212,196,174,0.25)';
  const cardAlt = colors.cardAlt || (darkMode ? '#252525' : '#f6f3f2');
  const primary = colors.primary || '#c9920a';

  return {
    body: { color: text },

    heading1: { flexDirection: 'row', fontSize: 24, fontWeight: '800', color: text, marginTop: 18, marginBottom: 8 },
    heading2: { flexDirection: 'row', fontSize: 20, fontWeight: '800', color: text, marginTop: 16, marginBottom: 8 },
    heading3: { flexDirection: 'row', fontSize: 17, fontWeight: '700', color: text, marginTop: 14, marginBottom: 6 },
    heading4: { flexDirection: 'row', fontSize: 15, fontWeight: '700', color: text, marginTop: 12, marginBottom: 6 },
    heading5: { flexDirection: 'row', fontSize: 13, fontWeight: '700', color: text, marginTop: 10, marginBottom: 4 },
    heading6: { flexDirection: 'row', fontSize: 12, fontWeight: '700', color: textMuted, marginTop: 10, marginBottom: 4 },

    hr: { backgroundColor: border, height: 1, marginVertical: 14 },

    strong: { fontWeight: '800', color: text },
    em: { fontStyle: 'italic', color: text },
    s: { textDecorationLine: 'line-through', color: textMuted },

    blockquote: {
      backgroundColor: cardAlt,
      borderColor: primary,
      borderLeftWidth: 3,
      marginVertical: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },

    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { flexDirection: 'row', justifyContent: 'flex-start', marginVertical: 2 },
    bullet_list_icon: { marginLeft: 4, marginRight: 8, color: primary },
    bullet_list_content: { flex: 1, color: text },
    ordered_list_icon: { marginLeft: 4, marginRight: 8, color: primary, fontWeight: '700' },
    ordered_list_content: { flex: 1, color: text },

    code_inline: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: cardAlt,
      color: text,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      fontFamily: monospace,
      fontSize: 13,
    },
    code_block: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: cardAlt,
      color: text,
      padding: 10,
      borderRadius: 8,
      fontFamily: monospace,
      fontSize: 13,
    },
    fence: {
      borderWidth: 1,
      borderColor: border,
      backgroundColor: cardAlt,
      color: text,
      padding: 10,
      borderRadius: 8,
      fontFamily: monospace,
      fontSize: 13,
    },

    table: { borderWidth: 1, borderColor: border, borderRadius: 8, marginVertical: 8, overflow: 'hidden' },
    thead: { backgroundColor: cardAlt },
    tbody: {},
    th: { flex: 1, padding: 8, fontWeight: '800', color: text },
    tr: { borderBottomWidth: 1, borderColor: border, flexDirection: 'row' },
    td: { flex: 1, padding: 8, color: text },

    link: { textDecorationLine: 'underline', color: primary },

    text: { color: text },
    paragraph: {
      marginTop: 6,
      marginBottom: 6,
      flexWrap: 'wrap',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      width: '100%',
    },

    taskCheckbox: { fontSize: 15, color: primary },
  };
}
