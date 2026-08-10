/**
 * AudioPlayer — reproductor integrado del audio original del Knowledge Pack.
 *
 * Pide la URL de reproducción a GET /API/v1/Downloads/jobs/{job_id}/stream
 * (getJobStreamUrl) — a diferencia del endpoint de descarga de un solo uso,
 * este no queda bloqueado por download_locks, así que soporta play/pause y
 * reabrir el reproductor sin volver a pedir el audio "una vez más".
 *
 * El SAS que devuelve el endpoint expira a los 5 minutos: si `sound.loadAsync`
 * o la reproducción fallan por URL vencida, `retry()` vuelve a pedir una URL
 * fresca en vez de reintentar la vieja.
 *
 * No carga el audio automáticamente al abrirse — arranca en 'idle' con una
 * confirmación explícita ("¿Querés escuchar...?"). Decisión de producto: deja
 * preparado el mismo gesto de confirmación que van a necesitar los sprints
 * siguientes (narración/TTS, EPIC V4) antes de consumir cualquier recurso.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { getJobStreamUrl } from '../../utils/api';
import styles from './AudioPlayer.styles';

function formatTime(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function AudioPlayer({ jobId, onClose }) {
  const [status, setStatus] = useState('idle'); // idle|loading|ready|playing|error
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);

  const soundRef = useRef(null);
  const trackWidthRef = useRef(0);
  const mountedRef = useRef(true);

  const onPlaybackStatusUpdate = useCallback((playbackStatus) => {
    if (!playbackStatus.isLoaded) {
      if (playbackStatus.error && mountedRef.current) {
        setStatus('error');
      }
      return;
    }
    if (!mountedRef.current) return;
    setPositionMillis(playbackStatus.positionMillis ?? 0);
    setDurationMillis(playbackStatus.durationMillis ?? 0);
    if (playbackStatus.didJustFinish) {
      soundRef.current?.setPositionAsync(0);
      setStatus('ready');
    } else {
      setStatus(playbackStatus.isPlaying ? 'playing' : 'ready');
    }
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      const streamUrl = await getJobStreamUrl(jobId);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      if (!mountedRef.current) {
        await sound.unloadAsync().catch(() => {});
        return;
      }
      soundRef.current = sound;
      setStatus('ready');
    } catch (e) {
      if (mountedRef.current) setStatus('error');
    }
  }, [jobId, onPlaybackStatusUpdate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const togglePlayPause = async () => {
    if (!soundRef.current || status === 'error') return;
    if (status === 'playing') {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const handleSeek = async (evt) => {
    if (!soundRef.current || !durationMillis || trackWidthRef.current <= 0) return;
    const ratio = Math.min(1, Math.max(0, evt.nativeEvent.locationX / trackWidthRef.current));
    await soundRef.current.setPositionAsync(ratio * durationMillis);
  };

  const progressRatio = durationMillis > 0 ? positionMillis / durationMillis : 0;

  if (status === 'idle') {
    return (
      <View style={styles.wrap}>
        <View style={styles.promptIconWrap}>
          <MaterialIcons name="graphic-eq" size={20} color="#B98A00" />
        </View>
        <View style={styles.body}>
          <Text style={styles.promptText}>¿Querés escuchar el audio original de esta clase?</Text>
        </View>
        <TouchableOpacity
          style={styles.listenBtn}
          onPress={load}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Reproducir audio original"
        >
          <Text style={styles.listenBtnText}>Reproducir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cerrar reproductor"
        >
          <MaterialIcons name="close" size={18} color="#8B6A00" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.playBtn}
        onPress={togglePlayPause}
        disabled={status === 'loading' || status === 'error'}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={status === 'playing' ? 'Pausar' : 'Reproducir'}
      >
        {status === 'loading' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <MaterialIcons name={status === 'playing' ? 'pause' : 'play-arrow'} size={22} color="#FFFFFF" />
        )}
      </TouchableOpacity>

      <View style={styles.body}>
        {status === 'error' ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>No se pudo cargar el audio.</Text>
            <TouchableOpacity onPress={load} hitSlop={8} accessibilityRole="button" accessibilityLabel="Reintentar">
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Pressable
              style={styles.track}
              onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
              onPress={handleSeek}
              accessibilityRole="adjustable"
              accessibilityLabel="Posición de reproducción"
            >
              <View style={styles.trackBg} />
              <View style={[styles.trackFill, { width: `${progressRatio * 100}%` }]} />
            </Pressable>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
              <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Cerrar reproductor"
      >
        <MaterialIcons name="close" size={18} color="#8B6A00" />
      </TouchableOpacity>
    </View>
  );
}
