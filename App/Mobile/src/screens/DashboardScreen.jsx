import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { createDashboardStyles } from './DashboardScreen.styles';
import { useThemedStyles } from '../hooks/useThemedStyles';
import AppTopBar from '../components/AppTopBar';
import ToastBanner from '../components/ToastBanner';
import { useToast } from '../hooks/useToast';
import { getSession } from '../utils/session';
import { getRecentJobs, getUserStats } from '../utils/api';

const SCREEN_W = Dimensions.get('window').width;

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(secs) {
  if (!secs || secs === 0) return '0 min';
  const m = Math.floor(Number(secs) / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function fmtRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function jobIcon(serviceCode) {
  if (serviceCode === 'STT') return 'keyboard-voice';
  if (serviceCode === 'TTS') return 'volume-up';
  if (serviceCode === 'VISION') return 'image-search';
  return 'auto-awesome';
}

function jobTone(status) {
  if (status === 'completed') return 'primary';
  if (status === 'failed') return 'error';
  if (status === 'processing') return 'secondary';
  return 'neutral';
}

function jobTag(serviceCode) {
  if (serviceCode === 'STT') return 'Audio';
  if (serviceCode === 'TTS') return 'Voz';
  if (serviceCode === 'VISION') return 'Visión';
  return 'IA';
}

// ── Slider cards ──────────────────────────────────────────────────────────────

function SliderCard({ style, children }) {
  return <View style={[{ width: SCREEN_W - 32, marginHorizontal: 0 }, style]}>{children}</View>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const styles = useThemedStyles(createDashboardStyles);
  const { show: showToast, visible: toastVisible, message: toastMsg } = useToast();

  const [session, setSession] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Slider state
  const sliderRef = useRef(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const firstName = useMemo(() => {
    const name = session?.display_name || session?.name || session?.email || '';
    return name.split(/\s+/)[0] || 'ahí';
  }, [session]);

  const load = useCallback(async () => {
    try {
      const [s, j, st] = await Promise.all([
        getSession(),
        getRecentJobs(5).catch(() => []),
        getUserStats().catch(() => null),
      ]);
      setSession(s);
      setJobs(j);
      setStats(st);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const slides = useMemo(() => [
    {
      key: 'cta',
      icon: 'keyboard-voice',
      title: 'Graba tu clase',
      subtitle: 'Inicia una grabación en segundos y obtén tu transcripción de forma automática.',
      btnLabel: 'Iniciar grabación',
      onPress: () => navigation.navigate('Services'),
    },
    {
      key: 'transcriptions',
      icon: 'menu-book',
      title: stats?.total_jobs > 0
        ? `${stats.total_jobs} grabación${stats.total_jobs !== 1 ? 'es' : ''}`
        : 'Sin grabaciones aún',
      subtitle: stats?.completed > 0
        ? `${stats.completed} completada${stats.completed !== 1 ? 's' : ''} · ${fmtDuration(stats.total_duration_seconds)} de audio procesado.`
        : 'Aún no has procesado ninguna grabación. ¡Empieza hoy!',
      btnLabel: 'Ver mis apuntes',
      onPress: () => navigation.navigate('Notes'),
    },
    {
      key: 'coming',
      icon: 'auto-awesome',
      title: 'Más IA en camino',
      subtitle: 'Text to Speech, Vision IA e IA Generativa llegarán pronto para potenciar tu estudio.',
      btnLabel: 'Ver servicios',
      onPress: () => navigation.navigate('Services'),
    },
  ], [stats, navigation]);

  return (
    <View style={styles.screen}>
      <AppTopBar
        sessionOverride={session}
        onAvatarPress={() => navigation.navigate('Profile')}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingTitle}>Hola, {firstName}!</Text>
            <Text style={styles.greetingSubtitle}>¿Qué aprenderemos hoy?</Text>
          </View>
        </View>

        {/* ── Hero Slider ── */}
        <FlatList
          ref={sliderRef}
          data={slides}
          keyExtractor={s => s.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SCREEN_W - 32}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_W - 32));
            setSlideIndex(idx);
          }}
          getItemLayout={(_, index) => ({
            length: SCREEN_W - 32,
            offset: (SCREEN_W - 32) * index,
            index,
          })}
          renderItem={({ item }) => (
            <SliderCard>
              <View style={styles.heroCard}>
                <View style={styles.heroBubble} />
                <View style={styles.heroBody}>
                  <MaterialIcons name={item.icon} size={28} color="rgba(255,255,255,0.7)" />
                  <Text style={[styles.heroTitle, { marginTop: 10 }]}>{item.title}</Text>
                  <Text style={styles.heroSubtitle}>{item.subtitle}</Text>
                </View>
                <TouchableOpacity style={styles.heroButton} onPress={item.onPress} activeOpacity={0.9}>
                  <Text style={styles.heroButtonText}>{item.btnLabel}</Text>
                </TouchableOpacity>
              </View>
            </SliderCard>
          )}
        />

        {/* Dots */}
        <View style={styles.indicatorRow}>
          {slides.map((_, i) => (
            <View key={i} style={i === slideIndex ? styles.indicatorActive : styles.indicatorDot} />
          ))}
        </View>

        {/* ── Actividad reciente ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actividad reciente</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Notes')} activeOpacity={0.8}>
            <Text style={styles.sectionLink}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={[styles.activityCard, { justifyContent: 'center', paddingVertical: 28 }]}>
            <Text style={styles.activitySubtitle}>Cargando actividad...</Text>
          </View>
        )}

        {!loading && jobs.length === 0 && (
          <View style={[styles.activityCard, { justifyContent: 'center', alignItems: 'center', paddingVertical: 28 }]}>
            <MaterialIcons name="inbox" size={32} color="#827562" />
            <Text style={[styles.activitySubtitle, { marginTop: 8 }]}>Sin actividad reciente</Text>
          </View>
        )}

        <View style={styles.activityList}>
          {jobs.map(job => {
            const tone = jobTone(job.status);
            return (
              <View key={job.job_id} style={styles.activityCard}>
                <View style={styles.activityMain}>
                  <View style={[
                    styles.activityIconBox,
                    tone === 'primary' && styles.activityIconPrimary,
                    tone === 'secondary' && styles.activityIconSecondary,
                    (tone === 'neutral' || tone === 'error') && styles.activityIconNeutral,
                  ]}>
                    <MaterialIcons
                      name={jobIcon(job.service_code)}
                      size={20}
                      color={tone === 'primary' ? '#c9920a' : tone === 'secondary' ? '#7c5800' : '#504534'}
                    />
                  </View>
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {job.blob_name ?? job.job_id.slice(0, 16) + '…'}
                    </Text>
                    <Text style={styles.activitySubtitle}>
                      {job.language_locale ?? job.feature_code ?? job.service_code}
                      {job.duration_seconds ? ` · ${fmtDuration(job.duration_seconds)}` : ''}
                    </Text>
                    <Text style={styles.activityTime}>{fmtRelative(job.requested_at)}</Text>
                  </View>
                </View>
                <View style={[
                  styles.tag,
                  tone === 'primary' && styles.tagPrimary,
                  tone === 'secondary' && styles.tagSecondary,
                  (tone === 'neutral' || tone === 'error') && styles.tagNeutral,
                ]}>
                  <Text style={styles.tagText}>{jobTag(job.service_code)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Stats rápidas ── */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="mic" size={28} color="#c9920a" />
              <Text style={styles.statValue}>{stats.total_jobs}</Text>
              <Text style={styles.statLabel}>Grabaciones</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="timer" size={28} color="#5a9fed" />
              <Text style={styles.statValue}>{fmtDuration(stats.total_duration_seconds)}</Text>
              <Text style={styles.statLabel}>Procesadas</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Términos</Text>
            <Text style={styles.footerLink}>Privacidad</Text>
          </View>
          <Text style={styles.footerCopy}>Champion AI © 2026 · v1.0.0</Text>
        </View>
      </ScrollView>

      {/* FAB Chatbot */}
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
