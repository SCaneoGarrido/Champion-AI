import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import styles from './NoteDetailScreen.styles';
import { getJobResult } from '../utils/api';
import { exportJobToPDF } from '../utils/pdfExport';

// ── Secciones ──────────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'transcription', label: 'Transcripción', icon: 'mic',               bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6' },
  { key: 'summary',       label: 'Resumen',        icon: 'summarize',         bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  { key: 'notes',         label: 'Notas',          icon: 'notes',             bg: 'rgba(201,146,10,0.1)',  color: '#c9920a' },
  { key: 'mind_map',      label: 'Mapa Mental',    icon: 'account-tree',      bg: 'rgba(168,85,247,0.1)', color: '#9333ea' },
];

// ── Mapa Mental ────────────────────────────────────────────────────────────────

function MindMapNode({ node, depth = 0 }) {
  if (!node?.name) return null;

  const isRoot   = depth === 0;
  const isChild  = depth === 1;

  const nodeStyle   = isRoot ? styles.mindMapNode       : isChild ? styles.mindMapChildNode       : styles.mindMapGrandchildNode;
  const bulletStyle = isRoot ? styles.mindMapBullet     : isChild ? styles.mindMapChildBullet     : styles.mindMapGrandchildBullet;
  const labelStyle  = isRoot ? styles.mindMapLabel      : isChild ? styles.mindMapChildLabel      : styles.mindMapGrandchildLabel;
  const bullet      = isRoot ? '◆'                     : isChild ? '▸'                           : '–';
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

function MindMapSection({ data }) {
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

// ── Sección colapsable ─────────────────────────────────────────────────────────

function CollapsibleSection({ section, result, expanded, onToggle }) {
  const renderBody = () => {
    if (section.key === 'mind_map') {
      return <MindMapSection data={result.mind_map_json} />;
    }
    const fieldMap = {
      transcription: result.transcription_text,
      summary:       result.summary_text,
      notes:         result.notes_text,
    };
    const text = fieldMap[section.key];
    return text
      ? <Text style={styles.sectionText}>{text}</Text>
      : <Text style={styles.emptyText}>Sin datos.</Text>;
  };

  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={onToggle}
        activeOpacity={0.75}
      >
        <View style={[styles.sectionIconWrap, { backgroundColor: section.bg }]}>
          <MaterialIcons name={section.icon} size={18} color={section.color} />
        </View>
        <Text style={styles.sectionTitle}>{section.label}</Text>
        <MaterialIcons
          name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={22}
          color="#827562"
        />
      </TouchableOpacity>

      {expanded && (
        <>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionBody}>
            {renderBody()}
          </View>
        </>
      )}
    </View>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────

export default function NoteDetailScreen({ visible, job, onClose }) {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [expanded, setExpanded] = useState({ transcription: true, summary: false, notes: false, mind_map: false });
  const [downloading, setDownloading] = useState(false);

  const jobName = job?.blob_name ?? (job ? `Apunte ${job.job_id.slice(0, 8)}…` : '');

  const fetchResult = useCallback(async () => {
    if (!job) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await getJobResult(job.job_id);
      setResult(data);
    } catch (e) {
      const msg = e.message ?? '';
      if (msg.includes('RESULT_NOT_READY')) {
        setError('El resultado aún no está disponible. Intenta más tarde.');
      } else {
        setError('No se pudo cargar el apunte. Verifica tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  }, [job]);

  useEffect(() => {
    if (visible && job) fetchResult();
  }, [visible, job]);

  const toggleSection = (key) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const handleDownload = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      await exportJobToPDF(jobName, result);
    } catch (e) {
      // El error se maneja con un alert nativo de expo-sharing o del SO
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      style={styles.modal}
    >
      <SafeAreaView style={styles.screen}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={20} color="#1a1a1a" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>{jobName}</Text>

          <TouchableOpacity
            style={[styles.headerBtn, downloading && { opacity: 0.5 }]}
            onPress={handleDownload}
            disabled={!result || downloading}
            activeOpacity={0.7}
          >
            {downloading
              ? <ActivityIndicator size="small" color="#c9920a" />
              : <MaterialIcons name="picture-as-pdf" size={20} color="#c9920a" />
            }
          </TouchableOpacity>
        </View>

        {/* Cuerpo */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color="#c9920a" size="large" />
            <Text style={styles.loadingText}>Cargando apunte…</Text>
          </View>
        )}

        {!loading && error ? (
          <View style={styles.centered}>
            <MaterialIcons name="error-outline" size={36} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchResult}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && result && (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {SECTIONS.map(section => (
              <CollapsibleSection
                key={section.key}
                section={section}
                result={result}
                expanded={expanded[section.key]}
                onToggle={() => toggleSection(section.key)}
              />
            ))}
          </ScrollView>
        )}

      </SafeAreaView>
    </Modal>
  );
}
