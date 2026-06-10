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
import styles from './SettingsScreen.styles';
import notesStyles from './NotesScreen.styles';

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [userLabel, setUserLabel] = useState('SC');
  const [drawerName, setDrawerName] = useState('Usuario');

  const load = useCallback(async () => {
    const s = await getAppSettings();
    setNotificationsEnabled(s.notificationsEnabled);
    setDarkMode(s.darkMode);
    const session = await getSession();
    setDrawerName(session?.name?.trim() || session?.email?.split('@')[0] || 'Usuario');
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

  const onToggleDarkMode = async (value) => {
    setDarkMode(value);
    await setAppSettings({ darkMode: value });
  };

  const handleLogout = async () => {
    await clearSession();
    setDrawerOpen(false);
    navigation.replace('Home');
  };

  const placeholderNav = (title) => {
    Alert.alert(title, 'Esta sección estará disponible próximamente.');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setDrawerOpen(true)} activeOpacity={0.85}>
            <MaterialIcons name="menu" size={26} color="#7c5800" />
          </TouchableOpacity>
          <Text style={styles.brand}>Champion AI</Text>
        </View>
        <View style={styles.avatarRing}>
          <Text style={styles.avatarText}>{userLabel}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerPill}>
          <MaterialIcons name="settings" size={18} color="#7c5800" />
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
                  borderBottomColor: 'rgba(240, 237, 237, 0.95)',
                },
                index === 3 && {
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(246, 243, 242, 0.98)',
                },
              ]}
              onPress={() => placeholderNav(row.title)}
              activeOpacity={0.75}
            >
              <View style={styles.rowLeft}>
                <View style={styles.rowIconBox}>
                  <MaterialIcons name={row.icon} size={26} color="#7c5800" />
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
            <MaterialIcons name="notifications" size={24} color="#7c5800" />
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
            <MaterialIcons name="dark-mode" size={24} color="#504534" />
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

      {drawerOpen ? (
        <View style={notesStyles.drawerOverlay}>
          <View style={notesStyles.drawerPanel}>
            <View style={notesStyles.drawerHeader}>
              <View style={notesStyles.drawerAvatar}>
                <Text style={notesStyles.drawerAvatarText}>{userLabel}</Text>
              </View>
              <View>
                <Text style={notesStyles.drawerName} numberOfLines={1}>
                  {drawerName}
                </Text>
                <Text style={notesStyles.drawerRole}>Configuración</Text>
              </View>
            </View>

            <View style={notesStyles.drawerNav}>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Dashboard');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="home" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('SpeechToText');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="mic" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Speech to Text</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Services');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="category" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Servicios</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Notes');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="edit-note" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Mis Apuntes</Text>
              </TouchableOpacity>
              <View style={[notesStyles.drawerItem, notesStyles.drawerItemActive]}>
                <MaterialIcons name="settings" size={20} color="#7c5800" />
                <Text style={notesStyles.drawerItemActiveText}>Configuracion</Text>
              </View>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Profile');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="person" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Mi Perfil</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={notesStyles.drawerLogout} onPress={handleLogout} activeOpacity={0.9}>
              <MaterialIcons name="logout" size={20} color="#ba1a1a" />
              <Text style={notesStyles.drawerLogoutText}>Cerrar sesion</Text>
            </TouchableOpacity>
          </View>
          <Pressable style={notesStyles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
        </View>
      ) : null}
    </View>
  );
}
