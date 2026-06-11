/**
 * SpeechToTextScreen – pantalla completa (stack); reutiliza SpeechToTextPanel.
 */
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';
import SpeechToTextPanel from '../components/SpeechToTextPanel';

export default function SpeechToTextScreen({ navigation }) {
  const { darkMode } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <SpeechToTextPanel
        variant="screen"
        onClose={() => navigation.goBack()}
      />
    </View>
  );
}
