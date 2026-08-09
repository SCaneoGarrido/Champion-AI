/**
 * AIQuoteCard — caja de cita destacada para contenido generado por IA.
 * Independiente y reutilizable: solo recibe `quote` + `author` como props,
 * no conoce de dónde viene el texto (Resumen, un highlight de Notas, etc.).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AIQuoteCard({ quote, author }) {
  if (!quote) return null;

  return (
    <View style={styles.card} accessibilityRole="text">
      <View style={styles.rail} />
      <View style={styles.content}>
        <Text style={styles.quote}>{quote}</Text>
        {author ? <Text style={styles.author}>— {author}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#F4F2F1',
    borderRadius: 18,
    overflow: 'hidden',
  },
  rail: {
    width: 4,
    backgroundColor: '#B98A00',
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 10,
  },
  quote: {
    fontSize: 17,
    lineHeight: 26,
    fontStyle: 'italic',
    color: '#444444',
  },
  author: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B98A00',
  },
});
