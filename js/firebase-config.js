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
  apiKey: "AIzaSyDmx3cpm7Eig0GzgbeTnu0I8XZpsybXfwo",
  authDomain: "invitacion-a-la-boda.firebaseapp.com",
  projectId: "invitacion-a-la-boda",
  storageBucket: "invitacion-a-la-boda.firebasestorage.app",
  messagingSenderId: "821765458876",
  appId: "1:821765458876:web:a2e2aeef0cddd69c2379b9",
};

export const isFirebaseConfigured = () =>
  firebaseConfig.apiKey !== "TU_API_KEY" &&
  firebaseConfig.projectId !== "TU_PROJECT_ID";
