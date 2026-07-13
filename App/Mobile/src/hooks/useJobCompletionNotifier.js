import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getRecentJobs } from '../utils/api';
import { useNotifications } from '../context/NotificationsContext';

const POLL_INTERVAL_MS = 15000;
const TERMINAL_STATUSES = new Set(['completed', 'failed']);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensurePermissions() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Champion AI',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch {
    // Sin soporte de notificaciones locales en este entorno (ej. Expo Go
    // desactualizado) — el poller sigue corriendo, solo no se notifica.
  }
}

function notifyJobFinished(job) {
  const name = job.blob_name ?? 'tu Knowledge Pack';
  const isFailed = job.status === 'failed';
  Notifications.scheduleNotificationAsync({
    content: {
      title: isFailed ? 'No se pudo procesar' : 'Knowledge Pack listo',
      body: isFailed ? `"${name}" falló al procesarse.` : `"${name}" ya está disponible.`,
      data: { job_id: job.job_id },
    },
    trigger: null,
  }).catch(() => {});
}

/**
 * Detecta, mientras la app está en primer plano, cuando cualquier job del
 * usuario pasa de queued/processing a completed/failed y dispara una
 * notificación local del SO. No depende de push del servidor — sigue el
 * principio "el cliente hace polling" del proyecto, generalizado a nivel
 * global en vez de solo dentro de "Mis Apuntes". Ver ADR-011.
 *
 * `navigation`: prop de navegación de MainTabNavigator (recibida de su
 * Stack.Screen padre) — se usa para ir a "Mis Apuntes" al tocar la
 * notificación, sin importar navigationRef desde App.jsx (evita el import
 * circular que el resto del código ya evita, ver authFetch.js).
 *
 * Además de la notificación local del SO, cada transición se registra en
 * NotificationsContext (histórico en memoria que consume el badge "!" del
 * avatar en AppTopBar) — debe llamarse dentro de NotificationsProvider.
 */
export function useJobCompletionNotifier(navigation) {
  const knownStatusesRef = useRef(new Map());
  const primedRef = useRef(false);
  const { pushNotification } = useNotifications();

  useEffect(() => {
    let cancelled = false;

    ensurePermissions();

    const poll = async () => {
      if (cancelled) return;
      try {
        const jobs = await getRecentJobs(50);
        const previous = knownStatusesRef.current;
        const next = new Map();

        for (const job of jobs) {
          next.set(job.job_id, job.status);

          if (primedRef.current) {
            const prevStatus = previous.get(job.job_id);
            const justFinished =
              TERMINAL_STATUSES.has(job.status) &&
              prevStatus &&
              !TERMINAL_STATUSES.has(prevStatus);
            if (justFinished) {
              notifyJobFinished(job);
              pushNotification({
                job_id: job.job_id,
                name: job.blob_name ?? null,
                status: job.status,
              });
            }
          }
        }

        knownStatusesRef.current = next;
        primedRef.current = true;
      } catch {
        // silencioso — el próximo tick reintenta
      }
    };

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') poll();
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
      // `navigation` aquí es el nav del Stack.Navigator raíz (padre de MainTabNavigator),
      // no el del Tab.Navigator interno — 'Notes' solo existe como tab anidado dentro de
      // 'Main'. Ver https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator
      navigation?.navigate('Main', { screen: 'Notes' });
    });

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      appStateSub.remove();
      responseSub.remove();
    };
  }, [navigation, pushNotification]);
}
