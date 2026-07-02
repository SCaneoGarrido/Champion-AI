/**
 * Popup inferior para Speech to Text (desde Servicios).
 */
import React, { useMemo, useState } from 'react';
import { Modal, View, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import SpeechToTextPanel from './SpeechToTextPanel';
import { createSpeechToTextStyles } from './SpeechToTextPanel.styles';

export default function SpeechToTextModal({ visible, onClose }) {
  const { darkMode, colors } = useTheme();
  const styles = useMemo(() => createSpeechToTextStyles(colors, darkMode), [colors, darkMode]);
  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    if (busy) return; // grabación/subida en curso o falta guardar el nombre — no se puede cerrar
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityLabel="Cerrar Speech to Text"
        />
        <SpeechToTextPanel onClose={handleClose} onBusyChange={setBusy} variant="modal" />
      </View>
    </Modal>
  );
}
