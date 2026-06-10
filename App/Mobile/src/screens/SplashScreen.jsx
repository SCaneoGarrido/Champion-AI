/**
 * SplashScreen – Pantalla de bienvenida animada.
 *
 * Objetivo:
 * - Mostrar SOLO el logo institucional al iniciar la app.
 * - Mantener una animación suave y rápida para no frenar al usuario.
 * - Redirigir automáticamente a la pantalla de carga académica.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

/** Tiempo total visible de la splash antes de redirigir */
const SPLASH_DURATION_MS = 2600;

export default function SplashScreen({ navigation }) {
  /**
   * Valores animados:
   * - logoOpacity: aparición progresiva del logo.
   * - logoScale: zoom muy leve para que no se vea estático.
   */
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Animación simple de entrada: limpia, rápida y con foco total en el logo.
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.back(0.8)),
        useNativeDriver: true,
      }),
    ]).start();

    // Redirección automática a la pantalla de carga al finalizar el tiempo definido.
    const timeoutId = setTimeout(() => {
      navigation.replace('AcademicLoading');
    }, SPLASH_DURATION_MS);

    // Limpieza para evitar fugas si se desmonta antes de tiempo.
    return () => clearTimeout(timeoutId);
  }, [logoOpacity, logoScale, navigation]);

  return (
    <View style={styles.container}>
      {/* Solo logo centrado; sin texto ni elementos extra para cumplir el diseño solicitado. */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/Logo Champion Slogan.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

/**
 * Estilos:
 * - Fondo blanco limpio.
 * - Logo centrado como elemento único.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 390,
    height: 250,
  },
});
