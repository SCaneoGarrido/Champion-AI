/**
 * Popup inferior para Speech to Text (desde Servicios).
 */
import React, { useMemo } from 'react';
import { Modal, View, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import SpeechToTextPanel from './SpeechToTextPanel';
import { createSpeechToTextStyles } from './SpeechToTextPanel.styles';

export default function SpeechToTextModal({ visible, onClose }) {
  const { darkMode, colors } = useTheme();
  const styles = useMemo(() => createSpeechToTextStyles(colors, darkMode), [colors, darkMode]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Cerrar Speech to Text"
        />
        <SpeechToTextPanel onClose={onClose} variant="modal" />
      </View>
    </Modal>
  );
}
