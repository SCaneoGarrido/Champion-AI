# ADR-011: Notificaciones locales al terminar un job (push real diferido)

tags: #adr #decision #mobile #notifications

---

## Estado

Adoptado (2026-07-13) — con una parte explícitamente diferida (push real, ver Negativas)

---

## Contexto

Hasta ahora la única forma de enterarse de que un job terminó era abrir "Mis Apuntes" y que
`NotesScreen` refrescara la lista al recuperar foco (`useFocusEffect`). Si el usuario estaba en
otra pantalla, o con la app cerrada, no había ninguna señal de que su Knowledge Pack ya estaba
listo (o había fallado).

Se pidió agregar notificaciones "de cualquier carácter" — cualquier tipo de solicitud (grabación
STT, retry, reprocesamiento de un step vía ADR-010) que termine, sin distinción por tipo, ya que
todas convergen en el mismo campo `ai_job.status` transicionando a `completed`/`failed`.

La primera opción evaluada fue **push real** (servidor→dispositivo, funciona con la app cerrada).
Se descartó para esta iteración por una razón puramente de infraestructura, no de diseño: el
proyecto no tiene `eas.json`, corre sobre Expo Go, y Expo Go **ya no soporta push remoto** desde
hace varias versiones de SDK. Push real requeriría además credenciales de Apple Developer Program
(de pago, con aprobación) y Firebase — nada de eso existe hoy. Se decidió explícitamente, en
conversación con el usuario, avanzar con notificaciones **locales** ahora y dejar push real como
trabajo futuro una vez exista esa infraestructura.

---

## Decisión

### 1. Detección: generalizar el polling existente, no crear un canal nuevo

El principio 7 del CLAUDE.md raíz ("el cliente hace polling, no hay push del servidor") no se
toca — se generaliza. `useJobCompletionNotifier` (`App/Mobile/src/hooks/`) hace polling de
`GET /jobs` (la misma función `getRecentJobs` que ya usa `NotesScreen`) cada 15s, mientras la app
está en primer plano (más un poll inmediato al volver de background vía `AppState`). No se creó
ningún endpoint nuevo — reutiliza el 100% existente.

Se monta **una sola vez**, dentro de `MainTabNavigator` (recibe `navigation` como prop, ya se lo
pasa su `Stack.Screen` padre en `App.jsx` — mismo mecanismo que usa cualquier pantalla del stack).
Al ser un componente que solo existe tras el login y se desmonta al volver a `Login`, el poller
vive y muere con la sesión autenticada sin lógica adicional de encendido/apagado.

### 2. Detectar la transición, no el estado

Se guarda en memoria (un `Map` en un `ref`, no persistido) el último `status` visto por
`job_id`. Un job dispara notificación solo si en el tick anterior estaba en `queued`/`processing`
y ahora está en `completed`/`failed` — nunca en el primer poll tras montar (se usa ese primer tick
solo para fijar la línea base), para no notificar de golpe todos los jobs que ya estaban
terminados antes de abrir la app.

### 3. Notificación local vía `expo-notifications`

`Notifications.scheduleNotificationAsync({ trigger: null, ... })` — dispara inmediatamente, sin
canal push, sin backend. Mensaje genérico según `status` (`completed` → "Knowledge Pack listo",
`failed` → "No se pudo procesar"), igual para cualquier tipo de solicitud (STT, retry,
reprocesamiento) porque todas comparten el mismo campo de estado. Tocar la notificación navega a
"Mis Apuntes" (`navigation.navigate('Notes')`).

Los permisos se piden con `requestPermissionsAsync()` de forma best-effort al montar; si el
usuario los niega, el poller sigue corriendo pero no se notifica — no se bloquea ni se insiste.

---

## Consecuencias

### Positivas

- Cero infraestructura nueva: sin tabla de tokens de dispositivo, sin endpoint de registro, sin
  llamada desde la Azure Function a un servicio externo de push. Funciona hoy, en Expo Go, sin
  ninguna cuenta ni credencial adicional.
- Cubre el pedido real ("avisarme cuando termine cualquier solicitud") para el caso de uso
  principal: usuario con la app abierta o recién puesta en segundo plano.
- El seam de detección (comparar `status` anterior vs. actual por `job_id`) es exactamente el que
  necesitaría push real más adelante — cuando exista esa infraestructura, el punto de disparo se
  reemplaza (de `scheduleNotificationAsync` local a un envío server-side), pero la lógica de "qué
  cuenta como recién terminado" no cambia.

### Negativas

- **No funciona con la app completamente cerrada** (proceso terminado) ni, de forma confiable, con
  la app en background por mucho tiempo — es el límite conocido y aceptado de esta iteración, no
  un bug. Push real es la única forma de cubrir ese caso, y quedó explícitamente diferido.
- El estado de "último status visto" vive solo en memoria — se pierde si la app se mata y reabre
  (el primer poll tras reabrir vuelve a fijar línea base sin notificar retroactivamente). Aceptable
  para este alcance; si se requiriera notificar incluso jobs que terminaron mientras la app estaba
  completamente cerrada, de nuevo apunta a que la solución real es push server-side.
- Intervalo de 15s: un job puede tardar hasta ~15s en notificarse después de terminar. No es
  tiempo real — se consideró suficiente dado que el pipeline completo (transcripción + 3 llamadas a
  GPT) toma bastante más que eso.

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Push real de punta a punta ahora | Requiere EAS, build nativo, credenciales Apple Developer Program (pagas, con aprobación) y Firebase — ninguna existe en el proyecto hoy. Se evaluó explícitamente con el usuario y se decidió diferir en vez de construir algo no verificable en este entorno. |
| Push real sin verificar (escribir el código igual, asumiendo credenciales futuras) | Riesgo real de que el diseño no encaje una vez se pruebe contra APNs/FCM reales (formato de payload, manejo de tokens inválidos/expirados, etc.) — se prefirió no construir a ciegas. |
| Polling solo dentro de "Mis Apuntes" (sin generalizar) | No cumple "de cualquier carácter" — si el usuario está en otra pantalla cuando el job termina, no se entera hasta volver a Apuntes. Descartado en la etapa de scoping con el usuario. |

---

## Trabajo futuro (explícitamente fuera de este ADR)

Push real: requiere (1) EAS configurado + build de desarrollo nativo, (2) Apple Developer Program
+ credenciales APNs, (3) Firebase + credenciales FCM, (4) una tabla nueva para device push tokens,
(5) un endpoint de registro de token, y (6) que la Azure Function (o un consumer nuevo de las
transiciones de `ai_job_status_history`) dispare el envío a la Expo Push API al completar/fallar
un job. Ninguno de estos seis puntos se implementó aquí — quedan documentados para cuando la
infraestructura de credenciales exista.

---

## Addendum (2026-07-13): historial en la app + badge en el avatar, y fix de navegación

Dos ajustes sobre la implementación inicial de este ADR:

- **Bug de navegación**: `useJobCompletionNotifier` se monta en `MainTabNavigator`, que recibe el
  `navigation` de su `Stack.Screen` padre (el stack raíz) — no el del `Tab.Navigator` interno. Tocar
  la notificación llamaba `navigation.navigate('Notes')`, que falla porque `'Notes'` no es una ruta
  del stack raíz, solo existe anidada dentro de `'Main'`. Corregido a
  `navigation.navigate('Main', { screen: 'Notes' })` (ver
  [nesting-navigators](https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator)).
- **`NotesScreen` no se actualizaba en vivo**: el refresco solo ocurría en `useFocusEffect` (al
  ganar foco). Se agregó un segundo `useFocusEffect` con un `setInterval` de 8s que llama a un
  `refreshSilently` (mismo fetch, sin togglear el spinner de pantalla completa) mientras la pantalla
  está enfocada — el badge de estado/step ahora se actualiza sin salir y volver a "Mis Apuntes".
- **Historial en la app + badge "!"**: se agregó `NotificationsContext`
  (`src/context/NotificationsContext.jsx`, mismo patrón que `ThemeContext` — `useNotifications()`
  lanza si se usa fuera del Provider) con una lista en memoria (máx. 20 items) de las transiciones
  detectadas y un contador de no vistas. `useJobCompletionNotifier` empuja a este contexto además de
  disparar la notificación local del SO. `AppTopBar` muestra un badge rojo "!" sobre el avatar
  cuando hay no vistas; tocarlo abre `NotificationsPanel` (lista de recientes) y marca todo como
  visto. El avatar en sí sigue yendo a Profile sin cambios — el badge es un touchable separado
  superpuesto, no reemplaza esa acción.
- `MainTabNavigator` se reestructuró: `NotificationsProvider` necesita envolver al componente que
  llama `useJobCompletionNotifier` (no puede ser el mismo componente que lo declara), así que la
  lógica de tabs se movió a un componente interno `TabsWithJobNotifier`.

---

## Referencias

- [[ADR-010-knowledge-pack-lifecycle-actions]] — los tres tipos de solicitud (STT, retry,
  reprocesamiento) que esta notificación cubre de forma genérica
- CLAUDE.md raíz, principio 7 — aclarado, no modificado en su fondo
