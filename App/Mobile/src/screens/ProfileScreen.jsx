import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { uploadAsync } from 'expo-file-system/legacy';
import { getSession, setSession } from '../utils/session';
import { getUserProfile, updateUserProfile, initAvatarUpload } from '../utils/api';
import baseStyles from './ProfileScreen.styles';
import { useThemedScreenStyles } from '../hooks/useThemedScreenStyles';
import { mergeProfileTheme } from '../theme/screenThemeMerges';
import AppTopBar from '../components/AppTopBar';
import ToastBanner from '../components/ToastBanner';
import { useToast } from '../hooks/useToast';

// Definido FUERA del componente para que su identidad sea estable entre renders.
// Si estuviera adentro, cada keystroke recrearía la función → React desmonttaría
// el TextInput → el teclado se cerraría.
function FieldRow({ icon, label, value, fieldKey, editing, editable = true, keyboardType, autoCapitalize, onChangeText, styles }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, editing && editable && styles.fieldBoxEditing]}>
        <MaterialIcons name={icon} size={22} color="#7c5800" />
        {editing && editable ? (
          <TextInput
            style={styles.fieldInput}
            value={value}
            onChangeText={t => onChangeText(fieldKey, t)}
            keyboardType={keyboardType || 'default'}
            autoCapitalize={autoCapitalize ?? 'sentences'}
            placeholderTextColor="#827562"
          />
        ) : (
          <Text style={styles.fieldText} numberOfLines={2}>{value || '–'}</Text>
        )}
      </View>
    </View>
  );
}

function buildForm(profile, session) {
  return {
    display_name: profile?.display_name || session?.display_name || session?.name || '',
    email:        profile?.email        || session?.email        || '',
    phone:        profile?.phone        || session?.phone        || '',
    location:     profile?.location     || session?.location     || '',
    occupation:   profile?.occupation   || session?.occupation   || '',
  };
}

export default function ProfileScreen({ navigation }) {
  const styles = useThemedScreenStyles(baseStyles, mergeProfileTheme);
  const { show: showToast, visible: toastVisible, message: toastMsg } = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ display_name: '', email: '', phone: '', location: '', occupation: '' });
  const [avatarUri, setAvatarUri] = useState(null);
  const [session, setSessionState] = useState(null);

  const load = useCallback(async () => {
    const s = await getSession();
    setSessionState(s);
    setAvatarUri(s?.avatarUri ?? s?.avatar_url ?? null);
    try {
      const profile = await getUserProfile();
      setForm(buildForm(profile, s));
      // Sync avatar from API if no local one
      if (!s?.avatarUri && profile?.avatar_url) {
        setAvatarUri(profile.avatar_url);
      }
    } catch {
      setForm(buildForm(null, s));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const imageSource = avatarUri ? { uri: avatarUri } : null;

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Permite el acceso a la galería en ajustes del dispositivo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await setSession({ avatarUri: uri });
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const uploadAvatar = async (localUri) => {
    try {
      const ext = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const { upload_url, avatar_url } = await initAvatarUpload(ext);
      await uploadAsync(upload_url, localUri, {
        httpMethod: 'PUT',
        headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': `image/${ext}` },
      });
      return avatar_url;
    } catch {
      return null; // Avatar upload failure is non-blocking
    }
  };

  const handleSave = async () => {
    if (!form.email.includes('@')) {
      Alert.alert('Correo inválido', 'Introduce un correo electrónico válido.');
      return;
    }
    setSaving(true);
    try {
      // Upload avatar if it's a local file URI (not already a remote URL)
      let finalAvatarUrl = null;
      if (avatarUri && avatarUri.startsWith('file://')) {
        finalAvatarUrl = await uploadAvatar(avatarUri);
      }

      const updated = await updateUserProfile({
        display_name: form.display_name.trim() || null,
        email:        form.email.trim()        || null,
        phone:        form.phone.trim()        || null,
        location:     form.location.trim()     || null,
        occupation:   form.occupation.trim()   || null,
        avatar_url:   finalAvatarUrl ?? undefined,
      });

      // Sincronizar sesión con los valores reales confirmados por la BD
      await setSession({
        name:         updated.display_name ?? form.display_name.trim(),
        display_name: updated.display_name ?? form.display_name.trim(),
        email:        updated.email        ?? form.email.trim(),
        phone:        updated.phone        ?? '',
        location:     updated.location     ?? '',
        occupation:   updated.occupation   ?? '',
        avatarUri:    avatarUri,
        avatar_url:   updated.avatar_url   ?? null,
      });

      // Actualizar el form con los valores confirmados por la BD
      setForm({
        display_name: updated.display_name ?? '',
        email:        updated.email        ?? '',
        phone:        updated.phone        ?? '',
        location:     updated.location     ?? '',
        occupation:   updated.occupation   ?? '',
      });
      if (updated.avatar_url && !avatarUri?.startsWith('file://')) {
        setAvatarUri(updated.avatar_url);
      }

      setEditing(false);
      showToast('✓ Perfil actualizado');
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    await load();
    setEditing(false);
  };

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <AppTopBar
        sessionOverride={session}
        onAvatarPress={pickAvatar}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.capsule}>
          <View style={styles.capsuleDot} />
          <Text style={styles.capsuleText}>Tu Información</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardDecor} pointerEvents="none" />

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={{ width: 92, height: 92, position: 'relative', marginBottom: 8 }}>
              <LinearGradient
                colors={['#7c5800', '#febf39']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 92, height: 92, borderRadius: 46, padding: 3 }}
              >
                <View style={styles.avatarInner}>
                  {imageSource ? (
                    <Image source={imageSource} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.avatarImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffdea6' }]}>
                      <Text style={{ fontSize: 28, fontWeight: '800', color: '#7c5800' }}>
                        {(form.display_name || form.email || 'SC').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
              <TouchableOpacity
                style={styles.editPhotoBtn}
                onPress={pickAvatar}
                activeOpacity={0.9}
              >
                <MaterialIcons name="photo-camera" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.displayName}>{form.display_name || form.email || 'Mi perfil'}</Text>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <FieldRow styles={styles} editing={editing} onChangeText={update} icon="person"      label="Nombre completo"    value={form.display_name} fieldKey="display_name" />
            <FieldRow styles={styles} editing={editing} onChangeText={update} icon="mail"        label="Correo electrónico" value={form.email}        fieldKey="email"         keyboardType="email-address" autoCapitalize="none" />
            <FieldRow styles={styles} editing={editing} onChangeText={update} icon="phone"       label="Número de contacto" value={form.phone}        fieldKey="phone"         keyboardType="phone-pad" />
            <FieldRow styles={styles} editing={editing} onChangeText={update} icon="location-on" label="Localidad"          value={form.location}     fieldKey="location" />
            <FieldRow styles={styles} editing={editing} onChangeText={update} icon="work"        label="Ocupación"          value={form.occupation}   fieldKey="occupation" />
          </View>

          {/* Actions */}
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.92} style={styles.primaryBtn}>
              <LinearGradient colors={['#7c5800', '#c9920a']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.primaryBtnInner}>
                <MaterialIcons name="settings-suggest" size={22} color="#fff" />
                <Text style={styles.primaryBtnText}>Editar perfil</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.92} style={styles.primaryBtn}>
                <LinearGradient colors={['#7c5800', '#c9920a']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.primaryBtnInner}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <MaterialIcons name="check" size={22} color="#fff" />
                  }
                  <Text style={styles.primaryBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.secondaryActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancel} activeOpacity={0.88}>
                  <Text style={styles.secondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Champion AI © 2026 · v1.0.0</Text>
          <Text style={styles.footerTag}>La forja del conocimiento moderno.</Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Términos</Text>
            <Text style={styles.footerLink}>Privacidad</Text>
            <Text style={styles.footerLink}>Soporte</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={() => showToast('🚧 Chatbot en desarrollo')}
        style={styles.fab}
        activeOpacity={0.88}
      >
        <MaterialIcons name="smart-toy" size={26} color="#fff" />
      </TouchableOpacity>

      <ToastBanner visible={toastVisible} message={toastMsg} />
    </KeyboardAvoidingView>
  );
}
