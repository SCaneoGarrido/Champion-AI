/**
 * Bottom-sheet para seleccionar el idioma de grabación STT.
 * Carga la lista desde /getAvailableLenguages al abrirse.
 */
import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getSTTLanguages } from '../utils/speechApi';

const ACCENT = '#3B82F6';

export default function LanguagePickerModal({ visible, selected, onSelect, onClose }) {
    const [languages, setLanguages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!visible) return;
        setLoading(true);
        setError('');
        getSTTLanguages()
            .then(langs => setLanguages(langs))
            .catch(e => setError(e.message || 'No se pudo cargar la lista de idiomas.'))
            .finally(() => setLoading(false));
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>

                    {/* Handle */}
                    <View style={styles.handle} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Idioma de grabación</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={14} style={styles.closeBtn}>
                            <MaterialIcons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    {/* Contenido */}
                    {loading && (
                        <View style={styles.center}>
                            <ActivityIndicator color={ACCENT} size="large" />
                            <Text style={styles.loadingText}>Cargando idiomas...</Text>
                        </View>
                    )}

                    {!loading && error ? (
                        <View style={styles.center}>
                            <MaterialIcons name="error-outline" size={36} color="#ef4444" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity
                                style={styles.retryBtn}
                                onPress={() => {
                                    setLoading(true);
                                    setError('');
                                    getSTTLanguages()
                                        .then(setLanguages)
                                        .catch(e => setError(e.message || 'Error al reintentar.'))
                                        .finally(() => setLoading(false));
                                }}
                            >
                                <Text style={styles.retryText}>Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {!loading && !error && languages.length === 0 && (
                        <View style={styles.center}>
                            <MaterialIcons name="language" size={36} color="#475569" />
                            <Text style={styles.errorText}>No se encontraron idiomas disponibles.</Text>
                        </View>
                    )}

                    {!loading && !error && languages.length > 0 && (
                        <FlatList
                            data={languages}
                            keyExtractor={item => item.locale}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.list}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                            renderItem={({ item }) => {
                                const isSelected = selected?.locale === item.locale;
                                return (
                                    <TouchableOpacity
                                        style={[styles.item, isSelected && styles.itemSelected]}
                                        onPress={() => { onSelect(item); onClose(); }}
                                        activeOpacity={0.75}
                                    >
                                        <View style={styles.itemLeft}>
                                            <Text style={[styles.itemName, isSelected && styles.itemNameSelected]}>
                                                {item.locale_name}
                                            </Text>
                                            <Text style={styles.itemCode}>{item.locale}</Text>
                                        </View>
                                        {isSelected && (
                                            <MaterialIcons name="check-circle" size={20} color={ACCENT} />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 36,
        maxHeight: '78%',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    handle: {
        alignSelf: 'center',
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginTop: 12,
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    loadingText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
    errorText: { color: '#fca5a5', fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
    retryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(59,130,246,0.18)',
    },
    retryText: { color: ACCENT, fontSize: 13, fontWeight: '700' },
    list: { paddingVertical: 8 },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.07)',
        marginHorizontal: 20,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    itemSelected: { backgroundColor: 'rgba(59,130,246,0.12)' },
    itemLeft: { flex: 1, gap: 2 },
    itemName: { fontSize: 14, fontWeight: '600', color: '#e2e8f0' },
    itemNameSelected: { color: ACCENT },
    itemCode: { fontSize: 11, fontWeight: '600', color: '#475569' },
});
