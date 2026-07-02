/**
 * Contenido Speech to Text: grabación en vivo o subida de archivo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import LiveSTTRecorder from './LiveSTTRecorder';
import AudioFileUploader from './AudioFileUploader';
import { createSpeechToTextStyles, STT_GRADIENT } from './SpeechToTextPanel.styles';

const RECENT = [
  { id: '1', icon: 'description', title: 'Clase de Historia_Final.mp3', meta: 'hace 2 h • 45:12' },
  { id: '2', icon: 'settings-voice', title: 'Entrevista_Trabajo_Juan.wav', meta: 'ayer • 12:05' },
];

const HELP_LIVE =
  'Graba en vivo hasta 3 h. Obtendrás transcripción y resumen cuando el procesamiento termine.';
const HELP_FILE = 'Sube MP3, WAV, M4A o MP4 para obtener SRT, VTT o PDF según tu plan.';

export default function SpeechToTextPanel({ onClose, onBusyChange, variant = 'modal' }) {
  const insets = useSafeAreaInsets();
  const { darkMode, colors } = useTheme();
  const styles = useMemo(() => createSpeechToTextStyles(colors, darkMode), [colors, darkMode]);
  const [tab, setTab] = useState('record');
  const [recordBusy, setRecordBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const busy = recordBusy || uploadBusy;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy]);

  return (
    <View style={variant === 'modal' ? styles.sheet : styles.screen}>
      <View style={styles.bgGlow} pointerEvents="none">
        <View style={styles.glowBlob1} />
        <View style={styles.glowBlob2} />
      </View>

      {variant === 'modal' ? <View style={styles.handleBar} /> : null}

      <View style={[styles.header, variant === 'screen' && { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.headerLeft}>
          {onClose ? (
            <TouchableOpacity
              style={[styles.iconBtn, busy && { opacity: 0.35 }]}
              onPress={busy ? undefined : onClose}
              disabled={busy}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={variant === 'screen' ? 'arrow-back' : 'close'}
                size={22}
                color={colors.primaryDark}
              />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.headerTitle}>Speech to Text</Text>
        </View>
        <View style={styles.micBadge}>
          <MaterialIcons name="mic" size={22} color="#3B82F6" />
        </View>
      </View>

      <ScrollView
        style={variant === 'modal' ? styles.sheetScroll : undefined}
        contentContainerStyle={[
          styles.scroll,
          variant === 'modal' && { paddingBottom: 28 + Math.max(insets.bottom, 12) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={STT_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBubble} pointerEvents="none" />
          <View style={styles.heroIconBg} pointerEvents="none">
            <MaterialIcons name="settings-voice" size={96} color="#ffffff" />
          </View>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Módulo de Voz</Text>
            </View>
            <Text style={styles.heroTitle}>Convierte voz en texto</Text>
            <Text style={styles.heroSubtitle}>
              Graba en vivo o sube un archivo de audio para transcribir con IA.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tabBtn, tab === 'record' && styles.tabBtnActive, busy && { opacity: 0.5 }]}
            onPress={() => !busy && setTab('record')}
            disabled={busy}
          >
            <MaterialIcons
              name="radio"
              size={18}
              color={tab === 'record' ? colors.text : colors.textMuted}
            />
            <Text style={[styles.tabText, tab === 'record' && styles.tabTextActive]}>Grabar</Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === 'upload' && styles.tabBtnActive, busy && { opacity: 0.5 }]}
            onPress={() => !busy && setTab('upload')}
            disabled={busy}
          >
            <MaterialIcons
              name="upload-file"
              size={18}
              color={tab === 'upload' ? colors.text : colors.textMuted}
            />
            <Text style={[styles.tabText, tab === 'upload' && styles.tabTextActive]}>Subir</Text>
          </Pressable>
        </View>

        {tab === 'record' ? (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.helpBtn}
              hitSlop={12}
              onPress={() => Alert.alert('Grabación en vivo', HELP_LIVE)}
            >
              <MaterialIcons name="help-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.cardIconBox}>
              <MaterialIcons name="radio" size={24} color="#3B82F6" />
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
            <LiveSTTRecorder onBusyChange={setRecordBusy} />
          </View>
        ) : (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.helpBtn}
              hitSlop={12}
              onPress={() => Alert.alert('Desde un archivo', HELP_FILE)}
            >
              <MaterialIcons name="help-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.cardIconBox}>
              <MaterialIcons name="upload-file" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.cardTitle}>Desde un archivo</Text>
            <Text style={styles.fileTypes}>MP3, WAV, M4A, MP4</Text>
            <Text style={styles.cardBody}>
              Sube grabaciones existentes para procesar transcripciones en segundos.
            </Text>
            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>SRT / VTT</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>PDF</Text>
              </View>
            </View>
            <AudioFileUploader onBusyChange={setUploadBusy} />
          </View>
        )}

        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recientes</Text>
          <View style={styles.recentStack}>
            {RECENT.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.recentItem, index === RECENT.length - 1 && styles.recentItemLast]}
                activeOpacity={0.85}
                onPress={() =>
                  Alert.alert(item.title, 'El detalle estará disponible próximamente.')
                }
              >
                <View style={styles.recentLeft}>
                  <View style={styles.recentIconCircle}>
                    <MaterialIcons name={item.icon} size={18} color={colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.recentMeta}>{item.meta}</Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
