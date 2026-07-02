import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { patchJobName } from '../utils/api';

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: '2-digit',
  });
}

export default function JobOptionsModal({
  visible, job, onClose,
  onView, onDownload, downloading,
  onRetry, retrying,
  onRenamed,
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef(null);

  useEffect(() => {
    setRenaming(false);
    setNameValue(job?.blob_name ?? '');
    setNameError('');
    setNameSaving(false);
  }, [job?.job_id, visible]);

  if (!job) return null;

  const isFailed  = job.status === 'failed';
  const jobName   = job.blob_name ?? `Apunte ${job.job_id.slice(0, 8)}…`;
  const date      = fmtDate(job.requested_at);
  const errorCode = job.last_error_code ?? null;

  const startRenaming = () => {
    setNameValue(job.blob_name ?? '');
    setNameError('');
    setRenaming(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setNameError('Ingresa un nombre para continuar.');
      return;
    }
    setNameSaving(true);
    setNameError('');
    try {
      await patchJobName(job.job_id, trimmed);
      onRenamed?.(job.job_id, trimmed);
      setRenaming(false);
    } catch (e) {
      setNameError(e.message || 'No se pudo guardar el nombre.');
    } finally {
      setNameSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Encabezado */}
        <View style={styles.jobHeader}>
          <View style={[styles.jobIconWrap, isFailed && styles.jobIconWrapError]}>
            <MaterialIcons
              name={isFailed ? 'error-outline' : 'keyboard-voice'}
              size={22}
              color={isFailed ? '#ef4444' : '#c9920a'}
            />
          </View>
          <View style={styles.jobMeta}>
            <Text style={styles.jobName} numberOfLines={2}>{jobName}</Text>
            {date ? <Text style={styles.jobDate}>{date}</Text> : null}
            {isFailed && errorCode ? (
              <Text style={styles.errorCode}>{errorCode}</Text>
            ) : null}
          </View>
          {!renaming && (
            <TouchableOpacity style={styles.renameIconBtn} onPress={startRenaming} hitSlop={10} activeOpacity={0.7}>
              <MaterialIcons name="edit" size={18} color="#827562" />
            </TouchableOpacity>
          )}
        </View>

        {renaming && (
          <View style={styles.renameBlock}>
            <View style={styles.renameInputRow}>
              <TextInput
                ref={nameInputRef}
                style={styles.renameInput}
                value={nameValue}
                onChangeText={t => { setNameValue(t); setNameError(''); }}
                placeholder="Ej: Clase de Historia — 19 jun"
                placeholderTextColor="#827562"
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                autoFocus
                maxLength={120}
              />
            </View>
            {nameError ? <Text style={styles.errorCode}>{nameError}</Text> : null}
            <View style={styles.renameActions}>
              <TouchableOpacity style={styles.renameSaveBtn} onPress={handleSaveName} activeOpacity={0.85} disabled={nameSaving}>
                {nameSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.optionPrimaryText}>Guardar</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.renameCancelBtn} onPress={() => setRenaming(false)} activeOpacity={0.8} disabled={nameSaving}>
                <Text style={styles.renameCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!renaming && <View style={styles.divider} />}

        {!renaming && (isFailed ? (
          /* ── Job fallido: reintentar ── */
          <TouchableOpacity
            style={[styles.optionRetry, retrying && styles.optionDisabled]}
            onPress={onRetry}
            activeOpacity={0.82}
            disabled={retrying}
          >
            {retrying
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <MaterialIcons name="replay" size={22} color="#ffffff" />
            }
            <Text style={styles.optionPrimaryText}>
              {retrying ? 'Reenviando…' : 'Reintentar procesamiento'}
            </Text>
          </TouchableOpacity>
        ) : (
          /* ── Job completado: visualizar + PDF ── */
          <>
            <TouchableOpacity style={styles.optionPrimary} onPress={onView} activeOpacity={0.82}>
              <MaterialIcons name="chrome-reader-mode" size={22} color="#ffffff" />
              <Text style={styles.optionPrimaryText}>Visualizar apunte</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionSecondary, downloading && styles.optionDisabled]}
              onPress={onDownload}
              activeOpacity={0.82}
              disabled={downloading}
            >
              {downloading
                ? <ActivityIndicator size="small" color="#c9920a" />
                : <MaterialIcons name="picture-as-pdf" size={22} color="#c9920a" />
              }
              <Text style={styles.optionSecondaryText}>
                {downloading ? 'Generando PDF…' : 'Descargar PDF'}
              </Text>
            </TouchableOpacity>
          </>
        ))}

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 16,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  jobIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(201,146,10,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  jobMeta: { flex: 1 },
  jobName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1a',
    lineHeight: 20,
  },
  jobDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#827562',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(212,196,174,0.2)',
    marginVertical: 6,
  },
  jobIconWrapError: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  errorCode: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  renameIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(130,117,98,0.1)',
    flexShrink: 0,
  },
  renameBlock: {
    gap: 8,
    marginBottom: 4,
  },
  renameInputRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,196,174,0.5)',
    backgroundColor: '#faf8f4',
    overflow: 'hidden',
  },
  renameInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  renameActions: {
    flexDirection: 'row',
    gap: 10,
  },
  renameSaveBtn: {
    flex: 1,
    backgroundColor: '#c9920a',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,196,174,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#827562',
  },
  optionRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ef4444',
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 22,
  },
  optionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#c9920a',
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 22,
  },
  optionPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  optionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(201,146,10,0.09)',
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(201,146,10,0.2)',
  },
  optionDisabled: { opacity: 0.6 },
  optionSecondaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#c9920a',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 2,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#827562',
  },
});
