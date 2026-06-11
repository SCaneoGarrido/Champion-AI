/**
 * SettingsScreen – Configuración de la app (preferencias persistentes).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSession, clearSession } from '../utils/session';
import { getAppSettings, setAppSettings } from '../utils/appSettings';
import { useTheme } from '../context/ThemeContext';
import { createSettingsStyles } from './SettingsScreen.styles';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useTopBarStyle } from '../hooks/useTopBarStyle';

const MENU_ROWS = [
  {
    id: 'subs',
    icon: 'card-membership',
    title: 'Gestionar suscripciones',
    subtitle: 'Plan actual: Gratuito',
  },
  {
    id: 'pay',
    icon: 'payments',
    title: 'Métodos de pago',
    subtitle: 'Sin método configurado',
  },
  {
    id: 'privacy',
    icon: 'lock-person',
    title: 'Configuración de privacidad',
    subtitle: 'Permisos y datos personales',
  },
  {
    id: 'support',
    icon: 'help-center',
    title: 'Soporte',
    subtitle: 'Ayuda, FAQ y contacto',
  },
];

export default function SettingsScreen({ navigation }) {
  const { darkMode, setDarkMode, colors } = useTheme();
  const styles = useThemedStyles(createSettingsStyles);
  const topBarStyle = useTopBarStyle();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [userLabel, setUserLabel] = useState('SC');

  const load = useCallback(async () => {
    const s = await getAppSettings();
    setNotificationsEnabled(s.notificationsEnabled);
    const session = await getSession();
    const source = session?.name || session?.email || 'SC';
    const clean = String(source).trim();
    if (!clean) {
      setUserLabel('SC');
      return;
    }
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) setUserLabel(`${parts[0][0]}${parts[1][0]}`.toUpperCase());
    else setUserLabel(clean.slice(0, 2).toUpperCase());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onToggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    await setAppSettings({ notificationsEnabled: value });
  };

  const onToggleDarkMode = (value) => {
    setDarkMode(value);
  };

  const handleLogout = async () => {
    await clearSession();
    navigation.getParent()?.replace('Login');
  };

  const placeholderNav = (title) => {
    Alert.alert(title, 'Esta sección estará disponible próximamente.');
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, topBarStyle]}>
        <View style={styles.topLeft}>
          <Text style={styles.brand}>Champion AI</Text>
        </View>
        <View style={styles.avatarRing}>
          <Text style={styles.avatarText}>{userLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerPill}>
          <MaterialIcons name="settings" size={18} color={colors.primaryDark} />
          <Text style={styles.headerPillText}>Configuración de la App</Text>
        </View>

        <View style={styles.mainCard}>
          {MENU_ROWS.map((row, index) => (
            <TouchableOpacity
              key={row.id}
              style={[
                styles.rowBtn,
                index <= 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderLight,
                },
                index === 3 && {
                  borderTopWidth: 1,
                  borderTopColor: colors.borderLight,
                },
              ]}
              onPress={() => placeholderNav(row.title)}
              activeOpacity={0.75}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBox}>
                  <MaterialIcons name={row.icon} size={26} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="rgba(212, 196, 174, 0.9)" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Cuenta</Text>

        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <MaterialIcons name="notifications" size={24} color={colors.primaryDark} />
            <Text style={styles.toggleLabel}>Notificaciones</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={onToggleNotifications}
            trackColor={{ false: '#eae7e7', true: '#c9920a' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#eae7e7"
          />
        </View>

        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <MaterialIcons name="dark-mode" size={24} color={colors.textSecondary} />
            <Text style={styles.toggleLabel}>Modo oscuro</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={onToggleDarkMode}
            trackColor={{ false: '#eae7e7', true: '#c9920a' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#eae7e7"
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialIcons name="logout" size={18} color="#ba1a1a" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerVer}>Versión 2.4.0 (Build 892)</Text>
          <Text style={styles.footerCopy}>© 2026 Champion AI. Todos los derechos reservados.</Text>
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => {}}>
        <LinearGradient
          colors={['#7c5800', '#c9920a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="smart-toy" size={32} color="#fff" />
        </LinearGradient>
      </Pressable>

    </View>
  );
}
