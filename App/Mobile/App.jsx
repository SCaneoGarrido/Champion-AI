/**
 * App.jsx – Componente raíz de Champion AI (Expo + React Native).
 *
 * Stack de autenticación + tabs principales + pantallas modales (SpeechToText, KnowledgePackViewer).
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
import { UploadManagerProvider } from './src/context/UploadManagerContext';
import UploadStatusBar from './src/components/UploadStatusBar';
import SpeechToTextScreen from './src/screens/SpeechToTextScreen';
import KnowledgeWorkspaceScreen from './src/screens/KnowledgeWorkspaceScreen';
import MindMapScreen from './src/screens/MindMapScreen';
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
      <UploadManagerProvider>
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
          {/*
            Knowledge Workspace V1 — superficie estable de producción (EPIC
            V1 cerrado). Reemplaza a NoteDetailScreen (retirado de rutas,
            archivo se mantiene por ahora como referencia — candidato a
            limpieza en un futuro chore). Swap habilitado por el seam de
            ADR-009: NotesScreen sigue navegando solo por nombre de ruta, no
            se tocó al hacer este cambio.
          */}
          <Stack.Screen
            name="KnowledgePackViewer"
            component={KnowledgeWorkspaceScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />
          {/*
            Knowledge Workspace Beta — mismo componente que la ruta estable
            por ahora (todavía no hay una V2 que diverja), pero es el punto
            de entrada permanente para probar la próxima iteración (ej. TTS/
            narración) de forma aislada antes de promoverla a
            KnowledgePackViewer — misma lección del rollback de la
            Presentation Layer, ahora formalizada como convención en vez de
            una ruta temporal (ver ADR-014-knowledge-workspace-versioning).
          */}
          <Stack.Screen
            name="KnowledgeWorkspaceBeta"
            component={KnowledgeWorkspaceScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />
          {/*
            "Bloques" del Workspace — recibe mindMap/documentTitle ya
            resueltos por KnowledgeWorkspaceScreen (ver MindMapScreen.jsx).
            Sin params cae a datos mock, para poder seguir probando
            MindMapDiagram aislado (known-issues.md ISSUE-012).
          */}
          <Stack.Screen
            name="MindMapScreen"
            component={MindMapScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <UploadStatusBar />
      </UploadManagerProvider>
      </SafeAreaProvider>
    </>
  );
}
