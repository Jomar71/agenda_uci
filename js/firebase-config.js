// Configuración de Firebase
// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Cargar configuración desde archivo seguro
const firebaseConfig = window.firebaseConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar Firestore
const db = firebase.firestore();

// Configurar persistencia offline
firebase.firestore().enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Múltiples pestañas abiertas, persistencia deshabilitada');
        } else if (err.code == 'unavailable') {
            console.warn('Modo offline no disponible');
        }
    });

// Configurar timestamps en snapshots
const settings = { timestampsInSnapshots: true };
db.settings(settings);

// Exportar instancia de Firestore
window.db = db;

console.log('🔥 Firebase inicializado correctamente');
