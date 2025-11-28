// js/firebase-service-simple.js - VERSION CORREGIDA
class FirebaseServiceSimple {
    constructor() {
        this.isAvailable = false;
        this.firestoreModules = null;
        this.init();
    }

    async init() {
        // Verificar si Firebase está disponible
        if (window.firebaseDb) {
            this.isAvailable = true;
            
            // Cargar módulos de Firestore una sola vez
            try {
                const { collection, onSnapshot, query, orderBy, where, getDocs, doc, setDoc, updateDoc, deleteDoc } = 
                    await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
                
                this.firestoreModules = {
                    collection, onSnapshot, query, orderBy, where, getDocs, doc, setDoc, updateDoc, deleteDoc
                };
                console.log('✅ Firebase Service disponible con módulos cargados');
            } catch (error) {
                console.error('❌ Error cargando módulos Firestore:', error);
                this.isAvailable = false;
            }
        } else {
            console.warn('⚠️ Firebase no disponible, usando localStorage');
            this.isAvailable = false;
        }
    }

    // 👂 Escuchar cambios en tiempo real - CORREGIDO
    listenToCollection(collectionName, callback) {
        if (!this.isAvailable || !this.firestoreModules) {
            console.warn(`⚠️ Firebase no disponible para listener de ${collectionName}`);
            return () => {}; // Función vacía para unsubscribe
        }

        try {
            const { collection, onSnapshot, query, orderBy } = this.firestoreModules;
            
            const q = query(collection(window.firebaseDb, collectionName), orderBy('updatedAt', 'desc'));
            
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

            console.log(`✅ Listener activado para ${collectionName}`);
            return unsubscribe;
        } catch (error) {
            console.error(`❌ Error iniciando listener de ${collectionName}:`, error);
            return () => {};
        }
    }

    // 🔄 Obtener todos los documentos
    async getAll(collectionName) {
        if (!this.isAvailable || !this.firestoreModules) {
            return this.getFromLocalStorage(collectionName);
        }

        try {
            const { collection, getDocs } = this.firestoreModules;
            
            const querySnapshot = await getDocs(collection(window.firebaseDb, collectionName));
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
            return this.getFromLocalStorage(collectionName);
        }
    }

    // 💾 Guardar documento
    async save(collectionName, id, data) {
        if (!this.isAvailable || !this.firestoreModules) {
            return this.saveToLocalStorage(collectionName, id, data);
        }

        try {
            const { doc, setDoc, updateDoc } = this.firestoreModules;

            const docId = id || this.generateId();
            const docRef = doc(window.firebaseDb, collectionName, docId.toString());
            
            if (id) {
                await updateDoc(docRef, {
                    ...data,
                    updatedAt: new Date()
                });
                console.log(`✅ ${collectionName} actualizado:`, id);
            } else {
                await setDoc(docRef, {
                    ...data,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log(`✅ ${collectionName} creado:`, docRef.id);
            }
            
            return docId;
        } catch (error) {
            console.error(`❌ Error guardando ${collectionName}:`, error);
            return this.saveToLocalStorage(collectionName, id, data);
        }
    }

    // 🗑️ Eliminar documento
    async delete(collectionName, id) {
        if (!this.isAvailable || !this.firestoreModules) {
            return this.deleteFromLocalStorage(collectionName, id);
        }

        try {
            const { doc, deleteDoc } = this.firestoreModules;

            await deleteDoc(doc(window.firebaseDb, collectionName, id.toString()));
            console.log(`✅ ${collectionName} eliminado:`, id);
        } catch (error) {
            console.error(`❌ Error eliminando ${collectionName}:`, error);
            this.deleteFromLocalStorage(collectionName, id);
        }
    }

    // 📦 Métodos de localStorage (fallback) - MANTENER IGUAL
    getFromLocalStorage(collectionName) {
        try {
            const stored = localStorage.getItem(collectionName);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error(`❌ Error cargando ${collectionName} de localStorage:`, error);
            return [];
        }
    }

    saveToLocalStorage(collectionName, id, data) {
        try {
            const items = this.getFromLocalStorage(collectionName);
            
            if (id) {
                const index = items.findIndex(item => item.id === id);
                if (index !== -1) {
                    items[index] = { ...data, id, updatedAt: new Date() };
                }
            } else {
                const newId = this.generateId();
                items.push({ ...data, id: newId, createdAt: new Date(), updatedAt: new Date() });
            }
            
            localStorage.setItem(collectionName, JSON.stringify(items));
            console.log(`💾 ${collectionName} guardado en localStorage`);
            return id || this.generateId();
        } catch (error) {
            console.error(`❌ Error guardando ${collectionName} en localStorage:`, error);
            return null;
        }
    }

    deleteFromLocalStorage(collectionName, id) {
        try {
            const items = this.getFromLocalStorage(collectionName);
            const filtered = items.filter(item => item.id !== id);
            localStorage.setItem(collectionName, JSON.stringify(filtered));
            console.log(`🗑️ ${collectionName} eliminado de localStorage:`, id);
        } catch (error) {
            console.error(`❌ Error eliminando ${collectionName} de localStorage:`, error);
        }
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}

// Crear instancia global
window.firebaseService = new FirebaseServiceSimple();
console.log('🚀 Firebase Service Simple inicializado');