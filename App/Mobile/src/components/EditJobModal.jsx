import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { patchJobName } from '../utils/api';

const REPROCESS_STEPS = [
  { key: 'summary',  label: 'Resumen',     icon: 'summarize',    color: '#16a34a' },
  { key: 'notes',    label: 'Notas',       icon: 'notes',        color: '#c9920a' },
  { key: 'mind_map', label: 'Mapa Mental', icon: 'account-tree', color: '#9333ea' },
];

export default function EditJobModal({ visible, job, onClose, onRenamed, onPickStep }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && job) {
      setName(job.blob_name ?? '');
      setError('');
    }
  }, [visible, job]);

  if (!job) return null;

  const trimmed = name.trim();
  const nameChanged = trimmed.length > 0 && trimmed !== (job.blob_name ?? '');

  const handleSaveName = async () => {
    if (!nameChanged) return;
    setSaving(true);
    setError('');
    try {
      await patchJobName(job.job_id, trimmed);
      onRenamed?.(trimmed);
    } catch (e) {
      setError('No se pudo renombrar el Knowledge Pack.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Editar Knowledge Pack</Text>
          <TouchableOpacity onPress={onClose} hitSlop={14} style={styles.closeBtn}>
            <MaterialIcons name="close" size={18} color="#827562" />
          </TouchableOpacity>
        </View>

        {/* ── Renombrar ── */}
        <Text style={styles.sectionLabel}>Nombre</Text>
        <View style={styles.nameRow}>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del apunte"
            placeholderTextColor="#a8998a"
            maxLength={120}
          />
          <TouchableOpacity
            style={[styles.saveBtn, (!nameChanged || saving) && styles.saveBtnDisabled]}
            onPress={handleSaveName}
            disabled={!nameChanged || saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <MaterialIcons name="check" size={18} color="#ffffff" />
            }
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.divider} />

        {/* ── Reprocesar contenido ── */}
        <Text style={styles.sectionLabel}>Reprocesar contenido</Text>
        <Text style={styles.sectionHint}>
          Vuelve a generar un bloque con tus propias instrucciones. La transcripción no se ve afectada.
        </Text>

        {REPROCESS_STEPS.map(step => (
          <TouchableOpacity
            key={step.key}
            style={styles.stepRow}
            onPress={() => onPickStep?.(step.key)}
            activeOpacity={0.75}
          >
            <View style={[styles.stepIconWrap, { backgroundColor: `${step.color}1a` }]}>
              <MaterialIcons name={step.icon} size={18} color={step.color} />
            </View>
            <Text style={styles.stepLabel}>{step.label}</Text>
            <MaterialIcons name="chevron-right" size={20} color="#c9b8a3" />
          </TouchableOpacity>
        ))}
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(212,196,174,0.5)',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212,196,174,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#827562',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#a8998a',
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 17,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameInput: {
    flex: 1,
    backgroundColor: 'rgba(212,196,174,0.14)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#c9920a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 8 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(212,196,174,0.2)',
    marginVertical: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
});
