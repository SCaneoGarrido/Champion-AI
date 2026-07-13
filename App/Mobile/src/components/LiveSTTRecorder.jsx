import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLiveSTTRecorder } from '../hooks/useLiveSTTRecorder';
import RecordingModal from './RecordingModal';
import ConfirmUploadModal from './ConfirmUploadModal';
import LanguagePickerModal from './LanguagePickerModal';
import { createLiveSTTRecorderStyles } from './LiveSTTRecorder.styles';

const DEFAULT_LANGUAGE = { locale: 'es-AR', locale_name: 'Spanish (Argentina)' };

export default function LiveSTTRecorder() {
    const { colors, darkMode } = useTheme();
    const styles = useMemo(() => createLiveSTTRecorderStyles(colors, darkMode), [colors, darkMode]);

    const [selectedLang, setSelectedLang] = useState(DEFAULT_LANGUAGE);
    const [showLangPicker, setShowLangPicker] = useState(false);

    const {
        status, step, error, elapsed, pendingRecording,
        start, stopRecording, confirmAndUpload, discardRecording, reset,
    } = useLiveSTTRecorder({ locale: selectedLang.locale, localeName: selectedLang.locale_name });

    const isError = status === 'error';
    const isConfirming = status === 'confirming';
    const isModalOpen = ['initializing', 'recording', 'processing'].includes(status);
    const canChangeLang = status === 'idle' || isError;

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

            {/* ── Error ── */}
            {isError && <Text style={styles.errorText}>{error}</Text>}

            {/* ── Botón principal ── */}
            <TouchableOpacity
                style={[styles.btn, isError ? styles.btnSecondary : styles.btnPrimary]}
                onPress={isError ? reset : start}
                activeOpacity={0.85}
            >
                <MaterialIcons name="fiber-manual-record" size={18} color="#fff" />
                <Text style={styles.btnText}>
                    {isError ? 'Reintentar' : 'Iniciar grabación'}
                </Text>
            </TouchableOpacity>

            {/* ── Modal de grabación (initializing/recording/processing) ── */}
            <RecordingModal
                visible={isModalOpen}
                status={status}
                elapsed={elapsed}
                step={step}
                onStop={stopRecording}
            />

            {/* ── Confirmación obvia + nombre, antes de subir ── */}
            <ConfirmUploadModal
                visible={isConfirming}
                durationSeconds={pendingRecording?.durationSeconds}
                onCancel={discardRecording}
                onConfirm={confirmAndUpload}
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
