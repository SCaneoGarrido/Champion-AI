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
import NoteDetailScreen from './src/screens/NoteDetailScreen';
import KnowledgeWorkspaceScreen from './src/screens/KnowledgeWorkspaceScreen';
import MindMapScreen from './src/screens/MindMapScreen';
import RichMarkdownPreviewScreen from './src/screens/RichMarkdownPreviewScreen';
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
          <Stack.Screen
            name="KnowledgePackViewer"
            component={NoteDetailScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />
          {/*
            Ruta temporal de revisión manual (EPIC V1 — Knowledge Workspace).
            Misma firma de params que KnowledgePackViewer ({ jobId, blobName }),
            registrada aparte a propósito para no reemplazar el viewer en
            producción todavía — sigue la lección del rollback de la
            Presentation Layer: probar aislado antes de integrar (ver
            App/Knowledge/Bugs/known-issues.md, ISSUE-012). Cuando se apruebe,
            el único cambio pendiente es mover este component al registro de
            arriba (ADR-009 ya preparó el seam para ese swap).
          */}
          <Stack.Screen
            name="KnowledgeWorkspacePreview"
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
            options={{ headerShown: false, presentation: 'modal' }}
          />
          {/*
            Preview aislado de RichMarkdown (Markdown + LaTeX real vía
            WebView/KaTeX) — datos 100% mock. Reintroduce WebView, la misma
            clase de riesgo de ISSUE-012 (known-issues.md); se prueba en
            dispositivo, sola, antes de conectarla a contenido real en
            ReaderCard/AIQuoteCard/MindMapDiagram.
          */}
          <Stack.Screen
            name="RichMarkdownPreview"
            component={RichMarkdownPreviewScreen}
            options={{ headerShown: false, presentation: 'modal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <UploadStatusBar />
      </UploadManagerProvider>
      </SafeAreaProvider>
    </>
  );
}
