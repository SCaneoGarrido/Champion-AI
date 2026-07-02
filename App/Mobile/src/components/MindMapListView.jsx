/**
 * Renderer de lista anidada para mind_map_json — extraído de NoteDetailScreen.jsx.
 * Es el fallback de MermaidRenderer.jsx: se usa cuando no hay mind_map_mermaid_code
 * (jobs anteriores a la Presentation Layer) o cuando el render de Mermaid falla.
 * Ver App/rules/mobile-rendering.md (R-RENDER-05, R-RENDER-08).
 */
import React from 'react';
import { View, Text } from 'react-native';
import styles from './MindMapListView.styles';

function MindMapNode({ node, depth = 0 }) {
  if (!node?.name) return null;

  const isRoot = depth === 0;
  const isChild = depth === 1;

  const nodeStyle = isRoot ? styles.mindMapNode : isChild ? styles.mindMapChildNode : styles.mindMapGrandchildNode;
  const bulletStyle = isRoot ? styles.mindMapBullet : isChild ? styles.mindMapChildBullet : styles.mindMapGrandchildBullet;
  const labelStyle = isRoot ? styles.mindMapLabel : isChild ? styles.mindMapChildLabel : styles.mindMapGrandchildLabel;
  const bullet = isRoot ? '◆' : isChild ? '▸' : '–';
  const childrenStyle = isRoot ? styles.mindMapChildren : styles.mindMapGrandchildren;

  return (
    <View>
      <View style={nodeStyle}>
        <Text style={bulletStyle}>{bullet}</Text>
        <Text style={labelStyle}>{node.name}</Text>
      </View>
      {node.children?.length > 0 && depth < 3 && (
        <View style={childrenStyle}>
          {node.children.map((child, i) => (
            <MindMapNode key={i} node={child} depth={depth + 1} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function MindMapListView({ data }) {
  if (!data?.nodes?.length) {
    return <Text style={styles.emptyText}>Sin datos.</Text>;
  }
  return (
    <View style={styles.mindMapRoot}>
      {data.nodes.map((node, i) => (
        <MindMapNode key={i} node={node} depth={0} />
      ))}
    </View>
  );
}
