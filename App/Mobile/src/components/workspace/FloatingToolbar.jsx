/**
 * FloatingToolbar — barra flotante lateral del Knowledge Workspace.
 *
 * Plegable: arranca colapsada (solo el handle fijo, opaco) y se despliega al
 * tocarlo, mostrando el panel de accesos con fondo translúcido (pedido
 * explícito, para no tapar el ReaderCard detrás). El handle se mantiene
 * siempre visible y opaco — es el ancla fija que pliega/despliega.
 *
 * Config-driven a propósito: el mockup original (ver
 * App/tasks/knowledge_workspace_mockup_description.md) define 4 botones fijos
 * (Resumen/Notas/Audio/Bloques), pero el Workspace real necesita un quinto
 * acceso a Transcripción (confirmado en la sesión de planificación de Sprint
 * 1). En vez de hardcodear slots, el componente recibe un arreglo de
 * botones — agregar/quitar accesos no requiere tocar este archivo.
 *
 * `buttons`: [{ key, icon, label, active, onPress }]
 *
 * Usa el `Animated` core de React Native (no `react-native-reanimated`) —
 * mismo patrón que `AnimatedTabBar.jsx`. `react-native-reanimated` v4 depende
 * de `react-native-worklets` (módulo nativo separado) que Expo Go no trae
 * compilado: cualquier hook de Reanimated (`useSharedValue`,
 * `useAnimatedStyle`, animaciones `entering`) crashea en Expo Go con
 * "Exception in HostFunction". Solo funcionaría con un dev client custom
 * (EAS), que este proyecto todavía no tiene (mismo límite que ADR-011/012).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import styles from './FloatingToolbar.styles';

function ToolbarButton({ icon, label, active, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      friction: 6,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={() => animateTo(0.9)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
        style={[styles.button, active ? styles.buttonActive : styles.buttonInactive]}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <MaterialIcons name={icon} size={24} color={active ? '#FFFFFF' : '#777777'} />
      </Pressable>
    </Animated.View>
  );
}

function TogglePanel({ buttons, onSelect }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 9, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.panel, { opacity, transform: [{ scale }] }]}>
      {buttons.map(btn => (
        <ToolbarButton
          key={btn.key}
          icon={btn.icon}
          label={btn.label}
          active={btn.active}
          onPress={() => onSelect(btn.onPress)}
        />
      ))}
    </Animated.View>
  );
}

export default function FloatingToolbar({ buttons, autoCloseOnSelect = true }) {
  const [expanded, setExpanded] = useState(false);
  const handleRotation = useRef(new Animated.Value(0)).current;

  const setExpandedAnimated = (next) => {
    setExpanded(next);
    Animated.timing(handleRotation, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const toggle = () => setExpandedAnimated(!expanded);

  // Ejecuta la acción del botón elegido y, si autoCloseOnSelect está activo
  // (default), pliega el panel de vuelta — mismo patrón que un speed-dial FAB.
  const handleSelect = (onPress) => {
    onPress?.();
    if (autoCloseOnSelect) setExpandedAnimated(false);
  };

  const rotate = handleRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] });

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.column}>
        {expanded && <TogglePanel buttons={buttons} onSelect={handleSelect} />}

        <Pressable
          onPress={toggle}
          style={styles.toggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Cerrar accesos rápidos' : 'Abrir accesos rápidos'}
          accessibilityState={{ expanded }}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialIcons name="add" size={26} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
