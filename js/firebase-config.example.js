// js/firebase-config.example.js - ARCHIVO SEGURO PARA GITHUB
// Este es un EJEMPLO - otros desarrolladores usarán este como guía

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-analytics.js";

// ⚠️ CONFIGURACIÓN DE EJEMPLO - REEMPLAZA CON TUS DATOS REALES
// Para obtener esta configuración:
// 1. Ve a https://console.firebase.google.com
// 2. Selecciona tu proyecto
// 3. Haz clic en ⚙️ → Configuración del proyecto
// 4. En "Tus apps", haz clic en tu app web
// 5. Copia el objeto firebaseConfig

const firebaseConfig = {
  apiKey: "COPIAR-apiKey-DESDE-FIREBASE-CONSOLE",
  authDomain: "COPIAR-authDomain-DESDE-FIREBASE-CONSOLE",
  projectId: "COPIAR-projectId-DESDE-FIREBASE-CONSOLE",
  storageBucket: "COPIAR-storageBucket-DESDE-FIREBASE-CONSOLE",
  messagingSenderId: "COPIAR-messagingSenderId-DESDE-FIREBASE-CONSOLE",
  appId: "COPIAR-appId-DESDE-FIREBASE-CONSOLE"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios de Firebase
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Configurar persistencia offline (opcional)
enableIndexedDbPersistence(db)
  .then(() => {
    console.log('✅ Persistencia offline habilitada');
  })
  .catch((err) => {
    console.warn('❌ Persistencia offline no disponible:', err);
  });

// Exportar servicios para usar en otros archivos
export { app, auth, db, storage, analytics };

console.log('🔥 Firebase configurado (ejemplo)');