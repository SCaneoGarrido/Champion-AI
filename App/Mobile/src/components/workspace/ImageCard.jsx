/**
 * ImageCard — imagen grande con caption, aspect ratio ~16:9.
 * Independiente y reutilizable. Ningún paso del pipeline STT genera imágenes
 * todavía (ver App/Knowledge/Roadmap/EPICS.md) — este componente queda listo
 * para cuando exista esa fuente de datos, sin uso real en el Workspace por ahora.
 */
import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

export default function ImageCard({ image, caption }) {
  if (!image) return null;

  return (
    <View>
      <Image
        source={{ uri: image }}
        style={styles.image}
        resizeMode="cover"
        accessibilityRole="image"
        accessibilityLabel={caption || 'Imagen'}
      />
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 18,
    backgroundColor: '#F3F2F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  caption: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B6B6B',
    textAlign: 'center',
  },
});
