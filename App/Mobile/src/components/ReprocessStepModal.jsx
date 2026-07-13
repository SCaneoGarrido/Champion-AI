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
import { reprocessJobStep } from '../utils/api';

const STEP_LABELS = {
  summary:  'Resumen',
  notes:    'Notas',
  mind_map: 'Mapa Mental',
};

export default function ReprocessStepModal({ visible, job, step, onClose, onSubmitted }) {
  const [instructions, setInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setInstructions('');
      setError('');
    }
  }, [visible, step]);

  if (!job || !step) return null;

  const stepLabel = STEP_LABELS[step] ?? step;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      await reprocessJobStep(job.job_id, step, instructions.trim());
      onSubmitted?.(step);
    } catch (e) {
      const code = e.message ?? '';
      if (code.includes('JOB_NOT_COMPLETED')) {
        setError('Este Knowledge Pack ya no está disponible para reprocesar.');
      } else {
        setError('No se pudo enviar el reprocesamiento.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <Pressable style={styles.backdrop} onPress={submitting ? undefined : onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Reprocesar "{stepLabel}"</Text>
          <TouchableOpacity onPress={onClose} hitSlop={14} style={styles.closeBtn} disabled={submitting}>
            <MaterialIcons name="close" size={18} color="#827562" />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Escribe instrucciones propias para regenerar este bloque (opcional). Si lo dejas vacío,
          se vuelve a generar con el criterio original.
        </Text>

        <TextInput
          style={styles.textarea}
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Ej: hazlo más breve y en primera persona…"
          placeholderTextColor="#a8998a"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          editable={!submitting}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.confirmBtn, submitting && styles.disabled]}
          onPress={handleConfirm}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <MaterialIcons name="autorenew" size={20} color="#ffffff" />
          }
          <Text style={styles.confirmText}>
            {submitting ? 'Enviando…' : 'Confirmar reprocesamiento'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7} disabled={submitting}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
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
    gap: 10,
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
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', flexShrink: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212,196,174,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#a8998a',
    lineHeight: 17,
  },
  textarea: {
    backgroundColor: 'rgba(212,196,174,0.14)',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 110,
  },
  errorText: { fontSize: 12, color: '#ef4444' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#c9920a',
    borderRadius: 18,
    paddingVertical: 17,
    marginTop: 4,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  disabled: { opacity: 0.6 },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#827562',
  },
});
