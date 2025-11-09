// Servicio de Firestore para sincronización en tiempo real
class FirestoreService {
    constructor() {
        this.db = null;
        this.listeners = new Map();
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        // Verificar si Firebase está disponible
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                this.db = window.db || firebase.firestore();
                console.log('🔥 Firestore inicializado correctamente');
                this.setupNetworkListeners();
            } catch (error) {
                console.error('❌ Error inicializando Firestore:', error);
                this.fallbackToLocalStorage();
            }
        } else {
            console.warn('⚠️ Firebase no disponible, usando localStorage');
            this.fallbackToLocalStorage();
        }
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 Conexión restablecida');
            this.isOnline = true;
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            console.log('📴 Conexión perdida');
            this.isOnline = false;
        });
    }

    fallbackToLocalStorage() {
        this.db = null;
        console.log('💾 Usando localStorage como fallback');
    }

    // Método para guardar datos
    async save(collection, id, data) {
        if (!this.db) {
            return this.saveToLocalStorage(collection, id, data);
        }

        try {
            const docRef = this.db.collection(collection).doc(id.toString());
            await docRef.set({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: data.createdAt || firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`💾 Guardado en Firestore: ${collection}/${id}`);
            return true;
        } catch (error) {
            console.error('❌ Error guardando en Firestore:', error);
            // Fallback a localStorage
            return this.saveToLocalStorage(collection, id, data);
        }
    }

    // Método para obtener datos
    async get(collection, id) {
        if (!this.db) {
            return this.getFromLocalStorage(collection, id);
        }

        try {
            const doc = await this.db.collection(collection).doc(id.toString()).get();
            if (doc.exists) {
                const data = doc.data();
                // Convertir timestamps de Firestore
                if (data.createdAt && data.createdAt.toDate) {
                    data.createdAt = data.createdAt.toDate().toISOString();
                }
                if (data.updatedAt && data.updatedAt.toDate) {
                    data.updatedAt = data.updatedAt.toDate().toISOString();
                }
                return data;
            }
            return null;
        } catch (error) {
            console.error('❌ Error obteniendo de Firestore:', error);
            return this.getFromLocalStorage(collection, id);
        }
    }

    // Método para obtener todos los documentos de una colección
    async getAll(collection) {
        if (!this.db) {
            return this.getAllFromLocalStorage(collection);
        }

        try {
            const snapshot = await this.db.collection(collection).orderBy('updatedAt', 'desc').get();
            const results = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Convertir timestamps
                if (data.createdAt && data.createdAt.toDate) {
                    data.createdAt = data.createdAt.toDate().toISOString();
                }
                if (data.updatedAt && data.updatedAt.toDate) {
                    data.updatedAt = data.updatedAt.toDate().toISOString();
                }
                results.push({ id: doc.id, ...data });
            });
            return results;
        } catch (error) {
            console.error('❌ Error obteniendo colección de Firestore:', error);
            return this.getAllFromLocalStorage(collection);
        }
    }

    // Método para eliminar datos
    async delete(collection, id) {
        if (!this.db) {
            return this.deleteFromLocalStorage(collection, id);
        }

        try {
            await this.db.collection(collection).doc(id.toString()).delete();
            console.log(`🗑️ Eliminado de Firestore: ${collection}/${id}`);
            return true;
        } catch (error) {
            console.error('❌ Error eliminando de Firestore:', error);
            return this.deleteFromLocalStorage(collection, id);
        }
    }

    // Método para escuchar cambios en tiempo real
    listenToCollection(collection, callback) {
        if (!this.db) {
            console.warn('⚠️ No se puede escuchar cambios en tiempo real sin Firestore');
            return null;
        }

        const unsubscribe = this.db.collection(collection)
            .orderBy('updatedAt', 'desc')
            .onSnapshot((snapshot) => {
                const changes = [];
                snapshot.docChanges().forEach((change) => {
                    const data = change.doc.data();
                    // Convertir timestamps
                    if (data.createdAt && data.createdAt.toDate) {
                        data.createdAt = data.createdAt.toDate().toISOString();
                    }
                    if (data.updatedAt && data.updatedAt.toDate) {
                        data.updatedAt = data.updatedAt.toDate().toISOString();
                    }

                    changes.push({
                        type: change.type, // 'added', 'modified', 'removed'
                        id: change.doc.id,
                        data: { id: change.doc.id, ...data }
                    });
                });

                if (changes.length > 0) {
                    console.log(`🔄 Cambios en ${collection}:`, changes.length);
                    callback(changes);
                }
            }, (error) => {
                console.error(`❌ Error en listener de ${collection}:`, error);
            });

        // Guardar referencia para poder detener el listener
        this.listeners.set(collection, unsubscribe);
        return unsubscribe;
    }

    // Método para detener listener
    stopListening(collection) {
        const unsubscribe = this.listeners.get(collection);
        if (unsubscribe) {
            unsubscribe();
            this.listeners.delete(collection);
            console.log(`🔇 Listener detenido para ${collection}`);
        }
    }

    // Métodos de fallback para localStorage
    saveToLocalStorage(collection, id, data) {
        try {
            const allData = JSON.parse(localStorage.getItem(collection) || '[]');
            const existingIndex = allData.findIndex(item => item.id == id);

            const item = {
                ...data,
                id: id,
                updatedAt: new Date().toISOString(),
                createdAt: data.createdAt || new Date().toISOString()
            };

            if (existingIndex >= 0) {
                allData[existingIndex] = item;
            } else {
                allData.push(item);
            }

            localStorage.setItem(collection, JSON.stringify(allData));
            console.log(`💾 Guardado en localStorage: ${collection}/${id}`);
            return true;
        } catch (error) {
            console.error('❌ Error guardando en localStorage:', error);
            return false;
        }
    }

    getFromLocalStorage(collection, id) {
        try {
            const allData = JSON.parse(localStorage.getItem(collection) || '[]');
            return allData.find(item => item.id == id) || null;
        } catch (error) {
            console.error('❌ Error obteniendo de localStorage:', error);
            return null;
        }
    }

    getAllFromLocalStorage(collection) {
        try {
            return JSON.parse(localStorage.getItem(collection) || '[]');
        } catch (error) {
            console.error('❌ Error obteniendo colección de localStorage:', error);
            return [];
        }
    }

    deleteFromLocalStorage(collection, id) {
        try {
            const allData = JSON.parse(localStorage.getItem(collection) || '[]');
            const filteredData = allData.filter(item => item.id != id);
            localStorage.setItem(collection, JSON.stringify(filteredData));
            console.log(`🗑️ Eliminado de localStorage: ${collection}/${id}`);
            return true;
        } catch (error) {
            console.error('❌ Error eliminando de localStorage:', error);
            return false;
        }
    }

    // Sincronizar cambios pendientes cuando se restablece la conexión
    async syncPendingChanges() {
        if (!this.db) return;

        console.log('🔄 Sincronizando cambios pendientes...');

        // Aquí podríamos implementar lógica para sincronizar cambios locales pendientes
        // Por simplicidad, por ahora solo notificamos que la conexión se restableció
        window.dispatchEvent(new CustomEvent('networkRestored'));
    }

    // Método para verificar conectividad
    isConnected() {
        return this.isOnline && !!this.db;
    }
}

// Crear instancia global
window.firestoreService = new FirestoreService();

console.log('🚀 Servicio de Firestore inicializado');
