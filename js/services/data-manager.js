/**
 * DataManager - Capa de acceso a datos unificada.
 * Gestiona Firebase Firestore con fallback automático a localStorage.
 * Patrón Singleton.
 */

import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    onSnapshot,
    query,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

import { hashPassword, formatDateLocal, generateId } from "../utils.js";

class DataManager {
    constructor() {
        if (DataManager.instance) {
            return DataManager.instance;
        }

        this.useFirebase = false;
        this.db = null;
        this.listeners = new Map();
        this.pendingSubscriptions = new Map();
        this.hasPermissionsError = false;
        this._ready = false;
        this._seeded = false;

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            this.init();
        } else {
            window.addEventListener('DOMContentLoaded', () => this.init());
        }

        DataManager.instance = this;
    }

    async init() {
        console.log('📡 DataManager: Initializing...');
        try {
            // Esperar a que firebase-config.js esté disponible (import ordenado)
            let retries = 0;
            const checkFirebase = () => {
                if (window.firebaseDb) {
                    this.db = window.firebaseDb;
                    this.useFirebase = true;
                    this._ready = true;
                    console.log('🚀 DataManager: Firebase conectado');
                    this._attachPendingSubscriptions();
                    this.updateSyncStatusUI();

                    // Notificar a los módulos que estamos en línea
                    window.dispatchEvent(new CustomEvent('uci_firebase_online'));
                    return true;
                }
                if (retries < 15) {
                    retries++;
                    setTimeout(checkFirebase, 200);
                    return false;
                }
                console.warn('⚠️ DataManager: Firebase no disponible, usando LocalStorage');
                this._ready = true;
                this._seedIfNeeded();
                this.updateSyncStatusUI();
                return false;
            };

            checkFirebase();
        } catch (error) {
            console.error('❌ DataManager Init Error:', error);
            this.useFirebase = false;
            this._ready = true;
            this._seedIfNeeded();
            this.updateSyncStatusUI();
        }
    }

    // ==========================================
    // Sincronización local -> nube
    // ==========================================

    async syncLocalToCloud() {
        if (!this.useFirebase || !this.db) return;
        if (localStorage.getItem('uci_data_synced') === 'true') return;

        console.log('🔄 Buscando datos locales para sincronizar...');
        let itemsSynced = 0;

        for (const colName of ['doctors', 'shifts']) {
            const localData = this._getFromLocalStorage(colName);
            for (const item of localData) {
                if (!item || !item.id) continue;
                try {
                    const cloudDoc = await this.getById(colName, item.id);
                    if (cloudDoc) continue;
                } catch (e) { /* ignora y continúa */ }
                await this.save(colName, item, item.id);
                itemsSynced++;
            }
        }

        if (itemsSynced > 0) {
            localStorage.setItem('uci_data_synced', 'true');
            console.log(`✅ Sincronización completada: ${itemsSynced} elementos migrados a la nube`);
        }
    }

    /** Crea datos de ejemplo SOLO en modo local y si la colección está vacía. */
    async _seedIfNeeded() {
        if (this._seeded) return;
        this._seeded = true;

        const doctors = this._getFromLocalStorage('doctors');
        if (doctors.length === 0) {
            const now = new Date().toISOString();
            const demoHash = await hashPassword('medico123');
            const sampleDoctors = [
                {
                    id: generateId(), name: 'Dr. Juan Pérez', specialty: 'Cardiología',
                    email: 'juan.perez@hospital.com', phone: '+1234567890',
                    username: 'jperez', passwordHash: demoHash, photo: null,
                    createdAt: now, updatedAt: now
                },
                {
                    id: generateId(), name: 'Dra. María García', specialty: 'Neurología',
                    email: 'maria.garcia@hospital.com', phone: '+1234567891',
                    username: 'mgarcia', passwordHash: demoHash, photo: null,
                    createdAt: now, updatedAt: now
                },
                {
                    id: generateId(), name: 'Dr. Carlos López', specialty: 'Pediatría',
                    email: 'carlos.lopez@hospital.com', phone: '+1234567892',
                    username: 'clopez', passwordHash: demoHash, photo: null,
                    createdAt: now, updatedAt: now
                }
            ];
            this._saveToLocalStorage('doctors', { data: sampleDoctors, isBulk: true });
            console.log('📝 Datos de ejemplo de médicos creados (modo local)');
        }

        const shifts = this._getFromLocalStorage('shifts');
        if (shifts.length === 0) {
            const doctors = this._getFromLocalStorage('doctors');
            const now = new Date().toISOString();
            const sampleShifts = [];
            for (let i = 1; i <= 5; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);
                sampleShifts.push({
                    id: generateId(),
                    doctorId: doctors[i % doctors.length]?.id,
                    date: formatDateLocal(date),
                    type: i % 2 === 0 ? 'noche' : 'mañana',
                    startTime: i % 2 === 0 ? '19:00' : '07:00',
                    endTime: i % 2 === 0 ? '07:00' : '19:00',
                    notes: '',
                    createdAt: now, updatedAt: now
                });
            }
            this._saveToLocalStorage('shifts', { data: sampleShifts, isBulk: true });
            console.log('📝 Datos de ejemplo de turnos creados (modo local)');
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
            if (icon) icon.className = 'fas fa-cloud';
            if (text) text.textContent = 'En la Nube';
            el.title = 'Sincronizado con Firebase Cloud';
        } else {
            el.classList.remove('online');
            el.classList.add('offline');
            if (icon) icon.className = 'fas fa-exclamation-triangle';
            if (text) text.textContent = 'Modo Local';
            el.title = 'Guardando solo en este dispositivo';
        }
    }

    // ==========================================
    // CRUD
    // ==========================================

    async getAll(collectionName) {
        if (this.useFirebase && this.db) {
            try {
                const querySnapshot = await getDocs(collection(this.db, collectionName));
                return querySnapshot.docs.map(docSnap => ({
                    ...docSnap.data(),
                    id: docSnap.id
                }));
            } catch (error) {
                console.error(`❌ Firestore getAll error (${collectionName}):`, error);

                if (error.code === 'permission-denied') {
                    console.warn('⚠️ Error de permisos detectado. Usando modo local.');
                    this.useFirebase = false;
                    this.hasPermissionsError = true;
                    this.updateSyncStatusUI();
                    window.dispatchEvent(new CustomEvent('uci_firebase_permissions_error', {
                        detail: { collection: collectionName }
                    }));
                }
            }
        }

        await this._seedIfNeeded();
        return this._getValidLocalData(collectionName);
    }

    async getById(collectionName, id) {
        if (!id || id === 'undefined') return null;

        if (this.useFirebase && this.db) {
            try {
                const docRef = doc(this.db, collectionName, String(id));
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
        return items.find(item => String(item.id) === String(id)) || null;
    }

    async save(collectionName, data, id = null) {
        let finalId = id ? String(id).trim() : null;
        if (!finalId || finalId === 'undefined') finalId = null;

        const timestamp = new Date().toISOString();
        const payload = { ...data, updatedAt: timestamp };
        if (!finalId) payload.createdAt = timestamp;
        delete payload.id;

        if (this.useFirebase && this.db) {
            try {
                if (finalId) {
                    await setDoc(doc(this.db, collectionName, finalId), payload, { merge: true });
                    return finalId;
                } else {
                    const docRef = await addDoc(collection(this.db, collectionName), payload);
                    return docRef.id;
                }
            } catch (error) {
                console.error(`❌ Firestore save error (${collectionName}):`, error);
                if (error.code === 'permission-denied') {
                    this.useFirebase = false;
                    this.hasPermissionsError = true;
                    this.updateSyncStatusUI();
                    window.dispatchEvent(new CustomEvent('uci_firebase_permissions_error', {
                        detail: { collection: collectionName, action: 'save' }
                    }));
                }
                throw error;
            }
        }

        return this._saveToLocalStorage(collectionName, payload, finalId);
    }

    async delete(collectionName, id) {
        const finalId = String(id).trim();
        let success = false;

        if (this.useFirebase && this.db) {
            try {
                await deleteDoc(doc(this.db, collectionName, finalId));
                success = true;
            } catch (error) {
                console.error(`❌ Firestore delete error (${collectionName}):`, error);
            }
        }

        const localSuccess = this._deleteFromLocalStorage(collectionName, finalId);
        return success || localSuccess;
    }

    // ==========================================
    // Listener en tiempo real
    // ==========================================

    /**
     * Registra un callback para cambios en una colección.
     * Si Firebase aún no está listo, la suscripción se encola y se activa al conectar.
     */
    subscribe(collectionName, callback) {
        const key = `${collectionName}`;
        if (!this.pendingSubscriptions.has(key)) {
            this.pendingSubscriptions.set(key, new Set());
        }
        this.pendingSubscriptions.get(key).add(callback);

        if (this.useFirebase && this.db) {
            this._attachSubscription(collectionName, callback);
        }

        return () => {
            this.pendingSubscriptions.get(key)?.delete(callback);
            const existing = this.listeners.get(key);
            if (existing) {
                existing();
                this.listeners.delete(key);
            }
        };
    }

    _attachPendingSubscriptions() {
        this.pendingSubscriptions.forEach((callbacks, key) => {
            if (this.listeners.has(key)) {
                this.listeners.get(key)();
                this.listeners.delete(key);
            }
            callbacks.forEach(callback => this._attachSubscription(key, callback));
        });
    }

    _attachSubscription(collectionName, callback) {
        try {
            const q = query(collection(this.db, collectionName));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const changes = snapshot.docChanges().map(change => ({
                    type: change.type,
                    id: change.doc.id,
                    data: change.doc.data()
                }));
                if (changes.length > 0) {
                    callback(changes);
                }
            }, (error) => {
                console.error(`❌ Firestore Snapshot error (${collectionName}):`, error);
                if (error.code === 'permission-denied') {
                    this.useFirebase = false;
                    this.hasPermissionsError = true;
                    this.updateSyncStatusUI();
                    window.dispatchEvent(new CustomEvent('uci_firebase_permissions_error', {
                        detail: { collection: collectionName }
                    }));
                }
            });

            this.listeners.set(collectionName, unsubscribe);
        } catch (error) {
            console.error(`❌ Subscribe error (${collectionName}):`, error);
        }
    }

    // ==========================================
    // LocalStorage (implementación privada)
    // ==========================================

    _getFromLocalStorage(collectionName) {
        try {
            const raw = localStorage.getItem(collectionName);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('LocalStorage Read Error:', e);
            return [];
        }
    }

    _getValidLocalData(collectionName) {
        const localData = this._getFromLocalStorage(collectionName);
        const valid = localData.filter(item => {
            const itemId = String(item.id || '').trim();
            return itemId !== '' && itemId !== 'undefined' && itemId !== 'null';
        });
        if (valid.length !== localData.length) {
            localStorage.setItem(collectionName, JSON.stringify(valid));
            window.dispatchEvent(new Event('storage'));
        }
        return valid;
    }

    _saveToLocalStorage(collectionName, data, id) {
        try {
            // Soporte para guardado masivo (seed)
            if (data && data.isBulk && Array.isArray(data.data)) {
                localStorage.setItem(collectionName, JSON.stringify(data.data));
                window.dispatchEvent(new Event('storage'));
                return true;
            }

            const items = this._getFromLocalStorage(collectionName);
            let newId = id;

            if (id) {
                const finalId = String(id).trim();
                const index = items.findIndex(item => String(item.id).trim() === finalId);
                if (index !== -1) {
                    items[index] = { ...items[index], ...data, id: finalId };
                } else {
                    items.push({ ...data, id: finalId });
                }
            } else {
                newId = generateId();
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
            const finalId = String(id).trim();
            const items = this._getFromLocalStorage(collectionName);
            const filtered = items.filter(item => {
                const itemId = String(item.id || '').trim();
                return itemId !== finalId && itemId !== '' && itemId !== 'undefined';
            });
            localStorage.setItem(collectionName, JSON.stringify(filtered));
            window.dispatchEvent(new Event('storage'));
            return true;
        } catch (e) {
            console.error('LocalStorage Delete Error:', e);
            return false;
        }
    }

    /** Detecta el escape (usado para debug; no se elimina para no romper compatibilidad). */
    get ready() {
        return this._ready;
    }
}

export const dataManager = new DataManager();
