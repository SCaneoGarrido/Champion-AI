/**
 * Navegación principal con tabs inferiores animados.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ThemeProvider } from '../context/ThemeContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import AnimatedTabBar from '../components/AnimatedTabBar';
import DashboardScreen from '../screens/DashboardScreen';
import ServicesScreen from '../screens/ServicesScreen';
import NotesScreen from '../screens/NotesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useJobCompletionNotifier } from '../hooks/useJobCompletionNotifier';

const Tab = createBottomTabNavigator();

// Componente aparte: useJobCompletionNotifier llama useNotifications() por
// dentro, y necesita estar renderizado COMO HIJO de NotificationsProvider,
// no en el mismo nivel que lo declara.
function TabsWithJobNotifier({ navigation }) {
  useJobCompletionNotifier(navigation);

  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function MainTabNavigator({ navigation }) {
  return (
    <ThemeProvider>
      <NotificationsProvider>
        <TabsWithJobNotifier navigation={navigation} />
      </NotificationsProvider>
    </ThemeProvider>
  );
}
