/**
 * Grabación de audio (Expo) y envío al backend con JWT en cada petición (authenticatedFetch).
 */
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { submitRecordingToSpeechPipeline } from '../utils/speechApi';
import { createAudioRecorderStyles } from './AudioRecorder.styles';

export default function AudioRecorder({ accentColor, primaryColor, mutedColor, errorColor }) {
  const styles = useMemo(
    () =>
      createAudioRecorderStyles({
        sttAccent: accentColor,
        primary: primaryColor,
        outline: mutedColor,
        error: errorColor,
      }),
    [accentColor, primaryColor, mutedColor, errorColor]
  );

  const recordingRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastJob, setLastJob] = useState(null);

  useEffect(() => {
    return () => {
      (async () => {
        try {
          if (recordingRef.current) {
            await recordingRef.current.stopAndUnloadAsync();
          }
        } catch (_) {}
      })();
    };
  }, []);

  const startRecording = async () => {
    setError('');
    setLastJob(null);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Se necesita permiso de micrófono.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      setError(e?.message || 'No se pudo iniciar la grabación.');
    }
  };

  const stopRecording = async () => {
    setError('');
    const recording = recordingRef.current;
    if (!recording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(false);
    setIsUploading(true);
    recordingRef.current = null;

    try {
      const statusBefore = await recording.getStatusAsync();
      const durationMillis = statusBefore.durationMillis || 0;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('No se obtuvo archivo de audio.');

      const durationSeconds = Math.max(durationMillis / 1000, 0.5);
      const result = await submitRecordingToSpeechPipeline({
        fileUri: uri,
        durationSeconds,
        format: 'm4a',
        sampleRate: 44100,
      });
      setLastJob(result);
    } catch (e) {
      setError(e?.message || 'Error al procesar el audio.');
    } finally {
      setIsUploading(false);
    }
  };

  const disabled = isUploading;

  return (
    <View style={styles.wrap}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {lastJob?.job_id ? (
        <Text style={styles.ok} numberOfLines={2}>
          Trabajo aceptado: {lastJob.job_id}
        </Text>
      ) : null}

      {!isRecording ? (
        <TouchableOpacity
          style={[styles.primaryBtn, disabled && styles.btnDisabled]}
          onPress={startRecording}
          disabled={disabled}
          activeOpacity={0.9}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="fiber-manual-record" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Iniciar grabación</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.stopBtn, isUploading && styles.btnDisabled]}
          onPress={stopRecording}
          disabled={isUploading}
          activeOpacity={0.9}
        >
          <MaterialIcons name="stop" size={20} color="#fff" />
          <Text style={styles.stopBtnText}>Detener y enviar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
