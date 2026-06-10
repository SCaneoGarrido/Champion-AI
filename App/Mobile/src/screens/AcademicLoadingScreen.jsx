/**
 * AcademicLoadingScreen – Pantalla intermedia de carga.
 *
 * Flujo:
 * 1) Se muestra después del Splash inicial.
 * 2) Ejecuta una animación de barra de progreso + barras de actividad.
 * 3) Al terminar, redirige automáticamente al Login.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

/** Duración total de la carga antes de navegar al login (5 segundos) */
const LOAD_DURATION_MS = 5000;

export default function AcademicLoadingScreen({ navigation }) {
  /** Progreso de 0 a 1 para la barra de carga */
  const progress = useRef(new Animated.Value(0)).current;
  /** Pulso infinito para dar “vida” a las barras de actividad */
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación principal de carga (de izquierda a derecha).
    Animated.timing(progress, {
      toValue: 1,
      duration: LOAD_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false, // width no soporta native driver
    }).start(({ finished }) => {
      if (finished) {
        navigation.replace('Login');
      }
    });

    // Pulso continuo para las barras “soundwave”.
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [navigation, progress, pulse]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  /** Definición base de alturas para las barras decorativas */
  const bars = useMemo(() => [10, 16, 24, 12, 18, 8, 12, 20, 15], []);

  return (
    <View style={styles.container}>
      {/* Wrapper central */}
      <View style={styles.main}>
        {/* Círculo con logo */}
        <View style={styles.logoCircle}>
          <Image
            source={require('../assets/images/Champion AI Logo Sin slogan (1).png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        {/* Marca */}
        <View style={styles.brandBlock}>
          <Text style={styles.brandTitle}>Champion AI</Text>
          <Text style={styles.brandSubtitle}>EL CURADOR ACADÉMICO</Text>
        </View>

        {/* Indicador tipo audio + barra de carga */}
        <View style={styles.loaderBlock}>
          <View style={styles.waveRow}>
            {bars.map((height, index) => {
              const scaleY = pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.72, 1.16],
              });
              const opacity = pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.45, 1],
              });
              return (
                <Animated.View
                  key={`bar-${index}`}
                  style={[
                    styles.waveBar,
                    {
                      height,
                      opacity,
                      transform: [{ scaleY }],
                    },
                    index === 2 || index === 6 ? styles.waveBarStrong : styles.waveBarSoft,
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.loadingText}>Iniciando entorno intelectual...</Text>
        </View>
      </View>

      {/* Pie de página */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerTitle}>© 2026 CHAMPION AI</Text>
        <Text style={styles.footerSubtitle}>IMPULSADO POR RIGOR ACADÉMICO Y DISEÑO INTELIGENTE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcf9f8',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 34,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1c1b1b',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 34,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 24,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 34,
  },
  brandTitle: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '800',
    color: '#765b00',
    letterSpacing: -1,
  },
  brandSubtitle: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.2,
    color: '#4d4637',
    opacity: 0.75,
  },
  loaderBlock: {
    alignItems: 'center',
  },
  waveRow: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  waveBar: {
    width: 6,
    borderRadius: 99,
    marginHorizontal: 3,
  },
  waveBarStrong: {
    backgroundColor: '#765b00',
  },
  waveBarSoft: {
    backgroundColor: '#dcb755',
  },
  progressTrack: {
    width: 210,
    height: 3,
    borderRadius: 99,
    backgroundColor: 'rgba(127, 118, 101, 0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#dcb755',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#4d4637',
    opacity: 0.62,
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  footerDivider: {
    width: 36,
    height: 1,
    backgroundColor: 'rgba(127, 118, 101, 0.2)',
    marginBottom: 14,
  },
  footerTitle: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '800',
    color: '#4d4637',
    opacity: 0.55,
  },
  footerSubtitle: {
    marginTop: 4,
    fontSize: 9,
    letterSpacing: 0.5,
    color: '#4d4637',
    opacity: 0.4,
    textAlign: 'center',
  },
});
