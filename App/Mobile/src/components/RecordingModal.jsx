/**
 * Modal de grabación: micrófono con ondas, timer y progreso de carga.
 * Se muestra durante initializing | recording | processing.
 */
import React, { useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ACCENT = '#3B82F6';
const MIC_SIZE = 88;
const RING_SIZE = 88;
const RING_DURATION = 1800;
const RING_STAGGER = 600;

function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export default function RecordingModal({ visible, status, elapsed, step, uploadProgress, onStop }) {
    const ring0 = useRef(new Animated.Value(0)).current;
    const ring1 = useRef(new Animated.Value(0)).current;
    const ring2 = useRef(new Animated.Value(0)).current;
    const rings = [ring0, ring1, ring2];

    // Animación de ondas: sólo activa durante 'recording'
    useEffect(() => {
        if (status !== 'recording') {
            rings.forEach(r => { r.stopAnimation(); r.setValue(0); });
            return;
        }

        const timeouts = [];

        rings.forEach((anim, i) => {
            const t = setTimeout(() => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: RING_DURATION,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
                    ])
                ).start();
            }, i * RING_STAGGER);
            timeouts.push(t);
        });

        return () => {
            timeouts.forEach(clearTimeout);
            rings.forEach(r => { r.stopAnimation(); r.setValue(0); });
        };
    }, [status]);

    const isInitializing = status === 'initializing';
    const isRecording = status === 'recording';
    const isProcessing = status === 'processing';

    const uploadPct =
        uploadProgress && uploadProgress.total > 0
            ? Math.round((uploadProgress.blocks / uploadProgress.total) * 100)
            : 0;

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.card}>

                    {/* Título de estado */}
                    <Text style={styles.statusLabel}>
                        {isInitializing ? 'PREPARANDO' : isRecording ? 'GRABANDO' : 'PROCESANDO'}
                    </Text>

                    {/* ── Micrófono + ondas ── */}
                    <View style={styles.micArea}>
                        {/* Ondas expansivas (sólo en recording) */}
                        {rings.map((prog, i) => (
                            <Animated.View
                                key={i}
                                pointerEvents="none"
                                style={[
                                    styles.ring,
                                    {
                                        transform: [{
                                            scale: prog.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 2.8],
                                            }),
                                        }],
                                        opacity: prog.interpolate({
                                            inputRange: [0, 0.15, 1],
                                            outputRange: [0.65, 0.45, 0],
                                        }),
                                    },
                                ]}
                            />
                        ))}

                        {/* Círculo del micrófono */}
                        <View style={[styles.micCircle, (isInitializing || isProcessing) && styles.micCircleDim]}>
                            {isInitializing ? (
                                <ActivityIndicator color="#fff" size="large" />
                            ) : (
                                <MaterialIcons
                                    name="mic"
                                    size={40}
                                    color="#fff"
                                />
                            )}
                        </View>
                    </View>

                    {/* ── Timer (sólo recording) ── */}
                    {isRecording && (
                        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
                    )}

                    {/* ── Progreso de carga (processing) ── */}
                    {isProcessing && (
                        <View style={styles.progressArea}>
                            {step ? <Text style={styles.stepText}>{step}</Text> : null}
                            {uploadProgress && uploadProgress.total > 0 && (
                                <>
                                    <View style={styles.progressTrack}>
                                        <Animated.View
                                            style={[styles.progressFill, { width: `${uploadPct}%` }]}
                                        />
                                    </View>
                                    <Text style={styles.progressLabel}>
                                        {uploadPct}%  ·  bloque {uploadProgress.blocks}/{uploadProgress.total}
                                    </Text>
                                </>
                            )}
                        </View>
                    )}

                    {/* ── Botón detener (recording) ── */}
                    {isRecording && (
                        <TouchableOpacity style={styles.stopBtn} onPress={onStop} activeOpacity={0.85}>
                            <MaterialIcons name="stop" size={20} color="#fff" />
                            <Text style={styles.btnText}>Detener y enviar</Text>
                        </TouchableOpacity>
                    )}

                    {/* ── Indicador de carga (initializing / processing) ── */}
                    {(isInitializing || isProcessing) && (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color={ACCENT} size="small" />
                            <Text style={styles.loadingText}>
                                {isInitializing ? 'Inicializando...' : 'Procesando audio...'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
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
        paddingVertical: 44,
        paddingHorizontal: 28,
        alignItems: 'center',
        gap: 0,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    statusLabel: {
        color: '#475569',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2.5,
        marginBottom: 40,
    },

    // ── Área del micrófono ──
    micArea: {
        width: MIC_SIZE,
        height: MIC_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 36,
    },
    ring: {
        position: 'absolute',
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        borderWidth: 2,
        borderColor: ACCENT,
    },
    micCircle: {
        width: MIC_SIZE,
        height: MIC_SIZE,
        borderRadius: MIC_SIZE / 2,
        backgroundColor: ACCENT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micCircleDim: { opacity: 0.6 },

    // ── Timer ──
    timer: {
        color: '#f8fafc',
        fontSize: 52,
        fontWeight: '200',
        letterSpacing: 6,
        fontVariant: ['tabular-nums'],
        marginBottom: 36,
        includeFontPadding: false,
    },

    // ── Progreso ──
    progressArea: {
        width: '100%',
        marginBottom: 28,
        gap: 10,
        alignItems: 'stretch',
    },
    stepText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    progressTrack: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: ACCENT,
        borderRadius: 2,
    },
    progressLabel: {
        color: '#475569',
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'right',
    },

    // ── Botones ──
    stopBtn: {
        width: '100%',
        backgroundColor: '#dc2626',
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
    },
    loadingText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '600',
    },
});
