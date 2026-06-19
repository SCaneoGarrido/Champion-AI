/**
 * TopBar unificado para todas las pantallas autenticadas.
 * Lee sesión para mostrar avatar (foto o iniciales).
 * Se normaliza: mismo logo, misma altura, misma estructura en todos los tabs.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useTopBarStyle } from '../hooks/useTopBarStyle';
import { useTheme } from '../context/ThemeContext';
import { getSession } from '../utils/session';

function getInitials(session) {
  const source = session?.display_name || session?.name || session?.email || '';
  const clean = String(source).trim();
  if (!clean) return 'SC';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

/**
 * @param {{ onAvatarPress?: () => void, sessionOverride?: object }} props
 */
export default function AppTopBar({ onAvatarPress, sessionOverride }) {
  const topBarStyle = useTopBarStyle();
  const { colors } = useTheme();
  const [session, setSession] = useState(sessionOverride ?? null);

  useEffect(() => {
    if (sessionOverride !== undefined) {
      setSession(sessionOverride);
      return;
    }
    getSession().then(s => setSession(s)).catch(() => {});
  }, [sessionOverride]);

  const initials = getInitials(session);
  const avatarUri = session?.avatarUri ?? session?.avatar_url ?? null;

  return (
    <View style={[
      styles.bar,
      {
        backgroundColor: colors.topBar,
        borderBottomColor: colors.border,
        paddingTop: topBarStyle.paddingTop,
        minHeight: topBarStyle.minHeight,
      },
    ]}>
      <Text style={[styles.brand, { color: colors.text }]}>
        Champion<Text style={{ color: colors.brandAccent }}>AI</Text>
      </Text>

      <TouchableOpacity
        onPress={onAvatarPress}
        activeOpacity={onAvatarPress ? 0.82 : 1}
        disabled={!onAvatarPress}
      >
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={[styles.avatarImg, { borderColor: colors.avatarBorder }]}
          />
        ) : (
          <View style={[
            styles.avatarBubble,
            { backgroundColor: colors.avatarBg, borderColor: colors.avatarBorder },
          ]}>
            <Text style={[styles.avatarText, { color: colors.avatarText }]}>{initials}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  avatarBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
  },
});
