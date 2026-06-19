import { StyleSheet } from 'react-native';

const ACCENT = '#3B82F6';
const SUCCESS = '#22c55e';
const ERROR = '#ba1a1a';

export function createLiveSTTRecorderStyles(colors = {}, darkMode = false) {
    const text = colors.text || (darkMode ? '#f1f5f9' : '#111827');
    const textMuted = colors.textMuted || '#6b7280';
    const borderColor = colors.borderLight || (darkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb');
    const selectorBg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    return StyleSheet.create({
        wrap: { width: '100%', gap: 10 },

        // ── Selector de idioma ──
        sectionLabel: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: textMuted,
            paddingHorizontal: 2,
        },
        langSelector: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 13,
            paddingHorizontal: 14,
            backgroundColor: selectorBg,
            borderRadius: 12,
            borderWidth: 1,
            borderColor,
        },
        langSelectorDisabled: { opacity: 0.5 },
        langText: {
            flex: 1,
            fontSize: 14,
            fontWeight: '600',
            color: text,
        },

        // ── Feedback de estado ──
        successRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 2,
        },
        successText: {
            flex: 1,
            fontSize: 12,
            fontWeight: '700',
            color: SUCCESS,
        },
        errorText: {
            fontSize: 12,
            fontWeight: '600',
            color: ERROR,
            lineHeight: 18,
            paddingHorizontal: 2,
        },

        // ── Card de nombre ──
        nameCard: {
            backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : '#f0fdf4',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: darkMode ? 'rgba(34,197,94,0.2)' : '#bbf7d0',
            padding: 16,
            gap: 10,
        },
        nameCardHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        nameCardTitle: {
            fontSize: 13,
            fontWeight: '800',
            color: '#15803d',
        },
        nameCardHint: {
            fontSize: 12,
            fontWeight: '500',
            color: textMuted,
            lineHeight: 17,
        },
        nameInputRow: {
            borderRadius: 10,
            borderWidth: 1,
            borderColor,
            backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : '#ffffff',
            overflow: 'hidden',
        },
        nameInput: {
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 14,
            fontWeight: '600',
            color: text,
        },
        nameError: {
            fontSize: 11,
            fontWeight: '700',
            color: ERROR,
        },
        nameActions: {
            flexDirection: 'row',
            gap: 10,
        },
        nameSaveBtn: {
            flex: 1,
            backgroundColor: ACCENT,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        nameSaveBtnText: {
            color: '#fff',
            fontSize: 13,
            fontWeight: '800',
        },
        nameSkipBtn: {
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor,
            alignItems: 'center',
            justifyContent: 'center',
        },
        nameSkipBtnText: {
            fontSize: 13,
            fontWeight: '700',
            color: textMuted,
        },

        // ── Botón ──
        btn: {
            borderRadius: 14,
            paddingVertical: 15,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
        },
        btnPrimary: { backgroundColor: ACCENT },
        btnSecondary: { backgroundColor: colors.primaryDark || '#7c5800' },
        btnText: {
            color: '#fff',
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: 0.3,
        },
    });
}
