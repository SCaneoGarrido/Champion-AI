/**
 * Barra inferior animada estilo Instagram/WhatsApp.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const TAB_CONFIG = {
  Home: { label: 'Home', icon: 'home' },
  Services: { label: 'Servicios', icon: 'apps' },
  Notes: { label: 'Apuntes', icon: 'edit-note' },
  Settings: { label: 'Config', icon: 'settings' },
  Profile: { label: 'Perfil', icon: 'person' },
};

function TabItem({ route, isFocused, onPress, onLongPress, activeColor, inactiveColor }) {
  const config = TAB_CONFIG[route.name] || { label: route.name, icon: 'circle' };
  const scale = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(isFocused ? 1.12 : 1)).current;

  useEffect(() => {
    Animated.spring(iconScale, {
      toValue: isFocused ? 1.12 : 1,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [isFocused, iconScale]);

  const animatePress = (toValue) => {
    Animated.spring(scale, {
      toValue,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={config.label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => animatePress(0.88)}
      onPressOut={() => animatePress(1)}
      style={styles.tabItem}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <MaterialIcons
            name={config.icon}
            size={24}
            color={isFocused ? activeColor : inactiveColor}
          />
        </Animated.View>
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? activeColor : inactiveColor },
            isFocused && styles.tabLabelActive,
          ]}
          numberOfLines={1}
        >
          {config.label}
        </Text>
        {isFocused ? (
          <View style={[styles.activeDot, { backgroundColor: activeColor }]} />
        ) : (
          <View style={styles.inactiveDot} />
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function AnimatedTabBar({ state, descriptors, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const indicatorX = useRef(new Animated.Value(0)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);

  useEffect(() => {
    if (!segmentWidth) return;
    Animated.spring(indicatorX, {
      toValue: state.index * segmentWidth,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [state.index, segmentWidth, indicatorX]);

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
      ]}
    >
      <View
        style={styles.bar}
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width;
          const next = width / state.routes.length;
          setSegmentWidth(next);
          indicatorX.setValue(state.index * next);
        }}
      >
        <Animated.View
          style={[
            styles.indicator,
            segmentWidth
              ? {
                  width: segmentWidth,
                  backgroundColor: colors.primary,
                  transform: [{ translateX: indicatorX }],
                }
              : { opacity: 0 },
          ]}
        />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              options={options}
              activeColor={colors.primary}
              inactiveColor={colors.tabInactive}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 12 },
    }),
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    minWidth: 56,
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  inactiveDot: {
    width: 4,
    height: 4,
    marginTop: 4,
  },
});
