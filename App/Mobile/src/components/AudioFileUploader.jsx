/**
 * Selección de archivo de audio y envío al pipeline STT.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { submitRecordingToSpeechPipeline } from '../utils/speechApi';
import { patchJobName } from '../utils/api';
import { createLiveSTTRecorderStyles } from './LiveSTTRecorder.styles';

const ALLOWED = ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'ogg'];

function detectFormat(name) {
  const ext = String(name || '').split('.').pop()?.toLowerCase();
  return ALLOWED.includes(ext) ? ext : 'm4a';
}

async function getAudioDurationSeconds(uri) {
  try {
    const { sound, status } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    const ms = status?.durationMillis || 0;
    await sound.unloadAsync();
    if (ms > 0) return ms / 1000;
  } catch (_) {}
  return 60;
}

export default function AudioFileUploader({ onBusyChange }) {
  const { colors, darkMode } = useTheme();
  const styles = useMemo(() => createLiveSTTRecorderStyles(colors, darkMode), [colors, darkMode]);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [pickedName, setPickedName] = useState('');
  const [acceptedJobId, setAcceptedJobId] = useState(null);

  // Nombre del archivo transcripto
  const [audioName, setAudioName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef(null);

  const isAccepted = !!acceptedJobId;

  // Ocupado: subiendo, o esperando que se guarde el nombre obligatorio
  const busy = isUploading || (isAccepted && !nameSaved);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy]);

  const handleReset = () => {
    setPickedName('');
    setAcceptedJobId(null);
    setAudioName('');
    setNameSaved(false);
    setNameError('');
    setNameSaving(false);
    setError('');
  };

  const handleSaveName = async () => {
    const trimmed = audioName.trim();
    if (!trimmed) {
      setNameError('Ingresa un nombre para continuar.');
      return;
    }
    if (!acceptedJobId) {
      setNameError('No se pudo identificar el archivo.');
      return;
    }
    setNameSaving(true);
    setNameError('');
    try {
      await patchJobName(acceptedJobId, trimmed);
      setNameSaved(true);
    } catch (e) {
      setNameError(e.message || 'No se pudo guardar el nombre.');
    } finally {
      setNameSaving(false);
    }
  };

  const pickAndUpload = async () => {
    setError('');
    setAcceptedJobId(null);
    setAudioName('');
    setNameSaved(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/mp4'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      const asset = result.assets[0];
      const format = detectFormat(asset.name);
      if (!ALLOWED.includes(format)) {
        setError('Formato no soportado. Usa MP3, WAV, M4A o MP4.');
        return;
      }

      setPickedName(asset.name || 'archivo');
      setIsUploading(true);
      const durationSeconds = await getAudioDurationSeconds(asset.uri);
      const pipelineResult = await submitRecordingToSpeechPipeline({
        fileUri: asset.uri,
        durationSeconds,
        format,
        sampleRate: 44100,
      });
      setAcceptedJobId(pipelineResult?.data?.job_id || null);
    } catch (e) {
      setError(e?.message || 'No se pudo subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {pickedName && !error ? (
        <Text style={styles.successText} numberOfLines={1}>
          Archivo: {pickedName}
        </Text>
      ) : null}

      {/* ── Estado aceptado: pedir nombre ── */}
      {isAccepted && !nameSaved && (
        <View style={styles.nameCard}>
          <View style={styles.nameCardHeader}>
            <MaterialIcons name="check-circle" size={18} color="#22c55e" />
            <Text style={styles.nameCardTitle}>Archivo enviado</Text>
          </View>
          <Text style={styles.nameCardHint}>
            Ingresa un nombre para tu transcripción antes de continuar — lo vas a necesitar para encontrarla en Mis Apuntes.
          </Text>
          <View style={styles.nameInputRow}>
            <TextInput
              ref={nameInputRef}
              style={styles.nameInput}
              value={audioName}
              onChangeText={t => { setAudioName(t); setNameError(''); }}
              placeholder="Ej: Clase de Historia — 19 jun"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              autoFocus
              maxLength={120}
            />
          </View>
          {nameError ? <Text style={styles.nameError}>{nameError}</Text> : null}
          <View style={styles.nameActions}>
            <TouchableOpacity style={styles.nameSaveBtn} onPress={handleSaveName} activeOpacity={0.85} disabled={nameSaving}>
              {nameSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.nameSaveBtnText}>Guardar nombre</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Nombre guardado ── */}
      {isAccepted && nameSaved && (
        <View style={styles.successRow}>
          <MaterialIcons name="check-circle" size={16} color="#22c55e" />
          <Text style={styles.successText}>
            "{audioName.trim()}" guardado en cola.
          </Text>
        </View>
      )}

      {/* ── Botón principal: solo visible cuando no está esperando nombre ── */}
      {(!isAccepted || nameSaved) && (
        <TouchableOpacity
          style={[styles.btn, isAccepted ? styles.btnSecondary : styles.btnPrimary, isUploading && { opacity: 0.6 }]}
          onPress={isAccepted ? handleReset : pickAndUpload}
          disabled={isUploading}
          activeOpacity={0.9}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name={isAccepted ? 'replay' : 'upload-file'} size={20} color="#fff" />
              <Text style={styles.btnText}>{isAccepted ? 'Subir otro archivo' : 'Subir archivo'}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
