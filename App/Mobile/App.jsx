/**
 * App.jsx – Componente raíz de Champion AI (Expo + React Native).
 *
 * Define la navegación con React Navigation (stack):
 * Splash, AcademicLoading, Home, Login, SignUp, Dashboard y SpeechToText.
 * Todas las pantallas comparten el mismo estilo de header (fondo oscuro, texto claro).
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import SplashScreen from './src/screens/SplashScreen';
import AcademicLoadingScreen from './src/screens/AcademicLoadingScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SpeechToTextScreen from './src/screens/SpeechToTextScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import NotesScreen from './src/screens/NotesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      {/* Barra de estado del sistema (hora, batería) en modo claro sobre fondo oscuro */}
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          // Iniciamos por Splash para mostrar la animación de marca.
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#eee',
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          {/* Splash sin header para una experiencia inmersiva y limpia */}
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          {/* Pantalla intermedia de carga antes del Login */}
          <Stack.Screen
            name="AcademicLoading"
            component={AcademicLoadingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Champion AI' }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar sesión' }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Registro' }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
          <Stack.Screen
            name="SpeechToText"
            component={SpeechToTextScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Services" component={ServicesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notes" component={NotesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
