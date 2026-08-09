/**
 * RichMarkdownPreviewScreen — revisión manual aislada de `RichMarkdown`
 * (Markdown real + LaTeX real vía WebView/KaTeX, ver `MathView.jsx`).
 *
 * Datos 100% mock — a propósito no toca ningún job real todavía. Es la pieza
 * de mayor riesgo técnico construida en esta sesión (reintroduce WebView);
 * se prueba sola, en dispositivo, antes de conectarla a `summary_text` /
 * `notes_json` / `mind_map_json` reales en el Workspace.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import RichMarkdown from '../components/workspace/RichMarkdown';
import styles from './RichMarkdownPreviewScreen.styles';

const MOCK_CONTENT = `# Executive Summary

La clase cubrió los fundamentos de la **dualidad onda-partícula** y su relación con el experimento de la doble rendija.

## Ecuación de Planck-Einstein

La energía de un fotón se relaciona con su frecuencia mediante:

$$E = h\\nu$$

donde $h \\approx 6.626 \\times 10^{-34}$ J·s es la constante de Planck.

## Principio de incertidumbre

Heisenberg formalizó que no se puede conocer simultáneamente la posición $x$ y el momento $p$ con precisión arbitraria:

$$\\Delta x \\Delta p \\geq \\frac{\\hbar}{2}$$

## Puntos clave

- La luz se comporta como onda **y** como partícula, según el experimento.
- La *función de onda* $\\psi(x, t)$ describe la probabilidad de encontrar una partícula en una posición.
- La ecuación de Schrödinger dependiente del tiempo es:

$$i\\hbar \\frac{\\partial \\psi}{\\partial t} = \\hat{H}\\psi$$

> "No creo que la naturaleza juegue a los dados." — cita atribuida a Einstein, mencionada como contraste con la interpretación de Copenhague.

## Ejemplo numérico

Si $\\lambda = 500$ nm, la frecuencia asociada es $\\nu = c / \\lambda \\approx 6 \\times 10^{14}$ Hz.
`;

export default function RichMarkdownPreviewScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <MaterialIcons name="arrow-back" size={22} color="#2E2E2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Markdown + LaTeX</Text>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>PREVIEW · DATOS MOCK</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <RichMarkdown content={MOCK_CONTENT} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
