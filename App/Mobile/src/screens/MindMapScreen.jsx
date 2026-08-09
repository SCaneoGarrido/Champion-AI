/**
 * MindMapScreen — "Bloques" del Knowledge Workspace (EPIC V1).
 *
 * Renderiza `MindMapDiagram` (ver ese archivo para la decisión de no usar
 * WebView/mermaid.js — árbol indentado, cero dependencias nuevas).
 *
 * Recibe `mindMap` + `documentTitle` ya resueltos vía route.params —
 * `KnowledgeWorkspaceScreen` ya tiene `result.mind_map_json` cargado de su
 * propio fetch (GET /jobs/{id}/result), así que esta pantalla no repite la
 * llamada a la API. Si se navega acá sin params (ex.: revisión manual
 * aislada), cae a datos mock — mismo propósito que tenía
 * MindMapDiagramPreviewScreen, ahora fusionado en una sola pantalla en vez de
 * mantener dos versiones (preview vs. real) del mismo componente host.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MindMapDiagram from '../components/workspace/MindMapDiagram';
import styles from './MindMapScreen.styles';

const MOCK_MIND_MAP = {
  title: 'Dualidad Onda-Partícula',
  nodes: [
    {
      name: 'Dualidad Onda-Partícula',
      children: [
        {
          name: 'Experimento de la doble rendija',
          children: [
            {
              name: 'Patrón de interferencia',
              children: [
                { name: 'Ondas que se refuerzan y cancelan', children: [] },
                { name: 'Se observa incluso con un fotón a la vez', children: [] },
              ],
            },
            { name: 'Colapso al medir qué rendija cruzó', children: [] },
          ],
        },
        {
          name: 'Principio de incertidumbre',
          children: [
            { name: 'Posición y momento no se conocen a la vez', children: [] },
            { name: 'Formulado por Heisenberg (1927)', children: [] },
          ],
        },
        {
          name: 'Interpretaciones',
          children: [
            { name: 'Copenhague', children: [] },
            { name: 'Muchos mundos', children: [] },
          ],
        },
      ],
    },
  ],
};

export default function MindMapScreen({ navigation, route }) {
  const mindMap = route?.params?.mindMap;
  const documentTitle = route?.params?.documentTitle;
  const usingMock = !mindMap;

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {documentTitle ? `Mapa Mental — ${documentTitle}` : 'Mapa Mental'}
        </Text>
      </View>

      {usingMock && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PREVIEW · DATOS MOCK</Text>
        </View>
      )}

      <View style={styles.card}>
        <MindMapDiagram data={usingMock ? MOCK_MIND_MAP : mindMap} />
      </View>
    </SafeAreaView>
  );
}
