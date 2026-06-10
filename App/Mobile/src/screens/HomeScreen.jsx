/**
 * HomeScreen – Pantalla de bienvenida (inicio).
 *
 * Muestra título, descripción y botones para ir a Login o Registro.
 * Recibe navigation por props (React Navigation) para navegar a otras pantallas.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>Bienvenido a Champion AI</Text>
        <Text style={styles.subtitle}>
          La solución para procesar documentos y tareas con IA
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Empieza ahora</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Qué puedes hacer?</Text>
        <Text style={styles.paragraph}>
          Champion AI integra servicios de Microsoft Azure para texto a voz, voz a texto,
          resúmenes automáticos y más. Todo desde tu móvil.
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>Iniciar sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.linkText}>Registrarse</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* Estilos de la pantalla (tema oscuro #1a1a2e, acentos #6366f1 / #818cf8) */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 24, paddingBottom: 48 },
  hero: { marginTop: 24, marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#eee', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#eee', marginBottom: 8 },
  paragraph: { fontSize: 14, color: '#aaa', lineHeight: 22 },
  buttons: { flexDirection: 'row', gap: 16, marginTop: 16 },
  linkButton: { paddingVertical: 8 },
  linkText: { color: '#818cf8', fontSize: 16 },
});
