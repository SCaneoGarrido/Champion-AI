/**
 * MindMapDiagram — "Bloques" del Knowledge Workspace (EPIC V1).
 *
 * Es el ítem de mayor riesgo histórico del roadmap: la Presentation Layer
 * anterior (Markdown/LaTeX/Mermaid vía WebView + mermaid.js) se implementó de
 * punta a punta y se revirtió por completo el 2026-07-11 por bugs visuales
 * persistentes en mobile (ver App/Knowledge/Bugs/known-issues.md, ISSUE-012).
 *
 * Decisión de esta implementación: NO reintroducir WebView/mermaid.js ni
 * ninguna librería de renderizado gráfico nueva (react-native-svg tampoco
 * está instalada, y no está confirmado que corra en Expo Go — misma lección
 * que el crash de react-native-reanimated de esta sesión). En su lugar, el
 * mapa mental se dibuja como un árbol indentado con guías verticales (mismo
 * patrón que un explorador de archivos) usando solo Views/Text — cero
 * dependencias nuevas, cero módulos nativos sin verificar, mismo criterio que
 * ya se aplicó en FloatingToolbar/ReaderCard. No es un renderizado Mermaid
 * literal, es el equivalente visual del EPIC V1 con el riesgo estructural
 * eliminado, no solo mitigado.
 *
 * Recibe `data` con la forma de `mind_map_json` (schema fijo, profundidad
 * máxima 4 niveles — ver known-issues.md ISSUE-007):
 *   { title, nodes: [{ name, children: [...] }] }
 */
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { cleanAIText } from '../../utils/textFormat';
import styles from './MindMapDiagram.styles';

const CHIP_STYLES = [styles.chipRoot, styles.chipDepth1, styles.chipDepth2, styles.chipDepth3];
const TEXT_STYLES = [styles.textRoot, styles.textDepth1, styles.textDepth2, styles.textDepth3];

function MindMapNode({ node, depth }) {
  const hasChildren = node.children?.length > 0;
  const [expanded, setExpanded] = useState(true);

  if (!node?.name) return null;

  const chipStyle = CHIP_STYLES[Math.min(depth, CHIP_STYLES.length - 1)];
  const textStyle = TEXT_STYLES[Math.min(depth, TEXT_STYLES.length - 1)];

  return (
    <View>
      <View style={styles.row}>
        {hasChildren ? (
          <Pressable
            style={styles.chevronBtn}
            onPress={() => setExpanded(e => !e)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={expanded ? `Colapsar ${node.name}` : `Expandir ${node.name}`}
            accessibilityState={{ expanded }}
          >
            <MaterialIcons
              name={expanded ? 'expand-more' : 'chevron-right'}
              size={20}
              color={depth === 0 ? '#B98A00' : '#8B6A00'}
            />
          </Pressable>
        ) : (
          <View style={styles.chevronSpacer} />
        )}

        <View style={[styles.chip, chipStyle]}>
          <Text style={textStyle}>{cleanAIText(node.name)}</Text>
        </View>
      </View>

      {hasChildren && expanded && (
        <View style={styles.childrenGuide}>
          {node.children.map((child, i) => (
            <MindMapNode key={i} node={child} depth={depth + 1} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function MindMapDiagram({ data }) {
  if (!data?.nodes?.length) {
    return (
      <View style={styles.emptyWrap}>
        <MaterialIcons name="account-tree" size={28} color="#6B6B6B" />
        <Text style={styles.emptyText}>Sin mapa mental disponible todavía.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      {data.nodes.map((node, i) => (
        <MindMapNode key={i} node={node} depth={0} />
      ))}
    </ScrollView>
  );
}
