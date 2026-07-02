# ADR-009: Expo Push Service como broker de push notifications

tags: #adr #decision #mobile #notifications #expo

---

## Estado

En implementación (2026-07)

---

## Contexto

`App/Knowledge/Roadmap/pending-features.md` identificaba desde antes push notifications como una mejora natural: el cliente hace polling activo hoy y el usuario debe revisar manualmente si un job terminó. Existe además un toggle "Notificaciones" en `SettingsScreen.jsx` que hoy solo escribe en AsyncStorage — sin ninguna infraestructura real detrás.

Champion AI corre sobre Expo (React Native) y sobre Azure end-to-end (Blob, Queue, Durable Functions, AI Speech, OpenAI). Para enviar push notifications a Android e iOS existen tres caminos evaluados:

1. **FCM + APNs directos** — máximo control, pero requiere manejar certificados/keys de APNs y credenciales de FCM por separado en el backend, sin intermediario.
2. **Azure Notification Hub** — consistente con el stack 100% Azure existente; un solo SDK de Azure desde la Function haría fan-out a FCM/APNs. Requiere provisionar un recurso ANH y subir ahí las credenciales de FCM/APNs.
3. **Expo Push Service** — `expo-notifications` en el cliente obtiene un Expo push token; el backend hace un POST simple a la API REST de Expo (`https://exp.host/--/api/v2/push/send`), y Expo intermedia hacia FCM/APNs. No requiere manejar certificados ni credenciales de ninguno de los dos directamente.

---

## Decisión

Usar **Expo Push Service** como único broker de push notifications, en ambas plataformas.

- Cliente: `expo-notifications` pide permisos y obtiene el Expo push token (`Notifications.getExpoPushTokenAsync()`).
- El token se registra en el backend vía `POST /AIServices/Devices/register`, persistido en la tabla nueva `sec_user_device` (ver [[tables]]).
- Envío: `App/procesamiento/shared/services/push_service.py` hace un POST directo a la API REST de Expo — sin SDK, sin credenciales adicionales más allá del token del dispositivo.
- Hook de envío: `completion_activity.py`, tras el éxito de `sp_complete_stt_live_recording_job_v1` ("Tu clase ya está lista.") y en los paths de fallo del orquestador ("El audio no pudo procesarse.").

Esta ronda de trabajo entrega infraestructura **conectada de punta a punta con un caso real** (no solo scaffolding inerte) — el envío en éxito/fallo del job queda efectivamente disparado, no solo el registro de tokens.

---

## Consecuencias

### Positivas

- Integración más simple posible para una app 100% Expo — sin manejar certificados APNs ni credenciales FCM en la infraestructura propia.
- Un solo código de cliente (`expo-notifications`) cubre Android e iOS sin ramas de plataforma.
- El envío es un efecto secundario sobre el resultado ya persistido — no toca el pipeline de IA ni sus prompts, ni condiciona el estado del job si falla.
- Camino de upgrade disponible: si el proyecto necesita features fuera del alcance de Expo Push Service (rich media avanzado, volumen muy alto), migrar a FCM/APNs directos o Azure Notification Hub es un cambio acotado a `push_service.py` y al registro de tokens — el resto de la arquitectura (tabla, endpoint, hook de envío) no cambia.

### Negativas

- Depende de la disponibilidad del servicio de Expo como intermediario (fuera del control directo de Champion AI).
- No es tan consistente con el resto del stack (100% Azure) como hubiera sido Azure Notification Hub — se acepta como trade-off por simplicidad de integración.
- El soporte de push notifications en Expo Go (sin dev client) puede variar entre versiones de Expo SDK — a confirmar empíricamente durante la implementación de esta feature.

---

## Alternativas consideradas

| Alternativa | Descartada por |
|---|---|
| Azure Notification Hub | Más piezas de infraestructura Azure para provisionar y mantener (recurso ANH + credenciales FCM/APNs subidas ahí) frente al beneficio marginal de "todo en Azure" para el volumen actual del proyecto |
| FCM + APNs directos | Mayor complejidad — certificados/keys APNs y credenciales FCM manejadas por separado, sin ninguna ventaja concreta sobre Expo Push Service en esta etapa |

---

## Referencias

- `App/Knowledge/Roadmap/pending-features.md` — origen de la necesidad
- [[tables]] — tabla `sec_user_device`
- [[stored-procedures]] — `sp_register_device_token_v1`
- `App/Mobile/CLAUDE.md` — flujo de registro en el cliente
- `App/procesamiento/CLAUDE.md` — hook de envío en el pipeline
- CLAUDE.md raíz — principio 7 (polling + push como complemento)
