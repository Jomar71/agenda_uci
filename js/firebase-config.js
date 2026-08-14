// js/firebase-config.js
// Configuración de Firebase para sincronización en tiempo real.
// Reemplaza estos valores con los de tu proyecto en la consola de Firebase.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// 🔥 CONFIGURACIÓN REAL DEL PROYECTO
const firebaseConfig = {
    apiKey: "AIzaSyDE_sgScXBKKAYMp-dO-wOiXy2zafei9WA",
    authDomain: "agenda-uci.firebaseapp.com",
    projectId: "agenda-uci",
    storageBucket: "agenda-uci.firebasestorage.app",
    messagingSenderId: "169608092361",
    appId: "1:169608092361:web:cb9bef10cc02781ef54b18"
};

let app = null;
let db = null;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    window.firebaseApp = app;
    window.firebaseDb = db;
    console.log('🔥 Firebase inicializado correctamente');
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    console.warn('⚠️ La aplicación continuará en modo local (localStorage)');
}

// Habilitar persistencia offline (ignora errores si ya está activa o no soportada)
if (db && window.indexedDB) {
    enableIndexedDbPersistence(db, { synchronizeTabs: true })
        .then(() => console.log('✅ Persistencia offline habilitada'))
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('⚠️ Persistencia offline no disponible (múltiples pestañas)');
            } else if (err.code === 'unimplemented') {
                console.warn('⚠️ Persistencia offline no soportada por el navegador');
            }
        });
}

export { app, db };
