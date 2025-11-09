// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD_example_key_here", // Reemplaza con tu API key real
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

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
