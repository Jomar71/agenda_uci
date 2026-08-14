// js/firebase-config.example.js - ARCHIVO DE EJEMPLO (SEGURO PARA GITHUB)
// Copia este archivo a js/firebase-config.js y reemplaza los valores con tu configuración real.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ⚠️ CONFIGURACIÓN DE EJEMPLO - REEMPLAZA CON TUS DATOS REALES
// Obtén esta configuración en: Firebase Console → Configuración del proyecto → Tus apps → Web
const firebaseConfig = {
    apiKey: "COPIAR-apiKey-DESDE-FIREBASE-CONSOLE",
    authDomain: "COPIAR-authDomain-DESDE-FIREBASE-CONSOLE",
    projectId: "COPIAR-projectId-DESDE-FIREBASE-CONSOLE",
    storageBucket: "COPIAR-storageBucket-DESDE-FIREBASE-CONSOLE",
    messagingSenderId: "COPIAR-messagingSenderId-DESDE-FIREBASE-CONSOLE",
    appId: "COPIAR-appId-DESDE-FIREBASE-CONSOLE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Persistencia offline (opcional)
enableIndexedDbPersistence(db, { synchronizeTabs: true })
    .then(() => console.log('✅ Persistencia offline habilitada'))
    .catch((err) => {
        if (err.code !== 'already-exists') {
            console.warn('⚠️ Persistencia offline no disponible:', err);
        }
    });

// Exponer para el resto de la aplicación
window.firebaseApp = app;
window.firebaseDb = db;

export { app, db };

console.log('🔥 Firebase configurado (ejemplo)');
