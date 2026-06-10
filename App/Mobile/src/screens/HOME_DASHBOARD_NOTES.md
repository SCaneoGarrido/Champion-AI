# Home Dashboard - Apuntes de implementacion

## Objetivo
- Reemplazar el dashboard basico por el diseno "Champion AI - Home Dashboard".
- Mantener la navegacion actual: `Login -> Dashboard`.
- Separar estilos en archivo dedicado para mejorar mantenimiento.

## Archivos modificados
- `src/screens/DashboardScreen.jsx`
- `src/screens/DashboardScreen.styles.js`

## Mapeo del diseno (HTML -> React Native)
- **TopAppBar**: barra superior con menu, marca y avatar de iniciales.
- **Greeting Area**: saludo principal + pastilla de fecha.
- **Hero / Slider**: tarjeta destacada con CTA "Empezar" e indicadores.
- **Actividad reciente**: lista de tarjetas con icono, metadata y etiqueta.
- **Stats**: dos tarjetas de metricas (racha y progreso).
- **Footer**: terminos, privacidad y version.
- **FAB**: boton flotante con badge de notificacion.
- **Drawer**: panel lateral con accesos y accion de cerrar sesion.

## Decisiones tecnicas
- Se uso `MaterialIcons` de `@expo/vector-icons` para simular Material Symbols del mockup.
- Los colores se trasladaron de forma aproximada a React Native.
- Se evito crear nuevas dependencias para mantener compatibilidad con Expo actual.
- El drawer se renderiza como overlay condicional (sin libreria extra de drawer).
- Se conserva la sesion via `AsyncStorage` con la clave `@champion_user`.

## Datos dinamicos actuales
- Iniciales del avatar calculadas desde `name`, `email` o `user_id`.
- Actividad reciente y metricas en arreglo local (datos mock por ahora).

## Pendientes recomendados
- Conectar "Actividad reciente" y estadisticas al backend real.
- Reemplazar texto de fecha por fecha dinamica segun locale.
- Navegar cada item del drawer a pantallas reales cuando existan.
- Agregar pruebas visuales para Android, iOS y Web (`expo start --web`).
