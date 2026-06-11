/**
 * SignUpScreen – Pantalla de registro con look alineado al Login.
 *
 * Qué hace:
 * - Valida campos obligatorios, formato de email, contraseña y aceptación de términos.
 * - Usa íconos personalizados (nombre, correo y candado) desde /assets/images.
 * - Mantiene acción de registro social como placeholder (Microsoft).
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { validarEmail, validarCampos } from '../utils/validation';
import { register } from '../utils/api';

export default function SignUpScreen({ navigation }) {
  /** Campos del formulario */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  /** Estado de UI y feedback */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const theme = useMemo(
    () => ({
      background: '#ffffff',
      text: '#0f172a',
      muted: '#64748b',
      inputBg: '#f8fafc',
      inputText: '#0f172a',
      border: '#e2e8f0',
      secondaryText: '#475569',
      divider: '#e5e7eb',
      footer: '#9ca3af',
      primary: '#dcb755',
      primarySoft: 'rgba(220, 183, 85, 0.25)',
    }),
    []
  );

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleRegister = async () => {
    setError('');

    // Validaciones de datos base
    if (!validarCampos([name, email, password, confirmPassword])) {
      setError('Completa todos los campos');
      return;
    }
    if (!validarEmail(email)) {
      setError('Email no válido');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones');
      return;
    }

    setLoading(true);
    try {
      // Mantenemos la misma lógica de integración ya usada en tu app.
      const { ok, data } = await register({ name, email, password });
      if (ok && data?.success) {
        navigation.replace('Login');
      } else {
        setError(data?.error?.message || 'Error al registrarse');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
          {/* Cabecera */}
          <View style={styles.header}>
            <Text style={styles.title}>Únete a Champion AI</Text>
            <Text style={styles.subtitle}>
              Comienza tu viaje hacia la excelencia académica hoy mismo.
            </Text>
          </View>

          {/* Mensaje de error */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Campo: Nombre completo */}
          <View style={styles.field}>
            <Text style={styles.label}>Nombre completo</Text>
            <View style={styles.inputWrap}>
              <Image
                source={require('../assets/images/User Logo.png')}
                style={styles.leftIconImage}
                resizeMode="contain"
              />
              <TextInput
                style={styles.textInput}
                placeholder="Ingresa tu nombre"
                placeholderTextColor={theme.muted}
                value={name}
                onChangeText={setName}
                editable={!loading}
                textContentType="name"
              />
            </View>
          </View>

          {/* Campo: Correo */}
          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputWrap}>
              <Image
                source={require('../assets/images/Email login.png')}
                style={styles.leftIconImage}
                resizeMode="contain"
              />
              <TextInput
                style={styles.textInput}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={theme.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
                textContentType="emailAddress"
              />
            </View>
          </View>

          {/* Campo: Contraseña */}
          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrap}>
              <Image
                source={require('../assets/images/Candado login.png')}
                style={styles.leftIconImage}
                resizeMode="contain"
              />
              <TextInput
                style={styles.textInput}
                placeholder="Crea una contraseña"
                placeholderTextColor={theme.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                textContentType="newPassword"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                disabled={loading}
                style={styles.passwordToggle}
              >
                <Text style={styles.passwordToggleText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Campo: Confirmar contraseña */}
          <View style={styles.field}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.inputWrap}>
              <Image
                source={require('../assets/images/Candado login.png')}
                style={styles.leftIconImage}
                resizeMode="contain"
              />
              <TextInput
                style={styles.textInput}
                placeholder="Repite tu contraseña"
                placeholderTextColor={theme.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
                textContentType="password"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((v) => !v)}
                disabled={loading}
                style={styles.passwordToggle}
              >
                <Text style={styles.passwordToggleText}>
                  {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Términos y condiciones */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptTerms((v) => !v)}
            activeOpacity={0.9}
            disabled={loading}
          >
            <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
              {acceptTerms ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.termsText}>
              Acepto los <Text style={styles.termsLink}>términos y condiciones</Text> y la política
              de privacidad.
            </Text>
          </TouchableOpacity>

          {/* Acción principal */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <View style={styles.buttonRow}>
                <Text style={styles.buttonText}>Crear Cuenta</Text>
                <Text style={styles.buttonIcon}>➔</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Registro social */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o regístrate con</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => setError('Registro con Microsoft no implementado en esta versión.')}
            disabled={loading}
          >
            <Image
              source={require('../assets/images/Microsoft logo.png')}
              style={[styles.socialLogo, { marginRight: 8 }]}
              resizeMode="contain"
            />
            <Text style={styles.socialText}>Microsoft</Text>
          </TouchableOpacity>

          {/* Navegación a Login */}
          <View style={styles.bottom}>
            <Text style={styles.bottomText}>¿Ya tienes cuenta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
              <Text style={styles.registerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>
          </View>

          {/* Pie legal */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2026 Champion AI. Todos los derechos reservados.</Text>
          </View>
        </ScrollView>

      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    screen: { flex: 1, backgroundColor: theme.background },
    scroll: {
      flexGrow: 1,
      justifyContent: 'flex-start',
      padding: 24,
      paddingTop: 68,
      paddingBottom: 24,
    },
    form: {
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },

    header: { alignItems: 'center', marginBottom: 18 },
    title: {
      fontSize: 31,
      fontWeight: '800',
      color: theme.text,
      letterSpacing: -0.5,
      textAlign: 'center',
    },
    subtitle: {
      marginTop: 8,
      fontSize: 15,
      color: theme.secondaryText,
      textAlign: 'center',
      lineHeight: 22,
    },
    errorText: {
      marginTop: 2,
      marginBottom: 12,
      color: '#ef4444',
      fontSize: 13,
      textAlign: 'center',
    },

    field: { marginBottom: 12 },
    label: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      marginLeft: 4,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 56,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBg,
      paddingHorizontal: 12,
    },
    leftIconImage: { width: 22, height: 22, marginRight: 10 },
    textInput: {
      flex: 1,
      color: theme.inputText,
      fontSize: 16,
      paddingVertical: 0,
    },
    passwordToggle: {
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    passwordToggleText: {
      color: theme.muted,
      fontWeight: '700',
      fontSize: 13,
    },

    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 6,
      marginBottom: 10,
      paddingHorizontal: 2,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: '#cbd5e1',
      backgroundColor: theme.inputBg,
      marginRight: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    checkboxMark: {
      color: '#0f172a',
      fontSize: 13,
      fontWeight: '900',
      lineHeight: 15,
    },
    termsText: {
      flex: 1,
      color: theme.secondaryText,
      fontSize: 13,
      lineHeight: 20,
    },
    termsLink: {
      color: theme.primary,
      fontWeight: '800',
    },

    button: {
      height: 56,
      borderRadius: 14,
      backgroundColor: theme.primary,
      marginTop: 8,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primarySoft,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 18,
      elevation: 4,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonRow: { flexDirection: 'row', alignItems: 'center' },
    buttonText: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
    buttonIcon: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginLeft: 8 },

    divider: {
      marginTop: 22,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.divider,
    },
    dividerText: {
      marginHorizontal: 10,
      color: '#9ca3af',
      fontSize: 13,
      fontWeight: '600',
    },

    socialButton: {
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      backgroundColor: theme.inputBg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    socialLogo: { width: 22, height: 22 },
    socialText: { fontSize: 14, fontWeight: '800', color: theme.text },

    bottom: {
      marginTop: 16,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    bottomText: { color: theme.secondaryText, fontSize: 16, fontWeight: '500' },
    registerLink: { color: theme.primary, fontSize: 16, fontWeight: '800', marginLeft: 6 },

    footer: { marginTop: 32, alignItems: 'center' },
    footerText: { fontSize: 12, color: theme.footer, textAlign: 'center' },

  });
}
