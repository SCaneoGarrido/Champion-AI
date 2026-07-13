/**
 * Confirmación obvia + nombre ANTES de subir un audio (grabado o elegido de
 * archivo) — se muestra una vez que el audio local está listo, antes de
 * llamar a uploadBlobInChunks/submitSTTJob.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ACCENT = '#3B82F6';

function formatDuration(secs) {
  if (!secs) return null;
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.round(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ConfirmUploadModal({ visible, durationSeconds, defaultName, onCancel, onConfirm }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setName(defaultName || '');
      setError('');
    }
  }, [visible, defaultName]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Ingresa un nombre para continuar.');
      return;
    }
    onConfirm(trimmed);
  };

  const duration = formatDuration(durationSeconds);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="graphic-eq" size={26} color={ACCENT} />
          </View>

          <Text style={styles.title}>Audio listo para subir</Text>
          {duration ? <Text style={styles.subtitle}>Duración: {duration}</Text> : null}

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={t => { setName(t); setError(''); }}
            placeholder="Ej: Clase de Historia — 19 jun"
            placeholderTextColor="#64748b"
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
            autoFocus
            maxLength={120}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <MaterialIcons name="cloud-upload" size={19} color="#fff" />
            <Text style={styles.confirmText}>Confirmar y subir</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Descartar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(59,130,246,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 20 },
  label: {
    alignSelf: 'flex-start',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  error: { alignSelf: 'flex-start', color: '#f87171', fontSize: 12, marginTop: 8 },
  confirmBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 22,
  },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  cancelBtn: { paddingVertical: 12, marginTop: 2 },
  cancelText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
});
