/**
 * KnowledgeWorkspaceScreen — EPIC V1 (ver App/Knowledge/Roadmap/EPICS.md).
 *
 * Implementa el diseño de App/tasks/knowledge_workspace_mockup_description.md
 * como un "content switcher": el FloatingToolbar navega entre los componentes
 * del Knowledge Pack (Resumen/Notas/Transcripción se renderizan acá dentro del
 * ReaderCard; Bloques/Audio quedan como stubs — son componentes aislados
 * aparte, todavía no construidos/integrados, ver task_procesamiento.md).
 *
 * Contrato de navegación (ADR-009): recibe { jobId, blobName? } por route.params
 * y es dueño de su propio fetch vía getJobResult(jobId) — no asume nada del
 * manager que lo invocó.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import ReaderCard from '../components/workspace/ReaderCard';
import FloatingToolbar from '../components/workspace/FloatingToolbar';
import ConfirmDialog from '../components/ConfirmDialog';
import ToastBanner from '../components/ToastBanner';
import { useToast } from '../hooks/useToast';
import { getJobResult, deleteJob } from '../utils/api';
import { exportJobToPDF } from '../utils/pdfExport';
import { mapJobResultToWorkspace } from '../utils/workspaceMapper';
import { getSession } from '../utils/session';
import styles from './KnowledgeWorkspaceScreen.styles';

const CONTENT_TABS = [
  { key: 'resumen', icon: 'summarize', label: 'Resumen' },
  { key: 'notas', icon: 'edit-note', label: 'Notas' },
  { key: 'transcripcion', icon: 'article', label: 'Transcripción' },
];

function getInitials(session) {
  const source = session?.display_name || session?.name || session?.email || '';
  const clean = String(source).trim();
  if (!clean) return 'SC';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export default function KnowledgeWorkspaceScreen({ navigation, route }) {
  const { jobId, blobName } = route.params;
  const { show: showToast, visible: toastVisible, message: toastMsg } = useToast();

  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('resumen');
  const [sectionIndices, setSectionIndices] = useState({ resumen: 0, notas: 0, transcripcion: 0 });

  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getSession().then(setSession).catch(() => {});
  }, []);

  const fetchResult = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getJobResult(jobId);
      setResult(data);
      setWorkspace(mapJobResultToWorkspace(data));
    } catch (e) {
      const msg = e.message ?? '';
      setError(msg.includes('RESULT_NOT_READY')
        ? 'El resultado aún no está disponible. Intenta más tarde.'
        : 'No se pudo cargar el Knowledge Pack. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchResult(); }, [fetchResult]);

  const documentTitle = workspace?.documentTitle ?? blobName ?? `Apunte ${jobId.slice(0, 8)}…`;
  const currentDocument = workspace?.documents?.[activeTab];
  const totalSections = currentDocument?.sections?.length ?? 0;
  const sectionIndex = Math.min(sectionIndices[activeTab] ?? 0, Math.max(totalSections - 1, 0));
  const currentSection = currentDocument?.sections?.[sectionIndex] ?? null;

  const moveSection = (delta) => {
    setSectionIndices(prev => ({
      ...prev,
      [activeTab]: Math.max(0, Math.min(totalSections - 1, (prev[activeTab] ?? 0) + delta)),
    }));
  };

  const handleExport = async () => {
    if (!result) return;
    setExporting(true);
    try {
      await exportJobToPDF(documentTitle, result);
    } catch (e) {
      showToast('No se pudo exportar el PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!result?.summary_text) {
      showToast('Todavía no hay resumen para compartir.');
      return;
    }
    try {
      await Share.share({ message: `${documentTitle}\n\n${result.summary_text}` });
    } catch (e) {
      // Cancelado por el usuario o error de plataforma — no vale la pena un toast agresivo acá.
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deleteJob(jobId);
      navigation.goBack();
    } catch (e) {
      showToast('No se pudo eliminar el Knowledge Pack.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toolbarButtons = [
    ...CONTENT_TABS.map(tab => ({
      key: tab.key,
      icon: tab.icon,
      label: tab.label,
      active: activeTab === tab.key,
      onPress: () => setActiveTab(tab.key),
    })),
    {
      key: 'bloques',
      icon: 'account-tree',
      label: 'Mapa mental',
      active: false,
      onPress: () => navigation.navigate('MindMapScreen', {
        mindMap: result?.mind_map_json,
        documentTitle,
      }),
    },
    {
      key: 'audio',
      icon: 'graphic-eq',
      label: 'Escuchar narración',
      active: false,
      onPress: () => showToast('🚧 Narración en desarrollo'),
    },
  ];

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

        <Text style={styles.workspaceTitle}>Champion AI</Text>

        <View style={styles.avatar} accessibilityRole="image" accessibilityLabel="Perfil">
          <Text style={styles.avatarText}>{getInitials(session)}</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator color="#B98A00" size="large" />
          <Text style={styles.loadingText}>Cargando Knowledge Pack…</Text>
        </View>
      )}

      {!loading && error ? (
        <View style={styles.centered}>
          <MaterialIcons name="error-outline" size={36} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchResult} accessibilityRole="button" accessibilityLabel="Reintentar">
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error && workspace && (
        <>
          <View style={styles.documentInfo}>
            <View style={styles.documentIconWrap}>
              <MaterialIcons name="menu-book" size={20} color="#B98A00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.documentEyebrow}>Knowledge Workspace</Text>
              <Text style={styles.documentName} numberOfLines={1}>{documentTitle}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <ReaderCard
              section={currentSection}
              sectionIndex={sectionIndex}
              totalSections={totalSections}
              onPrevious={() => moveSection(-1)}
              onNext={() => moveSection(1)}
            />
            <FloatingToolbar buttons={toolbarButtons} />
          </View>

          <View style={styles.bottomToolbar}>
            <View style={styles.bottomToolbarSide}>
              <TouchableOpacity
                style={styles.bottomIconBtn}
                onPress={handleExport}
                disabled={exporting}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Exportar a PDF"
              >
                {exporting
                  ? <ActivityIndicator size="small" color="#8B6A00" />
                  : <MaterialIcons name="picture-as-pdf" size={22} color="#8B6A00" />}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bottomIconBtn}
                onPress={handleShare}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Compartir resumen"
              >
                <MaterialIcons name="ios-share" size={22} color="#8B6A00" />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomToolbarSide}>
              <TouchableOpacity
                style={styles.bottomIconBtn}
                onPress={() => setShowDeleteConfirm(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Eliminar Knowledge Pack"
              >
                <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Eliminar Knowledge Pack"
        message={`¿Eliminar "${documentTitle}"? Dejará de aparecer en tus apuntes. Esta acción no se puede deshacer desde la app.`}
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ToastBanner visible={toastVisible} message={toastMsg} />
    </SafeAreaView>
  );
}
