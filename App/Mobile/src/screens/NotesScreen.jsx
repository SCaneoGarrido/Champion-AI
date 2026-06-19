import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import baseStyles from './NotesScreen.styles';
import { useThemedScreenStyles } from '../hooks/useThemedScreenStyles';
import { mergeNotesTheme } from '../theme/screenThemeMerges';
import AppTopBar from '../components/AppTopBar';
import ToastBanner from '../components/ToastBanner';
import { useToast } from '../hooks/useToast';
import { getSession } from '../utils/session';
import { getRecentJobs, getUserStats } from '../utils/api';

const PAGE_SIZE = 5;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' });
}

function fmtDuration(secs) {
  if (!secs || secs === 0) return null;
  const m = Math.floor(Number(secs) / 60);
  const s = Math.round(Number(secs) % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function StatusBadge({ status, styles }) {
  const cfg = {
    completed:  { label: 'Completado', wrap: styles.badgeAvailable,  text: styles.badgeAvailableText },
    processing: { label: 'En Proceso', wrap: styles.badgeProcess,    text: styles.badgeProcessText },
    queued:     { label: 'En Cola',    wrap: styles.badgeQueued,     text: styles.badgeQueuedText },
    failed:     { label: 'Error',      wrap: styles.badgeError,      text: styles.badgeErrorText },
  }[status] ?? { label: status, wrap: styles.badgeQueued, text: styles.badgeQueuedText };

  return (
    <View style={[styles.badge, cfg.wrap]}>
      <Text style={[styles.badgeText, cfg.text]} numberOfLines={1}>{cfg.label}</Text>
    </View>
  );
}

function serviceIcon(code) {
  if (code === 'STT') return { name: 'keyboard-voice', color: '#3b82f6' };
  if (code === 'TTS') return { name: 'volume-up',      color: '#22c55e' };
  return { name: 'auto-awesome', color: '#f59e0b' };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotesScreen({ navigation }) {
  const styles = useThemedScreenStyles(baseStyles, mergeNotesTheme);
  const { show: showToast, visible: toastVisible, message: toastMsg } = useToast();

  const [session, setSession] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, j, st] = await Promise.all([
        getSession(),
        getRecentJobs(50),
        getUserStats(),
      ]);
      setSession(s);
      setJobs(j);
      setStats(st);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar los apuntes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const pageJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <View style={styles.screen}>
      <View style={styles.decorTop} pointerEvents="none" />
      <View style={styles.decorBottom} pointerEvents="none" />

      <AppTopBar
        sessionOverride={session}
        onAvatarPress={() => navigation?.navigate('Profile')}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.headerPill}>
          <MaterialIcons name="menu-book" size={22} color="#c9920a" />
          <Text style={styles.headerPillTitle}>Mis Apuntes</Text>
        </View>

        {/* ── Tabla de grabaciones ── */}
        <View style={styles.tableCard}>
          {loading && (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color="#c9920a" size="large" />
              <Text style={[styles.fileName, { marginTop: 10 }]}>Cargando...</Text>
            </View>
          )}

          {!loading && error ? (
            <View style={{ paddingVertical: 28, alignItems: 'center', gap: 12 }}>
              <MaterialIcons name="error-outline" size={32} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 13 }}>{error}</Text>
              <TouchableOpacity onPress={load} style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(201,146,10,0.12)', borderRadius: 10 }}>
                <Text style={{ color: '#c9920a', fontWeight: '700' }}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!loading && !error && (
            <>
              <View style={styles.tableHeadRow}>
                <Text style={[styles.th, styles.thName]}>Archivo</Text>
                <Text style={[styles.th, styles.thDate]}>Fecha</Text>
                <Text style={[styles.th, styles.thStatus, { textAlign: 'center' }]}>Estado</Text>
                <Text style={[styles.th, styles.thActions, { textAlign: 'right' }]}>Info</Text>
              </View>

              {pageJobs.length === 0 && (
                <View style={{ paddingVertical: 28, alignItems: 'center', gap: 8 }}>
                  <MaterialIcons name="inbox" size={32} color="#827562" />
                  <Text style={styles.fileName}>Sin grabaciones aún</Text>
                </View>
              )}

              {pageJobs.map(job => {
                const ic = serviceIcon(job.service_code);
                const dur = fmtDuration(job.duration_seconds);
                return (
                  <View key={job.job_id} style={styles.row}>
                    <View style={styles.cellName}>
                      <MaterialIcons name={ic.name} size={20} color={ic.color} />
                      <Text style={styles.fileName} numberOfLines={1}>
                        {job.blob_name ?? job.job_id.slice(0, 14) + '…'}
                      </Text>
                    </View>
                    <Text style={styles.cellDate}>{fmtDate(job.requested_at)}</Text>
                    <View style={styles.cellStatus}>
                      <StatusBadge status={job.status} styles={styles} />
                    </View>
                    <View style={styles.cellActions}>
                      <TouchableOpacity
                        hitSlop={12}
                        activeOpacity={0.7}
                        onPress={() => showToast(dur ? `Duración: ${dur}` : `ID: ${job.job_id.slice(0, 8)}…`)}
                      >
                        <MaterialIcons name="info-outline" size={20} color="#827562" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {jobs.length > PAGE_SIZE && (
                <View style={styles.paginationBar}>
                  <Text style={styles.paginationLabel}>
                    Página {page} de {totalPages}
                  </Text>
                  <View style={styles.paginationBtns}>
                    <TouchableOpacity
                      style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                      onPress={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <MaterialIcons name="chevron-left" size={22} color="#827562" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                      onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <MaterialIcons name="chevron-right" size={22} color="#c9920a" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Métricas reales ── */}
        {stats && (
          <>
            <View style={styles.statsTitle}>
              <View style={styles.statsTitleBar} />
              <Text style={styles.statsTitleText}>Resumen</Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Grabaciones</Text>
                <Text style={styles.metricValue}>{stats.total_jobs}</Text>
                <View style={styles.metricIconBg}>
                  <MaterialIcons name="mic" size={56} color="#c9920a" />
                </View>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Completadas</Text>
                <Text style={styles.metricValue}>{stats.completed}</Text>
                <View style={styles.metricIconBg}>
                  <MaterialIcons name="check-circle" size={56} color="#c9920a" />
                </View>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>En cola</Text>
                <Text style={styles.metricValue}>{stats.queued}</Text>
                <View style={styles.metricIconBg}>
                  <MaterialIcons name="pending" size={56} color="#c9920a" />
                </View>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Audio total</Text>
                <Text style={styles.metricValueAccent}>
                  {Math.floor(Number(stats.total_duration_seconds ?? 0) / 60)}m
                </Text>
                <View style={styles.metricIconBg}>
                  <MaterialIcons name="timer" size={56} color="#c9920a" />
                </View>
              </View>
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerCopy}>© 2026 Champion AI</Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => showToast('🚧 Chatbot en desarrollo')}
        activeOpacity={0.88}
      >
        <MaterialIcons name="smart-toy" size={26} color="#fff" />
      </TouchableOpacity>

      <ToastBanner visible={toastVisible} message={toastMsg} />
    </View>
  );
}
