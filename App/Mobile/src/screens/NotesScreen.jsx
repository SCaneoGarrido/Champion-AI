/**
 * NotesScreen – Mis Apuntes: tabla, paginación, estadísticas y distribución (mock alineado al HTML).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import baseStyles from './NotesScreen.styles';
import { useThemedScreenStyles } from '../hooks/useThemedScreenStyles';
import { mergeNotesTheme } from '../theme/screenThemeMerges';
import { useTopBarStyle } from '../hooks/useTopBarStyle';

const USER_KEY = '@champion_user';

const NOTE_ROWS = [
  {
    id: '1',
    fileName: 'Bio_Final.pdf',
    date: '12 Oct 23',
    status: 'available',
    icon: 'picture-as-pdf',
    iconColor: '#ef4444',
  },
  {
    id: '2',
    fileName: 'Clase_04.mp3',
    date: '10 Oct 23',
    status: 'processing',
    icon: 'audio-file',
    iconColor: '#3b82f6',
  },
  {
    id: '3',
    fileName: 'Notas_IA.docx',
    date: '08 Oct 23',
    status: 'queued',
    icon: 'description',
    iconColor: '#fb923c',
  },
  {
    id: '4',
    fileName: 'Resumen_01.pdf',
    date: '07 Oct 23',
    status: 'error',
    icon: 'error-outline',
    iconColor: '#ef4444',
  },
];

export default function NotesScreen() {
  const styles = useThemedScreenStyles(baseStyles, mergeNotesTheme);
  const topBarStyle = useTopBarStyle();

  function StatusBadge({ status }) {
    const map = {
      available: {
        label: 'Disponible',
        wrap: styles.badgeAvailable,
        text: styles.badgeAvailableText,
      },
      processing: {
        label: 'En Proceso',
        wrap: styles.badgeProcess,
        text: styles.badgeProcessText,
      },
      queued: {
        label: 'En Cola',
        wrap: styles.badgeQueued,
        text: styles.badgeQueuedText,
      },
      error: {
        label: 'Error',
        wrap: styles.badgeError,
        text: styles.badgeErrorText,
      },
    };
    const cfg = map[status] || map.available;
    return (
      <View style={[styles.badge, cfg.wrap]}>
        <Text style={[styles.badgeText, cfg.text]} numberOfLines={1}>
          {cfg.label}
        </Text>
      </View>
    );
  }
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(1);
  const totalPages = 12;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(USER_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch (_) {}
    })();
  }, []);

  const userInitials = useMemo(() => {
    const source = user?.name || user?.email || user?.user_id || 'SC';
    const clean = String(source).trim();
    if (!clean) return 'SC';
    const split = clean.split(/\s+/).filter(Boolean);
    if (split.length >= 2) return `${split[0][0]}${split[1][0]}`.toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  }, [user]);

  return (
    <View style={styles.screen}>
      <View style={styles.decorTop} pointerEvents="none" />
      <View style={styles.decorBottom} pointerEvents="none" />

      <View style={[styles.topBar, topBarStyle]}>
        <View style={styles.topLeft}>
          <Text style={[styles.brand, { fontStyle: 'italic' }]}>
            Champion
            <Text style={[styles.brandAccent, { fontStyle: 'italic' }]}> AI</Text>
          </Text>
        </View>
        <View style={styles.avatarGold}>
          <Text style={styles.avatarGoldText}>{userInitials}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerPill}>
          <MaterialIcons name="menu-book" size={22} color="#c9920a" />
          <Text style={styles.headerPillTitle}>Mis Apuntes</Text>
        </View>

        <View style={styles.tableCard}>
          <View>
            <View style={styles.tableHeadRow}>
              <Text style={[styles.th, styles.thName]}>Nombre</Text>
              <Text style={[styles.th, styles.thDate]}>Fecha</Text>
              <Text style={[styles.th, styles.thStatus, { textAlign: 'center' }]}>Estado</Text>
              <Text style={[styles.th, styles.thActions, { textAlign: 'right' }]}>Acciones</Text>
            </View>
            {NOTE_ROWS.map((row) => (
              <View key={row.id} style={styles.row}>
                <View style={styles.cellName}>
                  <MaterialIcons name={row.icon} size={20} color={row.iconColor} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {row.fileName}
                  </Text>
                </View>
                <Text style={styles.cellDate}>{row.date}</Text>
                <View style={styles.cellStatus}>
                  <StatusBadge status={row.status} />
                </View>
                <View style={styles.cellActions}>
                  <TouchableOpacity hitSlop={12} activeOpacity={0.7}>
                    <MaterialIcons name="more-vert" size={20} color="#827562" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.paginationBar}>
            <Text style={styles.paginationLabel}>
              Página {page} de {totalPages}
            </Text>
            <View style={styles.paginationBtns}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <MaterialIcons name="chevron-left" size={22} color="#827562" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <MaterialIcons name="chevron-right" size={22} color="#c9920a" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.statsTitle}>
          <View style={styles.statsTitleBar} />
          <Text style={styles.statsTitleText}>Estadísticas de uso</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Apuntes</Text>
            <Text style={styles.metricValue}>142</Text>
            <View style={styles.metricIconBg}>
              <MaterialIcons name="book" size={56} color="#c9920a" />
            </View>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Transcripciones</Text>
            <Text style={styles.metricValue}>38</Text>
            <View style={styles.metricIconBg}>
              <MaterialIcons name="keyboard-voice" size={56} color="#c9920a" />
            </View>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Resúmenes IA</Text>
            <Text style={styles.metricValue}>89</Text>
            <View style={styles.metricIconBg}>
              <MaterialIcons name="auto-awesome" size={56} color="#c9920a" />
            </View>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Ahorro</Text>
            <Text style={styles.metricValueAccent}>12h</Text>
            <View style={styles.metricIconBg}>
              <MaterialIcons name="timer" size={56} color="#c9920a" />
            </View>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={styles.chartHeadTitle}>Distribución por servicio</Text>
            <Text style={styles.chartHeadTotal}>Total 100%</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={styles.barSeg1} />
            <View style={styles.barSeg2} />
            <View style={styles.barSeg3} />
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#c9920a' }]} />
              <Text style={styles.legendText}>Transcripciones (60%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#5a9fed' }]} />
              <Text style={styles.legendText}>Resúmenes (25%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#fbbc36' }]} />
              <Text style={styles.legendText}>Otros (15%)</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerCopy}>© 2026 Champion AI</Text>
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => {}}>
        <MaterialIcons name="smart-toy" size={28} color="#fff" />
      </Pressable>

    </View>
  );
}
