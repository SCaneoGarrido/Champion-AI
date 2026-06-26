/**
 * App.jsx – Componente raíz de Champion AI (Expo + React Native).
 *
 * Stack de autenticación + tabs principales + pantallas modales (SpeechToText).
 */
import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import SplashScreen from './src/screens/SplashScreen';
import AcademicLoadingScreen from './src/screens/AcademicLoadingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import { ThemeProvider } from './src/context/ThemeContext';
import SpeechToTextScreen from './src/screens/SpeechToTextScreen';
import { setSessionExpiredHandler } from './src/utils/authFetch';

export const navigationRef = createNavigationContainerRef();

// Redirige al Login y limpia el stack cuando la sesión expira
setSessionExpiredHandler(() => {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  }
});

function SpeechToTextWithTheme() {
  return (
    <ThemeProvider>
      <SpeechToTextScreen />
    </ThemeProvider>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#eee',
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="AcademicLoading"
            component={AcademicLoadingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar sesión' }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Registro' }} />
          <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen
            name="SpeechToText"
            component={SpeechToTextWithTheme}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </SafeAreaProvider>
    </>
  );
}
