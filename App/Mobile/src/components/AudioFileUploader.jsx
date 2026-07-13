/**
 * Selección de archivo de audio y envío al pipeline STT.
 * Usa el mismo pipeline que LiveSTTRecorder (initSTTJob + UploadManagerContext)
 * y la misma confirmación obvia + nombre antes de subir. Ver ADR-012.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { initSTTJob } from '../utils/speechApi';
import { useUploadManager } from '../context/UploadManagerContext';
import ConfirmUploadModal from './ConfirmUploadModal';
import { createAudioRecorderStyles } from './AudioRecorder.styles';

const ALLOWED = ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'ogg'];
const SAMPLE_RATE = 44100;

function detectFormat(name) {
  const ext = String(name || '').split('.').pop()?.toLowerCase();
  return ALLOWED.includes(ext) ? ext : 'm4a';
}

function stripExtension(name) {
  return String(name || '').replace(/\.[^./]+$/, '');
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
  const { startUpload } = useUploadManager();

  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState(null); // { fileUri, format, durationSeconds, defaultName }

  const pickFile = async () => {
    setError('');
    setIsPicking(true);
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

      const durationSeconds = await getAudioDurationSeconds(asset.uri);
      setPendingFile({
        fileUri: asset.uri,
        format,
        durationSeconds,
        defaultName: stripExtension(asset.name),
      });
    } catch (e) {
      setError(e?.message || 'No se pudo seleccionar el archivo.');
    } finally {
      setIsPicking(false);
    }
  };

  const handleConfirm = async (name) => {
    const file = pendingFile;
    setPendingFile(null);
    if (!file) return;
    try {
      const initData = await initSTTJob(file.format);
      startUpload({
        name,
        fileUri: file.fileUri,
        jobId: initData.job_id,
        uploadUrl: initData.upload_url,
        blobName: initData.blob_name,
        format: file.format,
        sampleRate: SAMPLE_RATE,
        durationSeconds: file.durationSeconds,
      });
    } catch (e) {
      setError(e?.message || 'No se pudo iniciar la subida.');
    }
  };

  return (
    <View style={styles.wrap}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryBtn, isPicking && styles.btnDisabled]}
        onPress={pickFile}
        disabled={isPicking}
        activeOpacity={0.9}
      >
        {isPicking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <MaterialIcons name="upload-file" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Subir archivo</Text>
          </>
        )}
      </TouchableOpacity>

      <ConfirmUploadModal
        visible={!!pendingFile}
        durationSeconds={pendingFile?.durationSeconds}
        defaultName={pendingFile?.defaultName}
        onCancel={() => setPendingFile(null)}
        onConfirm={handleConfirm}
      />
    </View>
  );
}
