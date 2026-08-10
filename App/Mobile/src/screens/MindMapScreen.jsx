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
import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
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
  const [rotating, setRotating] = useState(true);

  // El árbol necesita más ancho del que da portrait sin forzar wrap/overflow en
  // niveles profundos — se fuerza landscape solo mientras esta pantalla tiene foco
  // y se revierte a portrait al salir (el resto de la app sigue portrait-locked).
  // El contenido queda oculto (`rotating`) hasta que lockAsync resuelve — sin
  // esto se ve un frame en portrait justo antes de que el dispositivo rote.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setRotating(true);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).finally(() => {
        if (!cancelled) setRotating(false);
      });
      return () => {
        cancelled = true;
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.screen}>
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

      {rotating ? (
        <View style={styles.rotatingWrap}>
          <ActivityIndicator color="#B98A00" size="large" />
        </View>
      ) : (
        <View style={styles.card}>
          <MindMapDiagram data={usingMock ? MOCK_MIND_MAP : mindMap} />
        </View>
      )}
    </SafeAreaView>
  );
}
