/**
 * DashboardScreen – Home Dashboard tras iniciar sesión.
 *
 * Implementa el diseño solicitado de HomeDashboard y mantiene:
 * - lectura de sesión desde AsyncStorage para mostrar iniciales del usuario
 * - estructura por secciones para facilitar mantenimiento
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { createDashboardStyles } from './DashboardScreen.styles';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useTopBarStyle } from '../hooks/useTopBarStyle';

const USER_KEY = '@champion_user';

const ACTIVITY_ITEMS = [
  {
    id: '1',
    title: 'Resumen de Calculo II',
    subtitle: 'Derivadas e integrales',
    time: 'hace 2h',
    tag: 'Apunte',
    icon: 'file-open',
    tone: 'primary',
  },
  {
    id: '2',
    title: 'Consulta sobre Historia',
    subtitle: 'Revolucion Francesa',
    time: 'ayer',
    tag: 'Chat',
    icon: 'forum',
    tone: 'secondary',
  },
  {
    id: '3',
    title: 'PDF subido: Algebra',
    subtitle: 'Capitulo 3 - Matrices',
    time: 'hace 3d',
    tag: 'Archivo',
    icon: 'description',
    tone: 'neutral',
  },
];

export default function DashboardScreen() {
  const styles = useThemedStyles(createDashboardStyles);
  const topBarStyle = useTopBarStyle();
  const [user, setUser] = useState(null);

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
      <View style={[styles.topBar, topBarStyle]}>
        <View style={styles.topLeft}>
          <Text style={styles.brand}>
            Champion<Text style={styles.brandAccent}>AI</Text>
          </Text>
        </View>
        <View style={styles.avatarBubble}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingTitle}>Hola, Sebastian!</Text>
            <Text style={styles.greetingSubtitle}>Que aprenderemos hoy?</Text>
          </View>
          <View style={styles.datePill}>
            <Text style={styles.dateText}>Jue 19 Mar</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroBubble} />
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>Sube tus apuntes y yo los organizo</Text>
            <Text style={styles.heroSubtitle}>Carga PDFs o fotos de tus notas</Text>
          </View>
          <TouchableOpacity style={styles.heroButton} activeOpacity={0.9}>
            <Text style={styles.heroButtonText}>Empezar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.indicatorRow}>
          <View style={styles.indicatorActive} />
          <View style={styles.indicatorDot} />
          <View style={styles.indicatorDot} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actividad reciente</Text>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.sectionLink}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {ACTIVITY_ITEMS.map((item) => (
            <View key={item.id} style={styles.activityCard}>
              <View style={styles.activityMain}>
                <View
                  style={[
                    styles.activityIconBox,
                    item.tone === 'primary' && styles.activityIconPrimary,
                    item.tone === 'secondary' && styles.activityIconSecondary,
                    item.tone === 'neutral' && styles.activityIconNeutral,
                  ]}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={20}
                    color={
                      item.tone === 'primary'
                        ? '#c9920a'
                        : item.tone === 'secondary'
                          ? '#7c5800'
                          : '#504534'
                    }
                  />
                </View>
                <View style={styles.activityText}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.tag,
                  item.tone === 'primary' && styles.tagPrimary,
                  item.tone === 'secondary' && styles.tagSecondary,
                  item.tone === 'neutral' && styles.tagNeutral,
                ]}
              >
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <MaterialIcons name="bolt" size={28} color="#c9920a" />
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Racha de dias</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="school" size={28} color="#5a9fed" />
            <Text style={styles.statValue}>84%</Text>
            <Text style={styles.statLabel}>Progreso total</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Terminos</Text>
            <Text style={styles.footerLink}>Privacidad</Text>
          </View>
          <Text style={styles.footerCopy}>Champion AI (c) 2025</Text>
          <Text style={styles.footerVersion}>v1.0.0</Text>
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => {}}>
        <MaterialIcons name="smart-toy" size={26} color="#fff" />
        <View style={styles.fabBadge}>
          <Text style={styles.fabBadgeText}>1</Text>
        </View>
      </Pressable>
    </View>
  );
}
