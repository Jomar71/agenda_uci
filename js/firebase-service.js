// Servicio centralizado para Firebase Firestore
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDocs, 
    onSnapshot,
    query,
    orderBy,
    where 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

class FirebaseService {
    constructor() {
        this.listeners = new Map();
        console.log('🔥 FirebaseService inicializado');
    }

    // 🔄 Obtener todos los documentos de una colección
    async getAll(collectionName) {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const data = [];
            querySnapshot.forEach((doc) => {
                data.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            console.log(`✅ ${data.length} documentos cargados de ${collectionName}`);
            return data;
        } catch (error) {
            console.error(`❌ Error cargando ${collectionName}:`, error);
            throw error;
        }
    }

    // 💾 Guardar documento (crear o actualizar)
    async save(collectionName, id, data) {
        try {
            if (id) {
                // Actualizar documento existente
                const docRef = doc(db, collectionName, id.toString());
                await updateDoc(docRef, {
                    ...data,
                    updatedAt: new Date()
                });
                console.log(`✅ ${collectionName} actualizado:`, id);
            } else {
                // Crear nuevo documento
                const docRef = await addDoc(collection(db, collectionName), {
                    ...data,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`✅ ${collectionName} creado:`, docRef.id);
                return docRef.id;
            }
        } catch (error) {
            console.error(`❌ Error guardando ${collectionName}:`, error);
            throw error;
        }
    }

    // 🗑️ Eliminar documento
    async delete(collectionName, id) {
        try {
            await deleteDoc(doc(db, collectionName, id.toString()));
            console.log(`✅ ${collectionName} eliminado:`, id);
        } catch (error) {
            console.error(`❌ Error eliminando ${collectionName}:`, error);
            throw error;
        }
    }

    // 👂 Escuchar cambios en tiempo real
    listenToCollection(collectionName, callback) {
        try {
            const q = query(collection(db, collectionName), orderBy('updatedAt', 'desc'));
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const changes = [];
                snapshot.docChanges().forEach((change) => {
                    changes.push({
                        type: change.type,
                        id: change.doc.id,
                        data: change.doc.data()
                    });
                });
                
                console.log(`🔥 Cambios en ${collectionName}:`, changes.length);
                callback(changes);
            }, (error) => {
                console.error(`❌ Error en listener de ${collectionName}:`, error);
            });

            // Guardar referencia para poder detenerlo después
            this.listeners.set(collectionName, unsubscribe);
            console.log(`✅ Listener activado para ${collectionName}`);
            
            return unsubscribe;
        } catch (error) {
            console.error(`❌ Error iniciando listener de ${collectionName}:`, error);
            throw error;
        }
    }

    // 🛑 Detener todos los listeners
    stopAllListeners() {
        this.listeners.forEach((unsubscribe, collectionName) => {
            if (unsubscribe) {
                unsubscribe();
                console.log(`🛑 Listener detenido para ${collectionName}`);
            }
        });
        this.listeners.clear();
    }

    // 🔍 Buscar documentos por campo
    async query(collectionName, field, operator, value) {
        try {
            const q = query(collection(db, collectionName), where(field, operator, value));
            const querySnapshot = await getDocs(q);
            const data = [];
            querySnapshot.forEach((doc) => {
                data.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return data;
        } catch (error) {
            console.error(`❌ Error en query ${collectionName}:`, error);
            throw error;
        }
    }
}

// Instancia global del servicio Firebase
const firebaseService = new FirebaseService();
window.firebaseService = firebaseService;