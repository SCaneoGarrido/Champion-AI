/**
 * SpeechToTextScreen – Módulo voz a texto (maqueta según diseño HTML).
 * Navegación: stack; volver con header arrow.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AudioRecorder from '../components/AudioRecorder';
import styles, { C } from './SpeechToTextScreen.styles';

const RECENT = [
  {
    id: '1',
    icon: 'description',
    title: 'Clase de Historia_Final.mp3',
    meta: 'Procesado hace 2 horas • 45:12 min',
  },
  {
    id: '2',
    icon: 'settings-voice',
    title: 'Entrevista_Trabajo_Juan.wav',
    meta: 'Procesado ayer • 12:05 min',
  },
  {
    id: '3',
    icon: 'translate',
    title: 'TED_Talk_Spanish_Translation.mp4',
    meta: 'Traducción completada • 18:30 min',
  },
];

const HELP_LIVE =
  'Graba en vivo hasta 3 h. Obtendrás transcripción y opción de resumen cuando el procesamiento termine.';
const HELP_FILE =
  'Sube MP3, WAV, M4A o MP4 para obtener SRT, VTT o PDF según tu plan.';
const HELP_TRANSLATE =
  'Elige idioma de origen y destino; el audio se traduce y transcribe automáticamente.';

export default function SpeechToTextScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.bgGlow} pointerEvents="none">
        <View style={styles.glowBlob1} />
        <View style={styles.glowBlob2} />
      </View>

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={C.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Speech to Text</Text>
        </View>
        <View style={styles.micBadge}>
          <MaterialIcons name="mic" size={22} color={C.sttAccent} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[C.sttAccent, C.sttAccentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBubble} pointerEvents="none" />
          <View style={styles.heroIconBg} pointerEvents="none">
            <MaterialIcons name="settings-voice" size={120} color="#ffffff" />
          </View>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Módulo de Voz</Text>
            </View>
            <Text style={styles.heroTitle}>Convierte voz en texto</Text>
            <Text style={styles.heroSubtitle}>
              Potencia tu productividad con transcripciones automáticas impulsadas por inteligencia
              artificial de alta precisión.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>Elige una funcionalidad</Text>
          <View style={styles.sectionLine} />
        </View>

        <View style={styles.cardsCol}>
          {/* Card 1 */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.helpBtn}
              hitSlop={12}
              onPress={() => Alert.alert('Grabación en vivo', HELP_LIVE)}
              accessibilityLabel="Ayuda grabación en vivo"
            >
              <MaterialIcons name="help-outline" size={20} color={C.outlineVariant} />
            </TouchableOpacity>
            <View style={[styles.cardIconBox, styles.cardIconBoxBlue]}>
              <MaterialIcons name="radio" size={26} color={C.sttAccent} />
            </View>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Grabación en vivo</Text>
              <View style={styles.limitPill}>
                <Text style={styles.limitPillText}>Límite 3h</Text>
              </View>
            </View>
            <Text style={styles.cardBody}>
              Captura conferencias, reuniones o clases en tiempo real con detección de hablantes.
            </Text>
            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Transcripción</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Resumen</Text>
              </View>
            </View>
            <AudioRecorder />
          </View>

          {/* Card 2 */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.helpBtn}
              hitSlop={12}
              onPress={() => Alert.alert('Desde un archivo', HELP_FILE)}
              accessibilityLabel="Ayuda subir archivo"
            >
              <MaterialIcons name="help-outline" size={20} color={C.outlineVariant} />
            </TouchableOpacity>
            <View style={[styles.cardIconBox, styles.cardIconBoxBlue]}>
              <MaterialIcons name="upload-file" size={26} color={C.sttAccent} />
            </View>
            <Text style={styles.cardTitle}>Desde un archivo</Text>
            <Text style={styles.fileTypes}>MP3, WAV, M4A, MP4</Text>
            <Text style={styles.cardBody}>
              Sube grabaciones existentes para procesar transcripciones masivas en segundos.
            </Text>
            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>SRT / VTT</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>PDF</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={() =>
                Alert.alert('Subir archivo', 'La carga desde archivos estará disponible próximamente.')
              }
            >
              <MaterialIcons name="add" size={22} color="#fff" />
              <Text style={styles.primaryBtnText}>Subir archivo</Text>
            </TouchableOpacity>
          </View>

          {/* Card 3 */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.helpBtn}
              hitSlop={12}
              onPress={() => Alert.alert('Traducción de audio', HELP_TRANSLATE)}
              accessibilityLabel="Ayuda traducción"
            >
              <MaterialIcons name="help-outline" size={20} color={C.outlineVariant} />
            </TouchableOpacity>
            <View style={[styles.cardIconBox, styles.cardIconBoxGold]}>
              <MaterialIcons name="translate" size={26} color={C.primary} />
            </View>
            <Text style={[styles.cardTitle, { marginBottom: 10 }]}>Traducción de audio</Text>
            <Text style={styles.cardBody}>
              Traduce automáticamente cualquier fuente de audio a más de 30 idiomas distintos.
            </Text>
            <View style={styles.langGrid}>
              <Pressable style={styles.langCell}>
                <Text style={styles.langLabel}>Desde</Text>
                <View style={styles.langValueRow}>
                  <Text style={styles.langValue}>Spanish</Text>
                  <MaterialIcons name="expand-more" size={18} color={C.outline} />
                </View>
              </Pressable>
              <Pressable style={styles.langCell}>
                <Text style={styles.langLabel}>Hacia</Text>
                <View style={styles.langValueRow}>
                  <Text style={styles.langValue}>English</Text>
                  <MaterialIcons name="expand-more" size={18} color={C.outline} />
                </View>
              </Pressable>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={() =>
                Alert.alert('Traducir audio', 'La traducción multidioma estará disponible próximamente.')
              }
            >
              <Text style={styles.primaryBtnText}>Traducir audio</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recientes</Text>
          <View style={styles.recentStack}>
            {RECENT.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.recentItem,
                  index === 0 && styles.recentItemFirst,
                  index === RECENT.length - 1 && styles.recentItemLast,
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  Alert.alert(item.title, 'Abrir detalle del procesamiento estará disponible próximamente.')
                }
              >
                <View style={styles.recentLeft}>
                  <View style={styles.recentIconCircle}>
                    <MaterialIcons name={item.icon} size={20} color={C.outline} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.recentMeta}>{item.meta}</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={C.outline} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <Pressable style={styles.fab} onPress={() => {}} accessibilityLabel="Asistente">
        <LinearGradient
          colors={[C.sttAccent, C.sttAccentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="smart-toy" size={30} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
