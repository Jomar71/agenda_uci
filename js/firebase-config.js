// js/firebase-config.js - VERSION SIMPLIFICADA Y CORREGIDA

// Cargar Firebase directamente (sin módulos ES6 para compatibilidad)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";

// 🔥 CONFIGURACIÓN REAL - REEMPLAZA CON TUS DATOS
const firebaseConfig = {
  apiKey: "AIzaSyDE_sgScXBKKAYMp-dO-wOiXy2zafei9WA",
  authDomain: "agenda-uci.firebaseapp.com",
  projectId: "agenda-uci",
  storageBucket: "agenda-uci.firebasestorage.app",
  messagingSenderId: "169608092361",
  appId: "1:169608092361:web:cb9bef10cc02781ef54b18",
  measurementId: "G-2R49TLW0DR"
};

// ✅ INICIALIZAR FIREBASE
try {
  const app = initializeApp(firebaseConfig);

  // ✅ INICIALIZAR SERVICIOS
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const analytics = getAnalytics(app);

  console.log('🔥 Firebase inicializado correctamente');

  // Hacer disponible globalmente
  window.firebaseApp = app;
  window.firebaseAuth = auth;
  window.firebaseDb = db;
  window.firebaseStorage = storage;
  window.firebaseAnalytics = analytics;

} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
}