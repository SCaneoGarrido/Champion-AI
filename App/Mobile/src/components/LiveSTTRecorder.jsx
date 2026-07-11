import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLiveSTTRecorder } from '../hooks/useLiveSTTRecorder';
import RecordingModal from './RecordingModal';
import LanguagePickerModal from './LanguagePickerModal';
import { createLiveSTTRecorderStyles } from './LiveSTTRecorder.styles';
import { patchJobName } from '../utils/api';

const DEFAULT_LANGUAGE = { locale: 'es-AR', locale_name: 'Spanish (Argentina)' };

export default function LiveSTTRecorder() {
    const { colors, darkMode } = useTheme();
    const styles = useMemo(() => createLiveSTTRecorderStyles(colors, darkMode), [colors, darkMode]);

    const [selectedLang, setSelectedLang] = useState(DEFAULT_LANGUAGE);
    const [showLangPicker, setShowLangPicker] = useState(false);

    // Nombre de la grabación
    const [audioName, setAudioName] = useState('');
    const [nameSaving, setNameSaving] = useState(false);
    const [nameSaved, setNameSaved] = useState(false);
    const [nameError, setNameError] = useState('');
    const nameInputRef = useRef(null);

    const {
        status, step, error, jobResult, acceptedJobId, uploadProgress, elapsed, start, stop, reset,
    } = useLiveSTTRecorder({ locale: selectedLang.locale, localeName: selectedLang.locale_name });

    const isIdle = status === 'idle';
    const isError = status === 'error';
    const isAccepted = status === 'accepted';
    const isModalOpen = ['initializing', 'recording', 'processing'].includes(status);
    const canChangeLang = isIdle || isError || isAccepted;

    const handleReset = () => {
        setAudioName('');
        setNameSaved(false);
        setNameError('');
        setNameSaving(false);
        reset();
    };

    const handleSaveName = async () => {
        const trimmed = audioName.trim();
        if (!trimmed) {
            setNameError('Ingresa un nombre para continuar.');
            return;
        }
        if (!acceptedJobId) {
            setNameError('No se pudo identificar la grabación.');
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

    return (
        <View style={styles.wrap}>

            {/* ── Selector de idioma ── */}
            <Text style={styles.sectionLabel}>Idioma de grabación</Text>
            <TouchableOpacity
                style={[styles.langSelector, !canChangeLang && styles.langSelectorDisabled]}
                onPress={() => canChangeLang && setShowLangPicker(true)}
                activeOpacity={0.8}
            >
                <MaterialIcons name="language" size={18} color="#3B82F6" />
                <Text style={styles.langText} numberOfLines={1}>
                    {selectedLang.locale_name || selectedLang.locale}
                </Text>
                <MaterialIcons name="expand-more" size={18} color={colors.textMuted || '#6b7280'} />
            </TouchableOpacity>

            {/* ── Estado aceptado: pedir nombre ── */}
            {isAccepted && !nameSaved && (
                <View style={styles.nameCard}>
                    <View style={styles.nameCardHeader}>
                        <MaterialIcons name="check-circle" size={18} color="#22c55e" />
                        <Text style={styles.nameCardTitle}>Grabación enviada</Text>
                    </View>
                    <Text style={styles.nameCardHint}>
                        Dale un nombre a tu grabación para encontrarla fácilmente.
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
                        <TouchableOpacity style={styles.nameSkipBtn} onPress={handleReset} activeOpacity={0.8}>
                            <Text style={styles.nameSkipBtnText}>Omitir</Text>
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

            {/* ── Error ── */}
            {isError && <Text style={styles.errorText}>{error}</Text>}

            {/* ── Botón principal: solo visible cuando no está esperando nombre ── */}
            {(!isAccepted || nameSaved) && (
                <TouchableOpacity
                    style={[styles.btn, isAccepted || isError ? styles.btnSecondary : styles.btnPrimary]}
                    onPress={isAccepted || isError ? handleReset : start}
                    activeOpacity={0.85}
                >
                    <MaterialIcons name={isAccepted ? 'replay' : 'fiber-manual-record'} size={18} color="#fff" />
                    <Text style={styles.btnText}>
                        {isAccepted ? 'Nueva grabación' : isError ? 'Reintentar' : 'Iniciar grabación'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* ── Modal de grabación ── */}
            <RecordingModal
                visible={isModalOpen}
                status={status}
                elapsed={elapsed}
                step={step}
                uploadProgress={uploadProgress}
                onStop={stop}
            />

            {/* ── Modal selector de idioma ── */}
            <LanguagePickerModal
                visible={showLangPicker}
                selected={selectedLang}
                onSelect={setSelectedLang}
                onClose={() => setShowLangPicker(false)}
            />
        </View>
    );
}
