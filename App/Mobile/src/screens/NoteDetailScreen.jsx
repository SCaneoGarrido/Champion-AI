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
import MarkdownRenderer from '../components/MarkdownRenderer';
import MermaidRenderer from '../components/MermaidRenderer';
import { normalizeMathText } from '../utils/normalizeMathText';

// ── Secciones ──────────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'transcription', label: 'Transcripción', icon: 'mic',               bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6' },
  { key: 'summary',       label: 'Resumen',        icon: 'summarize',         bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  { key: 'notes',         label: 'Notas',          icon: 'notes',             bg: 'rgba(201,146,10,0.1)',  color: '#c9920a' },
  { key: 'mind_map',      label: 'Mapa Mental',    icon: 'account-tree',      bg: 'rgba(168,85,247,0.1)', color: '#9333ea' },
];

// ── Sección colapsable ─────────────────────────────────────────────────────────

// summary_text/notes_text ya son Markdown (ver App/procesamiento/prompts/summary.md, notes.md).
// transcription_text es salida literal de STT — nunca pasa por GPT, así que ningún prompt
// puede agregarle LaTeX. normalizeMathText() cubre el único caso en que igual conviene
// renderizarla como Markdown: patrones matemáticos simples e inequívocos que puedan
// aparecer literalmente en el texto transcripto. Ver ADR-010 en el Knowledge Vault.
const MARKDOWN_SECTIONS = new Set(['summary', 'notes']);

function CollapsibleSection({ section, result, jobId, expanded, onToggle }) {
  const renderBody = () => {
    if (section.key === 'mind_map') {
      return (
        <MermaidRenderer
          jobId={jobId}
          mindMapJson={result.mind_map_json}
          mermaidCode={result.mind_map_mermaid_code}
          svg={result.mind_map_svg}
        />
      );
    }
    const fieldMap = {
      transcription: result.transcription_text,
      summary:       result.summary_text,
      notes:         result.notes_text,
    };
    const text = fieldMap[section.key];
    if (!text) return <Text style={styles.emptyText}>Sin datos.</Text>;
    if (MARKDOWN_SECTIONS.has(section.key)) return <MarkdownRenderer content={text} />;
    if (section.key === 'transcription') return <MarkdownRenderer content={normalizeMathText(text)} />;
    return <Text style={styles.sectionText}>{text}</Text>;
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
                jobId={job?.job_id}
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
