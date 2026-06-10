/**
 * ProfileScreen – Mi perfil: datos editables y foto (AsyncStorage vía setSession).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getSession, setSession, clearSession } from '../utils/session';
import styles from './ProfileScreen.styles';
import notesStyles from './NotesScreen.styles';

const DEFAULT_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBSpnRpNTfJSmxdLrfOIV6P2d7_9XIwgeFwJyAgLNOULJOhTEjZ_AdIQukhtYYXux-A8oxUZqMI1SIR59xJEOJDKJilyoPjRnIqRj_KZPhmTNok5yaMlM8Mvr8YFF1bVonPh1Gf-DnIL4rrPk7ljobJCNJ9lkR8ayIKWTUzn5pErN38oAbso1vIDwblSRECM6ZKJ0IWre3NnDqOWTt54iN9qzm77uXBYNymgJbKtt5Yj9HmS4YXCmkkBObIDiTm_GX67JIhT20rVIxz';

function mergeProfile(session) {
  const s = session || {};
  return {
    name: (s.name && String(s.name).trim()) || 'Sebastián Caneo',
    email: (s.email && String(s.email).trim()) || 'sebastian@gmail.com',
    phone: s.phone != null && String(s.phone).trim() ? String(s.phone).trim() : '+56 9 1234 5678',
    location:
      s.location != null && String(s.location).trim()
        ? String(s.location).trim()
        : 'Santiago, Chile',
    occupation:
      s.occupation != null && String(s.occupation).trim()
        ? String(s.occupation).trim()
        : 'Universitario',
  };
}

export default function ProfileScreen({ navigation }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => mergeProfile(null));
  const [avatarUri, setAvatarUri] = useState(null);

  const load = useCallback(async () => {
    const session = await getSession();
    setForm(mergeProfile(session));
    setAvatarUri(session?.avatarUri || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const imageSource = avatarUri ? { uri: avatarUri } : { uri: DEFAULT_AVATAR_URL };

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Para cambiar la foto de perfil, permite el acceso a la galería en los ajustes del dispositivo.'
        );
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
    } catch (_) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const handleSave = async () => {
    if (!form.email.includes('@')) {
      Alert.alert('Correo inválido', 'Introduce un correo electrónico válido.');
      return;
    }
    await setSession({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      occupation: form.occupation.trim(),
      avatarUri: avatarUri ?? null,
    });
    setEditing(false);
  };

  const handleCancel = async () => {
    const session = await getSession();
    setForm(mergeProfile(session));
    setAvatarUri(session?.avatarUri || null);
    setEditing(false);
  };

  const handleLogout = async () => {
    await clearSession();
    setDrawerOpen(false);
    navigation.replace('Home');
  };

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const FieldRow = ({ icon, label, value, fieldKey, keyboardType, autoCapitalize }) => (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldBox, editing && styles.fieldBoxEditing]}>
        <MaterialIcons name={icon} size={22} color="#7c5800" />
        {editing ? (
          <TextInput
            style={styles.fieldInput}
            value={value}
            onChangeText={(t) => update(fieldKey, t)}
            keyboardType={keyboardType || 'default'}
            autoCapitalize={autoCapitalize ?? 'sentences'}
            placeholderTextColor="#827562"
          />
        ) : (
          <Text style={styles.fieldText} numberOfLines={2}>
            {value}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setDrawerOpen(true)} activeOpacity={0.85}>
            <MaterialIcons name="menu" size={26} color="#7c5800" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Champion AI</Text>
        </View>
        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.9} accessibilityLabel="Cambiar foto de perfil">
          <LinearGradient
            colors={['#7c5800', '#c9920a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.topAvatarWrap}
          >
            <Image source={imageSource} style={styles.topAvatarImage} resizeMode="cover" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

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

          <View style={styles.avatarSection}>
            <View style={{ width: 92, height: 92, position: 'relative', marginBottom: 8 }}>
              <LinearGradient
                colors={['#7c5800', '#febf39']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 92,
                  height: 92,
                  borderRadius: 46,
                  padding: 3,
                }}
              >
                <View style={styles.avatarInner}>
                  <Image source={imageSource} style={styles.avatarImage} resizeMode="cover" />
                </View>
              </LinearGradient>
              <TouchableOpacity
                style={styles.editPhotoBtn}
                onPress={pickAvatar}
                activeOpacity={0.9}
                accessibilityLabel="Cambiar foto de perfil"
              >
                <MaterialIcons name="edit" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.displayName}>{form.name}</Text>
          </View>

          <View style={styles.fields}>
            <FieldRow
              icon="mail"
              label="Correo electrónico"
              value={form.email}
              fieldKey="email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FieldRow
              icon="phone"
              label="Número de contacto"
              value={form.phone}
              fieldKey="phone"
              keyboardType="phone-pad"
            />
            <FieldRow icon="location-on" label="Localidad" value={form.location} fieldKey="location" />
            <FieldRow icon="work" label="Ocupación" value={form.occupation} fieldKey="occupation" />
          </View>

          {!editing ? (
            <TouchableOpacity
              onPress={() => setEditing(true)}
              activeOpacity={0.92}
              style={styles.primaryBtn}
            >
              <LinearGradient
                colors={['#7c5800', '#c9920a']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.primaryBtnInner}
              >
                <MaterialIcons name="settings-suggest" size={22} color="#fff" />
                <Text style={styles.primaryBtnText}>Editar perfil</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={handleSave} activeOpacity={0.92} style={styles.primaryBtn}>
                <LinearGradient
                  colors={['#7c5800', '#c9920a']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.primaryBtnInner}
                >
                  <MaterialIcons name="check" size={22} color="#fff" />
                  <Text style={styles.primaryBtnText}>Guardar cambios</Text>
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

      <Pressable
        onPress={() => {}}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.92 }]}
      >
        <LinearGradient
          colors={['#7c5800', '#c9920a']}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="smart-toy" size={30} color="#fff" />
        </LinearGradient>
      </Pressable>

      {drawerOpen ? (
        <View style={notesStyles.drawerOverlay}>
          <View style={notesStyles.drawerPanel}>
            <View style={notesStyles.drawerHeader}>
              <View style={[notesStyles.drawerAvatar, { overflow: 'hidden', padding: 0 }]}>
                <Image source={imageSource} style={{ width: 48, height: 48 }} resizeMode="cover" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={notesStyles.drawerName} numberOfLines={1}>
                  {form.name}
                </Text>
                <Text style={notesStyles.drawerRole} numberOfLines={1}>
                  {form.occupation}
                </Text>
              </View>
            </View>

            <View style={notesStyles.drawerNav}>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Dashboard');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="home" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('SpeechToText');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="mic" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Speech to Text</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Services');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="category" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Servicios</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Notes');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="edit-note" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Mis Apuntes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={notesStyles.drawerItem}
                onPress={() => {
                  setDrawerOpen(false);
                  navigation.navigate('Settings');
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="settings" size={20} color="#504534" />
                <Text style={notesStyles.drawerItemText}>Configuracion</Text>
              </TouchableOpacity>
              <View style={[notesStyles.drawerItem, notesStyles.drawerItemActive]}>
                <MaterialIcons name="person" size={20} color="#7c5800" />
                <Text style={notesStyles.drawerItemActiveText}>Mi Perfil</Text>
              </View>
            </View>

            <TouchableOpacity style={notesStyles.drawerLogout} onPress={handleLogout} activeOpacity={0.9}>
              <MaterialIcons name="logout" size={20} color="#ba1a1a" />
              <Text style={notesStyles.drawerLogoutText}>Cerrar sesion</Text>
            </TouchableOpacity>
          </View>
          <Pressable style={notesStyles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
