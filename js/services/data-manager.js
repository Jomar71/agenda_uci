
// Remove import { db } since we can't rely on it being exported
// We will use window.firebaseDb which is set by firebase-config.js
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
    where,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/**
 * DataManager - Unified Data Access Layer
 * Handles Firebase connection with automatic LocalStorage fallback
 * Implements Singleton pattern
 */
class DataManager {
    constructor() {
        if (DataManager.instance) {
            return DataManager.instance;
        }

        this.useFirebase = false;
        this.listeners = new Map();
        this.hasPermissionsError = false; // Persistent state for UI checks

        // Use a more robust initialization
        if (document.readyState === 'complete') {
            this.init();
        } else {
            window.addEventListener('load', () => this.init());
        }

        DataManager.instance = this;
    }

    async init() {
        console.log('📡 DataManager: Initializing...');
        try {
            // Check for Firebase multiple times if needed (retry logic)
            let retries = 0;
            const checkFirebase = () => {
                if (window.firebaseDb) {
                    this.db = window.firebaseDb;
                    this.useFirebase = true;
                    console.log('🚀 DataManager: Firebase connected successfully');
                    this.updateSyncStatusUI();

                    // Notify other modules that we are online
                    window.dispatchEvent(new CustomEvent('uci_firebase_online'));
                    return true;
                }
                if (retries < 10) {
                    retries++;
                    setTimeout(checkFirebase, 200);
                    return false;
                }
                console.warn('⚠️ DataManager: Firebase timeout, using LocalStorage');
                this.updateSyncStatusUI();
                return false;
            };

            checkFirebase();
        } catch (error) {
            console.error('❌ DataManager Init Error:', error);
            this.useFirebase = false;
            this.updateSyncStatusUI();
        }
    }

    async syncLocalToCloud() {
        if (!this.useFirebase || !this.db) return;

        // Prevent multiple syncs
        if (localStorage.getItem('uci_data_synced') === 'true') {
            console.log('✅ Data already synced previously');
            return;
        }

        console.log('🔄 Checking for local data to sync...');
        const collections = ['doctors', 'shifts'];
        let itemsSynced = 0;

        for (const colName of collections) {
            const localData = this._getFromLocalStorage(colName);
            if (localData.length > 0) {
                console.log(`📤 Syncing ${localData.length} items from ${colName} to cloud...`);
                for (const item of localData) {
                    // Safety: Skip invalid items
                    if (!item || (!item.id && !item.name)) continue;

                    // Check for existing cloud data
                    if (item.id && item.id !== 'undefined') {
                        try {
                            const cloudDoc = await this.getById(colName, item.id);
                            if (cloudDoc) continue;
                        } catch (e) { }
                    }

                    // Save to cloud
                    await this.save(colName, item, item.id && item.id !== 'undefined' ? item.id : null);
                    itemsSynced++;
                }
                // Clear local specifically to avoid re-syncing duplicates
                // localStorage.removeItem(colName); 
            }
        }

        if (itemsSynced > 0) {
            localStorage.setItem('uci_data_synced', 'true');
            console.log(`✅ Sync completed: ${itemsSynced} items migrated to cloud`);
        }
    }

    updateSyncStatusUI() {
        const el = document.getElementById('sync-status');
        if (!el) return;

        const icon = el.querySelector('i');
        const text = el.querySelector('.status-text');

        if (this.useFirebase && this.db) {
            el.classList.remove('offline');
            el.classList.add('online');
            if (text) text.textContent = 'En la Nube';
            el.title = 'Sincronizado con Firebase Cloud';
        } else {
            el.classList.remove('online');
            el.classList.add('offline');
            if (text) text.textContent = 'Modo Local';
            el.title = 'Guardando solo en este dispositivo (LocalStorage)';
        }
    }

    // ==========================================
    // CRUD Operations
    // ==========================================

    async getAll(collectionName) {
        if (this.useFirebase && this.db) {
            try {
                const querySnapshot = await getDocs(collection(this.db, collectionName));
                return querySnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id.toString().trim()
                }));
            } catch (error) {
                console.error(`❌ Firestore getAll error (${collectionName}):`, error);

                // Si es un error de permisos, notificar a la app
                if (error.code === 'permission-denied') {
                    console.warn('⚠️ Error de permisos detectado. Usando modo de emergencia (Local).');
                    this.useFirebase = false;
                    this.hasPermissionsError = true;
                    this.updateSyncStatusUI();
                    window.dispatchEvent(new CustomEvent('uci_firebase_permissions_error', {
                        detail: { collection: collectionName }
                    }));
                }

                return this._getFromLocalStorage(collectionName);
            }
        }

        // When in local mode or fallback, proactively clean up records with no/invalid IDs
        const localData = this._getFromLocalStorage(collectionName);
        const validData = localData.filter(item => {
            const itemId = (item.id || '').toString().trim();
            return itemId !== '' && itemId !== 'undefined' && itemId !== 'null';
        });

        if (validData.length !== localData.length) {
            console.log(`🧹 DataManager: Purged ${localData.length - validData.length} invalid records from ${collectionName}`);
            localStorage.setItem(collectionName, JSON.stringify(validData));
            window.dispatchEvent(new Event('storage'));
        }

        return validData;
    }

    async getById(collectionName, id) {
        if (!id || id === 'undefined') return null;

        if (this.useFirebase && this.db) {
            try {
                const docRef = doc(this.db, collectionName, id.toString());
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    return { id: docSnap.id, ...docSnap.data() };
                }
                return null;
            } catch (error) {
                console.error(`❌ Firestore getById error (${collectionName}):`, error);
            }
        }

        const items = await this.getAll(collectionName);
        return items.find(item => item.id.toString() === id.toString());
    }

    async save(collectionName, data, id = null) {
        // Force ID to string if provided and trim to avoid whitespace issues
        let finalId = id ? id.toString().trim() : null;
        if (finalId === 'undefined' || finalId === '') finalId = null;

        const items = await this.getAll(collectionName);
        const timestamp = new Date().toISOString();

        const payload = {
            ...data,
            updatedAt: timestamp
        };

        // Important: Remove 'id' from the payload before saving to Firestore
        // to avoid overwriting the 'doc.id' field when loading back.
        delete payload.id;

        if (this.useFirebase && this.db) {
            try {
                if (finalId) {
                    const docRef = doc(this.db, collectionName, finalId);
                    await setDoc(docRef, payload, { merge: true });
                    console.log(`✅ DataManager: Update success (${collectionName}/${finalId})`);
                    return finalId;
                } else {
                    payload.createdAt = timestamp;
                    const docRef = await addDoc(collection(this.db, collectionName), payload);
                    console.log(`✅ DataManager: Create success (${collectionName}/${docRef.id})`);
                    return docRef.id;
                }
            } catch (error) {
                console.error(`❌ Firestore save error (${collectionName}):`, error);

                if (error.code === 'permission-denied') {
                    window.dispatchEvent(new CustomEvent('uci_firebase_permissions_error', {
                        detail: { collection: collectionName, action: 'save' }
                    }));
                }

                // Don't fall back to local on write error to avoid data loss/desync
                throw error;
            }
        } else {
            if (!id) payload.createdAt = timestamp;
            return this._saveToLocalStorage(collectionName, payload, id);
        }
    }

    async delete(collectionName, id) {
        let success = false;
        const finalId = id.toString().trim();
        console.log(`🗑️ DataManager: Attempting to delete from ${collectionName} ID: ${finalId}`);

        if (this.useFirebase && this.db) {
            try {
                await deleteDoc(doc(this.db, collectionName, finalId));
                console.log(`🗑️ DataManager: Firestore delete success (${collectionName}/${finalId})`);
                success = true;
            } catch (error) {
                console.error(`❌ DataManager: Firestore delete error (${collectionName}):`, error);
            }
        }

        // Always attempt to remove from LocalStorage as well to clear "ghost" data
        const localSuccess = this._deleteFromLocalStorage(collectionName, finalId);
        console.log(`🗑️ DataManager: LocalStorage delete ${localSuccess ? 'success' : 'failed'} for ${finalId}`);
        return success || localSuccess;
    }

    // ==========================================
    // Real-time Listeners
    // ==========================================

    subscribe(collectionName, callback) {
        if (this.useFirebase && this.db) {
            try {
                // Simplified query without orderBy to avoid index requirement for now
                const q = query(collection(this.db, collectionName));
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const changes = snapshot.docChanges().map(change => ({
                        type: change.type,
                        id: change.doc.id,
                        data: change.doc.data()
                    }));

                    // Only callback if there are actual changes
                    if (changes.length > 0) {
                        console.log(`🔥 [${collectionName}] Real-time change detected:`, changes.length, 'items');
                        callback(changes);
                    }
                }, (error) => {
                    console.error(`❌ Firestore Snapshot error (${collectionName}):`, error);
                });

                this.listeners.set(collectionName, unsubscribe);
                return unsubscribe;
            } catch (error) {
                console.error(`❌ Subscribe error (${collectionName}):`, error);
            }
        }
        return () => { };
    }

    unsubscribeAll() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners.clear();
    }

    // ==========================================
    // LocalStorage Implementation (Private)
    // ==========================================

    _getFromLocalStorage(collectionName) {
        try {
            const data = localStorage.getItem(collectionName);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('LocalStorage Read Error:', e);
            return [];
        }
    }

    _saveToLocalStorage(collectionName, data, id) {
        try {
            const items = this._getFromLocalStorage(collectionName);
            let newId = id;

            if (id) {
                const finalId = id.toString().trim();
                const index = items.findIndex(item => item.id && item.id.toString().trim() === finalId);
                if (index !== -1) {
                    items[index] = { ...items[index], ...data, id: finalId };
                } else {
                    items.push({ ...data, id: finalId });
                }
            } else {
                newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                items.push({ ...data, id: newId });
            }

            localStorage.setItem(collectionName, JSON.stringify(items));
            window.dispatchEvent(new Event('storage'));
            return newId;
        } catch (e) {
            console.error('LocalStorage Write Error:', e);
            return null;
        }
    }

    _deleteFromLocalStorage(collectionName, id) {
        try {
            const finalId = id.toString().trim();
            const items = this._getFromLocalStorage(collectionName);
            // Purge the item AND any items with empty IDs that might be stuck
            const newItems = items.filter(item => {
                const itemId = (item.id || '').toString().trim();
                return itemId !== finalId && itemId !== '' && itemId !== 'undefined';
            });
            localStorage.setItem(collectionName, JSON.stringify(newItems));
            window.dispatchEvent(new Event('storage'));
            return true;
        } catch (e) {
            console.error('LocalStorage Delete Error:', e);
            return false;
        }
    }
}

export const dataManager = new DataManager();
