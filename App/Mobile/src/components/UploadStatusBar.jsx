/**
 * Barra flotante de subidas en curso — se monta una sola vez en App.jsx, por
 * fuera del árbol de navegación, para seguir visible sin importar a qué
 * pantalla/tab navegue el usuario mientras un audio se sube en segundo plano.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useUploadManager } from '../context/UploadManagerContext';

function taskLabel(task) {
  if (task.status === 'error') return task.errorMessage || 'No se pudo subir el audio.';
  if (task.status === 'done') return 'Subida completa — enviado a procesar';
  if (task.status === 'submitting') return 'Enviando a procesar…';
  const pct = task.progress?.total > 0
    ? Math.round((task.progress.blocks / task.progress.total) * 100)
    : 0;
  return `Subiendo… ${pct}%`;
}

export default function UploadStatusBar() {
  const insets = useSafeAreaInsets();
  const { tasks, retryUpload, dismissTask } = useUploadManager();

  if (tasks.length === 0) return null;

  return (
    <View style={[styles.wrap, { top: Math.max(insets.top, 10) + 4 }]} pointerEvents="box-none">
      {tasks.map(task => {
        const isError = task.status === 'error';
        const isDone = task.status === 'done';
        return (
          <View key={task.id} style={[styles.pill, isError && styles.pillError, isDone && styles.pillDone]}>
            {!isError && !isDone && <ActivityIndicator size="small" color="#ffffff" />}
            {isDone && <MaterialIcons name="check-circle" size={16} color="#ffffff" />}
            {isError && <MaterialIcons name="error-outline" size={16} color="#ffffff" />}

            <View style={styles.textCol}>
              <Text style={styles.name} numberOfLines={1}>{task.name}</Text>
              <Text style={styles.status} numberOfLines={1}>{taskLabel(task)}</Text>
            </View>

            {isError && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => retryUpload(task.id)} hitSlop={8}>
                <MaterialIcons name="replay" size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
            {(isError || isDone) && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => dismissTask(task.id)} hitSlop={8}>
                <MaterialIcons name="close" size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    gap: 8,
    zIndex: 999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15,23,42,0.94)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  pillError: { backgroundColor: 'rgba(153,27,27,0.96)' },
  pillDone: { backgroundColor: 'rgba(21,128,61,0.96)' },
  textCol: { flex: 1, minWidth: 0 },
  name: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  status: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
