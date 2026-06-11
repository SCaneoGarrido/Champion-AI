/**
 * LoginScreen – Pantalla de inicio de sesión.
 *
 * Formulario con email y contraseña. Valida con validation.js y llama a api.login().
 * Si el login es correcto, guarda user_id en AsyncStorage y navega al Dashboard.
 * En error de red muestra mensaje indicando comprobar si la API está en marcha.
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
import { login } from '../utils/api';
import { setSession } from '../utils/session';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const handleLogin = async () => {
    setError('');
    if (!validarCampos([email, password])) {
      setError('Completa todos los campos');
      return;
    }
    if (!validarEmail(email)) {
      setError('Email no válido');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password);
      console.log('Respuesta del login:', response);

      if (response.success) {
        if (!response.accessToken) {
          setError('Respuesta del servidor incompleta.');
          return;
        }
        await setSession({
          user_id: response.user_id ? String(response.user_id) : undefined,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken ?? undefined,
          email,
        });
        navigation.replace('Main');
        return;
      }

      setError(
        response?.error?.message || response?.data?.error?.message || 'Error al iniciar sesión'
      );
    } catch (err) {
      setError('No se pudo conectar con el servidor. ¿Está la API en marcha?');
      console.error('Erro en login: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const theme = useMemo(
    () => ({
      background: '#ffffff',
      text: '#0f172a',
      muted: '#64748b',
      inputBg: '#f8fafc',
      inputText: '#0f172a',
      border: '#e2e8f0',
      cardBg: '#ffffff',
      buttonText: '#ffffff',
      primary: '#dcb755',
      primarySoft: 'rgba(220, 183, 85, 0.25)',
    }),
    []
  );

  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.maxWidth}>
            <View style={styles.topSpacer} />

            <View style={styles.textCenter}>
              <Text style={styles.title}>Bienvenido</Text>
              <Text style={styles.subtitle}>Ingresa a Champion AI</Text>
              <Image
                source={require('../assets/images/Champion AI Logo Sin slogan (1).png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.fields}>
              <View style={styles.field}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                  <Image
                    source={require('../assets/images/Email login.png')}
                    style={styles.leftIconImage}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={[styles.textInput, { color: theme.inputText }]}
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

              <View style={styles.field}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                  <Image
                    source={require('../assets/images/Candado login.png')}
                    style={styles.leftIconImage}
                    resizeMode="contain"
                  />
                  <TextInput
                    style={[styles.textInput, { color: theme.inputText }]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    textContentType="password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    style={styles.passwordToggle}
                  >
                    <Text style={{ color: theme.muted, fontWeight: '600' }}>
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.forgotRow}>
                <TouchableOpacity
                  onPress={() => setError('Función de “recuperar contraseña” no implementada en esta versión.')}
                  disabled={loading}
                >
                  <Text style={[styles.linkText, { color: theme.primary }]}>
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.primary, shadowColor: theme.primarySoft },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={theme.buttonText} />
              ) : (
                <View style={styles.buttonRow}>
                  <Text style={[styles.buttonText, { color: theme.buttonText }]}>
                    Iniciar Sesión
                  </Text>
                  <Text style={[styles.buttonIcon, { color: theme.buttonText }]}>➔</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.muted }]}>o continúa con</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <TouchableOpacity
              style={[
                styles.socialButton,
                { borderColor: theme.border, backgroundColor: 'transparent' },
              ]}
              onPress={() => setError('Login con Microsoft no implementado en esta versión.')}
              disabled={loading}
            >
              <Image
                source={require('../assets/images/Microsoft logo.png')}
                style={[styles.socialLogo, { marginRight: 8 }]}
                resizeMode="contain"
              />
              <Text style={[styles.socialText, { color: theme.text }]}>Microsoft</Text>
            </TouchableOpacity>

            <View style={styles.bottom}>
              <Text style={[styles.bottomText, { color: theme.muted }]}>
                ¿No tienes una cuenta?
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')} disabled={loading}>
                <Text style={[styles.registerLink, { color: theme.primary }]}>Regístrate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    screen: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 24,
      justifyContent: 'center',
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingVertical: 24,
    },
    maxWidth: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
    },
    topSpacer: { height: 54, marginBottom: 6 },
    textCenter: { alignItems: 'center', marginBottom: 18 },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: 0.2,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 16,
      color: theme.muted,
      fontWeight: '600',
    },
    logo: { width: 360, height: 170, marginTop: 10 },

    errorText: {
      marginTop: 10,
      marginBottom: 12,
      color: '#f87171',
      fontSize: 13,
      textAlign: 'center',
    },

    fields: { marginTop: 10, marginBottom: 14 },
    field: { marginBottom: 14 },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.muted,
      textTransform: 'uppercase',
      marginLeft: 4,
      marginBottom: 8,
      letterSpacing: 0.7,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 12,
      height: 56,
    },
    leftIconImage: { width: 22, height: 22, marginRight: 10 },
    textInput: {
      flex: 1,
      fontSize: 16,
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    passwordToggle: {
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    forgotRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 4,
    },
    linkText: {
      fontSize: 12,
      fontWeight: '700',
      textDecorationLine: 'none',
    },

    button: {
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
      // shadow similar al diseño (aprox.)
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 18,
      elevation: 4,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonRow: { flexDirection: 'row', alignItems: 'center' },
    buttonText: { fontSize: 16, fontWeight: '800' },
    buttonIcon: { fontSize: 18, fontWeight: '800', marginLeft: 10 },

    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    dividerLine: { height: 1, flex: 1, opacity: 1 },
    dividerText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginHorizontal: 10 },

    socialButton: {
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    socialLogo: { width: 20, height: 20 },
    socialText: { fontSize: 14, fontWeight: '800' },

    bottom: { marginTop: 22, alignItems: 'center' },
    bottomText: { fontSize: 13, fontWeight: '600' },
    registerLink: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  });
}
