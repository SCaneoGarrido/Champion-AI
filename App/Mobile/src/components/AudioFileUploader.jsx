/**
 * Selección de archivo de audio y envío al pipeline STT.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { submitRecordingToSpeechPipeline } from '../utils/speechApi';
import { createAudioRecorderStyles } from './AudioRecorder.styles';

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

export default function AudioFileUploader({ accentColor, mutedColor, errorColor }) {
  const styles = createAudioRecorderStyles({ accentColor, errorColor, mutedColor });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastJob, setLastJob] = useState(null);
  const [pickedName, setPickedName] = useState('');

  const pickAndUpload = async () => {
    setError('');
    setLastJob(null);
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
      setLastJob(pipelineResult);
    } catch (e) {
      setError(e?.message || 'No se pudo subir el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {pickedName && !error ? (
        <Text style={styles.ok} numberOfLines={1}>
          Archivo: {pickedName}
        </Text>
      ) : null}
      {lastJob?.job_id ? (
        <Text style={styles.ok} numberOfLines={2}>
          Trabajo aceptado: {lastJob.job_id}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[styles.primaryBtn, isUploading && styles.btnDisabled]}
        onPress={pickAndUpload}
        disabled={isUploading}
        activeOpacity={0.9}
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialIcons name="upload-file" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Subir archivo</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
