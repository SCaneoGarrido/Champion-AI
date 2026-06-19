import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import baseStyles from './ServicesScreen.styles';
import { useThemedScreenStyles } from '../hooks/useThemedScreenStyles';
import { mergeServicesTheme } from '../theme/screenThemeMerges';
import SpeechToTextModal from '../components/SpeechToTextModal';
import AppTopBar from '../components/AppTopBar';
import ToastBanner from '../components/ToastBanner';
import { useToast } from '../hooks/useToast';
import { getSession } from '../utils/session';

const VISION_DEMO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAnUumlVn3K11t9-Lz_qgssahG34kwblPkH5l_C-sWOfIcwIeC6Hfiqn1EBsDWdqeV6MIMmLIvfn-vlYjOhQ007TJHzFWr9PD5CwsdtPPj8spdOJHmHEawFILm0j1NwL5CbyNcUXnKiIXPDkkxKlk5MgBCBM6Yl_qbcDwbFDLp_JIskjWb4qUYV-sn1ZLXFPZJkG9d-88S4hZrnJ90alOGauSOeCCixHRAKgzRL11XoSH82-fxc_x2pXg4Nzz7CZ8iRs9UcHMzcZULM';

const WIP = '__wip__';

const SERVICE_ROWS = [
  [
    {
      id: 'stt',
      title: 'Speech to Text',
      description: 'Dicta tus ideas de diseño rápidamente.',
      icon: 'mic',
      modal: 'stt',
    },
    {
      id: 'vision',
      title: 'Vision IA',
      description: 'Analiza imágenes y extrae planos.',
      icon: 'visibility',
      action: WIP,
    },
  ],
  [
    {
      id: 'tts',
      title: 'Text to Speech',
      description: 'Escucha tus apuntes en voz natural.',
      icon: 'volume-up',
      action: WIP,
    },
    {
      id: 'gen',
      title: 'IA Generativa',
      description: 'Genera resúmenes y ejercicios.',
      icon: 'auto-awesome',
      action: WIP,
    },
  ],
];

export default function ServicesScreen({ navigation }) {
  const styles = useThemedScreenStyles(baseStyles, mergeServicesTheme);
  const { show: showToast, visible: toastVisible, message: toastMsg } = useToast();
  const [session, setSession] = useState(null);
  const [sttModalVisible, setSttModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSession().then(s => setSession(s)).catch(() => {});
    }, [])
  );
  const cardWidth = useMemo(() => {
    const w = Dimensions.get('window').width;
    return (w - 16 * 2 - 12) / 2;
  }, []);

  const onUseService = (item) => {
    if (item.modal === 'stt') {
      setSttModalVisible(true);
      return;
    }
    if (item.action === WIP) {
      showToast('🚧 En desarrollo');
      return;
    }
    if (item.navigateTo) {
      navigation.navigate(item.navigateTo);
    }
  };

  return (
    <View style={styles.screen}>
      <AppTopBar
        sessionOverride={session}
        onAvatarPress={() => navigation?.navigate('Profile')}
      />

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
                    onPress={() => onUseService(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.gridUseText}>Usar</Text>
                    <MaterialIcons name="arrow-forward" size={14} color="#c9920a" />
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => showToast('🚧 Chatbot en desarrollo')}
        activeOpacity={0.88}
      >
        <MaterialIcons name="smart-toy" size={26} color="#fff" />
      </TouchableOpacity>

      <ToastBanner visible={toastVisible} message={toastMsg} />
      <SpeechToTextModal visible={sttModalVisible} onClose={() => setSttModalVisible(false)} />
    </View>
  );
}
