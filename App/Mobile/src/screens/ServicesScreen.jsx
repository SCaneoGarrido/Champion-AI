/**
 * ServicesScreen – Catálogo de herramientas IA (diseño alineado al mock web).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { clearSession } from '../utils/session';
import styles from './ServicesScreen.styles';

const USER_KEY = '@champion_user';

const VISION_DEMO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAnUumlVn3K11t9-Lz_qgssahG34kwblPkH5l_C-sWOfIcwIeC6Hfiqn1EBsDWdqeV6MIMmLIvfn-vlYjOhQ007TJHzFWr9PD5CwsdtPPj8spdOJHmHEawFILm0j1NwL5CbyNcUXnKiIXPDkkxKlk5MgBCBM6Yl_qbcDwbFDLp_JIskjWb4qUYV-sn1ZLXFPZJkG9d-88S4hZrnJ90alOGauSOeCCixHRAKgzRL11XoSH82-fxc_x2pXg4Nzz7CZ8iRs9UcHMzcZULM';

const SERVICE_ROWS = [
  [
    {
      id: 'stt',
      title: 'Speech to Text',
      description: 'Dicta tus ideas de diseño rápidamente.',
      icon: 'mic',
      navigateTo: 'SpeechToText',
    },
    {
      id: 'vision',
      title: 'Vision IA',
      description: 'Analiza imágenes y extrae planos.',
      icon: 'visibility',
      navigateTo: null,
    },
  ],
  [
    {
      id: 'tts',
      title: 'Text to Speech',
      description: 'Escucha tus apuntes en voz natural.',
      icon: 'volume-up',
      navigateTo: null,
    },
    {
      id: 'gen',
      title: 'IA Generativa',
      description: 'Genera resúmenes y ejercicios.',
      icon: 'auto-awesome',
      navigateTo: null,
    },
  ],
];

export default function ServicesScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cardWidth = useMemo(() => {
    const w = Dimensions.get('window').width;
    return (w - 16 * 2 - 12) / 2;
  }, []);

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

  const handleLogout = async () => {
    await clearSession();
    setDrawerOpen(false);
    navigation.replace('Home');
  };

  const onUseService = (navigateTo) => {
    if (navigateTo) {
      setDrawerOpen(false);
      navigation.navigate(navigateTo);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setDrawerOpen(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="menu" size={24} color="#1c1b1b" />
          </TouchableOpacity>
          <Text style={styles.brand}>
            Champion<Text style={styles.brandAccent}>AI</Text>
          </Text>
        </View>
        <View style={styles.avatarBubble}>
          <Text style={styles.avatarText}>{userInitials}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroKicker}>Herramientas IA</Text>
          <Text style={styles.heroTitle}>¿Qué necesitas hoy?</Text>
          <Text style={styles.heroSubtitle}>
            Potencia tu estudio con inteligencia artificial de vanguardia diseñada para ti.
          </Text>
          <View style={styles.heroIconWrap} pointerEvents="none">
            <MaterialIcons name="auto-awesome" size={120} color="#1c1b1b" />
          </View>
        </View>

        <View style={{ marginBottom: 24 }}>
          {SERVICE_ROWS.map((row, rowIndex) => (
            <View
              key={`row-${rowIndex}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: rowIndex === 0 ? 12 : 0,
              }}
            >
              {row.map((item) => (
                <View
                  key={item.id}
                  style={[styles.gridCard, { width: cardWidth }]}
                >
                  <View style={styles.gridIconBox}>
                    <MaterialIcons name={item.icon} size={22} color="#c9920a" />
                  </View>
                  <Text style={styles.gridCardTitle}>{item.title}</Text>
                  <Text style={styles.gridCardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <TouchableOpacity
                    style={styles.gridUseRow}
                    onPress={() => onUseService(item.navigateTo)}
                    activeOpacity={item.navigateTo ? 0.7 : 1}
                    disabled={!item.navigateTo}
                  >
                    <Text
                      style={[
                        styles.gridUseText,
                        !item.navigateTo && { opacity: 0.45 },
                      ]}
                    >
                      Usar
                    </Text>
                    <MaterialIcons
                      name="arrow-forward"
                      size={14}
                      color={item.navigateTo ? '#c9920a' : 'rgba(201, 146, 10, 0.45)'}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.eduSection}>
          <View style={styles.eduCard}>
            <Text style={styles.eduTitle}>¿Cómo funciona Vision IA?</Text>
            <Text style={styles.eduBody}>
              Sube una foto de un plano. Nuestra IA procesará las líneas y elementos para
              entregarte un análisis constructivo detallado.
            </Text>
            <Image
              source={{ uri: VISION_DEMO_IMAGE }}
              style={styles.eduImage}
              resizeMode="cover"
              accessibilityLabel="Demo Vision IA: líneas arquitectónicas"
            />
          </View>
          <View style={styles.dotsRow}>
            <View style={styles.dotActive} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Términos</Text>
            <Text style={styles.footerLink}>Privacidad</Text>
          </View>
          <Text style={styles.footerCopy}>Champion AI © 2026 · v1.0.0</Text>
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => {}}>
        <LinearGradient
          colors={['#7c5800', '#c9920a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="smart-toy" size={26} color="#fff" />
        </LinearGradient>
        <View style={styles.fabBadge}>
          <Text style={styles.fabBadgeText}>1</Text>
        </View>
      </Pressable>

      {drawerOpen ? (
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerPanel}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerAvatarText}>{userInitials}</Text>
              </View>
              <View>
                <Text style={styles.drawerName}>Sebastian</Text>
                <Text style={styles.drawerRole}>Student Architect</Text>
              </View>
            </View>

            <View style={styles.drawerNav}>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Dashboard');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="home" size={20} color="#504534" />
                <Text style={styles.drawerItemText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('SpeechToText');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="mic" size={20} color="#504534" />
                <Text style={styles.drawerItemText}>Speech to Text</Text>
              </TouchableOpacity>
              <View style={[styles.drawerItem, styles.drawerItemActive]}>
                <MaterialIcons name="category" size={20} color="#7c5800" />
                <Text style={styles.drawerItemActiveText}>Servicios</Text>
              </View>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Notes');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="edit-note" size={20} color="#504534" />
                <Text style={styles.drawerItemText}>Mis Apuntes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Settings');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="settings" size={20} color="#504534" />
                <Text style={styles.drawerItemText}>Configuracion</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Profile');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="person" size={20} color="#504534" />
                <Text style={styles.drawerItemText}>Mi Perfil</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.drawerLogout} onPress={handleLogout} activeOpacity={0.9}>
              <MaterialIcons name="logout" size={20} color="#ba1a1a" />
              <Text style={styles.drawerLogoutText}>Cerrar sesion</Text>
            </TouchableOpacity>
          </View>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
        </View>
      ) : null}
    </View>
  );
}
