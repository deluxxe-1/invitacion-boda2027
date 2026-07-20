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
  apiKey: "AIzaSyAvwrCpTKTwXoDl2VkjzYX6vtcs_PWKQU4",
  authDomain: "boda-2027.firebaseapp.com",
  projectId: "boda-2027",
  storageBucket: "boda-2027.firebasestorage.app",
  messagingSenderId: "2745893545",
  appId: "1:2745893545:web:8f7d62bddc4b0defa4dfb8",
  measurementId: "G-DCMYNQGMQ7",
};

export const isFirebaseConfigured = () =>
  firebaseConfig.apiKey !== "TU_API_KEY" &&
  firebaseConfig.projectId !== "TU_PROJECT_ID";
