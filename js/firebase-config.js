/**
 * Configuración de Firebase
 *
 * Para conectar tu proyecto:
 * 1. Crea un proyecto en https://console.firebase.google.com
 * 2. Añade una app web y copia la configuración aquí
 * 3. Activa Firestore en la consola
 * 4. Ejecuta: npx firebase-tools@latest login
 * 5. Ejecuta: npx firebase-tools@latest use TU_PROJECT_ID
 * 6. Despliega: npx firebase-tools@latest deploy
 */

export const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT_ID.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

export const isFirebaseConfigured = () =>
  firebaseConfig.apiKey !== "TU_API_KEY" &&
  firebaseConfig.projectId !== "TU_PROJECT_ID";
