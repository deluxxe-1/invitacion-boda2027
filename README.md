# Invitación Boda — Diego & Silvia

Web responsive de invitación de boda con animación de sobre al hacer scroll y formulario RSVP conectado a Firebase Firestore.

## Características

- Sobre animado que se abre al hacer scroll (optimizado para móvil)
- Invitación con toda la información de la boda
- Formulario de confirmación de asistencia (ceremonia / ceremonia + celebración / no asiste)
- Datos guardados en Firebase Firestore

## Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Activa **Firestore Database** (modo producción)
3. Añade una app **Web** y copia la configuración
4. Pega los valores en `js/firebase-config.js`
5. Instala Firebase CLI y autentícate:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use TU_PROJECT_ID
```

6. Despliega hosting y reglas:

```bash
npx -y firebase-tools@latest deploy
```

## Probar en local

Abre `index.html` en el navegador o usa el emulador de Firebase:

```bash
npx -y firebase-tools@latest emulators:start --only hosting
```

## Ver respuestas RSVP

Las confirmaciones se guardan en la colección `rsvps` de Firestore. Puedes verlas en Firebase Console → Firestore Database.

## Información de la boda

- **Novios:** Diego & Silvia
- **Fecha:** Sábado 12 de Junio 2027
- **Ceremonia:** 17:30 h — Iglesia de San Jerónimo el Real, Madrid
- **Celebración:** 19:30 h — Complejo El Olivar, Alcalá de Henares, Madrid
