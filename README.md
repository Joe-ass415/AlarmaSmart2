# SmartAlarm

Despierta de verdad. En lugar de silenciar la alarma a ciegas, **agitas el teléfono** hasta completar el reto: tu cuerpo se despierta antes que tu móvil.

SmartAlarm es una app móvil (iOS / Android) construida con **Expo SDK 57 + React Native + TypeScript**. Funciona **100 % local**: no hay servidor, ni cuentas, ni base de datos en la nube. Alarmas, recordatorios y ajustes viven en el dispositivo (`AsyncStorage`) y las notificaciones se programan con `expo-notifications`.

---

## Qué hace

### Alarmas con reto de agitación
- Reto configurable: **de 1 a 20 agitaciones** para silenciar la alarma.
- **Sensibilidad ajustable (1-10)**: a 1 hay que lanzar el móvil con fuerza; a 10 basta una sacudida de muñeca.
- Detección sobre el **acelerómetro nativo** (`expo-sensors`) con calibración de línea base, histéresis y cooldown, independiente de la orientación del dispositivo.
- **Vibración** en 4 niveles (`off`, `light`, `medium`, `strong`) con `expo-haptics`.
- **Pospuesta (snooze)** configurable en minutos.
- Repetición semanal: elige los días que se repite (o alarma única).
- Etiqueta, hora y próxima ocurrencia calculada y cacheada en la pantalla de inicio.

### Biblioteca de sonidos offline
- **8 sonidos** sintetizados y empaquetados en el repo (`assets/sounds/*.wav`), sin depender de assets de terceros ni de red.
- 4 gratuitos + 4 premium, con vista previa y loop en la pantalla de disparo.
- Se regeneran con `npm run sounds` (`scripts/generate-sounds.mjs`).

### Recordatorios
- Tareas con **categoría** (Escuela, Trabajo, Salud, Personal), notas y fecha objetivo.
- **Anticipación** configurable (aviso antes de la hora) y repetición semanal.
- Marcado como completado, pospuesta y **tasa de cumplimiento** semanal.

### Calendario (opcional)
- Lectura de los próximos eventos del calendario del sistema (`expo-calendar`).
- Creación de eventos desde la propia app.
- Todo local y revocable: la app solo lee, nunca sube nada.

### Estadísticas (Premium)
- **Adhesión**: retos superados sobre el total de disparos.
- Tiempo medio hasta silenciar, número de agitaciones, rachas de días.
- Registro histórico de cada disparo (`shake` / `snooze` / `emergencia` / `silencioso`).

### Diseño y ajuste
- Temas **claro / oscuro / sistema** y 5 acentos (menta, violeta, cielo, ámbar, coral).
- Formato 12 h / 24 h.
- Onboarding de 3 pasos + nombre de usuario.
- Pantalla Premium con prueba simulada para el MVP.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Expo SDK 57, React Native 0.86, React 19.2 |
| Navegación | Expo Router (file-based routing en `src/app/`) |
| Lenguaje | TypeScript 6 |
| UI | `@expo/ui`, `expo-linear-gradient`, `expo-blur`, `expo-glass-effect`, `react-native-reanimated`, SF Symbols |
| Sensores | `expo-sensors` (acelerómetro), `expo-haptics` |
| Audio | `expo-audio` |
| Notificaciones | `expo-notifications` (locales) |
| Calendario | `expo-calendar` |
| Persistencia | `@react-native-async-storage/async-storage` |

---

## Estructura

```
src/
├── app/                  # Pantallas (Expo Router)
│   ├── _layout.tsx       # Layout raíz + providers
│   ├── onboarding.tsx    # Onboarding de 3 pasos
│   ├── (tabs)/           # Inicio, Alarmas, Recordatorios, Premium, Ajustes
│   ├── alarm/            # edit.tsx · ringing.tsx
│   ├── reminder/edit.tsx
│   ├── calendar.tsx
│   ├── sounds.tsx
│   └── stats.tsx
├── components/           # UI compartida (ui/, rows.tsx, headers, tab-bar)
├── core/                 # Lógica pura: types, date, sounds, notifications, calendar, storage, haptics
├── hooks/                # useNow, useShakeDetector
├── state/                # Contextos: Alarms, Reminders, Settings
└── theme/                # tokens + ThemeProvider
assets/sounds/            # Biblioteca de sonidos WAV generada
scripts/generate-sounds.mjs
```

---

## Desarrollo local

```bash
npm install
npx expo start
```

> **Importante:** esta app **no funciona en Expo Go**. Usa `expo-sensors`, `expo-notifications`, `expo-audio` y `expo-dev-client`, que son módulos nativos y requieren una **development build** (ver tutorial abajo).

Con una development build ya instalada en el dispositivo, `npx expo start` abre el dev server y los cambios se aplican al instante.

Otros comandos:

```bash
npm run lint        # ESLint (expo lint)
npx tsc --noEmit    # Typecheck
npm run sounds      # Regenera assets/sounds/*.wav
npx expo-doctor     # Diagnóstico de dependencias y config
```

---

## Tutorial: cómo abrir una build de EAS CLI

EAS Build compila la app en la nube, así que **no necesitas Xcode ni Android Studio**. Solo una cuenta de Expo (gratis para Android y para builds internas de iOS).

### 1. Instalar y autenticar EAS CLI

```bash
npm install -g eas-cli      # o usa npx eas-cli@latest <comando>
eas login                   # email + contraseña, o abre el navegador
eas whoami                  # comprueba que estás dentro
```

### 2. El proyecto ya está enlazado

Este repo ya tiene su `projectId` de EAS en `app.json` (`expo.extra.eas.projectId`) y los perfiles definidos en `eas.json`. Si clonaste el repo y quieres enlazar **tu** cuenta:

```bash
eas build:configure
```

> El `slug` y el `projectId` se mantienen a propósito: cambiar el `slug` rompe el vínculo con el proyecto de EAS. Si necesitas un proyecto nuevo, borra `extra.eas.projectId` y ejecuta `eas build:configure`.

### 3. Elegir perfil y plataforma

Los perfiles viven en `eas.json`:

| Perfil | Para qué sirve | Plataforma |
| --- | --- | --- |
| `development` | Build de desarrollo con **dev client** y recarga en caliente. La que usas para programar. | ambas |
| `preview` | Build **interna** (APK o IPA) para probar en tu móvil sin publicarla. | ambas |
| `production` | Build para las **tiendas**, con `autoIncrement` de versión. | ambas |

```bash
# Desarrollo (con dev client) — recommended
eas build --profile development --platform android

# Previa interna para instalar y probar a mano
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Ambas plataformas, listo para publicar
eas build --profile production --platform all
```

La primera build de un proyecto nuevo **crea el proyecto en EAS y pide permisos** de enqueue; acepta con `y`. Después de eso, la build se compila en la nube (~15-25 min) y te llega un **email + un link** al dashboard.

### 4. Seguir y abrir la build

```bash
eas build:list                    # historial con id, plataforma, estado y link
eas build:view <BUILD_ID>         # detalle de una build concreta
eas build:cancel <BUILD_ID>       # cancelar si te equivocaste de perfil
```

Desde el link de la build puedes:

- **Android (preview / development):** descargar el `.apk` e instalarlo en el móvil (te llegará un aviso de "unknown sources") o por USB con `adb install -r app-release.apk`.
- **iOS (preview):** instalarlo desde el enlace de la build en `expo.dev` (registra antes el UDID del dispositivo con `eas device:create`) o distributing vía **TestFlight**.
- **Production:** descargar el `.aab`/`.ipa` y subirlo, o dejar que EAS lo haga por ti con `eas submit`.

### 5. Publicar en las tiendas

```bash
eas submit --platform android --latest        # .aab → Google Play
eas submit --platform ios --latest            # .ipa → App Store Connect
```

Las builds de iOS para las tiendas requieren una **cuenta de Expo de pago**; las de Android y las internas no.

### 6. Actualizaciones OTA (solo JavaScript)

Si solo cambiaste código TS/TSX —sin tocar dependencias nativas ni `app.json`— no hace falta recompilar: sube el JS con una actualización Over-The-Air.

```bash
eas update --branch preview --message "Ajustes en la pantalla de alarma"
```

El comando genera un **commit** en git con los cambios y una URL tipo `u.expo.dev/xxxx`. Ábrela desde la development build instalada en el móvil y el cambio se aplica al instante. Solo lo que se publique a un canal de producción (`eas update --channel production`) llega a las builds de las tiendas.

---

## Licencia

MIT