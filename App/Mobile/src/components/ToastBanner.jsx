import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * Overlay de notificación efímera.
 * Uso: <ToastBanner visible={visible} message={message} />
 */
export default function ToastBanner({ visible, message }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity }]} pointerEvents="none">
      <MaterialIcons name="construction" size={16} color="#fff" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 108,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(28,27,27,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
